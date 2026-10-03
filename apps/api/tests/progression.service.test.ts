import { describe, it, expect } from 'vitest';
import {
  calculateQuizResult,
  canRetakeQuiz,
  isLessonCompleted,
  canAccessLesson,
  canTakeQuiz,
  canAccessQuiz,
  isQuizPassed,
  canAccessAssignment,
  isModuleComplete,
  canAccessNextModule,
  canAccessEnrollmentContent,
  isLessonTimeGated,
  canAccessFinalStage,
  evaluateModuleStatus,
  isCertificateEligible,
  checkCertificateEligibility,
} from '../src/services/progression.service.js';
import { ModuleStatus, SubmissionStatus, CourseSettings } from '@academy/shared';

const defaultSettings: CourseSettings = {
  passingQuizScorePercent: 70,
  maxQuizAttempts: 3,
  sequentialLessonsLock: true,
  lessonCompletionThresholdPercent: 90,
  mockTestPassingPercent: 75,
  finalAssessmentPassingPercent: 80,
};

describe('Progression Service - Pure Functions & Business Rules', () => {
  describe('calculateQuizResult (R5 & R6 grading)', () => {
    it('14 of 20 correct at 70% threshold is a PASS', () => {
      const result = calculateQuizResult(14, 20, 70);
      expect(result.percentage).toBe(70);
      expect(result.passed).toBe(true);
      expect(result.correct).toBe(14);
      expect(result.total).toBe(20);
    });

    it('13 of 20 correct at 70% threshold is a FAIL', () => {
      const result = calculateQuizResult(13, 20, 70);
      expect(result.percentage).toBe(65);
      expect(result.passed).toBe(false);
      expect(result.correct).toBe(13);
      expect(result.total).toBe(20);
    });

    it('handles perfect score (20/20)', () => {
      const result = calculateQuizResult(20, 20, 70);
      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('handles zero score (0/20)', () => {
      const result = calculateQuizResult(0, 20, 70);
      expect(result.percentage).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('handles zero questions edge case cleanly without NaN or division by zero', () => {
      const result = calculateQuizResult(0, 0, 70);
      expect(result.percentage).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.total).toBe(0);
    });

    it('handles custom pass percentage (e.g. 80%)', () => {
      expect(calculateQuizResult(15, 20, 80).passed).toBe(false); // 75% < 80%
      expect(calculateQuizResult(16, 20, 80).passed).toBe(true);  // 80% >= 80%
    });

    it('supports PARTIAL scoring mode', () => {
      const partialResult = calculateQuizResult(0, 10, 70, {
        scoringMode: 'PARTIAL',
        partialPointsEarned: 14.5,
        maxPoints: 20,
      });
      expect(partialResult.percentage).toBe(72.5);
      expect(partialResult.passed).toBe(true);
    });
  });

  describe('canRetakeQuiz', () => {
    it('allows retake when attempts are under maxAttempts', () => {
      expect(canRetakeQuiz(1, 3)).toBe(true);
      expect(canRetakeQuiz(2, 3)).toBe(true);
    });

    it('disallows retake when maxAttempts is reached or exceeded', () => {
      expect(canRetakeQuiz(3, 3)).toBe(false);
      expect(canRetakeQuiz(4, 3)).toBe(false);
    });

    it('allows unlimited retakes when maxAttempts is null, undefined, or 0', () => {
      expect(canRetakeQuiz(5, null)).toBe(true);
      expect(canRetakeQuiz(10, undefined)).toBe(true);
      expect(canRetakeQuiz(20, 0)).toBe(true);
    });
  });

  describe('isLessonCompleted', () => {
    it('returns false when no progress is recorded', () => {
      expect(isLessonCompleted(undefined)).toBe(false);
      expect(isLessonCompleted(null)).toBe(false);
    });

    it('returns true when completedAt is explicitly set', () => {
      expect(isLessonCompleted({ percent: 10, completedAt: new Date() })).toBe(true);
    });

    it('returns true when watch percent reaches or exceeds threshold (90%)', () => {
      expect(isLessonCompleted({ percent: 90, completedAt: null })).toBe(true);
      expect(isLessonCompleted({ percent: 95, completedAt: null })).toBe(true);
      expect(isLessonCompleted({ percent: 100, completedAt: null })).toBe(true);
    });

    it('returns false when watch percent is below threshold', () => {
      expect(isLessonCompleted({ percent: 89.9, completedAt: null })).toBe(false);
      expect(isLessonCompleted({ percent: 50, completedAt: null })).toBe(false);
    });
  });

  describe('canAccessLesson with sequential lock', () => {
    const lessons = [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }];

    it('denies access if module is locked', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      const allowed = canAccessLesson({
        isModuleUnlocked: false,
        lessonIndex: 0,
        orderedLessons: lessons,
        lessonProgressMap: map,
        sequentialLock: true,
      });
      expect(allowed).toBe(false);
    });

    it('grants access to first lesson in an unlocked module', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      const allowed = canAccessLesson({
        isModuleUnlocked: true,
        lessonIndex: 0,
        orderedLessons: lessons,
        lessonProgressMap: map,
        sequentialLock: true,
      });
      expect(allowed).toBe(true);
    });

    it('locks second lesson if first lesson is incomplete', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      map.set('l1', { percent: 75, completedAt: null });
      const allowed = canAccessLesson({
        isModuleUnlocked: true,
        lessonIndex: 1,
        orderedLessons: lessons,
        lessonProgressMap: map,
        sequentialLock: true,
      });
      expect(allowed).toBe(false);
    });

    it('unlocks second lesson when first lesson is completed', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      map.set('l1', { percent: 92, completedAt: null });
      const allowed = canAccessLesson({
        isModuleUnlocked: true,
        lessonIndex: 1,
        orderedLessons: lessons,
        lessonProgressMap: map,
        sequentialLock: true,
      });
      expect(allowed).toBe(true);
    });
  });

  describe('canTakeQuiz & canAccessQuiz (R5: quiz after video lessons)', () => {
    const lessons = [{ id: 'l1' }, { id: 'l2' }];

    it('denies quiz access if any module lesson is incomplete', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      map.set('l1', { percent: 100, completedAt: new Date() });
      map.set('l2', { percent: 80, completedAt: null });

      const allowed = canTakeQuiz({
        isModuleUnlocked: true,
        moduleLessons: lessons,
        lessonProgressMap: map,
        thresholdPercent: 90,
      });
      expect(allowed).toBe(false);
    });

    it('unlocks quiz only when all module lessons are complete', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      map.set('l1', { percent: 95, completedAt: null });
      map.set('l2', { percent: 90, completedAt: null });

      const allowed = canTakeQuiz({
        isModuleUnlocked: true,
        moduleLessons: lessons,
        lessonProgressMap: map,
        thresholdPercent: 90,
      });
      expect(allowed).toBe(true);
      expect(canAccessQuiz({
        isModuleUnlocked: true,
        moduleLessons: lessons,
        lessonProgressMap: map,
        thresholdPercent: 90,
      })).toBe(true);
    });

    it('denies quiz access if max attempts reached', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      map.set('l1', { percent: 100, completedAt: new Date() });
      map.set('l2', { percent: 100, completedAt: new Date() });

      const allowed = canTakeQuiz({
        isModuleUnlocked: true,
        moduleLessons: lessons,
        lessonProgressMap: map,
        thresholdPercent: 90,
        attemptsCount: 3,
        maxAttempts: 3,
      });
      expect(allowed).toBe(false);
    });

    it('denies quiz access when requiresQuiz is false on module', () => {
      const map = new Map<string, { percent: number; completedAt: Date | null }>();
      map.set('l1', { percent: 100, completedAt: new Date() });
      map.set('l2', { percent: 100, completedAt: new Date() });

      const allowed = canTakeQuiz({
        isModuleUnlocked: true,
        moduleLessons: lessons,
        lessonProgressMap: map,
        requiresQuiz: false,
      });
      expect(allowed).toBe(false);
    });
  });

  describe('isModuleComplete (R8: module completion with toggles)', () => {
    it('returns true when lessons done, quiz passed, and assignment approved', () => {
      expect(
        isModuleComplete({
          lessonsDone: true,
          requiresQuiz: true,
          quizPassed: true,
          requiresAssignment: true,
          assignmentApproved: true,
        })
      ).toBe(true);
    });

    it('returns false if lessons are not done even if quiz and assignment are passed', () => {
      expect(
        isModuleComplete({
          lessonsDone: false,
          requiresQuiz: true,
          quizPassed: true,
          requiresAssignment: true,
          assignmentApproved: true,
        })
      ).toBe(false);
    });

    it('returns true when requiresAssignment is false without needing assignment approval', () => {
      expect(
        isModuleComplete({
          lessonsDone: true,
          requiresQuiz: true,
          quizPassed: true,
          requiresAssignment: false,
          assignmentApproved: false,
        })
      ).toBe(true);
    });

    it('returns true when requiresQuiz is false without needing quiz pass', () => {
      expect(
        isModuleComplete({
          lessonsDone: true,
          requiresQuiz: false,
          quizPassed: false,
          requiresAssignment: true,
          assignmentApproved: true,
        })
      ).toBe(true);
    });

    it('returns true when both requiresQuiz and requiresAssignment are false once lessons are done', () => {
      expect(
        isModuleComplete({
          lessonsDone: true,
          requiresQuiz: false,
          quizPassed: false,
          requiresAssignment: false,
          assignmentApproved: false,
        })
      ).toBe(true);
    });
  });

  describe('canAccessNextModule (R6: unlocking next module & enrollment guards)', () => {
    it('allows access to next module when previous module is complete', () => {
      expect(canAccessNextModule({ previousModuleComplete: true })).toBe(true);
    });

    it('blocks access if previous module is incomplete', () => {
      expect(canAccessNextModule({ previousModuleComplete: false })).toBe(false);
    });

    it('blocks access if enrollment payment is not PAID', () => {
      expect(
        canAccessNextModule({
          previousModuleComplete: true,
          enrollmentStatus: { paymentStatus: 'PENDING', accessStatus: 'ACTIVE' },
        })
      ).toBe(false);

      expect(
        canAccessNextModule({
          previousModuleComplete: true,
          enrollmentStatus: { paymentStatus: 'FAILED', accessStatus: 'ACTIVE' },
        })
      ).toBe(false);
    });

    it('blocks access if enrollment accessStatus is SUSPENDED or EXPIRED', () => {
      expect(
        canAccessNextModule({
          previousModuleComplete: true,
          enrollmentStatus: { paymentStatus: 'PAID', accessStatus: 'SUSPENDED' },
        })
      ).toBe(false);

      expect(
        canAccessNextModule({
          previousModuleComplete: true,
          enrollmentStatus: { paymentStatus: 'PAID', accessStatus: 'EXPIRED' },
        })
      ).toBe(false);
    });

    it('allows access when paid, active, and previous module is complete', () => {
      expect(
        canAccessNextModule({
          previousModuleComplete: true,
          enrollmentStatus: { paymentStatus: 'PAID', accessStatus: 'ACTIVE' },
        })
      ).toBe(true);
    });
  });

  describe('canAccessEnrollmentContent', () => {
    it('allows access for PAID and ACTIVE enrollments', () => {
      expect(canAccessEnrollmentContent({ paymentStatus: 'PAID', accessStatus: 'ACTIVE' })).toBe(true);
    });

    it('denies access for UNPAID or non-active enrollments', () => {
      expect(canAccessEnrollmentContent({ paymentStatus: 'PENDING', accessStatus: 'ACTIVE' })).toBe(false);
      expect(canAccessEnrollmentContent({ paymentStatus: 'FAILED', accessStatus: 'ACTIVE' })).toBe(false);
      expect(canAccessEnrollmentContent({ paymentStatus: 'PAID', accessStatus: 'SUSPENDED' })).toBe(false);
    });
  });

  describe('isLessonTimeGated (R2: Recorded vs Live)', () => {
    it('is never time-gated for RECORDED delivery mode (self-paced)', () => {
      const futureDate = new Date(Date.now() + 86400000);
      expect(isLessonTimeGated({ deliveryMode: 'RECORDED', sessionStartTime: futureDate })).toBe(false);
    });

    it('is time-gated for LIVE delivery mode if session is in the future', () => {
      const futureDate = new Date(Date.now() + 86400000);
      expect(isLessonTimeGated({ deliveryMode: 'LIVE', sessionStartTime: futureDate })).toBe(true);
    });

    it('is NOT time-gated for LIVE delivery mode if session has started', () => {
      const pastDate = new Date(Date.now() - 3600000);
      expect(isLessonTimeGated({ deliveryMode: 'LIVE', sessionStartTime: pastDate })).toBe(false);
    });
  });

  describe('canAccessFinalStage', () => {
    it('allows access only when all modules are completed', () => {
      expect(canAccessFinalStage({ allModulesCompleted: true })).toBe(true);
      expect(canAccessFinalStage({ allModulesCompleted: false })).toBe(false);
    });
  });

  describe('evaluateModuleStatus full lifecycle', () => {
    const mockModule = {
      id: 'm1',
      order: 1,
      requiresQuiz: true,
      requiresAssignment: true,
      lessons: [{ id: 'l1', order: 1, durationSeconds: 600 }],
      quiz: { id: 'q1', passingScorePercent: 70, maxAttempts: 3 },
      assignment: { id: 'a1', maxScore: 100 },
    };

    it('returns LOCKED if previous module is not complete', () => {
      const status = evaluateModuleStatus({
        isModuleUnlocked: false,
        module: mockModule,
        progressData: {
          lessonProgressMap: new Map(),
          quizAttempts: [],
          assignmentSubmissions: [],
        },
        settings: defaultSettings,
      });
      expect(status).toBe(ModuleStatus.LOCKED);
    });

    it('returns AVAILABLE if unlocked with no interaction', () => {
      const status = evaluateModuleStatus({
        isModuleUnlocked: true,
        module: mockModule,
        progressData: {
          lessonProgressMap: new Map(),
          quizAttempts: [],
          assignmentSubmissions: [],
        },
        settings: defaultSettings,
      });
      expect(status).toBe(ModuleStatus.AVAILABLE);
    });

    it('returns IN_PROGRESS when student has started watching lessons', () => {
      const map = new Map();
      map.set('l1', { watchedSeconds: 120, percent: 20, completedAt: null });

      const status = evaluateModuleStatus({
        isModuleUnlocked: true,
        module: mockModule,
        progressData: {
          lessonProgressMap: map,
          quizAttempts: [],
          assignmentSubmissions: [],
        },
        settings: defaultSettings,
      });
      expect(status).toBe(ModuleStatus.IN_PROGRESS);
    });

    it('returns AWAITING_REVIEW when lessons done + quiz passed + assignment pending review', () => {
      const map = new Map();
      map.set('l1', { watchedSeconds: 600, percent: 100, completedAt: new Date() });

      const status = evaluateModuleStatus({
        isModuleUnlocked: true,
        module: mockModule,
        progressData: {
          lessonProgressMap: map,
          quizAttempts: [{ scorePercent: 100, isPassed: true, attemptNumber: 1 }],
          assignmentSubmissions: [{ status: SubmissionStatus.PENDING }],
        },
        settings: defaultSettings,
      });
      expect(status).toBe(ModuleStatus.AWAITING_REVIEW);
    });

    it('returns COMPLETED strictly when lessons done + quiz passed + assignment APPROVED', () => {
      const map = new Map();
      map.set('l1', { watchedSeconds: 600, percent: 100, completedAt: new Date() });

      const status = evaluateModuleStatus({
        isModuleUnlocked: true,
        module: mockModule,
        progressData: {
          lessonProgressMap: map,
          quizAttempts: [{ scorePercent: 100, isPassed: true, attemptNumber: 1 }],
          assignmentSubmissions: [{ status: SubmissionStatus.APPROVED, grade: 95 }],
        },
        settings: defaultSettings,
      });
      expect(status).toBe(ModuleStatus.COMPLETED);
    });

    it('returns COMPLETED when requiresAssignment is false and quiz is passed', () => {
      const map = new Map();
      map.set('l1', { watchedSeconds: 600, percent: 100, completedAt: new Date() });

      const status = evaluateModuleStatus({
        isModuleUnlocked: true,
        module: {
          ...mockModule,
          requiresAssignment: false,
        },
        progressData: {
          lessonProgressMap: map,
          quizAttempts: [{ scorePercent: 80, isPassed: true, attemptNumber: 1 }],
          assignmentSubmissions: [],
        },
        settings: defaultSettings,
      });
      expect(status).toBe(ModuleStatus.COMPLETED);
    });
  });

  describe('isCertificateEligible & checkCertificateEligibility', () => {
    it('returns false if any single requirement is incomplete', () => {
      expect(
        isCertificateEligible({
          allModulesCompleted: false,
          mockTestPassed: true,
          finalProjectApproved: true,
          finalAssessmentPassed: true,
        })
      ).toBe(false);

      expect(
        isCertificateEligible({
          allModulesCompleted: true,
          mockTestPassed: false,
          finalProjectApproved: true,
          finalAssessmentPassed: true,
        })
      ).toBe(false);

      expect(
        isCertificateEligible({
          allModulesCompleted: true,
          mockTestPassed: true,
          finalProjectApproved: false,
          finalAssessmentPassed: true,
        })
      ).toBe(false);

      expect(
        isCertificateEligible({
          allModulesCompleted: true,
          mockTestPassed: true,
          finalProjectApproved: true,
          finalAssessmentPassed: false,
        })
      ).toBe(false);
    });

    it('returns true when all 4 conditions are met', () => {
      expect(
        isCertificateEligible({
          allModulesCompleted: true,
          mockTestPassed: true,
          finalProjectApproved: true,
          finalAssessmentPassed: true,
        })
      ).toBe(true);

      expect(
        checkCertificateEligibility({
          allModulesCompleted: true,
          mockTestPassed: true,
          finalProjectApproved: true,
          finalAssessmentPassed: true,
        })
      ).toBe(true);
    });
  });
});
