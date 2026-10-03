import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { progressionService } from '../src/services/progression.service.js';
import { courseService } from '../src/services/course.service.js';
import { quizService } from '../src/services/quiz.service.js';
import { assignmentService } from '../src/services/assignment.service.js';
import { reviewService } from '../src/services/review.service.js';
import { mockTestService } from '../src/services/mock-test.service.js';
import { finalProjectService } from '../src/services/final-project.service.js';
import { finalAssessmentService } from '../src/services/final-assessment.service.js';
import { certificateService } from '../src/services/certificate.service.js';
import { Role, SubmissionStatus, ModuleStatus } from '@academy/shared';

describe('End-to-End Progression Vertical Slice Integration Test', () => {
  let student: any;
  let instructor: any;
  let course: any;
  let module1: any;
  let lesson1_1: any;
  let lesson1_2: any;
  let lesson1_3: any;
  let quiz1: any;
  let assignment1: any;

  beforeAll(async () => {
    // Create a fresh dedicated test student
    const testEmail = `test_student_${Date.now()}@creativeit.academy`;
    student = await prisma.user.create({
      data: {
        name: 'Test Student',
        email: testEmail,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        role: Role.STUDENT,
      },
    });

    instructor = await prisma.user.findUnique({ where: { email: 'instructor@creativeit.academy' } });
    course = await prisma.course.findUnique({
      where: { slug: 'fullstack-ai-engineering' },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' } },
            quiz: { include: { questions: { include: { options: true } } } },
            assignment: true,
          },
        },
        mockTest: { include: { questions: { include: { options: true } } } },
        finalProject: true,
        finalAssessment: { include: { questions: { include: { options: true } } } },
      },
    });

    // Enroll fresh student
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
      },
    });

    module1 = course.modules[0];
    lesson1_1 = module1.lessons[0];
    lesson1_2 = module1.lessons[1];
    lesson1_3 = module1.lessons[2];
    quiz1 = module1.quiz;
    assignment1 = module1.assignment;
  });

  it('Step 1: Fresh progression state has Module 1 AVAILABLE and subsequent modules LOCKED', async () => {
    const prog = await progressionService.getCourseProgression(course.id, student.id);
    expect(prog.modules[0].status).not.toBe(ModuleStatus.LOCKED);
    expect(prog.modules[1].isLocked).toBe(true);
    expect(prog.modules[2].isLocked).toBe(true);
    expect(prog.mockTestPassed).toBe(false);
    expect(prog.certificateEligible).toBe(false);
  });

  it('Step 2: Completing all lessons in Module 1 unlocks Module 1 Quiz', async () => {
    // Mark Lesson 1 complete
    await courseService.recordLessonProgress(student.id, lesson1_1.id, 600, 100, true);
    // Mark Lesson 2 complete
    await courseService.recordLessonProgress(student.id, lesson1_2.id, 720, 100, true);
    // Mark Lesson 3 complete
    await courseService.recordLessonProgress(student.id, lesson1_3.id, 840, 100, true);

    const prog = await progressionService.getCourseProgression(course.id, student.id);
    expect(prog.modules[0].lessonsCompleted).toBe(3);
    expect(prog.modules[0].quizDetail.isLocked).toBe(false);
  });

  it('Step 3: Submitting Quiz 1 with passing answers passes quiz and unlocks Practical Assignment', async () => {
    // Collect correct options for quiz1 questions
    const answers = quiz1.questions.map((q: any) => ({
      questionId: q.id,
      selectedOptionIds: q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id),
    }));

    const result = await quizService.submitQuizAttempt({
      quizId: quiz1.id,
      studentId: student.id,
      role: Role.STUDENT,
      answers,
    });

    expect(result.isPassed).toBe(true);
    expect(result.scorePercent).toBeGreaterThanOrEqual(70);

    const prog = await progressionService.getCourseProgression(course.id, student.id);
    expect(prog.modules[0].isQuizPassed).toBe(true);
    expect(prog.modules[0].assignmentDetail.isLocked).toBe(false);
  });

  it('Step 4: Student submits practical assignment -> Module status transitions to AWAITING_REVIEW', async () => {
    const sub = await assignmentService.submitAssignment({
      assignmentId: assignment1.id,
      studentId: student.id,
      role: Role.STUDENT,
      textContent: 'Completed modular REST API with Zod validation and TypeScript in monorepo.',
      linkUrl: 'https://github.com/student1/monorepo-lms',
    });

    expect(sub.submission.status).toBe(SubmissionStatus.PENDING);

    const prog = await progressionService.getCourseProgression(course.id, student.id);
    expect(prog.modules[0].status).toBe(ModuleStatus.AWAITING_REVIEW);
    // Module 2 is still locked until instructor approves
    expect(prog.modules[1].isLocked).toBe(true);
  });

  it('Step 5: Instructor reviews and approves assignment -> Module 1 completes and Module 2 unlocks!', async () => {
    const latestSubmission = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: assignment1.id, studentId: student.id },
      orderBy: { version: 'desc' },
    });

    const reviewRes = await reviewService.reviewAssignmentSubmission({
      submissionId: latestSubmission!.id,
      reviewerId: instructor.id,
      status: SubmissionStatus.APPROVED,
      feedback: 'Outstanding architecture and complete test coverage. Approved with full marks!',
      grade: 100,
    });

    expect(reviewRes.submission.status).toBe(SubmissionStatus.APPROVED);

    const prog = await progressionService.getCourseProgression(course.id, student.id);
    expect(prog.modules[0].status).toBe(ModuleStatus.COMPLETED);
    // Module 2 is now UNLOCKED!
    expect(prog.modules[1].isLocked).toBe(false);
  });
});
