import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import { progressionService } from './progression.service.js';
import { Role } from '@academy/shared';

export class MockTestService {
  async getMockTestForRunner(mockTestId: string, studentId: string, role: Role) {
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: mockTestId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              select: {
                id: true,
                questionId: true,
                text: true,
              },
            },
          },
        },
        course: { select: { id: true, title: true } },
      },
    });

    if (!mockTest) throw new NotFoundError('Mock test not found');

    // Check if student completed all modules first
    if (role === Role.STUDENT) {
      const progression = await progressionService.getCourseProgression(mockTest.courseId, studentId);
      if (!progression.isAllModulesCompleted) {
        throw new BadRequestError('Mock test is locked. You must complete all course modules first.');
      }
    }

    const attempts = await prisma.mockTestAttempt.findMany({
      where: { mockTestId, studentId },
      orderBy: { createdAt: 'desc' },
    });

    const isPassed = attempts.some((a) => a.isPassed || a.scorePercent >= mockTest.passingScorePercent);
    const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.scorePercent)) : null;

    return {
      mockTest,
      attemptsCount: attempts.length,
      maxAttempts: mockTest.maxAttempts,
      isPassed,
      bestScore,
      recentAttempt: attempts[0] || null,
    };
  }

  async submitMockTest(params: {
    mockTestId: string;
    studentId: string;
    role: Role;
    answers: { questionId: string; selectedOptionIds: string[] }[];
    timeSpentSeconds?: number;
  }) {
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: params.mockTestId },
      include: {
        questions: { include: { options: true } },
      },
    });

    if (!mockTest) throw new NotFoundError('Mock test not found');

    const previousAttempts = await prisma.mockTestAttempt.count({
      where: { mockTestId: params.mockTestId, studentId: params.studentId },
    });

    if (previousAttempts >= mockTest.maxAttempts) {
      throw new BadRequestError(`Maximum attempts (${mockTest.maxAttempts}) reached for this mock test.`);
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const breakdown: any[] = [];

    for (const q of mockTest.questions) {
      totalPoints += q.points;
      const submitted = params.answers.find((a) => a.questionId === q.id);
      const selectedOptionIds = submitted?.selectedOptionIds || [];
      const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);

      const isCorrect =
        selectedOptionIds.length === correctOptionIds.length &&
        selectedOptionIds.every((id) => correctOptionIds.includes(id));

      if (isCorrect) earnedPoints += q.points;

      breakdown.push({
        questionId: q.id,
        questionText: q.text,
        explanation: q.explanation,
        selectedOptionIds,
        correctOptionIds,
        isCorrect,
        points: q.points,
      });
    }

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = scorePercent >= mockTest.passingScorePercent;

    const attempt = await prisma.mockTestAttempt.create({
      data: {
        mockTestId: params.mockTestId,
        studentId: params.studentId,
        attemptNumber: previousAttempts + 1,
        scorePercent,
        isPassed,
        timeSpentSeconds: params.timeSpentSeconds || 0,
        answersData: breakdown,
      },
    });

    const progression = await progressionService.getCourseProgression(mockTest.courseId, params.studentId);

    return {
      attempt,
      scorePercent,
      isPassed,
      passingScorePercent: mockTest.passingScorePercent,
      breakdown,
      progression,
    };
  }
}

export const mockTestService = new MockTestService();
