import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { assessmentService } from '../src/services/assessment.service.js';
import { calculateQuizResult } from '../src/services/progression.service.js';
import {
  Role,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  AnswerReviewPolicy,
  ScoringMode,
  QuizAttemptStatus,
  ModuleStatus,
} from '@academy/shared';

describe('Assessment Engine & Question Bank Tests (Prompt 5)', { timeout: 30000 }, () => {
  describe('Pure Pass/Fail Boundary Calculations (70% Pass Mark)', () => {
    it('grades 14 / 20 as PASS (70.0% >= 70%)', () => {
      const result = calculateQuizResult(14, 20, 70);
      expect(result.percentage).toBe(70);
      expect(result.passed).toBe(true);
    });

    it('grades 13 / 20 as FAIL (65.0% < 70%)', () => {
      const result = calculateQuizResult(13, 20, 70);
      expect(result.percentage).toBe(65);
      expect(result.passed).toBe(false);
    });

    it('grades 7 / 10 as PASS (70.0% >= 70%)', () => {
      const result = calculateQuizResult(7, 10, 70);
      expect(result.percentage).toBe(70);
      expect(result.passed).toBe(true);
    });

    it('grades 6 / 10 as FAIL (60.0% < 70%)', () => {
      const result = calculateQuizResult(6, 10, 70);
      expect(result.percentage).toBe(60);
      expect(result.passed).toBe(false);
    });

    it('handles odd questions count: 5 questions at 70% needs 4 (80% PASS, 3 is 60% FAIL)', () => {
      const passResult = calculateQuizResult(4, 5, 70);
      expect(passResult.percentage).toBe(80);
      expect(passResult.passed).toBe(true);

      const failResult = calculateQuizResult(3, 5, 70);
      expect(failResult.percentage).toBe(60);
      expect(failResult.passed).toBe(false);
    });

    it('handles zero questions gracefully without divide-by-zero errors', () => {
      const result = calculateQuizResult(0, 0, 70);
      expect(result.percentage).toBe(0);
      expect(result.passed).toBe(false);
    });
  });

  describe('CSV Import & Validation Engine', () => {
    it('generates downloadable template with valid sample rows', () => {
      const template = assessmentService.generateCsvTemplate();
      expect(template).toContain('question,type,option1,option2,option3,option4,option5,option6,correct,explanation,difficulty,tags');
      expect(template).toContain('SINGLE_CHOICE');
      expect(template).toContain('MULTIPLE_CHOICE');
    });

    it('validates CSV and catches row-level errors in dry-run mode', async () => {
      const invalidCsv = [
        'question,type,option1,option2,correct,explanation,difficulty,tags',
        ',SINGLE_CHOICE,Option A,Option B,1,Explanation,MEDIUM,tag1', // Empty question
        'What is JavaScript?,SINGLE_CHOICE,Option A,,1,Explanation,MEDIUM,tag1', // < 2 options
        'What is React?,SINGLE_CHOICE,Library,Framework,5,Explanation,MEDIUM,tag1', // Invalid correct index
        'What is Node?,SINGLE_CHOICE,Runtime,Framework,1;2,Explanation,MEDIUM,tag1', // Single choice with multiple correct
      ].join('\n');

      // We use a dummy quiz ID for dry run test
      // Find any quiz in DB
      const sampleQuiz = await prisma.quiz.findFirst();
      if (!sampleQuiz) return;

      const report = await assessmentService.importQuestionsFromCsv(sampleQuiz.id, invalidCsv, true);
      expect(report.dryRun).toBe(true);
      expect(report.valid).toBe(false);
      expect(report.errorCount).toBe(4);
      expect(report.errors[0].field).toBe('question');
      expect(report.errors[1].field).toBe('options');
      expect(report.errors[2].field).toBe('correct');
      expect(report.errors[3].field).toBe('correct');
    });
  });

  describe('Database Integration: Full Assessment Lifecycle & Zero-Leakage', () => {
    let studentA: any;
    let studentB: any;
    let instructor: any;
    let course: any;
    let module1: any;
    let module2: any;
    let testQuiz: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      // Setup test users
      instructor = await prisma.user.create({
        data: {
          name: 'Quiz Instructor',
          email: `instructor_${timestamp}@creativeit.academy`,
          passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
          role: Role.INSTRUCTOR,
        },
      });

      studentA = await prisma.user.create({
        data: {
          name: 'Student A',
          email: `student_a_${timestamp}@creativeit.academy`,
          passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
          role: Role.STUDENT,
        },
      });

      studentB = await prisma.user.create({
        data: {
          name: 'Student B',
          email: `student_b_${timestamp}@creativeit.academy`,
          passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
          role: Role.STUDENT,
        },
      });

      // Questions to seed with Quiz
      const seedQuestions = [];
      for (let i = 1; i <= 10; i++) {
        seedQuestions.push({
          text: `Question ${i}: What is concept #${i}?`,
          explanation: `Detailed explanation for Question ${i}`,
          type: i % 2 === 1 ? QuestionType.SINGLE_CHOICE : QuestionType.MULTIPLE_CHOICE,
          order: i,
          points: 1.0,
          marks: 1.0,
          difficulty: i <= 3 ? QuestionDifficulty.EASY : i <= 7 ? QuestionDifficulty.MEDIUM : QuestionDifficulty.HARD,
          tags: [`tag_${i}`, 'core'],
          status: QuestionStatus.ACTIVE,
          options: {
            create: [
              { text: `Option 1 for Q${i}`, isCorrect: true },
              { text: `Option 2 for Q${i}`, isCorrect: i % 2 === 0 },
              { text: `Option 3 for Q${i}`, isCorrect: false },
              { text: `Option 4 for Q${i}`, isCorrect: false },
            ],
          },
        });
      }

      // Create Course with 2 Modules
      course = await prisma.course.create({
        data: {
          title: `Assessment Test Course ${timestamp}`,
          slug: `assessment-test-course-${timestamp}`,
          description: 'Testing quiz runner and module unlocking',
          category: 'Web Development',
          instructorId: instructor.id,
          modules: {
            create: [
              {
                title: 'Module 1: Fundamentals',
                order: 1,
                requiresAssignment: false, // Completing quiz directly unlocks Module 2
                requiresQuiz: true,
                lessons: {
                  create: [
                    {
                      title: 'Lesson 1.1 Intro',
                      durationSeconds: 300,
                      order: 1,
                    },
                    {
                      title: 'Lesson 1.2 Deep Dive',
                      durationSeconds: 600,
                      order: 2,
                    },
                  ],
                },
                quiz: {
                  create: {
                    title: 'Module 1 Mastery Assessment',
                    description: 'Test your understanding of Module 1',
                    questionCount: 5, // Draw 5 questions out of pool
                    passPercentage: 70.0, // 4 out of 5 to pass
                    timeLimitMinutes: 15,
                    maxAttempts: 3,
                    cooldownMinutes: 0,
                    shuffleQuestions: true,
                    shuffleOptions: true,
                    showAnswersAfterSubmit: AnswerReviewPolicy.AFTER_PASS,
                    scoringMode: ScoringMode.ALL_OR_NOTHING,
                    questions: {
                      create: seedQuestions,
                    },
                  },
                },
              },
              {
                title: 'Module 2: Advanced Topics',
                order: 2,
                requiresAssignment: false,
                requiresQuiz: true,
                lessons: {
                  create: [
                    {
                      title: 'Lesson 2.1 Advanced Concepts',
                      durationSeconds: 400,
                      order: 1,
                    },
                  ],
                },
              },
            ],
          },
        },
        include: {
          modules: {
            include: { lessons: true, quiz: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      module1 = course.modules[0];
      module2 = course.modules[1];
      testQuiz = module1.quiz;

      // Enroll studentA & studentB
      await prisma.enrollment.createMany({
        data: [
          { studentId: studentA.id, courseId: course.id, paymentStatus: 'PAID', accessStatus: 'ACTIVE' },
          { studentId: studentB.id, courseId: course.id, paymentStatus: 'PAID', accessStatus: 'ACTIVE' },
        ],
      });

      // Module 1 is AVAILABLE for studentA
      await prisma.moduleProgress.create({
        data: {
          studentId: studentA.id,
          moduleId: module1.id,
          status: ModuleStatus.AVAILABLE,
        },
      });
    }, 30000);

    afterAll(async () => {
      // Clean up test records
      if (course) {
        await prisma.course.delete({ where: { id: course.id } }).catch(() => {});
      }
      if (studentA) {
        await prisma.user.delete({ where: { id: studentA.id } }).catch(() => {});
      }
      if (studentB) {
        await prisma.user.delete({ where: { id: studentB.id } }).catch(() => {});
      }
      if (instructor) {
        await prisma.user.delete({ where: { id: instructor.id } }).catch(() => {});
      }
    }, 30000);

    it('blocks starting quiz if lessons are not yet completed', async () => {
      const quizInfo = await assessmentService.getStudentQuizInfo(module1.id, studentA.id, Role.STUDENT);
      expect(quizInfo.state).toBe('LOCKED');
      expect((quizInfo as any).lockReason).toBe('LESSONS_INCOMPLETE');
    });

    it('allows starting attempt once all lessons are completed', async () => {
      // Complete all lessons in Module 1 for studentA
      for (const lesson of module1.lessons) {
        await prisma.lessonProgress.create({
          data: {
            studentId: studentA.id,
            lessonId: lesson.id,
            watchedSeconds: lesson.durationSeconds,
            percent: 100.0,
            completedAt: new Date(),
          },
        });
      }

      const quizInfo = await assessmentService.getStudentQuizInfo(module1.id, studentA.id, Role.STUDENT);
      expect(quizInfo.state).toBe('AVAILABLE');
      expect(quizInfo.isPassed).toBe(false);
    });

    it('zero-leakage check: startQuizAttempt NEVER exposes correct answers or explanations', async () => {
      const startResult = await assessmentService.startQuizAttempt({
        quizId: testQuiz.id,
        studentId: studentA.id,
        role: Role.STUDENT,
      });

      expect(startResult.attemptId).toBeDefined();
      expect(startResult.questionsCount).toBe(5);
      expect(startResult.questions.length).toBe(5);

      // Verify that no question or option contains correct answer data
      for (const q of startResult.questions) {
        expect((q as any).correctOptionIds).toBeUndefined();
        expect((q as any).explanation).toBeUndefined();
        for (const opt of q.options) {
          expect((opt as any).isCorrect).toBeUndefined();
        }
      }
    });

    it('autosaves partial answers and computes score strictly on submission', async () => {
      // Resume the active attempt
      const activeAttempt = await prisma.quizAttempt.findFirst({
        where: { studentId: studentA.id, quizId: testQuiz.id, status: QuizAttemptStatus.IN_PROGRESS },
      });
      expect(activeAttempt).toBeDefined();

      const snapshot = activeAttempt!.questionSnapshot as any[];
      expect(snapshot.length).toBe(5);

      // Select wrong answers on first 3 questions and correct on 2 questions (2/5 = 40% -> FAIL)
      const answersPayload: any[] = [];

      // Q1: correct
      answersPayload.push({
        questionId: snapshot[0].id,
        selectedOptionIds: snapshot[0].correctOptionIds,
        flagged: false,
      });

      // Q2: correct
      answersPayload.push({
        questionId: snapshot[1].id,
        selectedOptionIds: snapshot[1].correctOptionIds,
        flagged: true,
      });

      // Q3, Q4, Q5: deliberately wrong (pick option that is NOT in correctOptionIds)
      for (let i = 2; i < 5; i++) {
        const wrongOpt = snapshot[i].options.find(
          (opt: any) => !snapshot[i].correctOptionIds.includes(opt.id)
        );
        answersPayload.push({
          questionId: snapshot[i].id,
          selectedOptionIds: wrongOpt ? [wrongOpt.id] : [],
          flagged: false,
        });
      }

      // Autosave answers
      const saveRes = await assessmentService.saveAttemptAnswers({
        attemptId: activeAttempt!.id,
        studentId: studentA.id,
        answers: answersPayload,
      });
      expect(saveRes.success).toBe(true);

      // Final Submit
      const submitRes = await assessmentService.submitQuizAttempt({
        attemptId: activeAttempt!.id,
        studentId: studentA.id,
      });

      expect(submitRes.passed).toBe(false);
      expect(submitRes.percentage).toBe(40); // 2 out of 5 = 40%
      expect(submitRes.correctAnswersCount).toBe(2);
      expect(submitRes.incorrectAnswersCount).toBe(3);

      // Module 2 must still be locked
      const mod2Progress = await prisma.moduleProgress.findUnique({
        where: { studentId_moduleId: { studentId: studentA.id, moduleId: module2.id } },
      });
      expect(mod2Progress?.status).not.toBe(ModuleStatus.AVAILABLE);

      // Answer Review Policy Check (AFTER_PASS): Because student hasn't passed yet, answers must be hidden
      expect(submitRes.showAnswers).toBe(false);
      for (const q of submitRes.questionsReview) {
        expect(q.correctOptionIds).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      }
    });

    it('allows retry, achieves passing score (>=70%), and unlocks next module', async () => {
      // Start Attempt #2
      const startRetake = await assessmentService.startQuizAttempt({
        quizId: testQuiz.id,
        studentId: studentA.id,
        role: Role.STUDENT,
      });

      expect(startRetake.attemptNumber).toBe(2);

      const activeAttempt2 = await prisma.quizAttempt.findUnique({
        where: { id: startRetake.attemptId },
      });
      const snapshot2 = activeAttempt2!.questionSnapshot as any[];

      // Answer 4 out of 5 correctly (80% >= 70% -> PASS)
      const answersPayload2: any[] = [];
      for (let i = 0; i < 4; i++) {
        answersPayload2.push({
          questionId: snapshot2[i].id,
          selectedOptionIds: snapshot2[i].correctOptionIds,
        });
      }
      // 5th question wrong
      const wrongOpt = snapshot2[4].options.find(
        (opt: any) => !snapshot2[4].correctOptionIds.includes(opt.id)
      );
      answersPayload2.push({
        questionId: snapshot2[4].id,
        selectedOptionIds: wrongOpt ? [wrongOpt.id] : [],
      });

      const passResult = await assessmentService.submitQuizAttempt({
        attemptId: startRetake.attemptId,
        studentId: studentA.id,
        finalAnswers: answersPayload2,
      });

      expect(passResult.passed).toBe(true);
      expect(passResult.percentage).toBe(80);
      expect(passResult.nextModuleUnlocked).toBe(true);

      // Verify Module 1 is now COMPLETED
      const mod1Progress = await prisma.moduleProgress.findUnique({
        where: { studentId_moduleId: { studentId: studentA.id, moduleId: module1.id } },
      });
      expect(mod1Progress?.status).toBe(ModuleStatus.COMPLETED);

      // Verify Module 2 is now AVAILABLE!
      const mod2Progress = await prisma.moduleProgress.findUnique({
        where: { studentId_moduleId: { studentId: studentA.id, moduleId: module2.id } },
      });
      expect(mod2Progress?.status).toBe(ModuleStatus.AVAILABLE);

      // Verify Answer Review Policy (AFTER_PASS): Answers & explanations are now visible!
      expect(passResult.showAnswers).toBe(true);
      for (const q of passResult.questionsReview) {
        expect(q.correctOptionIds).toBeDefined();
      }
    });

    it('question snapshot immutability: editing question bank does not mutate past attempt results', async () => {
      // Find past attempt #2
      const pastAttempt = await prisma.quizAttempt.findFirst({
        where: { studentId: studentA.id, quizId: testQuiz.id, attemptNumber: 2 },
      });
      expect(pastAttempt).toBeDefined();
      const pastScore = pastAttempt!.score;

      // Edit one of the questions in the bank: modify text, options, and explanation
      const firstQ = await prisma.question.findFirst({
        where: { quizId: testQuiz.id },
      });

      await assessmentService.updateQuestion(firstQ!.id, {
        text: 'MODIFIED QUESTION TEXT POST ATTEMPT',
        explanation: 'NEW EXPLANATION',
        options: [
          { text: 'New Option Alpha', isCorrect: false },
          { text: 'New Option Beta', isCorrect: true },
        ],
      });

      // Verify attempt score is completely unchanged
      const attemptAfterEdit = await prisma.quizAttempt.findUnique({
        where: { id: pastAttempt!.id },
      });
      expect(attemptAfterEdit!.score).toBe(pastScore);

      // Verify getAttemptResult still uses the historical snapshot
      const review = await assessmentService.getAttemptResult(pastAttempt!.id, studentA.id);
      expect(review.score).toBe(pastScore);
    });

    it('enforces student ownership isolation (Student B cannot access Student A attempt)', async () => {
      const studentAAttempt = await prisma.quizAttempt.findFirst({
        where: { studentId: studentA.id, quizId: testQuiz.id },
      });

      await expect(
        assessmentService.getAttemptForResume(studentAAttempt!.id, studentB.id)
      ).rejects.toThrow();

      await expect(
        assessmentService.getAttemptResult(studentAAttempt!.id, studentB.id)
      ).rejects.toThrow();
    });

    it('admin override: resets attempts and allows clean retake with audit logging', async () => {
      const resetResult = await assessmentService.adminResetStudentAttempts(
        testQuiz.id,
        studentA.id,
        instructor.id,
        'Student reported technical disconnect'
      );

      expect(resetResult.success).toBe(true);

      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'QUIZ_ATTEMPTS_RESET', entityId: testQuiz.id },
      });
      expect(auditLog).toBeDefined();
      expect((auditLog?.details as any)?.reason).toBe('Student reported technical disconnect');
    });
  });
});
