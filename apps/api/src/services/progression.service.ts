import {
  ModuleStatus,
  SubmissionStatus,
  CourseSettings,
  Role,
} from '@academy/shared';
import { prisma } from '../lib/prisma.js';
import { ProgressionLockedError, NotFoundError } from '../lib/errors.js';

export interface PureModuleInput {
  id: string;
  order: number;
  requiresQuiz?: boolean;
  requiresAssignment?: boolean;
  lessons: { id: string; order: number; durationSeconds: number }[];
  quiz?: {
    id: string;
    passingScorePercent: number;
    maxAttempts: number | null;
  } | null;
  assignment?: {
    id: string;
    maxScore: number;
  } | null;
}

export interface PureProgressData {
  lessonProgressMap: Map<string, { watchedSeconds: number; percent: number; completedAt: Date | null }>;
  quizAttempts: { scorePercent: number; isPassed: boolean; attemptNumber: number }[];
  assignmentSubmissions: { status: SubmissionStatus; grade?: number | null }[];
}

export interface QuizResultCalculation {
  percentage: number;
  passed: boolean;
  correct: number;
  total: number;
}

/**
 * Pure function: Calculates score percentage and pass/fail status for a quiz attempt.
 * R5/R6: If student scores at least the passPercentage (default 70%), they pass.
 * e.g. 14 of 20 = 70.0% (PASS); 13 of 20 = 65.0% (FAIL).
 * Supports ALL_CORRECT (default) or PARTIAL scoring.
 */
export function calculateQuizResult(
  correct: number,
  total: number,
  passPercentage = 70,
  options?: {
    scoringMode?: 'ALL_CORRECT' | 'PARTIAL';
    partialPointsEarned?: number;
    maxPoints?: number;
  }
): QuizResultCalculation {
  if (total <= 0) {
    return {
      percentage: 0,
      passed: false,
      correct: 0,
      total: 0,
    };
  }

  let percentage: number;
  if (options?.scoringMode === 'PARTIAL' && options.maxPoints && options.maxPoints > 0) {
    const earned = Math.max(0, options.partialPointsEarned ?? 0);
    percentage = Math.round((earned / options.maxPoints) * 10000) / 100;
  } else {
    percentage = Math.round((Math.max(0, correct) / total) * 10000) / 100;
  }

  const passed = percentage >= passPercentage;

  return {
    percentage,
    passed,
    correct: Math.max(0, correct),
    total,
  };
}

/**
 * Pure function: Checks if a retake is allowed given attempt count and maxAttempts limit
 */
export function canRetakeQuiz(
  attemptsCount: number,
  maxAttempts: number | null | undefined
): boolean {
  if (maxAttempts === null || maxAttempts === undefined || maxAttempts <= 0) {
    return true;
  }
  return attemptsCount < maxAttempts;
}

/**
 * Pure function: Determines if an individual lesson is complete
 */
export function isLessonCompleted(
  progress: { watchedSeconds?: number; percent?: number; completedAt?: Date | null } | undefined | null,
  thresholdPercent = 90
): boolean {
  if (!progress) return false;
  if (progress.completedAt) return true;
  return (progress.percent || 0) >= thresholdPercent;
}

/**
 * Pure function: Checks if student can access a specific lesson in a module
 */
export function canAccessLesson(params: {
  isModuleUnlocked: boolean;
  lessonIndex: number;
  orderedLessons: { id: string }[];
  lessonProgressMap: Map<string, { percent: number; completedAt: Date | null }>;
  sequentialLock: boolean;
  thresholdPercent?: number;
}): boolean {
  if (!params.isModuleUnlocked) return false;
  if (!params.sequentialLock || params.lessonIndex === 0) return true;

  const threshold = params.thresholdPercent ?? 90;
  // All previous lessons in the module must be completed
  for (let i = 0; i < params.lessonIndex; i++) {
    const prevLessonId = params.orderedLessons[i].id;
    const prevProgress = params.lessonProgressMap.get(prevLessonId);
    if (!isLessonCompleted(prevProgress, threshold)) {
      return false;
    }
  }
  return true;
}

/**
 * Pure function: Checks if student can access the module quiz
 * R5: Quiz is taken AFTER watching all module videos.
 */
