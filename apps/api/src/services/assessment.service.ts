import { prisma } from '../lib/prisma.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ProgressionLockedError,
} from '../lib/errors.js';
import {
  calculateQuizResult,
  canRetakeQuiz,
  progressionService,
} from './progression.service.js';
import {
  Role,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  AnswerReviewPolicy,
  ScoringMode,
  QuizAttemptStatus,
  QuizEventType,
  QuizStatus,
  ModuleStatus,
  CompletionSource,
} from '@academy/shared';
import { eventBus } from '../events/event-bus.js';

export interface StartAttemptResult {
  attemptId: string;
  quizId: string;
  attemptNumber: number;
  status: QuizAttemptStatus;
  startedAt: string;
  expiresAt: string | null;
  timeLimitMinutes: number | null;
  remainingSeconds: number | null;
  questionsCount: number;
  questions: {
    id: string;
    text: string;
    type: QuestionType;
    order: number;
    points: number;
    difficulty: QuestionDifficulty;
    tags: string[];
    imageUrl?: string | null;
    options: { id: string; text: string }[];
  }[];
  savedAnswers: {
    questionId: string;
    selectedOptionIds: string[];
    flagged: boolean;
  }[];
}

export class AssessmentService {
  /**
   * Evaluates student's current quiz state for a given module
   */
  async getStudentQuizInfo(moduleId: string, studentId: string, role: Role) {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: true,
        quiz: {
          include: {
            _count: {
              select: {
                questions: { where: { status: QuestionStatus.ACTIVE } },
              },
            },
          },
        },
        lessons: {
          select: { id: true, durationSeconds: true },
        },
      },
    });

    if (!module) throw new NotFoundError('Module not found');

    if (!module.quiz) {
      return {
        moduleId,
        hasQuiz: false,
        state: 'NO_QUIZ',
        message: 'No quiz required for this module.',
      };
    }

    const quiz = module.quiz;

    // Check enrollment & lesson progression
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: module.courseId },
      },
    });

    if (!enrollment || enrollment.paymentStatus !== 'PAID' || enrollment.accessStatus !== 'ACTIVE') {
      return {
        moduleId,
        quizId: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questionCount || quiz._count.questions,
        passPercentage: quiz.passPercentage,
        timeLimitMinutes: quiz.timeLimitMinutes,
        maxAttempts: quiz.maxAttempts,
        state: 'LOCKED',
        lockReason: !enrollment ? 'NOT_ENROLLED' : 'PAYMENT_PENDING',
        lockMessage: 'Active and paid enrollment is required.',
      };
    }

    // Check lesson progress
    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: {
        studentId,
        lessonId: { in: module.lessons.map((l) => l.id) },
      },
    });

    const courseSettings = (module.course.settings as any) || {};
    const threshold = courseSettings.lessonCompletionThresholdPercent || 90;
    const allLessonsDone = module.lessons.every((lesson) => {
      const prog = lessonProgresses.find((p) => p.lessonId === lesson.id);
      return prog?.completedAt || (prog?.percent || 0) >= threshold;
    });

    if (!allLessonsDone) {
      return {
        moduleId,
        quizId: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questionCount || quiz._count.questions,
        passPercentage: quiz.passPercentage,
        timeLimitMinutes: quiz.timeLimitMinutes,
        maxAttempts: quiz.maxAttempts,
        state: 'LOCKED',
        lockReason: 'LESSONS_INCOMPLETE',
        lockMessage: 'You must watch all video lessons in this module before taking the assessment.',
      };
    }

    // Fetch student's attempts
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    const activeAttempt = attempts.find((a) => a.status === QuizAttemptStatus.IN_PROGRESS);
    const passedAttempt = attempts.find((a) => a.passed || a.isPassed || a.scorePercent >= quiz.passPercentage);
    const isPassed = !!passedAttempt;
    const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage || a.scorePercent || 0)) : null;

    // Check Cooldown
    let cooldownRemainingSeconds = 0;
    if (quiz.cooldownMinutes > 0 && attempts.length > 0 && !isPassed) {
      const lastAttempt = attempts[0];
      if (lastAttempt.submittedAt) {
        const cooldownEnd = new Date(lastAttempt.submittedAt).getTime() + quiz.cooldownMinutes * 60 * 1000;
        cooldownRemainingSeconds = Math.max(0, Math.floor((cooldownEnd - Date.now()) / 1000));
      }
    }

    const maxAllowedAttempts = quiz.maxAttempts ?? 3;
    const attemptsExhausted = attempts.length >= maxAllowedAttempts && !isPassed;

    let state = 'AVAILABLE';
    if (activeAttempt) {
      state = 'IN_PROGRESS';
    } else if (isPassed && !quiz.allowRetakeAfterPass) {
      state = 'PASSED';
    } else if (attemptsExhausted) {
      state = 'ATTEMPTS_EXHAUSTED';
    } else if (cooldownRemainingSeconds > 0) {
      state = 'COOLDOWN';
    }

    return {
      moduleId,
      quizId: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questionCount: quiz.questionCount || quiz._count.questions,
      passPercentage: quiz.passPercentage,
      timeLimitMinutes: quiz.timeLimitMinutes,
      maxAttempts: quiz.maxAttempts,
      attemptsCount: attempts.length,
      attemptsLeft: Math.max(0, maxAllowedAttempts - attempts.length),
      isPassed,
      bestScore,
      recentAttempt: attempts[0]
        ? {
            id: attempts[0].id,
            attemptNumber: attempts[0].attemptNumber,
            percentage: attempts[0].percentage || attempts[0].scorePercent,
            passed: attempts[0].passed || attempts[0].isPassed,
            submittedAt: attempts[0].submittedAt,
            status: attempts[0].status,
          }
        : null,
      activeAttemptId: activeAttempt?.id || null,
      cooldownRemainingSeconds,
      state,
    };
  }

  /**
   * Starts a new attempt or resumes an existing IN_PROGRESS attempt
   */
  async startQuizAttempt(params: {
    quizId: string;
    studentId: string;
    role: Role;
    ip?: string;
    userAgent?: string;
  }): Promise<StartAttemptResult> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        module: {
          include: {
            course: true,
            lessons: true,
          },
        },
        questions: {
          where: { status: QuestionStatus.ACTIVE },
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) throw new NotFoundError('Quiz not found');

    // Progression verification
    await progressionService.assertCanAccessQuiz(params.quizId, params.studentId, params.role);

    // Check for existing IN_PROGRESS attempt
    const existingActive = await prisma.quizAttempt.findFirst({
      where: {
        quizId: params.quizId,
        studentId: params.studentId,
        status: QuizAttemptStatus.IN_PROGRESS,
      },
      include: {
        answers: true,
      },
    });

    if (existingActive) {
      // Check if expired
      if (existingActive.expiresAt && new Date(existingActive.expiresAt).getTime() < Date.now()) {
        // Auto-submit expired attempt
        await this.autoSubmitExpiredAttempt(existingActive.id);
      } else {
        // Return existing active attempt for seamless resume
        return this.formatActiveAttemptResponse(existingActive, quiz);
      }
    }

    // Check max attempts and pass state
    const previousAttempts = await prisma.quizAttempt.findMany({
      where: { quizId: params.quizId, studentId: params.studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    const isAlreadyPassed = previousAttempts.some(
      (a) => a.passed || a.isPassed || a.scorePercent >= quiz.passPercentage
    );

    if (isAlreadyPassed && !quiz.allowRetakeAfterPass) {
      throw new BadRequestError('You have already passed this quiz. Retakes after passing are not enabled.');
    }

    const maxAllowed = quiz.maxAttempts ?? 3;
    if (previousAttempts.length >= maxAllowed) {
      throw new BadRequestError(`Maximum attempts limit (${maxAllowed}) reached for this quiz.`);
    }

    // Cooldown check
    if (quiz.cooldownMinutes > 0 && previousAttempts.length > 0) {
      const last = previousAttempts[0];
      if (last.submittedAt) {
        const cooldownEnd = new Date(last.submittedAt).getTime() + quiz.cooldownMinutes * 60 * 1000;
        if (Date.now() < cooldownEnd) {
          const remainingMinutes = Math.ceil((cooldownEnd - Date.now()) / (60 * 1000));
          throw new BadRequestError(`Cooldown period active. Please wait ${remainingMinutes} minute(s) before retrying.`);
        }
      }
    }

    // Pool questions selection
    const activeQuestions = quiz.questions;
    if (activeQuestions.length === 0) {
      throw new BadRequestError('This quiz does not have any active questions in its question bank.');
    }

    const targetCount = quiz.questionCount
      ? Math.min(quiz.questionCount, activeQuestions.length)
      : activeQuestions.length;

    // Draw questions (with retry diversity logic: avoid repeating previous attempt questions if pool is large)
    const selectedQuestions = this.selectQuestionsFromPool(
      activeQuestions,
      targetCount,
      previousAttempts[0]?.questionSnapshot as any
    );

    // Shuffle questions if enabled
    if (quiz.shuffleQuestions) {
      this.shuffleArray(selectedQuestions);
    }

    // Build question snapshot
    const questionSnapshot: any[] = selectedQuestions.map((q, idx) => {
      const options = [...q.options];
      if (quiz.shuffleOptions) {
        this.shuffleArray(options);
      }

      return {
        id: q.id,
        text: q.text,
        type: q.type,
        order: idx + 1,
        points: q.points,
        marks: q.marks,
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: q.tags,
        imageUrl: q.imageUrl,
        options: options.map((opt) => ({
          id: opt.id,
          text: opt.text,
        })),
        correctOptionIds: options.filter((opt) => opt.isCorrect).map((opt) => opt.id),
      };
    });

    const now = new Date();
    const expiresAt = quiz.timeLimitMinutes
      ? new Date(now.getTime() + quiz.timeLimitMinutes * 60 * 1000)
      : null;

    const newAttempt = await prisma.quizAttempt.create({
      data: {
        quizId: params.quizId,
        studentId: params.studentId,
        attemptNumber: previousAttempts.length + 1,
        status: QuizAttemptStatus.IN_PROGRESS,
        startedAt: now,
        expiresAt,
        questionSnapshot,
        ip: params.ip,
        userAgent: params.userAgent,
      },
      include: {
        answers: true,
      },
    });

    return this.formatActiveAttemptResponse(newAttempt, quiz);
  }

  /**
   * Autosaves answers for an ongoing attempt
   */
  async saveAttemptAnswers(params: {
    attemptId: string;
    studentId: string;
    answers: { questionId: string; selectedOptionIds: string[]; flagged?: boolean }[];
  }) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: params.attemptId },
    });

    if (!attempt) throw new NotFoundError('Attempt not found');
    if (attempt.studentId !== params.studentId) throw new ForbiddenError('Access denied');

    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
      throw new BadRequestError(`Cannot save answers. Attempt is ${attempt.status}.`);
    }

    if (attempt.expiresAt && new Date(attempt.expiresAt).getTime() < Date.now()) {
      await this.autoSubmitExpiredAttempt(attempt.id);
      throw new BadRequestError('Time limit for this attempt has expired.');
    }

    const snapshot = (attempt.questionSnapshot as any[]) || [];
    const validQuestionIds = new Set(snapshot.map((q) => q.id));

    // Save/Update each answer idempotently
    for (const ans of params.answers) {
      if (!validQuestionIds.has(ans.questionId)) {
        continue;
      }

      await prisma.attemptAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: ans.questionId,
          },
        },
        create: {
          attemptId: attempt.id,
          questionId: ans.questionId,
          selectedOptionIds: ans.selectedOptionIds || [],
          flagged: Boolean(ans.flagged),
          answeredAt: new Date(),
        },
        update: {
          selectedOptionIds: ans.selectedOptionIds || [],
          flagged: ans.flagged !== undefined ? Boolean(ans.flagged) : undefined,
          answeredAt: new Date(),
        },
      });
    }

    return { success: true, savedCount: params.answers.length };
  }

  /**
   * Resumes an attempt by attemptId
   */
  async getAttemptForResume(attemptId: string, studentId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        answers: true,
      },
    });

    if (!attempt) throw new NotFoundError('Attempt not found');
    if (attempt.studentId !== studentId) throw new ForbiddenError('Access denied');

    if (attempt.status === QuizAttemptStatus.SUBMITTED) {
      return { isSubmitted: true, attemptId: attempt.id, status: attempt.status };
    }

    if (attempt.expiresAt && new Date(attempt.expiresAt).getTime() < Date.now()) {
      await this.autoSubmitExpiredAttempt(attempt.id);
      return { isSubmitted: true, attemptId: attempt.id, status: QuizAttemptStatus.SUBMITTED };
    }

    return this.formatActiveAttemptResponse(attempt, attempt.quiz);
  }

  /**
   * Submits a quiz attempt and computes grade strictly from the question snapshot
   */
  async submitQuizAttempt(params: {
    attemptId: string;
    studentId: string;
    finalAnswers?: { questionId: string; selectedOptionIds: string[]; flagged?: boolean }[];
  }) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        quiz: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt) throw new NotFoundError('Attempt not found');
    if (attempt.studentId !== params.studentId) throw new ForbiddenError('Access denied');

    // Idempotent: if already submitted, return cached result
    if (attempt.status === QuizAttemptStatus.SUBMITTED) {
      return this.getAttemptResult(attempt.id, params.studentId);
    }

    // Save final answers if provided
    if (params.finalAnswers && params.finalAnswers.length > 0) {
      await this.saveAttemptAnswers({
        attemptId: attempt.id,
        studentId: params.studentId,
        answers: params.finalAnswers,
      });
    }

    // Fetch latest answers
    const latestAnswers = await prisma.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
    });

    const snapshot = (attempt.questionSnapshot as any[]) || [];
    const quiz = attempt.quiz;
    const scoringMode = quiz.scoringMode || ScoringMode.ALL_OR_NOTHING;
    const negativeMarking = Boolean(quiz.negativeMarking);
    const negativeMarkValue = quiz.negativeMarkValue ?? 0.25;

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    // Grade each question from snapshot
    for (const q of snapshot) {
      const qPoints = q.points || 1.0;
      totalPoints += qPoints;

      const userAns = latestAnswers.find((a) => a.questionId === q.id);
      const selected = userAns?.selectedOptionIds ? (userAns.selectedOptionIds as string[]) : [];

      if (selected.length === 0) {
        unansweredCount++;
        await prisma.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: q.id } },
          create: {
            attemptId: attempt.id,
            questionId: q.id,
            selectedOptionIds: [],
            isCorrect: false,
            awardedMarks: 0,
            pointsEarned: 0,
          },
          update: {
            isCorrect: false,
            awardedMarks: 0,
            pointsEarned: 0,
          },
        });
        continue;
      }

      const correctIds: string[] = q.correctOptionIds || [];
      const isSingleChoice = q.type === QuestionType.SINGLE_CHOICE;

      let isCorrect = false;
      let questionScore = 0;

      if (isSingleChoice) {
        if (selected.length === 1 && correctIds.includes(selected[0])) {
          isCorrect = true;
          questionScore = qPoints;
          correctCount++;
        } else {
          isCorrect = false;
          questionScore = negativeMarking ? -1 * (negativeMarkValue * qPoints) : 0;
          incorrectCount++;
        }
      } else {
        // MULTIPLE CHOICE
        const correctlyChosen = selected.filter((id) => correctIds.includes(id)).length;
        const incorrectlyChosen = selected.filter((id) => !correctIds.includes(id)).length;
        const exactMatch =
          selected.length === correctIds.length && correctlyChosen === correctIds.length;

        if (scoringMode === ScoringMode.ALL_OR_NOTHING) {
          if (exactMatch) {
            isCorrect = true;
            questionScore = qPoints;
            correctCount++;
          } else {
            isCorrect = false;
            questionScore = negativeMarking ? -1 * (negativeMarkValue * qPoints) : 0;
            incorrectCount++;
          }
        } else {
          // PARTIAL scoring mode
          if (exactMatch) {
            isCorrect = true;
            questionScore = qPoints;
            correctCount++;
          } else if (correctIds.length > 0) {
            const fractionCorrect = correctlyChosen / correctIds.length;
            const penalty = incorrectlyChosen / Math.max(1, q.options.length - correctIds.length);
            const netFraction = Math.max(0, fractionCorrect - penalty);
            questionScore = Math.round(netFraction * qPoints * 100) / 100;

            if (questionScore >= qPoints * 0.99) {
              isCorrect = true;
              correctCount++;
            } else {
              isCorrect = false;
              incorrectCount++;
            }
          }
        }
      }

      earnedPoints += questionScore;

      await prisma.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: q.id } },
        create: {
          attemptId: attempt.id,
          questionId: q.id,
          selectedOptionIds: selected,
          isCorrect,
          awardedMarks: questionScore,
          pointsEarned: questionScore,
        },
        update: {
          isCorrect,
          awardedMarks: questionScore,
          pointsEarned: questionScore,
        },
      });
    }

    // Ensure totalPoints is at least 1
    totalPoints = Math.max(1, totalPoints);
    earnedPoints = Math.max(0, earnedPoints);

    // Call pure progression calculateQuizResult
    const quizResult = calculateQuizResult(
      correctCount,
      snapshot.length,
      quiz.passPercentage,
      {
        partialPointsEarned: earnedPoints,
        maxPoints: totalPoints,
      }
    );

    const now = new Date();

    // 1 DB Transaction to persist grade, update module progression and unlock next module
    const { updatedAttempt, nextModuleUnlocked, assignmentAvailable } = await prisma.$transaction(
      async (tx) => {
        const gradedAttempt = await tx.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            status: QuizAttemptStatus.SUBMITTED,
            submittedAt: now,
            score: earnedPoints,
            maxScore: totalPoints,
            percentage: quizResult.percentage,
            scorePercent: quizResult.percentage,
            totalPoints,
            earnedPoints,
            passed: quizResult.passed,
            isPassed: quizResult.passed,
          },
        });

        let nextUnlocked = false;
        let assignAvail = false;

        if (quizResult.passed) {
          // Check Module requirements
          const currentModule = quiz.module;
          const requiresAssignment = currentModule.requiresAssignment !== false;

          if (!requiresAssignment) {
            // Module is complete!
            await tx.moduleProgress.upsert({
              where: {
                studentId_moduleId: {
                  studentId: params.studentId,
                  moduleId: currentModule.id,
                },
              },
              create: {
                studentId: params.studentId,
                moduleId: currentModule.id,
                status: ModuleStatus.COMPLETED,
                completedAt: now,
              },
              update: {
                status: ModuleStatus.COMPLETED,
                completedAt: now,
              },
            });

            // Unlock next module
            const nextModule = await tx.module.findFirst({
              where: {
                courseId: currentModule.courseId,
                order: { gt: currentModule.order },
              },
              orderBy: { order: 'asc' },
            });

            if (nextModule) {
              await tx.moduleProgress.upsert({
                where: {
                  studentId_moduleId: {
                    studentId: params.studentId,
                    moduleId: nextModule.id,
                  },
                },
                create: {
                  studentId: params.studentId,
                  moduleId: nextModule.id,
                  status: ModuleStatus.AVAILABLE,
                },
                update: {
                  status: ModuleStatus.AVAILABLE,
                },
              });
              nextUnlocked = true;
            }
          } else {
            // Module requires practical assignment next
            await tx.moduleProgress.upsert({
              where: {
                studentId_moduleId: {
                  studentId: params.studentId,
                  moduleId: currentModule.id,
                },
              },
              create: {
                studentId: params.studentId,
                moduleId: currentModule.id,
                status: ModuleStatus.IN_PROGRESS,
              },
              update: {
                status: ModuleStatus.IN_PROGRESS,
              },
            });
            assignAvail = true;
          }
        }

        return {
          updatedAttempt: gradedAttempt,
          nextModuleUnlocked: nextUnlocked,
          assignmentAvailable: assignAvail,
        };
      }
    );

    // Emit Events
    eventBus.emit('quiz.submitted', {
      attemptId: attempt.id,
      quizId: quiz.id,
      studentId: params.studentId,
      score: earnedPoints,
      percentage: quizResult.percentage,
      passed: quizResult.passed,
      occurredAt: now,
    });

    if (quizResult.passed) {
      eventBus.emit('quiz.passed', {
        attemptId: attempt.id,
        quizId: quiz.id,
        studentId: params.studentId,
        percentage: quizResult.percentage,
        occurredAt: now,
      });

      if (nextModuleUnlocked) {
        eventBus.emit('module.completed', {
          moduleId: quiz.moduleId,
          studentId: params.studentId,
          courseId: quiz.module.courseId,
          occurredAt: now,
        });
      }
    } else {
      eventBus.emit('quiz.failed', {
        attemptId: attempt.id,
        quizId: quiz.id,
        studentId: params.studentId,
        percentage: quizResult.percentage,
        occurredAt: now,
      });
    }

    return this.getAttemptResult(attempt.id, params.studentId);
  }

  /**
   * Retrieves full result breakdown obeying showAnswersAfterSubmit visibility rule
   */
  async getAttemptResult(attemptId: string, studentId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            module: true,
          },
        },
        answers: true,
      },
    });

    if (!attempt) throw new NotFoundError('Attempt not found');
    if (attempt.studentId !== studentId) throw new ForbiddenError('Access denied');

    const quiz = attempt.quiz;
    const snapshot = (attempt.questionSnapshot as any[]) || [];
    const answers = attempt.answers;

    const allAttempts = await prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    const isPassed = attempt.passed || attempt.isPassed;
    const studentEverPassed = allAttempts.some((a) => a.passed || a.isPassed);
    const maxAllowed = quiz.maxAttempts ?? 3;
    const attemptsLeft = Math.max(0, maxAllowed - allAttempts.length);

    // Evaluate showAnswers policy
    const policy = quiz.showAnswersAfterSubmit || AnswerReviewPolicy.AFTER_PASS;
    let showAnswers = false;

    if (policy === AnswerReviewPolicy.NEVER) {
      showAnswers = false;
    } else if (policy === AnswerReviewPolicy.AFTER_EACH_ATTEMPT) {
      showAnswers = true;
    } else if (policy === AnswerReviewPolicy.AFTER_PASS) {
      showAnswers = studentEverPassed;
    } else if (policy === AnswerReviewPolicy.AFTER_MAX_ATTEMPTS) {
      showAnswers = studentEverPassed || attemptsLeft === 0;
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const questionsReview = snapshot.map((q) => {
      const userAns = answers.find((a) => a.questionId === q.id);
      const selected = (userAns?.selectedOptionIds as string[]) || [];
      const isCorrect = Boolean(userAns?.isCorrect);

      if (selected.length === 0) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        points: q.points || 1,
        awardedMarks: userAns?.awardedMarks ?? (isCorrect ? q.points : 0),
        isCorrect,
        selectedOptionIds: selected,
        // Only disclose correct answer IDs & explanations if policy allows
        correctOptionIds: showAnswers ? q.correctOptionIds : undefined,
        explanation: showAnswers ? q.explanation : undefined,
        options: q.options.map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: showAnswers ? (q.correctOptionIds || []).includes(opt.id) : undefined,
        })),
        relatedLessonTags: q.tags || [],
      };
    });

    const timeSpentSeconds =
      attempt.submittedAt && attempt.startedAt
        ? Math.max(
            0,
            Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
          )
        : 0;

    let cooldownEndsAt: string | null = null;
    if (quiz.cooldownMinutes > 0 && attempt.submittedAt && !isPassed) {
      cooldownEndsAt = new Date(
        new Date(attempt.submittedAt).getTime() + quiz.cooldownMinutes * 60 * 1000
      ).toISOString();
    }

    return {
      attemptId: attempt.id,
      quizId: quiz.id,
      moduleId: quiz.moduleId,
      attemptNumber: attempt.attemptNumber,
      score: attempt.score || attempt.earnedPoints,
      maxScore: attempt.maxScore || attempt.totalPoints,
      percentage: attempt.percentage || attempt.scorePercent,
      passed: isPassed,
      passPercentage: quiz.passPercentage,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() || new Date().toISOString(),
      timeSpentSeconds,
      totalQuestions: snapshot.length,
      correctAnswersCount: correctCount,
      incorrectAnswersCount: incorrectCount,
      unansweredCount,
      showAnswers,
      questionsReview,
      attemptsLeft,
      cooldownEndsAt,
      nextModuleUnlocked: isPassed && quiz.module.requiresAssignment === false,
      assignmentAvailable: isPassed && quiz.module.requiresAssignment !== false,
    };
  }

  /**
   * Logs an integrity event for an attempt
   */
  async logQuizEvent(attemptId: string, studentId: string, type: QuizEventType, metadata?: any) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.studentId !== studentId) return;

    await prisma.quizEvent.create({
      data: {
        attemptId,
        type,
        metadata: metadata || {},
      },
    });
  }

  /**
   * Auto-submits an expired attempt
   */
  private async autoSubmitExpiredAttempt(attemptId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.status !== QuizAttemptStatus.IN_PROGRESS) return;

    await this.submitQuizAttempt({
      attemptId: attempt.id,
      studentId: attempt.studentId,
    });
  }

  /**
   * Formats sanitized active attempt response (NEVER leaks correct answers or explanations)
   */
  private formatActiveAttemptResponse(attempt: any, quiz: any): StartAttemptResult {
    const snapshot = (attempt.questionSnapshot as any[]) || [];
    const now = Date.now();
    let remainingSeconds: number | null = null;

    if (attempt.expiresAt) {
      const diff = Math.floor((new Date(attempt.expiresAt).getTime() - now) / 1000);
      remainingSeconds = Math.max(0, diff);
    }

    const sanitizedQuestions = snapshot.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      order: q.order,
      points: q.points || 1,
      difficulty: q.difficulty,
      tags: q.tags || [],
      imageUrl: q.imageUrl,
      options: q.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
      })),
      // DO NOT include correctOptionIds or explanation!
    }));

    const savedAnswers = (attempt.answers || []).map((a: any) => ({
      questionId: a.questionId,
      selectedOptionIds: (a.selectedOptionIds as string[]) || [],
      flagged: Boolean(a.flagged),
    }));

    return {
      attemptId: attempt.id,
      quizId: attempt.quizId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt?.toISOString() || null,
      timeLimitMinutes: quiz.timeLimitMinutes,
      remainingSeconds,
      questionsCount: sanitizedQuestions.length,
      questions: sanitizedQuestions,
      savedAnswers,
    };
  }

  /**
   * Selects random questions from pool with retry question diversity
   */
  private selectQuestionsFromPool(
    pool: any[],
    count: number,
    previousSnapshot?: any[]
  ): any[] {
    if (pool.length <= count) {
      return [...pool];
    }

    const previousQuestionIds = new Set((previousSnapshot || []).map((q) => q.id));
    const unaskedPool = pool.filter((q) => !previousQuestionIds.has(q.id));

    if (unaskedPool.length >= count) {
      this.shuffleArray(unaskedPool);
      return unaskedPool.slice(0, count);
    }

    // Mix unasked with shuffled previous
    this.shuffleArray(unaskedPool);
    const needed = count - unaskedPool.length;
    const previouslyAsked = pool.filter((q) => previousQuestionIds.has(q.id));
    this.shuffleArray(previouslyAsked);

    return [...unaskedPool, ...previouslyAsked.slice(0, needed)];
  }

  private shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  /**
   * Returns attempt history for student on a module
   */
  async getStudentQuizHistory(moduleId: string, studentId: string) {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { quiz: true },
    });

    if (!module || !module.quiz) {
      return [];
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: module.quiz.id,
        studentId,
      },
      orderBy: { attemptNumber: 'desc' },
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        maxScore: true,
        percentage: true,
        passed: true,
      },
    });

    return attempts.map((a) => ({
      ...a,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() || null,
      passPercentage: module.quiz!.passPercentage,
    }));
  }

  /**
   * Helper: verify instructor ownership or admin permissions for a quiz
   */
  async assertQuizAccess(quizId: string, instructorId?: string, role?: Role) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!quiz) throw new NotFoundError('Quiz not found');

    if (role === Role.INSTRUCTOR && instructorId) {
      if (quiz.module.course.instructorId !== instructorId) {
        throw new ForbiddenError('You do not have permission to manage this quiz.');
      }
    }

    return quiz;
  }

  /**
   * Get Admin Quiz Config and publishing checklist
   */
  async getAdminQuizConfig(quizIdOrModuleId: string, instructorId?: string, role?: Role) {
    const quiz = await prisma.quiz.findFirst({
      where: {
        OR: [{ id: quizIdOrModuleId }, { moduleId: quizIdOrModuleId }],
      },
      include: {
        module: {
          include: {
            course: { select: { id: true, title: true, instructorId: true } },
          },
        },
        questions: {
          include: { options: true },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
    });

    if (!quiz) throw new NotFoundError('Quiz not found');

    if (role === Role.INSTRUCTOR && instructorId) {
      if (quiz.module.course.instructorId !== instructorId) {
        throw new ForbiddenError('You do not have permission to manage this quiz.');
      }
    }

    const activeQuestions = quiz.questions.filter((q) => q.status === QuestionStatus.ACTIVE);
    const activeCount = activeQuestions.length;
    const requiredCount = quiz.questionCount || activeCount;

    // Check checklist issues
    const issues: string[] = [];
    if (activeCount === 0) {
      issues.push('Question bank has no active questions.');
    }
    if (quiz.questionCount && quiz.questionCount > activeCount) {
      issues.push(`Target question count (${quiz.questionCount}) exceeds active questions available (${activeCount}).`);
    }

    for (const q of activeQuestions) {
      const correctOpts = q.options.filter((o) => o.isCorrect);
      if (correctOpts.length === 0) {
        issues.push(`Question "${q.text.substring(0, 30)}..." has no correct answer marked.`);
      }
      if (q.type === QuestionType.SINGLE_CHOICE && correctOpts.length > 1) {
        issues.push(`Single-choice question "${q.text.substring(0, 30)}..." has multiple correct answers.`);
      }
      if (q.options.length < 2) {
        issues.push(`Question "${q.text.substring(0, 30)}..." has fewer than 2 options.`);
      }
    }

    const canPublish = issues.length === 0 && activeCount >= (quiz.questionCount || 1);

    return {
      quiz: {
        id: quiz.id,
        moduleId: quiz.moduleId,
        moduleTitle: quiz.module.title,
        courseId: quiz.module.course.id,
        courseTitle: quiz.module.course.title,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questionCount,
        passPercentage: quiz.passPercentage,
        maxAttempts: quiz.maxAttempts,
        cooldownMinutes: quiz.cooldownMinutes,
        timeLimitMinutes: quiz.timeLimitMinutes,
        shuffleQuestions: quiz.shuffleQuestions,
        shuffleOptions: quiz.shuffleOptions,
        showAnswersAfterSubmit: quiz.showAnswersAfterSubmit,
        scoringMode: quiz.scoringMode,
        negativeMarking: quiz.negativeMarking,
        negativeMarkValue: quiz.negativeMarkValue,
        status: quiz.status,
        allowRetakeAfterPass: quiz.allowRetakeAfterPass,
        activeQuestionsCount: activeCount,
        totalQuestionsCount: quiz._count.questions,
        totalAttemptsCount: quiz._count.attempts,
      },
      publishingChecklist: {
        canPublish,
        activeCount,
        requiredCount,
        issues,
      },
    };
  }

  /**
   * Update Quiz Settings
   */
  async updateQuizSettings(quizId: string, data: any, instructorId?: string, role?: Role) {
    const quiz = await this.assertQuizAccess(quizId, instructorId, role);

    const activeCount = await prisma.question.count({
      where: { quizId: quiz.id, status: QuestionStatus.ACTIVE },
    });

    if (data.questionCount && data.questionCount > activeCount && activeCount > 0) {
      // Allow saving with warning or constraint
    }

    const updated = await prisma.quiz.update({
      where: { id: quiz.id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        questionCount: data.questionCount !== undefined ? data.questionCount : undefined,
        passPercentage: data.passPercentage !== undefined ? data.passPercentage : undefined,
        passingScorePercent: data.passPercentage !== undefined ? data.passPercentage : undefined,
        maxAttempts: data.maxAttempts !== undefined ? data.maxAttempts : undefined,
        cooldownMinutes: data.cooldownMinutes !== undefined ? data.cooldownMinutes : undefined,
        timeLimitMinutes: data.timeLimitMinutes !== undefined ? data.timeLimitMinutes : undefined,
        shuffleQuestions: data.shuffleQuestions !== undefined ? Boolean(data.shuffleQuestions) : undefined,
        shuffleOptions: data.shuffleOptions !== undefined ? Boolean(data.shuffleOptions) : undefined,
        showAnswersAfterSubmit: data.showAnswersAfterSubmit !== undefined ? data.showAnswersAfterSubmit : undefined,
        scoringMode: data.scoringMode !== undefined ? data.scoringMode : undefined,
        negativeMarking: data.negativeMarking !== undefined ? Boolean(data.negativeMarking) : undefined,
        negativeMarkValue: data.negativeMarkValue !== undefined ? Number(data.negativeMarkValue) : undefined,
        status: data.status !== undefined ? data.status : undefined,
        allowRetakeAfterPass: data.allowRetakeAfterPass !== undefined ? Boolean(data.allowRetakeAfterPass) : undefined,
      },
    });

    return updated;
  }

  /**
   * Publish Quiz after validating checklist
   */
  async publishQuiz(quizId: string, instructorId?: string, role?: Role) {
    const config = await this.getAdminQuizConfig(quizId, instructorId, role);
    if (!config.publishingChecklist.canPublish) {
      throw new BadRequestError(
        `Cannot publish quiz due to the following issues:\n- ${config.publishingChecklist.issues.join('\n- ')}`
      );
    }

    return prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.PUBLISHED },
    });
  }

  /**
   * List Questions for Question Bank with filters
   */
  async listQuestions(
    quizId: string,
    filters: { difficulty?: QuestionDifficulty; status?: QuestionStatus; tag?: string; search?: string },
    instructorId?: string,
    role?: Role
  ) {
    await this.assertQuizAccess(quizId, instructorId, role);

    const where: any = { quizId };

    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.status) where.status = filters.status;
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.search) {
      where.text = { contains: filters.search, mode: 'insensitive' };
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { createdAt: 'asc' } },
        _count: { select: { attemptAnswers: true } },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return questions.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      text: q.text,
      explanation: q.explanation,
      type: q.type,
      order: q.order,
      points: q.points,
      difficulty: q.difficulty,
      tags: q.tags,
      imageUrl: q.imageUrl,
      status: q.status,
      version: q.version,
      usageCount: q._count.attemptAnswers,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));
  }

  /**
   * Create Question with Options
   */
  async createQuestion(quizId: string, data: any, instructorId?: string, role?: Role) {
    await this.assertQuizAccess(quizId, instructorId, role);

    if (!data.options || data.options.length < 2) {
      throw new BadRequestError('Questions must have at least 2 options.');
    }

    const correctCount = data.options.filter((o: any) => o.isCorrect).length;
    if (correctCount === 0) {
      throw new BadRequestError('At least one option must be marked as correct.');
    }

    if (data.type === QuestionType.SINGLE_CHOICE && correctCount !== 1) {
      throw new BadRequestError('Single-choice questions must have exactly one correct option.');
    }

    const questionCount = await prisma.question.count({ where: { quizId } });

    const question = await prisma.question.create({
      data: {
        quizId,
        text: data.text,
        explanation: data.explanation || null,
        type: data.type || QuestionType.SINGLE_CHOICE,
        order: data.order || questionCount + 1,
        points: data.points || 1.0,
        marks: data.points || 1.0,
        difficulty: data.difficulty || QuestionDifficulty.MEDIUM,
        tags: data.tags || [],
        imageUrl: data.imageUrl || null,
        status: data.status || QuestionStatus.ACTIVE,
        version: 1,
        options: {
          create: data.options.map((opt: any) => ({
            text: opt.text,
            isCorrect: Boolean(opt.isCorrect),
          })),
        },
      },
      include: {
        options: true,
      },
    });

    return question;
  }

  /**
   * Update Question (handles versioning if attempts already exist)
   */
  async updateQuestion(questionId: string, data: any, instructorId?: string, role?: Role) {
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: { include: { module: { include: { course: true } } } },
        options: true,
        _count: { select: { attemptAnswers: true } },
      },
    });

    if (!existing) throw new NotFoundError('Question not found');
    await this.assertQuizAccess(existing.quizId, instructorId, role);

    if (data.options) {
      if (data.options.length < 2) {
        throw new BadRequestError('Questions must have at least 2 options.');
      }
      const correctCount = data.options.filter((o: any) => o.isCorrect).length;
      if (correctCount === 0) {
        throw new BadRequestError('At least one option must be marked as correct.');
      }
      const effectiveType = data.type || existing.type;
      if (effectiveType === QuestionType.SINGLE_CHOICE && correctCount !== 1) {
        throw new BadRequestError('Single-choice questions must have exactly one correct option.');
      }
    }

    // Version increment on edit to keep data audit transparent
    const nextVersion = existing.version + 1;

    // Use transaction to update question and recreate options
    const updated = await prisma.$transaction(async (tx) => {
      if (data.options) {
        await tx.option.deleteMany({ where: { questionId } });
        await tx.option.createMany({
          data: data.options.map((opt: any) => ({
            questionId,
            text: opt.text,
            isCorrect: Boolean(opt.isCorrect),
          })),
        });
      }

      return tx.question.update({
        where: { id: questionId },
        data: {
          text: data.text !== undefined ? data.text : undefined,
          explanation: data.explanation !== undefined ? data.explanation : undefined,
          type: data.type !== undefined ? data.type : undefined,
          order: data.order !== undefined ? data.order : undefined,
          points: data.points !== undefined ? data.points : undefined,
          marks: data.points !== undefined ? data.points : undefined,
          difficulty: data.difficulty !== undefined ? data.difficulty : undefined,
          tags: data.tags !== undefined ? data.tags : undefined,
          imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
          status: data.status !== undefined ? data.status : undefined,
          version: nextVersion,
        },
        include: {
          options: true,
        },
      });
    });

    return updated;
  }

  /**
   * Delete or Archive Question
   */
  async deleteQuestion(questionId: string, permanent = false, instructorId?: string, role?: Role) {
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        _count: { select: { attemptAnswers: true } },
      },
    });

    if (!existing) throw new NotFoundError('Question not found');
    await this.assertQuizAccess(existing.quizId, instructorId, role);

    if (permanent && existing._count.attemptAnswers === 0) {
      await prisma.question.delete({ where: { id: questionId } });
      return { success: true, action: 'DELETED' };
    }

    // Otherwise archive to safeguard attempt relations
    await prisma.question.update({
      where: { id: questionId },
      data: { status: QuestionStatus.ARCHIVED },
    });
    return { success: true, action: 'ARCHIVED' };
  }

  /**
   * Duplicate Question
   */
  async duplicateQuestion(questionId: string, instructorId?: string, role?: Role) {
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!existing) throw new NotFoundError('Question not found');
    await this.assertQuizAccess(existing.quizId, instructorId, role);

    const questionCount = await prisma.question.count({ where: { quizId: existing.quizId } });

    const cloned = await prisma.question.create({
      data: {
        quizId: existing.quizId,
        text: `${existing.text} (Copy)`,
        explanation: existing.explanation,
        type: existing.type,
        order: questionCount + 1,
        points: existing.points,
        marks: existing.marks,
        difficulty: existing.difficulty,
        tags: existing.tags,
        imageUrl: existing.imageUrl,
        status: QuestionStatus.ACTIVE,
        version: 1,
        options: {
          create: existing.options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: { options: true },
    });

    return cloned;
  }

  /**
   * Bulk Question Action
   */
  async bulkQuestionAction(
    quizId: string,
    action: 'ACTIVATE' | 'ARCHIVE' | 'DELETE',
    questionIds: string[],
    instructorId?: string,
    role?: Role
  ) {
    await this.assertQuizAccess(quizId, instructorId, role);

    if (action === 'ACTIVATE') {
      await prisma.question.updateMany({
        where: { quizId, id: { in: questionIds } },
        data: { status: QuestionStatus.ACTIVE },
      });
    } else if (action === 'ARCHIVE') {
      await prisma.question.updateMany({
        where: { quizId, id: { in: questionIds } },
        data: { status: QuestionStatus.ARCHIVED },
      });
    } else if (action === 'DELETE') {
      // Archive questions that have attempts, delete ones without
      const questionsWithAttempts = await prisma.question.findMany({
        where: { quizId, id: { in: questionIds }, attemptAnswers: { some: {} } },
        select: { id: true },
      });
      const withAttemptIds = new Set(questionsWithAttempts.map((q) => q.id));
      const pureDeleteIds = questionIds.filter((id) => !withAttemptIds.has(id));

      if (pureDeleteIds.length > 0) {
        await prisma.question.deleteMany({ where: { id: { in: pureDeleteIds } } });
      }
      if (withAttemptIds.size > 0) {
        await prisma.question.updateMany({
          where: { id: { in: Array.from(withAttemptIds) } },
          data: { status: QuestionStatus.ARCHIVED },
        });
      }
    }

    return { success: true, count: questionIds.length };
  }

  /**
   * CSV Import for Question Bank
   */
  async importQuestionsFromCsv(
    quizId: string,
    csvContent: string,
    dryRun = false,
    instructorId?: string,
    role?: Role
  ) {
    await this.assertQuizAccess(quizId, instructorId, role);

    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      throw new BadRequestError('CSV file is empty or missing data rows.');
    }

    // Header parse
    const headerLine = lines[0];
    const headers = this.parseCsvRow(headerLine).map((h) => h.toLowerCase().trim());

    const requiredHeaders = ['question', 'type', 'option1', 'option2', 'correct'];
    for (const req of requiredHeaders) {
      if (!headers.includes(req)) {
        throw new BadRequestError(`Missing required CSV column header: "${req}"`);
      }
    }

    const questionIdx = headers.indexOf('question');
    const typeIdx = headers.indexOf('type');
    const correctIdx = headers.indexOf('correct');
    const explanationIdx = headers.indexOf('explanation');
    const difficultyIdx = headers.indexOf('difficulty');
    const tagsIdx = headers.indexOf('tags');

    // Find option indices (option1..option6)
    const optionIndices: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const idx = headers.indexOf(`option${i}`);
      if (idx !== -1) optionIndices.push(idx);
    }

    const errors: { row: number; field: string; message: string }[] = [];
    const validQuestions: any[] = [];

    for (let r = 1; r < lines.length; r++) {
      const rowNum = r + 1;
      const row = this.parseCsvRow(lines[r]);

      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const questionText = row[questionIdx]?.trim();
      if (!questionText) {
        errors.push({ row: rowNum, field: 'question', message: 'Question text is required.' });
        continue;
      }

      const rawType = (row[typeIdx] || '').toUpperCase().trim();
      let type: QuestionType = QuestionType.SINGLE_CHOICE;
      if (rawType.includes('MULTIPLE') || rawType === 'MULTI' || rawType === 'CHECKBOX') {
        type = QuestionType.MULTIPLE_CHOICE;
      } else if (rawType.includes('SINGLE') || rawType === 'RADIO') {
        type = QuestionType.SINGLE_CHOICE;
      }

      // Collect options
      const options: { text: string; isCorrect: boolean }[] = [];
      const rawCorrect = (row[correctIdx] || '').toUpperCase().trim();

      // Normalize correct indicators: e.g. "1,3" or "A,C" or "1"
      const correctIndices = new Set<number>();
      if (rawCorrect) {
        const parts = rawCorrect.split(/[,;\s]+/).filter(Boolean);
        for (const part of parts) {
          const num = parseInt(part, 10);
          if (!isNaN(num) && num >= 1 && num <= 6) {
            correctIndices.add(num - 1);
          } else if (/^[A-F]$/i.test(part)) {
            const charCode = part.toUpperCase().charCodeAt(0) - 65; // A=0, B=1...
            correctIndices.add(charCode);
          }
        }
      }

      for (let i = 0; i < optionIndices.length; i++) {
        const optText = row[optionIndices[i]]?.trim();
        if (optText) {
          options.push({
            text: optText,
            isCorrect: correctIndices.has(i),
          });
        }
      }

      if (options.length < 2) {
        errors.push({
          row: rowNum,
          field: 'options',
          message: 'At least 2 non-empty options are required.',
        });
        continue;
      }

      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        errors.push({
          row: rowNum,
          field: 'correct',
          message: `No valid correct option marked. Specified: "${rawCorrect}".`,
        });
        continue;
      }

      if (type === QuestionType.SINGLE_CHOICE && correctCount > 1) {
        errors.push({
          row: rowNum,
          field: 'correct',
          message: `Single choice question cannot have ${correctCount} correct options.`,
        });
        continue;
      }

      // Explanation
      const explanation = explanationIdx !== -1 ? row[explanationIdx]?.trim() || null : null;

      // Difficulty
      let difficulty: QuestionDifficulty = QuestionDifficulty.MEDIUM;
      if (difficultyIdx !== -1) {
        const diffRaw = (row[difficultyIdx] || '').toUpperCase().trim();
        if (diffRaw === 'EASY') difficulty = QuestionDifficulty.EASY;
        else if (diffRaw === 'HARD') difficulty = QuestionDifficulty.HARD;
      }

      // Tags
      const tags =
        tagsIdx !== -1 && row[tagsIdx]
          ? row[tagsIdx]
              .split(/[,;]+/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [];

      validQuestions.push({
        text: questionText,
        type,
        explanation,
        difficulty,
        tags,
        options,
      });
    }

    if (dryRun) {
      return {
        dryRun: true,
        valid: errors.length === 0,
        totalRows: lines.length - 1,
        validCount: validQuestions.length,
        errorCount: errors.length,
        errors,
        preview: validQuestions.slice(0, 5),
      };
    }

    if (errors.length > 0 && validQuestions.length === 0) {
      throw new BadRequestError(`CSV Validation failed with ${errors.length} error(s). First error: [Row ${errors[0].row}] ${errors[0].message}`);
    }

    // Insert valid questions
    const currentCount = await prisma.question.count({ where: { quizId } });
    let createdCount = 0;

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      await prisma.question.create({
        data: {
          quizId,
          text: q.text,
          explanation: q.explanation,
          type: q.type,
          order: currentCount + i + 1,
          points: 1.0,
          marks: 1.0,
          difficulty: q.difficulty,
          tags: q.tags,
          status: QuestionStatus.ACTIVE,
          version: 1,
          options: {
            create: q.options.map((opt: any) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
            })),
          },
        },
      });
      createdCount++;
    }

    return {
      dryRun: false,
      importedCount: createdCount,
      errorCount: errors.length,
      errors,
    };
  }

  /**
   * Export Question Bank to CSV
   */
  async exportQuestionsToCsv(quizId: string, instructorId?: string, role?: Role) {
    await this.assertQuizAccess(quizId, instructorId, role);

    const questions = await prisma.question.findMany({
      where: { quizId },
      include: { options: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const headers = [
      'question',
      'type',
      'option1',
      'option2',
      'option3',
      'option4',
      'option5',
      'option6',
      'correct',
      'explanation',
      'difficulty',
      'tags',
    ];

    const rows = questions.map((q) => {
      const opts = q.options.slice(0, 6);
      const correctIndices: number[] = [];
      const optTexts: string[] = ['', '', '', '', '', ''];

      opts.forEach((opt, idx) => {
        optTexts[idx] = opt.text;
        if (opt.isCorrect) correctIndices.push(idx + 1);
      });

      return [
        this.escapeCsv(q.text),
        q.type,
        ...optTexts.map((t) => this.escapeCsv(t)),
        correctIndices.join(','),
        this.escapeCsv(q.explanation || ''),
        q.difficulty,
        this.escapeCsv(q.tags.join(', ')),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate downloadable CSV template
   */
  generateCsvTemplate() {
    const headers = [
      'question',
      'type',
      'option1',
      'option2',
      'option3',
      'option4',
      'option5',
      'option6',
      'correct',
      'explanation',
      'difficulty',
      'tags',
    ];

    const samples = [
      [
        '"Which hook is used for managing local component state in React?"',
        'SINGLE_CHOICE',
        '"useState"',
        '"useEffect"',
        '"useContext"',
        '"useReducer"',
        '""',
        '""',
        '1',
        '"useState declares a state variable directly inside functional components."',
        'EASY',
        '"react,hooks,state"',
      ].join(','),
      [
        '"Select all valid HTTP methods used in RESTful APIs (Select all that apply):"',
        'MULTIPLE_CHOICE',
        '"GET"',
        '"FETCH"',
        '"POST"',
        '"DELETE"',
        '""',
        '""',
        '1,3,4',
        '"GET, POST, PUT, DELETE, and PATCH are standard HTTP methods. FETCH is a browser API."',
        'MEDIUM',
        '"http,rest,api"',
      ].join(','),
    ];

    return [headers.join(','), ...samples].join('\n');
  }

  /**
   * Admin: List Quiz Attempts with filters & pagination
   */
  async getQuizAttemptsForAdmin(
    quizId: string,
    filters: {
      batchId?: string;
      studentId?: string;
      status?: QuizAttemptStatus;
      passed?: boolean;
      page?: number;
      limit?: number;
    },
    instructorId?: string,
    role?: Role
  ) {
    await this.assertQuizAccess(quizId, instructorId, role);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { quizId };

    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.status) where.status = filters.status;
    if (filters.passed !== undefined) where.passed = filters.passed;

    if (filters.batchId) {
      where.student = {
        enrollments: {
          some: {
            batchId: filters.batchId,
          },
        },
      };
    }

    const [attempts, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              enrollments: {
                select: { batch: { select: { id: true, name: true } } },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.quizAttempt.count({ where }),
    ]);

    const items = attempts.map((a) => {
      const timeSpentSeconds =
        a.submittedAt && a.startedAt
          ? Math.max(0, Math.floor((new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 1000))
          : null;

      return {
        id: a.id,
        attemptNumber: a.attemptNumber,
        status: a.status,
        score: a.score || a.earnedPoints,
        maxScore: a.maxScore || a.totalPoints,
        percentage: a.percentage || a.scorePercent,
        passed: a.passed || a.isPassed,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt?.toISOString() || null,
        timeSpentSeconds,
        student: {
          id: a.student.id,
          name: a.student.name,
          email: a.student.email,
          avatar: a.student.avatar,
          batchName: a.student.enrollments[0]?.batch?.name || null,
        },
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Student Assessment History Overview
   */
  async getStudentAssessmentsForAdmin(studentId: string, role: Role, instructorId?: string) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                modules: {
                  orderBy: { order: 'asc' },
                  include: {
                    quiz: true,
                    moduleProgress: { where: { studentId } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) throw new NotFoundError('Student not found');

    const modulesData: any[] = [];

    for (const enr of student.enrollments) {
      if (role === Role.INSTRUCTOR && instructorId && enr.course.instructorId !== instructorId) {
        continue;
      }

      for (const mod of enr.course.modules) {
        if (!mod.quiz) continue;

        const attempts = await prisma.quizAttempt.findMany({
          where: { quizId: mod.quiz.id, studentId },
          orderBy: { attemptNumber: 'desc' },
        });

        const passed = attempts.some((a) => a.passed || a.isPassed);
        const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage || a.scorePercent)) : null;

        modulesData.push({
          courseId: enr.course.id,
          courseTitle: enr.course.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          quizId: mod.quiz.id,
          quizTitle: mod.quiz.title,
          passPercentage: mod.quiz.passPercentage,
          attemptsCount: attempts.length,
          bestScore,
          passed,
          lastAttemptDate: attempts[0]?.submittedAt?.toISOString() || null,
          moduleProgressStatus: mod.moduleProgress[0]?.status || 'LOCKED',
        });
      }
    }

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      assessments: modulesData,
    };
  }

  /**
   * Admin: Detailed Quiz Analytics
   */
  async getQuizAnalytics(quizId: string, instructorId?: string, role?: Role) {
    const quiz = await this.assertQuizAccess(quizId, instructorId, role);

    const [attempts, questions] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { quizId: quiz.id, status: QuizAttemptStatus.SUBMITTED },
        include: { answers: true },
      }),
      prisma.question.findMany({
        where: { quizId: quiz.id, status: QuestionStatus.ACTIVE },
        include: { options: true },
      }),
    ]);

    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a) => a.passed || a.isPassed).length;
    const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 10000) / 100 : 0;

    const avgScore =
      totalAttempts > 0
        ? Math.round(
            (attempts.reduce((acc, a) => acc + (a.percentage || a.scorePercent), 0) / totalAttempts) * 100
          ) / 100
        : 0;

    const validDurations = attempts
      .filter((a) => a.submittedAt && a.startedAt)
      .map((a) => (new Date(a.submittedAt!).getTime() - new Date(a.startedAt).getTime()) / 1000);

    const avgTimeSeconds =
      validDurations.length > 0
        ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
        : 0;

    // Per-question difficulty index & miss rate
    const questionAnalytics = questions.map((q) => {
      let timesEncountered = 0;
      let timesCorrect = 0;

      for (const attempt of attempts) {
        const ans = attempt.answers.find((a) => a.questionId === q.id);
        if (ans) {
          timesEncountered++;
          if (ans.isCorrect) {
            timesCorrect++;
          }
        }
      }

      const correctPercentage =
        timesEncountered > 0 ? Math.round((timesCorrect / timesEncountered) * 10000) / 100 : null;

      return {
        questionId: q.id,
        text: q.text,
        difficulty: q.difficulty,
        type: q.type,
        tags: q.tags,
        timesEncountered,
        timesCorrect,
        correctPercentage,
      };
    });

    const mostMissedQuestions = [...questionAnalytics]
      .filter((q) => q.timesEncountered >= 1 && q.correctPercentage !== null)
      .sort((a, b) => (a.correctPercentage ?? 100) - (b.correctPercentage ?? 100))
      .slice(0, 5);

    return {
      quizId: quiz.id,
      title: quiz.title,
      totalAttempts,
      passedAttempts,
      passRate,
      averageScorePercent: avgScore,
      averageTimeSpentSeconds: avgTimeSeconds,
      questionsCount: questions.length,
      questionAnalytics,
      mostMissedQuestions,
    };
  }

  /**
   * Admin Override: Reset attempts for a student
   */
  async adminResetStudentAttempts(
    quizId: string,
    studentId: string,
    adminUserId: string,
    reason = 'Admin override'
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { module: true },
    });
    if (!quiz) throw new NotFoundError('Quiz not found');

    // Invalidate or archive student's current attempts
    await prisma.quizAttempt.updateMany({
      where: { quizId, studentId, status: QuizAttemptStatus.IN_PROGRESS },
      data: { status: QuizAttemptStatus.ABANDONED },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'QUIZ_ATTEMPTS_RESET',
        entityType: 'QuizAttempt',
        entityId: quizId,
        details: {
          quizId,
          studentId,
          moduleId: quiz.moduleId,
          reason,
        },
      },
    });

    return { success: true, message: 'Student attempts successfully reset.' };
  }

  /**
   * Admin Override: Manually mark module quiz as passed
   */
  async adminPassModuleQuiz(
    moduleId: string,
    studentId: string,
    adminUserId: string,
    reason: string
  ) {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true, quiz: true },
    });

    if (!module) throw new NotFoundError('Module not found');

    const now = new Date();

    // 1 DB Transaction to mark complete and unlock next module
    const result = await prisma.$transaction(async (tx) => {
      const requiresAssignment = module.requiresAssignment !== false;

      const modProgress = await tx.moduleProgress.upsert({
        where: { studentId_moduleId: { studentId, moduleId } },
        create: {
          studentId,
          moduleId,
          status: requiresAssignment ? ModuleStatus.IN_PROGRESS : ModuleStatus.COMPLETED,
          completedAt: requiresAssignment ? null : now,
        },
        update: {
          status: requiresAssignment ? ModuleStatus.IN_PROGRESS : ModuleStatus.COMPLETED,
          completedAt: requiresAssignment ? null : now,
        },
      });

      let nextUnlocked = false;
      if (!requiresAssignment) {
        const nextModule = await tx.module.findFirst({
          where: { courseId: module.courseId, order: { gt: module.order } },
          orderBy: { order: 'asc' },
        });

        if (nextModule) {
          await tx.moduleProgress.upsert({
            where: { studentId_moduleId: { studentId, moduleId: nextModule.id } },
            create: {
              studentId,
              moduleId: nextModule.id,
              status: ModuleStatus.AVAILABLE,
            },
            update: {
              status: ModuleStatus.AVAILABLE,
            },
          });
          nextUnlocked = true;
        }
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'QUIZ_OVERRIDE_PASS',
          entityType: 'ModuleProgress',
          entityId: modProgress.id,
          details: {
            moduleId,
            studentId,
            courseId: module.courseId,
            reason,
            completionSource: CompletionSource.ADMIN,
          },
        },
      });

      return { modProgress, nextUnlocked };
    });

    return {
      success: true,
      message: 'Module quiz marked as passed by admin override.',
      ...result,
    };
  }

  /**
   * Admin Override: Invalidate an attempt
   */
  async adminInvalidateAttempt(attemptId: string, adminUserId: string, reason: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundError('Attempt not found');

    await prisma.$transaction([
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: QuizAttemptStatus.ABANDONED,
          passed: false,
          isPassed: false,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'QUIZ_ATTEMPT_INVALIDATED',
          entityType: 'QuizAttempt',
          entityId: attemptId,
          details: {
            attemptId,
            studentId: attempt.studentId,
            quizId: attempt.quizId,
            reason,
          },
        },
      }),
    ]);

    return { success: true, message: 'Attempt invalidated.' };
  }

  // Helper for CSV row parsing
  private parseCsvRow(text: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private escapeCsv(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }
}

export const assessmentService = new AssessmentService();

