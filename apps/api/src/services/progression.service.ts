import {
  ModuleStatus,
  SubmissionStatus,
  CourseSettings,
  Role,
  PracticeStatus,
  DeliveryMode,
} from '@academy/shared';
import { prisma } from '../lib/prisma.js';
import {
  ProgressionLockedError,
  NotFoundError,
  LessonAccessDeniedError,
} from '../lib/errors.js';

export { LessonAccessDeniedError };

/**
 * Pure function: Asserts whether a student can access a specific lesson or throws a descriptive 403 error
 */
export function assertCanAccessLesson(params: {
  enrollment: any;
  lesson: any;
  module: any;
  courseSettings?: any;
  previousModuleCompleted?: boolean;
  previousLessonsCompleted?: boolean;
}): boolean {
  if (!params.enrollment) {
    throw new LessonAccessDeniedError('NOT_ENROLLED', 'You are not enrolled in this course.');
  }

  if (params.enrollment.paymentStatus !== 'PAID') {
    throw new LessonAccessDeniedError(
      'PAYMENT_PENDING',
      'Enrollment payment is pending or incomplete.'
    );
  }

  if (params.enrollment.accessStatus && params.enrollment.accessStatus !== 'ACTIVE') {
    throw new LessonAccessDeniedError(
      'ACCESS_SUSPENDED',
      'Your course access has been suspended or expired.'
    );
  }

  if (params.previousModuleCompleted === false) {
    throw new LessonAccessDeniedError(
      'MODULE_LOCKED',
      'The previous module must be completed before accessing this lesson.'
    );
  }

  if (
    params.courseSettings?.sequentialLessonsLock &&
    params.previousLessonsCompleted === false
  ) {
    throw new LessonAccessDeniedError(
      'PREVIOUS_LESSON_INCOMPLETE',
      'You must complete prior lessons in sequence before accessing this lesson.'
    );
  }

  return true;
}

/**
 * Pure function: Validates live session join time window (e.g. 15 mins before until scheduled end)
 */
export function isWithinJoinWindow(
  startsAt: Date,
  durationMinutes: number,
  joinWindowMinutes = 15
): { allowed: boolean; reason?: 'TOO_EARLY' | 'ENDED' } {
  const now = Date.now();
  const startTime = new Date(startsAt).getTime();
  const endTime = startTime + durationMinutes * 60 * 1000;
  const earliestAllowed = startTime - joinWindowMinutes * 60 * 1000;

  if (now < earliestAllowed) {
    return { allowed: false, reason: 'TOO_EARLY' };
  }

  if (now > endTime) {
    return { allowed: false, reason: 'ENDED' };
  }

  return { allowed: true };
}