export function canTakeQuiz(params: {
  isModuleUnlocked: boolean;
  moduleLessons: { id: string }[];
  lessonProgressMap: Map<string, { percent: number; completedAt: Date | null }>;
  thresholdPercent?: number;
  requiresQuiz?: boolean;
  attemptsCount?: number;
  maxAttempts?: number | null;
}): boolean {
  if (!params.isModuleUnlocked) return false;
  if (params.requiresQuiz === false) return false;

  // Max attempts check
  if (
    params.maxAttempts !== undefined &&
    params.maxAttempts !== null &&
    params.maxAttempts > 0 &&
    (params.attemptsCount ?? 0) >= params.maxAttempts
  ) {
    return false;
  }

  if (params.moduleLessons.length === 0) return true;

  const threshold = params.thresholdPercent ?? 90;
  return params.moduleLessons.every((lesson) => {
    const prog = params.lessonProgressMap.get(lesson.id);
    return isLessonCompleted(prog, threshold);
  });
}

/**
 * Backward-compatible alias for canTakeQuiz
 */
export const canAccessQuiz = canTakeQuiz;

/**
 * Pure function: Checks if quiz is passed
 */
export function isQuizPassed(
  quizAttempts: { scorePercent: number; isPassed: boolean }[],
  passingScorePercent = 70
): boolean {
  if (!quizAttempts || quizAttempts.length === 0) return false;
  return quizAttempts.some((a) => a.isPassed || a.scorePercent >= passingScorePercent);
}

/**
 * Pure function: Checks if student can access the practical assignment
 * R8: Requires lessons completed + quiz passed (if requiresQuiz is true)
 */
export function canAccessAssignment(params: {
  isModuleUnlocked: boolean;
  moduleLessons: { id: string }[];
  lessonProgressMap: Map<string, { percent: number; completedAt: Date | null }>;
  hasQuiz: boolean;
  requiresQuiz?: boolean;
  quizAttempts: { scorePercent: number; isPassed: boolean }[];
  passingQuizScorePercent?: number;
  thresholdPercent?: number;
}): boolean {
  if (!params.isModuleUnlocked) return false;

  // 1. Lessons must all be completed
  const lessonsDone = canTakeQuiz({
    isModuleUnlocked: params.isModuleUnlocked,
    moduleLessons: params.moduleLessons,
    lessonProgressMap: params.lessonProgressMap,
    thresholdPercent: params.thresholdPercent,
    requiresQuiz: true,
  });

  if (!lessonsDone) return false;

  // 2. If quiz is required and exists, it must be passed
  const shouldCheckQuiz = params.requiresQuiz !== false && params.hasQuiz;
  if (shouldCheckQuiz) {
    return isQuizPassed(params.quizAttempts, params.passingQuizScorePercent ?? 70);
  }

  return true;
}

/**
 * Pure function: Evaluates if a module is complete
 * R8: lessonsDone AND (quizPassed or !requiresQuiz) AND (assignmentApproved or !requiresAssignment)
 */
export function isModuleComplete(params: {
  lessonsDone: boolean;
  requiresQuiz?: boolean;
  quizPassed?: boolean;
  requiresAssignment?: boolean;
  assignmentApproved?: boolean;
}): boolean {
  if (!params.lessonsDone) return false;

  const quizSatisfied = params.requiresQuiz === false || !!params.quizPassed;
  const assignmentSatisfied = params.requiresAssignment === false || !!params.assignmentApproved;

  return quizSatisfied && assignmentSatisfied;
}

/**
 * Pure function: Checks if student can access the next module
 * R6: Next module opens when previous module is complete.
 */
export function canAccessNextModule(params: {
  previousModuleComplete: boolean;
  enrollmentStatus?: {
    paymentStatus?: string;
    accessStatus?: string;
  };
}): boolean {
  if (params.enrollmentStatus) {
    if (params.enrollmentStatus.paymentStatus && params.enrollmentStatus.paymentStatus !== 'PAID') {
      return false;
    }
    if (params.enrollmentStatus.accessStatus && params.enrollmentStatus.accessStatus !== 'ACTIVE') {
      return false;
    }
  }

  return params.previousModuleComplete;
}

/**
 * Pure function: Checks if enrollment access is active and paid
 */
