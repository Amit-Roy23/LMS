import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import { progressionService } from './progression.service.js';
import { certificateService } from './certificate.service.js';
import { Role } from '@academy/shared';
import { logger } from '../lib/logger.js';

export class FinalAssessmentService {
  async getAssessmentForRunner(finalAssessmentId: string, studentId: string, role: Role) {
    const assessment = await prisma.finalAssessment.findUnique({
      where: { id: finalAssessmentId },
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

    if (!assessment) throw new NotFoundError('Final assessment not found');

    if (role === Role.STUDENT) {
      const progression = await progressionService.getCourseProgression(assessment.courseId, studentId);
      if (!progression.isAllModulesCompleted || !progression.mockTestPassed || !progression.finalProjectApproved) {
        throw new BadRequestError('Final assessment is locked. Complete all modules, mock test, and have your final project approved first.');
      }
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { finalAssessmentId, studentId },
      orderBy: { createdAt: 'desc' },
    });

    const isPassed = attempts.some((a) => a.isPassed || a.scorePercent >= assessment.passingScorePercent);
    const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.scorePercent)) : null;

    return {
      assessment,
      attemptsCount: attempts.length,
      maxAttempts: assessment.maxAttempts,
      isPassed,
      bestScore,
      recentAttempt: attempts[0] || null,
    };
  }

  async submitAssessment(params: {
    finalAssessmentId: string;
    studentId: string;
    role: Role;
    answers: { questionId: string; selectedOptionIds: string[] }[];
    timeSpentSeconds?: number;
  }) {
    const [assessment, previousAttempts] = await Promise.all([
      prisma.finalAssessment.findUnique({
        where: { id: params.finalAssessmentId },
        include: {
          questions: { include: { options: true } },
        },
      }),
      prisma.examAttempt.count({
        where: { finalAssessmentId: params.finalAssessmentId, studentId: params.studentId },
      }),
    ]);

    if (!assessment) throw new NotFoundError('Final assessment not found');

    // Submissions are gated exactly like the runner
    if (params.role === Role.STUDENT) {
      const gate = await progressionService.getCourseProgression(assessment.courseId, params.studentId);
      if (!gate.isAllModulesCompleted || !gate.mockTestPassed || !gate.finalProjectApproved) {
        throw new BadRequestError('Final assessment is locked. Complete all modules, mock test, and have your final project approved first.');
      }
    }

    if (previousAttempts >= assessment.maxAttempts) {
      throw new BadRequestError(`Maximum attempts (${assessment.maxAttempts}) reached for this final assessment.`);
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const breakdown: any[] = [];

    for (const q of assessment.questions) {
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
    const isPassed = scorePercent >= assessment.passingScorePercent;

    const attempt = await prisma.examAttempt.create({
      data: {
        finalAssessmentId: params.finalAssessmentId,
        studentId: params.studentId,
        attemptNumber: previousAttempts + 1,
        scorePercent,
        isPassed,
        timeSpentSeconds: params.timeSpentSeconds || 0,
        answersData: breakdown,
      },
    });

    const progression = await progressionService.getCourseProgression(assessment.courseId, params.studentId);

    // Auto issue certificate if now eligible!
    let certificate = null;
    if (isPassed && progression.certificateEligible) {
      try {
        certificate = await certificateService.issueCertificateIfEligible(assessment.courseId, params.studentId);
      } catch (e) {
        logger.error({ e }, 'Failed to issue certificate after passing final assessment');
      }
    }

    return {
      attempt,
      scorePercent,
      isPassed,
      passingScorePercent: assessment.passingScorePercent,
      breakdown,
      certificate,
      progression,
    };
  }
}

export const finalAssessmentService = new FinalAssessmentService();
