import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import { progressionService } from './progression.service.js';
import { Role } from '@academy/shared';

export class QuizService {
  async getQuizForRunner(quizId: string, studentId: string, role: Role) {
    await progressionService.assertCanAccessQuiz(quizId, studentId, role);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              select: {
                id: true,
                questionId: true,
                text: true,
                // Do NOT expose isCorrect to student runner
              },
            },
          },
        },
        module: { select: { id: true, title: true, courseId: true } },
      },
    });

    if (!quiz) throw new NotFoundError('Quiz not found');

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: true,
      },
    });

    const isPassed = attempts.some((a) => a.isPassed || a.scorePercent >= quiz.passingScorePercent);
    const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.scorePercent)) : null;

    return {
      quiz,
      attemptsCount: attempts.length,
      maxAttempts: quiz.maxAttempts,
      isPassed,
      bestScore,
      recentAttempt: attempts[0] || null,
    };
  }

  async submitQuizAttempt(params: {
    quizId: string;
    studentId: string;
    role: Role;
    answers: { questionId: string; selectedOptionIds: string[] }[];
  }) {
    await progressionService.assertCanAccessQuiz(params.quizId, params.studentId, params.role);

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        questions: {
          include: { options: true },
        },
        module: true,
      },
    });

    if (!quiz) throw new NotFoundError('Quiz not found');

    const previousAttempts = await prisma.quizAttempt.count({
      where: { quizId: params.quizId, studentId: params.studentId },
    });

    const maxAllowedAttempts = quiz.maxAttempts ?? 3;
    if (previousAttempts >= maxAllowedAttempts) {
      throw new BadRequestError(`Maximum attempts (${maxAllowedAttempts}) reached for this quiz.`);
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const answerRecords: {
      questionId: string;
      selectedOptionIds: any;
      isCorrect: boolean;
      pointsEarned: number;
    }[] = [];

    for (const q of quiz.questions) {
      totalPoints += q.points;
      const submitted = params.answers.find((a) => a.questionId === q.id);
      const selectedOptionIds = submitted?.selectedOptionIds || [];

      // Find correct option IDs
      const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);

      // Check if selected matches correct options exactly
      const isCorrect =
        selectedOptionIds.length === correctOptionIds.length &&
        selectedOptionIds.every((id) => correctOptionIds.includes(id));

      const pointsEarned = isCorrect ? q.points : 0;
      earnedPoints += pointsEarned;

      answerRecords.push({
        questionId: q.id,
        selectedOptionIds,
        isCorrect,
        pointsEarned,
      });
    }

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = scorePercent >= quiz.passingScorePercent;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: params.quizId,
        studentId: params.studentId,
        attemptNumber: previousAttempts + 1,
        scorePercent,
        totalPoints,
        earnedPoints,
        isPassed,
        answers: {
          create: answerRecords,
        },
      },
      include: {
        answers: true,
      },
    });

    // Re-evaluate progression
    const progression = await progressionService.getCourseProgression(quiz.module.courseId, params.studentId);

    return {
      attempt,
      scorePercent,
      isPassed,
      passingScorePercent: quiz.passingScorePercent,
      remainingAttempts: Math.max(0, maxAllowedAttempts - (previousAttempts + 1)),
      progression,
    };
  }

  async createQuiz(data: any) {
    const { questions, ...quizData } = data;
    return prisma.quiz.create({
      data: {
        ...quizData,
        questions: {
          create: (questions || []).map((q: any) => ({
            text: q.text,
            explanation: q.explanation,
            type: q.type,
            order: q.order,
            points: q.points || 1,
            options: {
              create: (q.options || []).map((opt: any) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: { include: { options: true } },
      },
    });
  }
}

export const quizService = new QuizService();