export function canAccessEnrollmentContent(params: {
  paymentStatus?: string;
  accessStatus?: string;
}): boolean {
  const isPaid = !params.paymentStatus || params.paymentStatus === 'PAID';
  const isActive = !params.accessStatus || params.accessStatus === 'ACTIVE';
  return isPaid && isActive;
}

/**
 * Pure function: Evaluates time-gating for LIVE batch lessons
 * R2: Recorded is self-paced; Live sessions can be time-gated by session start date.
 */
export function isLessonTimeGated(params: {
  deliveryMode: string;
  sessionStartTime?: Date | null;
  currentTime?: Date;
}): boolean {
  if (params.deliveryMode === 'RECORDED') {
    return false;
  }

  if (params.deliveryMode === 'LIVE' && params.sessionStartTime) {
    const now = params.currentTime || new Date();
    return now < new Date(params.sessionStartTime);
  }

  return false;
}

/**
 * Pure function: Checks if student can access the final stage (Mock test, final project, final exam)
 */
export function canAccessFinalStage(params: { allModulesCompleted: boolean }): boolean {
  return params.allModulesCompleted;
}

/**
 * Pure function: Evaluates overall module status
 */
export function evaluateModuleStatus(params: {
  isModuleUnlocked: boolean;
  module: PureModuleInput;
  progressData: PureProgressData;
  settings: CourseSettings;
}): ModuleStatus {
  if (!params.isModuleUnlocked) {
    return ModuleStatus.LOCKED;
  }

  const lessonsDone = canTakeQuiz({
    isModuleUnlocked: true,
    moduleLessons: params.module.lessons,
    lessonProgressMap: params.progressData.lessonProgressMap,
    thresholdPercent: params.settings.lessonCompletionThresholdPercent,
    requiresQuiz: true,
  });

  const requiresQuiz = params.module.requiresQuiz !== false && !!params.module.quiz;
  const requiresAssignment = params.module.requiresAssignment !== false && !!params.module.assignment;

  const quizPassed = !requiresQuiz
    ? true
    : isQuizPassed(
        params.progressData.quizAttempts,
        params.module.quiz?.passingScorePercent || params.settings.passingQuizScorePercent
      );

  const latestSubmission = params.progressData.assignmentSubmissions[0];
  const assignmentApproved = !requiresAssignment
    ? true
    : latestSubmission?.status === SubmissionStatus.APPROVED;

  const assignmentPending =
    requiresAssignment &&
    latestSubmission &&
    (latestSubmission.status === SubmissionStatus.PENDING ||
      latestSubmission.status === SubmissionStatus.CHANGES_REQUESTED);

  // If all requirements are satisfied -> COMPLETED
  if (
    isModuleComplete({
      lessonsDone,
      requiresQuiz,
      quizPassed,
      requiresAssignment,
      assignmentApproved,
    })
  ) {
    return ModuleStatus.COMPLETED;
  }

  // If assignment submitted and waiting for review
  if (lessonsDone && quizPassed && latestSubmission?.status === SubmissionStatus.PENDING) {
    return ModuleStatus.AWAITING_REVIEW;
  }

  // If any lesson started or attempted
  const anyLessonTouched = params.module.lessons.some((l) => {
    const prog = params.progressData.lessonProgressMap.get(l.id);
    return prog && ((prog.percent && prog.percent > 0) || prog.completedAt);
  });

  if (anyLessonTouched || params.progressData.quizAttempts.length > 0 || assignmentPending) {
    return ModuleStatus.IN_PROGRESS;
  }

  return ModuleStatus.AVAILABLE;
}

/**
 * Pure function: Checks certificate eligibility
 */
export function isCertificateEligible(params: {
  allModulesCompleted: boolean;
  mockTestPassed: boolean;
  finalProjectApproved: boolean;
  finalAssessmentPassed: boolean;
}): boolean {
  return (
    params.allModulesCompleted &&
    params.mockTestPassed &&
    params.finalProjectApproved &&
    params.finalAssessmentPassed
  );
}

export const checkCertificateEligibility = isCertificateEligible;

/**
 * ProgressionService: Server-side database-backed state machine
 */