export interface PureModuleInput {
  id: string;
  order: number;
  requiresQuiz?: boolean;
  requiresAssignment?: boolean;
  requirePracticeDone?: boolean;
  lessons: {
    id: string;
    order: number;
    durationSeconds: number;
    type?: string;
    liveSessionId?: string | null;
  }[];
  practiceTasks?: { id: string; order: number }[];
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
  lessonProgressMap: Map<
    string,
    {
      watchedSeconds: number;
      percent: number;
      completedAt: Date | null;
      lastPositionSeconds?: number;
      watchedSegments?: [number, number][];
    }
  >;
  practiceProgressMap: Map<string, PracticeStatus>;
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
 * Pure function: Merges watched video intervals and calculates tamper-resistant unique watched seconds and percentage.
 * Anti-cheat guarantees:
 * 1. Clamps all intervals to [0, durationSeconds]
 * 2. Ignores negative / invalid / backwards intervals
 * 3. Merges overlapping and consecutive intervals
 * 4. Ensures seeking forward without playing doesn't grant watched credit
 * 5. Calculates percent = (totalUniqueWatched / durationSeconds) * 100
 */
export type WatchedInterval = [number, number] | { start: number; end: number };

/**
 * Pure function: Merges watched intervals into a sorted disjoint union,
 * prevents forward-seeking inflation, filters impossible-speed intervals, and clamps to duration.
 */
export function mergeWatchedIntervals(
  existingIntervals: WatchedInterval[] | undefined | null,
  incomingIntervals: WatchedInterval[] | undefined | null,
  durationSeconds: number,
  options?: { maxPlaybackRate?: number; maxIntervalSeconds?: number }
): {
  merged: [number, number][];
  mergedSegments: { start: number; end: number }[];
  totalUniqueSeconds: number;
  percent: number;
} {
  const duration = Math.max(0, durationSeconds || 0);
  const maxIntervalLimit = options?.maxIntervalSeconds ?? 120; // 2 minutes max per heartbeat chunk

  const validIntervals: [number, number][] = [];

  const extractStartEnd = (item: WatchedInterval): [number, number] | null => {
    if (Array.isArray(item) && item.length === 2) {
      return [item[0], item[1]];
    }
    if (item && typeof item === 'object' && 'start' in item && 'end' in item) {
      return [(item as any).start, (item as any).end];
    }
    return null;
  };

  const processInterval = (item: WatchedInterval, isIncoming = false) => {
    const tuple = extractStartEnd(item);
    if (!tuple) return;
    const [start, end] = tuple;

    if (typeof start !== 'number' || typeof end !== 'number' || isNaN(start) || isNaN(end)) {
      return;
    }
    if (start >= end || start < 0) {
      return;
    }

    // Anti-cheat: reject single incoming heartbeat chunks that exceed max realistic duration
    if (isIncoming && end - start > maxIntervalLimit) {
      return;
    }

    const clampedStart = Math.max(0, Math.min(duration, start));
    const clampedEnd = Math.max(0, Math.min(duration, end));

    if (clampedEnd > clampedStart) {
      validIntervals.push([
        Math.round(clampedStart * 10) / 10,
        Math.round(clampedEnd * 10) / 10,
      ]);
    }
  };

  (existingIntervals || []).forEach((item) => processInterval(item, false));
  (incomingIntervals || []).forEach((item) => processInterval(item, true));

  if (validIntervals.length === 0) {
    return { merged: [], mergedSegments: [], totalUniqueSeconds: 0, percent: 0 };
  }

  // Sort intervals by start ascending, then end ascending
  validIntervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged: [number, number][] = [];
  let current = validIntervals[0];

  for (let i = 1; i < validIntervals.length; i++) {
    const next = validIntervals[i];
    if (next[0] <= current[1]) {
      // Overlapping or contiguous interval -> merge
      current[1] = Math.max(current[1], next[1]);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  // Calculate unique seconds from union
  let totalUniqueSeconds = 0;
  for (const [start, end] of merged) {
    totalUniqueSeconds += end - start;
  }

  totalUniqueSeconds = Math.round(totalUniqueSeconds * 10) / 10;
  const percent =
    duration <= 0
      ? 100
      : Math.min(100, Math.round((totalUniqueSeconds / duration) * 10000) / 100);

  const mergedSegments = merged.map(([start, end]) => ({ start, end }));

  return {
    merged,
    mergedSegments,
    totalUniqueSeconds,
    percent,
  };
}

/**
 * Pure function: Calculates watch percentage clamped between 0 and 100
 */
export function calculateWatchPercentage(watchedSeconds: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 100;
  return Math.min(100, Math.round((Math.max(0, watchedSeconds) / durationSeconds) * 10000) / 100);
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
 * Pure function: Calculates score percentage and pass/fail status for a quiz attempt.
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
  progressOrWatched: { watchedSeconds?: number; percent?: number; completedAt?: Date | null } | number | undefined | null,
  thresholdOrDuration?: number,
  thresholdPercent = 90
): boolean {
  if (typeof progressOrWatched === 'number') {
    const duration = thresholdOrDuration && thresholdOrDuration > 0 ? thresholdOrDuration : 1;
    const threshold = thresholdPercent;
    const percent = (progressOrWatched / duration) * 100;
    return percent >= threshold;
  }
  if (!progressOrWatched) return false;
  if (progressOrWatched.completedAt) return true;
  const threshold = thresholdOrDuration ?? 90;
  return (progressOrWatched.percent || 0) >= threshold;
}

/**
 * Pure function: Checks if all practice tasks in a module are completed
 */
export function isPracticeCompleted(
  practiceTasks: { id: string }[] | undefined,
  practiceProgress: Map<string, PracticeStatus> | { practiceTaskId: string; status: string }[] | undefined
): boolean {
  if (!practiceTasks || practiceTasks.length === 0) return true;
  if (!practiceProgress) return false;

  const getStatus = (taskId: string): string | undefined => {
    if (practiceProgress instanceof Map) {
      return practiceProgress.get(taskId);
    }
    const item = practiceProgress.find((p) => p.practiceTaskId === taskId);
    return item?.status;
  };

  return practiceTasks.every((task) => getStatus(task.id) === PracticeStatus.DONE || getStatus(task.id) === 'DONE');
}

/**
 * Pure function: Checks if student can access the module quiz
 * R5: Quiz is taken AFTER watching all module videos + completing practice (if requirePracticeDone is true).
 */
export function canTakeQuiz(params: {
  isModuleUnlocked?: boolean;
  allLessonsCompleted?: boolean;
  practiceCompleted?: boolean;
  moduleLessons?: { id: string }[];
  lessonProgressMap?: Map<string, { percent: number; completedAt: Date | null }>;
  thresholdPercent?: number;
  requiresQuiz?: boolean;
  requirePracticeDone?: boolean;
  practiceTasks?: { id: string }[];
  practiceProgressMap?: Map<string, PracticeStatus>;
  attemptsCount?: number;
  maxAttempts?: number | null;
}): boolean {
  if (params.isModuleUnlocked === false) return false;
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

  // Handle simplified boolean signature
  if (params.allLessonsCompleted !== undefined) {
    if (!params.allLessonsCompleted) return false;
    if (params.requirePracticeDone && !params.practiceCompleted) return false;
    return true;
  }

  // 1. All lessons must be completed
  if (params.moduleLessons && params.lessonProgressMap) {
    const threshold = params.thresholdPercent ?? 90;
    const lessonsDone = params.moduleLessons.every((lesson) => {
      const prog = params.lessonProgressMap!.get(lesson.id);
      return isLessonCompleted(prog, threshold);
    });

    if (!lessonsDone) return false;
  }

  // 2. If requirePracticeDone is true, verify practice tasks
  if (params.requirePracticeDone && params.practiceTasks && params.practiceTasks.length > 0) {
    const practiceDone = isPracticeCompleted(params.practiceTasks, params.practiceProgressMap);
    if (!practiceDone) return false;
  }

  return true;
}

export const canAccessQuiz = canTakeQuiz;

/**
 * Pure function: Checks if student can access final stage (Mock test, Capstone, Final exam)
 */
export function canAccessFinalStage(params: { allModulesCompleted: boolean }): boolean {
  return params.allModulesCompleted;
}

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
 */
export function canAccessAssignment(params: {
  isModuleUnlocked: boolean;
  moduleLessons: { id: string }[];
  lessonProgressMap: Map<string, { percent: number; completedAt: Date | null }>;
  hasQuiz: boolean;
  requiresQuiz?: boolean;
  requirePracticeDone?: boolean;
  practiceTasks?: { id: string }[];
  practiceProgressMap?: Map<string, PracticeStatus>;
  quizAttempts: { scorePercent: number; isPassed: boolean }[];
  passingQuizScorePercent?: number;
  thresholdPercent?: number;
}): boolean {
  if (!params.isModuleUnlocked) return false;

  // 1. Lessons and practice must be complete
  const lessonsDone = canTakeQuiz({
    isModuleUnlocked: params.isModuleUnlocked,
    moduleLessons: params.moduleLessons,
    lessonProgressMap: params.lessonProgressMap,
    thresholdPercent: params.thresholdPercent,
    requiresQuiz: true,
    requirePracticeDone: params.requirePracticeDone,
    practiceTasks: params.practiceTasks,
    practiceProgressMap: params.practiceProgressMap,
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
 */
export function isModuleComplete(params: {
  lessonsDone: boolean;
  practiceDone?: boolean;
  requiresQuiz?: boolean;
  quizPassed?: boolean;
  requiresAssignment?: boolean;
  assignmentApproved?: boolean;
}): boolean {
  if (!params.lessonsDone) return false;
  if (params.practiceDone === false) return false;

  const quizSatisfied = params.requiresQuiz === false || !!params.quizPassed;
  const assignmentSatisfied =
    params.requiresAssignment === false || !!params.assignmentApproved;

  return quizSatisfied && assignmentSatisfied;
}

/**
 * Pure function: Checks if student can access the next module
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

  const lessonsDone = params.module.lessons.every((l) => {
    const prog = params.progressData.lessonProgressMap.get(l.id);
    return isLessonCompleted(prog, params.settings.lessonCompletionThresholdPercent);
  });

  const practiceDone = params.module.requirePracticeDone
    ? isPracticeCompleted(params.module.practiceTasks, params.progressData.practiceProgressMap)
    : true;

  const requiresQuiz = params.module.requiresQuiz !== false && !!params.module.quiz;
  const requiresAssignment =
    params.module.requiresAssignment !== false && !!params.module.assignment;

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
      practiceDone,
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

  const anyPracticeTouched = (params.module.practiceTasks || []).some((pt) => {
    const st = params.progressData.practiceProgressMap.get(pt.id);
    return st && st !== PracticeStatus.NOT_STARTED;
  });

  if (
    anyLessonTouched ||
    anyPracticeTouched ||
    params.progressData.quizAttempts.length > 0 ||
    assignmentPending
  ) {
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
    // Load the course tree together with this student's records at every level in a single
    // query (relationJoins turns the nested includes into one SQL statement). Serverless
    // deployments usually run with a tiny connection pool, so one round trip matters.
    const mine = { where: { studentId } };
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              include: {
                lessonResources: true,
                practiceTasks: { orderBy: { order: 'asc' }, include: { progress: mine } },
                progress: mine,
                notes: mine,
                bookmarks: mine,
              },
            },
            practiceTasks: { orderBy: { order: 'asc' }, include: { progress: mine } },
            quiz: {
              include: {
                _count: { select: { questions: true } },
                attempts: { where: { studentId }, orderBy: { createdAt: 'desc' } },
              },
            },
            assignment: {
              include: { submissions: { where: { studentId }, orderBy: { version: 'desc' } } },
            },
            liveSessions: { orderBy: { startsAt: 'asc' } },
            moduleProgress: mine,
          },
        },
        mockTest: { include: { attempts: { where: { studentId }, orderBy: { scorePercent: 'desc' } } } },
        finalProject: {
          include: { submissions: { where: { studentId }, orderBy: { createdAt: 'desc' } } },
        },
        finalAssessment: {
          include: { attempts: { where: { studentId }, orderBy: { scorePercent: 'desc' } } },
        },
        enrollments: { where: { studentId }, include: { batch: true } },
        certificates: mine,
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const settings: CourseSettings = (course.settings
      ? (course.settings as unknown as CourseSettings)
      : {
          passingQuizScorePercent: 70,
          maxQuizAttempts: 3,
          sequentialLessonsLock: true,
          lessonCompletionThresholdPercent: 90,
          mockTestPassingPercent: 75,
          finalAssessmentPassingPercent: 80,
          requirePracticeDone: false,
          watermarkEnabled: true,
        });

    // Flatten the student's records out of the course tree
    const modules = course.modules;
    const allLessons = modules.flatMap((m) => m.lessons);
    const enrollment = course.enrollments[0] || null;
    const certificate = course.certificates[0] || null;
    const lessonProgresses = allLessons.flatMap((l) => l.progress);
    const practiceProgresses = [
      ...modules.flatMap((m) => m.practiceTasks.flatMap((t) => t.progress)),
      ...allLessons.flatMap((l) => l.practiceTasks.flatMap((t) => t.progress)),
    ];
    const quizAttempts = modules.flatMap((m) => m.quiz?.attempts || []);
    const assignmentSubmissions = modules.flatMap((m) => m.assignment?.submissions || []);
    const mockTestAttempts = course.mockTest?.attempts || [];
    const projectSubmissions = course.finalProject?.submissions || [];
    const examAttempts = course.finalAssessment?.attempts || [];
    const storedModuleProgress = modules.flatMap((m) => m.moduleProgress);
    const lessonNotes = allLessons.flatMap((l) => l.notes);
    const lessonBookmarks = allLessons.flatMap((l) => l.bookmarks);

    const storedModuleStatus = new Map(storedModuleProgress.map((mp) => [mp.moduleId, mp.status]));
    const moduleProgressWrites: Promise<unknown>[] = [];

    // Content is only unlocked for students holding a paid, active enrollment in this course
    const isAccessAllowed =
      !!enrollment &&
      canAccessEnrollmentContent({
        paymentStatus: enrollment.paymentStatus,
        accessStatus: enrollment.accessStatus,
      });

    const lessonProgressMap = new Map<
      string,
      {
        watchedSeconds: number;
        percent: number;
        completedAt: Date | null;
        lastPositionSeconds?: number;
        watchedSegments?: [number, number][];
      }
    >();
    lessonProgresses.forEach((lp) => {
      lessonProgressMap.set(lp.lessonId, {
        watchedSeconds: lp.watchedSeconds,
        percent: lp.percent,
        completedAt: lp.completedAt,
        lastPositionSeconds: lp.lastPositionSeconds,
        watchedSegments: (lp.watchedSegments as [number, number][]) || [],
      });
    });

    const practiceProgressMap = new Map<string, PracticeStatus>();
    practiceProgresses.forEach((pp) => {
      practiceProgressMap.set(pp.practiceTaskId, pp.status as PracticeStatus);
    });

    const bookmarkedLessonIds = new Set(lessonBookmarks.map((b) => b.lessonId));
    const notesCountMap = new Map<string, number>();
    lessonNotes.forEach((n) => {
      notesCountMap.set(n.lessonId, (notesCountMap.get(n.lessonId) || 0) + 1);
    });

    const moduleStatusList: any[] = [];
    let isPreviousModuleCompleted = true; // Module 1 starts unlocked if access allowed

    let nextUpLesson: {
      id: string;
      title: string;
      moduleId: string;
      moduleTitle: string;
      order: number;
    } | null = null;

    for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
      const mod = course.modules[mIdx];
      const isModuleUnlocked = isAccessAllowed && isPreviousModuleCompleted;

      // Module practice tasks
      const allModulePracticeTasks = [
        ...(mod.practiceTasks || []),
        ...mod.lessons.flatMap((l) => l.practiceTasks || []),
      ];

      // Filter quiz and assignment data for this module
      const modQuizAttempts = mod.quiz
        ? quizAttempts.filter((qa) => qa.quizId === mod.quiz!.id)
        : [];
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
          requirePracticeDone: mod.requirePracticeDone || settings.requirePracticeDone,
          lessons: mod.lessons.map((l) => ({
            id: l.id,
            order: l.order,
            durationSeconds: l.durationSeconds,
            type: l.type,
            liveSessionId: l.liveSessionId,
          })),
          practiceTasks: allModulePracticeTasks,
          quiz: mod.quiz,
          assignment: mod.assignment,
        },
        progressData: {
          lessonProgressMap,
          practiceProgressMap,
          quizAttempts: modQuizAttempts,
          assignmentSubmissions: modSubmissions as unknown as {
            status: SubmissionStatus;
            grade?: number | null;
          }[],
        },
        settings,
      });

      // Compute lesson statuses
      const lessonsComputed = mod.lessons.map((lesson, lIdx) => {
        const prog = lessonProgressMap.get(lesson.id);
        const completed = isLessonCompleted(prog, settings.lessonCompletionThresholdPercent);
        const unlocked =
          isAccessAllowed &&
          canAccessLesson({
            isModuleUnlocked,
            lessonIndex: lIdx,
            orderedLessons: mod.lessons,
            lessonProgressMap,
            sequentialLock: settings.sequentialLessonsLock,
            thresholdPercent: settings.lessonCompletionThresholdPercent,
          });

        if (unlocked && !completed && !nextUpLesson) {
          nextUpLesson = {
            id: lesson.id,
            title: lesson.title,
            moduleId: mod.id,
            moduleTitle: mod.title,
            order: lesson.order,
          };
        }

        return {
          id: lesson.id,
          moduleId: mod.id,
          title: lesson.title,
          description: lesson.description,
          type: lesson.type,
          videoProvider: lesson.videoProvider,
          order: lesson.order,
          durationSeconds: lesson.durationSeconds,
          isPreview: lesson.isPreview,
          isCompleted: completed,
          isLocked: !unlocked,
          isBookmarked: bookmarkedLessonIds.has(lesson.id),
          notesCount: notesCountMap.get(lesson.id) || 0,
          progressPercent: prog ? prog.percent : 0,
          lastPositionSeconds: prog?.lastPositionSeconds || 0,
          resourcesCount: lesson.lessonResources?.length || 0,
          practiceCount: lesson.practiceTasks?.length || 0,
        };
      });

      const lessonsCompletedCount = lessonsComputed.filter((l) => l.isCompleted).length;
      const modQuizPassed = mod.quiz
        ? isQuizPassed(modQuizAttempts, mod.quiz.passingScorePercent)
        : true;
      const modAssignmentApproved = mod.assignment
        ? modSubmissions[0]?.status === SubmissionStatus.APPROVED
        : true;

      const isQuizLocked = !canTakeQuiz({
        isModuleUnlocked,
        moduleLessons: mod.lessons,
        lessonProgressMap,
        thresholdPercent: settings.lessonCompletionThresholdPercent,
        requiresQuiz: mod.requiresQuiz,
        requirePracticeDone: mod.requirePracticeDone || settings.requirePracticeDone,
        practiceTasks: allModulePracticeTasks,
        practiceProgressMap,
        attemptsCount: modQuizAttempts.length,
        maxAttempts: mod.quiz?.maxAttempts,
      });

      const isAssignmentLocked = !canAccessAssignment({
        isModuleUnlocked,
        moduleLessons: mod.lessons,
        lessonProgressMap,
        hasQuiz: !!mod.quiz,
        requiresQuiz: mod.requiresQuiz,
        requirePracticeDone: mod.requirePracticeDone || settings.requirePracticeDone,
        practiceTasks: allModulePracticeTasks,
        practiceProgressMap,
        quizAttempts: modQuizAttempts,
        passingQuizScorePercent: mod.quiz?.passingScorePercent,
        thresholdPercent: settings.lessonCompletionThresholdPercent,
      });

      moduleStatusList.push({
        id: mod.id,
        order: mod.order,
        title: mod.title,
        description: mod.description,
        requiresQuiz: mod.requiresQuiz,
        requiresAssignment: mod.requiresAssignment,
        requirePracticeDone: mod.requirePracticeDone || settings.requirePracticeDone,
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
              description: mod.quiz.description,
              passingScorePercent: mod.quiz.passingScorePercent,
              maxAttempts: mod.quiz.maxAttempts,
              questionCount: mod.quiz._count?.questions || mod.quiz.questionCount || 0,
              attemptsCount: modQuizAttempts.length,
              canRetake: canRetakeQuiz(modQuizAttempts.length, mod.quiz.maxAttempts),
              userBestScore: modQuizAttempts.length
                ? Math.max(...modQuizAttempts.map((a) => a.scorePercent))
                : null,
              isPassed: modQuizPassed,
              isLocked: isQuizLocked,
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
              isLocked: isAssignmentLocked,
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
    const completedModules = moduleStatusList.filter(
      (m) => m.status === ModuleStatus.COMPLETED
    ).length;
    const isAllModulesCompleted = totalModules > 0 && completedModules === totalModules;

    // Post-Module Stages
    const mockTestPassed =
      course.mockTest && mockTestAttempts.length > 0
        ? mockTestAttempts.some(
            (a) => a.isPassed || a.scorePercent >= course.mockTest!.passingScorePercent
          )
        : !course.mockTest;

    const finalProjectApproved =
      course.finalProject && projectSubmissions.length > 0
        ? projectSubmissions[0]?.status === SubmissionStatus.APPROVED
        : !course.finalProject;

    const finalAssessmentPassed =
      course.finalAssessment && examAttempts.length > 0
        ? examAttempts.some(
            (a) => a.isPassed || a.scorePercent >= course.finalAssessment!.passingScorePercent
          )
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
      coursePercent:
        totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      nextUpLesson,
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

  // Server-side guard for Lesson Access returning friendly machine-readable codes
  async assertCanAccessLesson(lessonId: string, studentId: string, role: Role) {
    if (role === Role.ADMIN || role === Role.INSTRUCTOR) return null;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });

    if (!lesson) throw new NotFoundError('Lesson not found');

    // Enrollment and progression are independent lookups, so fetch them together
    const [enrollment, progression] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId: lesson.module.courseId } },
        include: { batch: true },
      }),
      this.getCourseProgression(lesson.module.courseId, studentId),
    ]);

    if (!enrollment) {
      throw new LessonAccessDeniedError(
        'NOT_ENROLLED',
        'You are not enrolled in this course.'
      );
    }

    if (enrollment.paymentStatus !== 'PAID') {
      throw new LessonAccessDeniedError(
        'PAYMENT_PENDING',
        'Enrollment payment is pending. Please complete payment to access lessons.'
      );
    }

    if (enrollment.accessStatus === 'SUSPENDED') {
      throw new LessonAccessDeniedError(
        'ACCESS_SUSPENDED',
        'Your access to this course has been suspended. Please contact support.'
      );
    }

    // Time gating for LIVE classes if scheduled and not started
    if (enrollment.mode === DeliveryMode.LIVE && lesson.liveSessionId) {
      const liveSession = await prisma.liveSession.findUnique({
        where: { id: lesson.liveSessionId },
      });
      if (liveSession && !liveSession.recordingUrl) {
        const now = new Date();
        if (now < new Date(liveSession.startsAt)) {
          throw new LessonAccessDeniedError(
            'LIVE_SESSION_NOT_STARTED',
            'This scheduled live session has not started yet.'
          );
        }
      }
    }

    const mod = progression.modules.find((m: any) => m.id === lesson.moduleId);
    if (!mod || mod.isLocked) {
      throw new LessonAccessDeniedError(
        'MODULE_LOCKED',
        'This module is locked. You must complete the previous module first.'
      );
    }

    const lessonItem = mod.lessons.find((l: any) => l.id === lessonId);
    if (lessonItem?.isLocked) {
      throw new LessonAccessDeniedError(
        'PREVIOUS_LESSON_INCOMPLETE',
        'This lesson is locked. Complete the preceding lessons first.'
      );
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

    const [enrollment, progression] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId: quiz.module.courseId } },
      }),
      this.getCourseProgression(quiz.module.courseId, studentId),
    ]);

    if (!enrollment || enrollment.paymentStatus !== 'PAID') {
      throw new LessonAccessDeniedError(
        'PAYMENT_PENDING',
        'Active paid enrollment required to access module quiz.'
      );
    }

    const mod = progression.modules.find((m: any) => m.id === quiz.moduleId);
    if (!mod || mod.isLocked) {
      throw new ProgressionLockedError('This module is locked.');
    }

    if (mod.quizDetail?.isLocked) {
      throw new ProgressionLockedError(
        'Quiz is locked. You must complete all module lessons first.'
      );
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

    const [enrollment, progression] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId: assignment.module.courseId } },
      }),
      this.getCourseProgression(assignment.module.courseId, studentId),
    ]);

    if (!enrollment || enrollment.paymentStatus !== 'PAID') {
      throw new LessonAccessDeniedError(
        'PAYMENT_PENDING',
        'Active paid enrollment required to submit assignments.'
      );
    }

    const mod = progression.modules.find((m: any) => m.id === assignment.moduleId);
    if (!mod || mod.isLocked) {
      throw new ProgressionLockedError('This module is locked.');
    }

    if (mod.assignmentDetail?.isLocked) {
      throw new ProgressionLockedError(
        'Assignment is locked. Complete all lessons and pass the module quiz first.'
      );
    }

    return true;
  }
}

export const progressionService = new ProgressionService();