export class ProgressionService {
  async getCourseProgression(courseId: string, studentId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' } },
            quiz: true,
            assignment: true,
          },
        },
        mockTest: true,
        finalProject: true,
        finalAssessment: true,
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const settings = (course.settings ? (course.settings as unknown as CourseSettings) : {
      passingQuizScorePercent: 70,
      maxQuizAttempts: 3,
      sequentialLessonsLock: true,
      lessonCompletionThresholdPercent: 90,
      mockTestPassingPercent: 75,
      finalAssessmentPassingPercent: 80,
    });

    // Fetch student enrollment & progress data for this course in parallel
    const [
      enrollment,
      lessonProgresses,
      quizAttempts,
      assignmentSubmissions,
      mockTestAttempts,
      projectSubmissions,
      examAttempts,
      certificate,
      storedModuleProgress,
    ] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
      }),
      prisma.lessonProgress.findMany({ where: { studentId, lesson: { module: { courseId } } } }),
      prisma.quizAttempt.findMany({
        where: { studentId, quiz: { module: { courseId } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId, assignment: { module: { courseId } } },
        orderBy: { version: 'desc' },
      }),
      prisma.mockTestAttempt.findMany({
        where: { studentId, mockTest: { courseId } },
        orderBy: { scorePercent: 'desc' },
      }),
      prisma.projectSubmission.findMany({
        where: { studentId, project: { courseId } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.examAttempt.findMany({
        where: { studentId, finalAssessment: { courseId } },
        orderBy: { scorePercent: 'desc' },
      }),
      prisma.certificate.findUnique({ where: { studentId_courseId: { studentId, courseId } } }),
      prisma.moduleProgress.findMany({ where: { studentId, module: { courseId } } }),
    ]);

    const storedModuleStatus = new Map(storedModuleProgress.map((mp) => [mp.moduleId, mp.status]));
    const moduleProgressWrites: Promise<unknown>[] = [];

    // Content is only unlocked for students holding a paid, active enrollment in this course
    const isAccessAllowed =
      !!enrollment &&
      canAccessEnrollmentContent({
        paymentStatus: enrollment.paymentStatus,
        accessStatus: enrollment.accessStatus,
      });

    const lessonProgressMap = new Map<string, { watchedSeconds: number; percent: number; completedAt: Date | null }>();
    lessonProgresses.forEach((lp) => {
      lessonProgressMap.set(lp.lessonId, {
        watchedSeconds: lp.watchedSeconds,
        percent: lp.percent,
        completedAt: lp.completedAt,
      });
    });

    const moduleStatusList: {
      id: string;
      order: number;
      title: string;
      requiresQuiz: boolean;
      requiresAssignment: boolean;
      status: ModuleStatus;
      lessonsCompleted: number;
      totalLessons: number;
      isQuizPassed: boolean;
      isAssignmentApproved: boolean;
      isLocked: boolean;
      lessons: {
        id: string;
        title: string;
        order: number;
        durationSeconds: number;
        videoUrl: string;
        isCompleted: boolean;
        isLocked: boolean;
        progressPercent: number;
      }[];
      quizDetail?: any;
      assignmentDetail?: any;
    }[] = [];

    let isPreviousModuleCompleted = true; // Module 1 starts unlocked if access allowed

    for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
      const mod = course.modules[mIdx];
      const isModuleUnlocked = isAccessAllowed && isPreviousModuleCompleted;

      // Filter quiz and assignment data for this module
      const modQuizAttempts = mod.quiz ? quizAttempts.filter((qa) => qa.quizId === mod.quiz!.id) : [];
      const modSubmissions = mod.assignment
        ? assignmentSubmissions.filter((asub) => asub.assignmentId === mod.assignment!.id)
        : [];

      const status = evaluateModuleStatus({
        isModuleUnlocked,
        module: {
          id: mod.id,
          order: mod.order,
          requiresQuiz: mod.requiresQuiz,
          requiresAssignment: mod.requiresAssignment,
          lessons: mod.lessons.map((l) => ({ id: l.id, order: l.order, durationSeconds: l.durationSeconds })),
          quiz: mod.quiz,
          assignment: mod.assignment,
        },
        progressData: {
          lessonProgressMap,
          quizAttempts: modQuizAttempts,
          assignmentSubmissions: modSubmissions as unknown as { status: SubmissionStatus; grade?: number | null }[],
        },
        settings,
      });

      // Compute lesson statuses
      const lessonsComputed = mod.lessons.map((lesson, lIdx) => {
        const prog = lessonProgressMap.get(lesson.id);
        const completed = isLessonCompleted(prog, settings.lessonCompletionThresholdPercent);
        const unlocked = isAccessAllowed && canAccessLesson({
          isModuleUnlocked,
          lessonIndex: lIdx,
          orderedLessons: mod.lessons,
          lessonProgressMap,
          sequentialLock: settings.sequentialLessonsLock,
          thresholdPercent: settings.lessonCompletionThresholdPercent,
        });

        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          durationSeconds: lesson.durationSeconds,
          videoUrl: lesson.videoUrl,
          isCompleted: completed,
          isLocked: !unlocked,
          progressPercent: prog ? prog.percent : 0,
        };
      });

      const lessonsCompletedCount = lessonsComputed.filter((l) => l.isCompleted).length;
      const modQuizPassed = mod.quiz ? isQuizPassed(modQuizAttempts, mod.quiz.passingScorePercent) : true;
      const modAssignmentApproved = mod.assignment
        ? modSubmissions[0]?.status === SubmissionStatus.APPROVED
        : true;

      moduleStatusList.push({
        id: mod.id,
        order: mod.order,
        title: mod.title,
        requiresQuiz: mod.requiresQuiz,
        requiresAssignment: mod.requiresAssignment,
        status,
        lessonsCompleted: lessonsCompletedCount,
        totalLessons: mod.lessons.length,
        isQuizPassed: modQuizPassed,
        isAssignmentApproved: modAssignmentApproved,
        isLocked: !isModuleUnlocked,
        lessons: lessonsComputed,
        quizDetail: mod.quiz
          ? {
              id: mod.quiz.id,
              title: mod.quiz.title,
              passingScorePercent: mod.quiz.passingScorePercent,
              maxAttempts: mod.quiz.maxAttempts,
              questionCount: mod.quiz.questionCount,
              attemptsCount: modQuizAttempts.length,
              canRetake: canRetakeQuiz(modQuizAttempts.length, mod.quiz.maxAttempts),
              userBestScore: modQuizAttempts.length ? Math.max(...modQuizAttempts.map((a) => a.scorePercent)) : null,
              isPassed: modQuizPassed,
              isLocked: !canTakeQuiz({
                isModuleUnlocked,
                moduleLessons: mod.lessons,
                lessonProgressMap,
                thresholdPercent: settings.lessonCompletionThresholdPercent,
                requiresQuiz: mod.requiresQuiz,
                attemptsCount: modQuizAttempts.length,
                maxAttempts: mod.quiz.maxAttempts,
              }),
            }
          : null,
        assignmentDetail: mod.assignment
          ? {
              id: mod.assignment.id,
              title: mod.assignment.title,
              description: mod.assignment.description,
              maxScore: mod.assignment.maxScore,
              latestSubmission: modSubmissions[0] || null,
              submissionHistory: modSubmissions,
              isApproved: modAssignmentApproved,
              isLocked: !canAccessAssignment({
                isModuleUnlocked,
                moduleLessons: mod.lessons,
                lessonProgressMap,
                hasQuiz: !!mod.quiz,
                requiresQuiz: mod.requiresQuiz,
                quizAttempts: modQuizAttempts,
                passingQuizScorePercent: mod.quiz?.passingScorePercent,
                thresholdPercent: settings.lessonCompletionThresholdPercent,
              }),
            }
          : null,
      });

      // Persist the module status only when it changed (keeps reads cheap)
      if (storedModuleStatus.get(mod.id) !== status) {
        moduleProgressWrites.push(
          prisma.moduleProgress.upsert({
            where: { studentId_moduleId: { studentId, moduleId: mod.id } },
            update: { status, completedAt: status === ModuleStatus.COMPLETED ? new Date() : null },
            create: {
              studentId,
              moduleId: mod.id,
              status,
              completedAt: status === ModuleStatus.COMPLETED ? new Date() : null,
            },
          })
        );
      }

      isPreviousModuleCompleted = status === ModuleStatus.COMPLETED;
    }

    await Promise.all(moduleProgressWrites);

    const totalModules = course.modules.length;
    const completedModules = moduleStatusList.filter((m) => m.status === ModuleStatus.COMPLETED).length;
    const isAllModulesCompleted = totalModules > 0 && completedModules === totalModules;

    // Post-Module Stages
    const mockTestPassed =
      course.mockTest && mockTestAttempts.length > 0
        ? mockTestAttempts.some((a) => a.isPassed || a.scorePercent >= course.mockTest!.passingScorePercent)
        : !course.mockTest;

    const finalProjectApproved =
      course.finalProject && projectSubmissions.length > 0
        ? projectSubmissions[0]?.status === SubmissionStatus.APPROVED
        : !course.finalProject;

    const finalAssessmentPassed =
      course.finalAssessment && examAttempts.length > 0
        ? examAttempts.some((a) => a.isPassed || a.scorePercent >= course.finalAssessment!.passingScorePercent)
        : !course.finalAssessment;

    const certificateEligible = isCertificateEligible({
      allModulesCompleted: isAllModulesCompleted,
      mockTestPassed,
      finalProjectApproved,
      finalAssessmentPassed,
    });

    return {
      courseId,
      studentId,
      hasAccess: isAccessAllowed,
      totalModules,
      completedModules,
      coursePercent: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      modules: moduleStatusList,
      isAllModulesCompleted,
      mockTestPassed,
      finalProjectApproved,
      finalAssessmentPassed,
      certificateEligible,
      certificate: certificate
        ? {
            id: certificate.id,
            certificateId: certificate.certificateId,
            issuedAt: certificate.issuedAt.toISOString(),
            pdfUrl: certificate.pdfUrl,
            status: certificate.status,
          }
        : null,
    };
  }

  // Server-side guard for Lesson Access
  async assertCanAccessLesson(lessonId: string, studentId: string, role: Role) {
    if (role === Role.ADMIN || role === Role.INSTRUCTOR) return null;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });

    if (!lesson) throw new NotFoundError('Lesson not found');

    // Check enrollment payment/access
    const progression = await this.getCourseProgression(lesson.module.courseId, studentId);
    if (!progression.hasAccess) {
      throw new ProgressionLockedError('Active paid enrollment required to access course lessons.');
    }
    const mod = progression.modules.find((m) => m.id === lesson.moduleId);
    if (!mod || mod.isLocked) {
      throw new ProgressionLockedError('This module is locked. Complete the previous module first.');
    }

    const lessonItem = mod.lessons.find((l) => l.id === lessonId);
    if (lessonItem?.isLocked) {
      throw new ProgressionLockedError('This lesson is locked. Complete the preceding lessons first.');
    }

    return progression;
  }

  // Server-side guard for Quiz Submission
  async assertCanAccessQuiz(quizId: string, studentId: string, role: Role) {
    if (role === Role.ADMIN || role === Role.INSTRUCTOR) return true;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { module: { select: { courseId: true } } },
    });

    if (!quiz) throw new NotFoundError('Quiz not found');

    const progression = await this.getCourseProgression(quiz.module.courseId, studentId);
    if (!progression.hasAccess) {
      throw new ProgressionLockedError('Active paid enrollment required to access module quiz.');
    }
    const mod = progression.modules.find((m) => m.id === quiz.moduleId);
    if (!mod || mod.isLocked) {
      throw new ProgressionLockedError('This module is locked.');
    }

    if (mod.quizDetail?.isLocked) {
      throw new ProgressionLockedError('Quiz is locked. You must complete all module video lessons first.');
    }

    return true;
  }

  // Server-side guard for Assignment Submission
  async assertCanAccessAssignment(assignmentId: string, studentId: string, role: Role) {
    if (role === Role.ADMIN || role === Role.INSTRUCTOR) return true;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { module: { select: { courseId: true } } },
    });

    if (!assignment) throw new NotFoundError('Assignment not found');

    const progression = await this.getCourseProgression(assignment.module.courseId, studentId);
    if (!progression.hasAccess) {
      throw new ProgressionLockedError('Active paid enrollment required to submit assignments.');
    }
    const mod = progression.modules.find((m) => m.id === assignment.moduleId);
    if (!mod || mod.isLocked) {
      throw new ProgressionLockedError('This module is locked.');
    }

    if (mod.assignmentDetail?.isLocked) {
      throw new ProgressionLockedError('Assignment is locked. Complete all lessons and pass the module quiz first.');
    }

    return true;
  }
}

export const progressionService = new ProgressionService();
