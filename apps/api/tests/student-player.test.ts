import { describe, it, expect } from 'vitest';
import {
  assertCanAccessLesson,
  LessonAccessDeniedError,
  isPracticeCompleted,
  canTakeQuiz,
  isWithinJoinWindow,
} from '../src/services/progression.service.js';
import { StorageService } from '../src/services/storage.service.js';
import { DeliveryMode, EnrollmentStatus, PaymentStatus, AccessStatus } from '@academy/shared';

describe('Student Player & Access Control Matrix (Layer 2)', () => {
  const enrollmentActive = {
    id: 'enr-1',
    studentId: 'stu-1',
    courseId: 'crs-1',
    mode: DeliveryMode.RECORDED,
    status: EnrollmentStatus.ACTIVE,
    paymentStatus: PaymentStatus.PAID,
    accessStatus: AccessStatus.ACTIVE,
  };

  const moduleUnlocked = {
    id: 'mod-1',
    courseId: 'crs-1',
    order: 1,
    requirePracticeDone: false,
    requiresQuiz: true,
    requiresAssignment: true,
  };

  const module2 = {
    id: 'mod-2',
    courseId: 'crs-1',
    order: 2,
    requirePracticeDone: false,
    requiresQuiz: true,
    requiresAssignment: true,
  };

  const lesson1_1 = {
    id: 'les-1',
    moduleId: 'mod-1',
    order: 1,
    title: 'Lesson 1',
    durationSeconds: 600,
  };

  const lesson1_2 = {
    id: 'les-2',
    moduleId: 'mod-1',
    order: 2,
    title: 'Lesson 2',
    durationSeconds: 600,
  };

  describe('Lesson Access Matrix & 403 Error Codes', () => {
    it('throws NOT_ENROLLED when no enrollment exists', () => {
      try {
        assertCanAccessLesson({
          enrollment: null,
          lesson: lesson1_1,
          module: moduleUnlocked,
          courseSettings: { sequentialLessonsLock: true },
          previousModuleCompleted: true,
          previousLessonsCompleted: true,
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LessonAccessDeniedError);
        expect(err.reasonCode).toBe('NOT_ENROLLED');
        expect(err.statusCode).toBe(403);
      }
    });

    it('throws PAYMENT_PENDING when enrollment is unpaid', () => {
      try {
        assertCanAccessLesson({
          enrollment: {
            ...enrollmentActive,
            paymentStatus: PaymentStatus.PENDING,
          },
          lesson: lesson1_1,
          module: moduleUnlocked,
          courseSettings: { sequentialLessonsLock: true },
          previousModuleCompleted: true,
          previousLessonsCompleted: true,
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LessonAccessDeniedError);
        expect(err.reasonCode).toBe('PAYMENT_PENDING');
      }
    });

    it('throws ACCESS_SUSPENDED when access status is SUSPENDED', () => {
      try {
        assertCanAccessLesson({
          enrollment: {
            ...enrollmentActive,
            accessStatus: AccessStatus.SUSPENDED,
          },
          lesson: lesson1_1,
          module: moduleUnlocked,
          courseSettings: { sequentialLessonsLock: true },
          previousModuleCompleted: true,
          previousLessonsCompleted: true,
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LessonAccessDeniedError);
        expect(err.reasonCode).toBe('ACCESS_SUSPENDED');
      }
    });

    it('throws MODULE_LOCKED when previous module is not complete', () => {
      try {
        assertCanAccessLesson({
          enrollment: enrollmentActive,
          lesson: { ...lesson1_1, moduleId: 'mod-2' },
          module: module2,
          courseSettings: { sequentialLessonsLock: true },
          previousModuleCompleted: false, // Module 1 not finished
          previousLessonsCompleted: true,
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LessonAccessDeniedError);
        expect(err.reasonCode).toBe('MODULE_LOCKED');
      }
    });

    it('throws PREVIOUS_LESSON_INCOMPLETE when sequential lock is enabled and prev lesson is incomplete', () => {
      try {
        assertCanAccessLesson({
          enrollment: enrollmentActive,
          lesson: lesson1_2,
          module: moduleUnlocked,
          courseSettings: { sequentialLessonsLock: true },
          previousModuleCompleted: true,
          previousLessonsCompleted: false, // Lesson 1.1 not watched
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LessonAccessDeniedError);
        expect(err.reasonCode).toBe('PREVIOUS_LESSON_INCOMPLETE');
      }
    });

    it('allows access to lesson when all conditions are satisfied', () => {
      expect(() => {
        assertCanAccessLesson({
          enrollment: enrollmentActive,
          lesson: lesson1_1,
          module: moduleUnlocked,
          courseSettings: { sequentialLessonsLock: true },
          previousModuleCompleted: true,
          previousLessonsCompleted: true,
        });
      }).not.toThrow();
    });
  });

  describe('Practice Gating & Quiz Unlock Rules', () => {
    it('isPracticeCompleted checks whether all practice tasks have DONE status', () => {
      const task1 = { id: 't1' };
      const task2 = { id: 't2' };

      // None done
      expect(isPracticeCompleted([task1, task2], [])).toBe(false);

      // Only 1 done
      expect(
        isPracticeCompleted([task1, task2], [
          { practiceTaskId: 't1', status: 'DONE' },
          { practiceTaskId: 't2', status: 'IN_PROGRESS' },
        ])
      ).toBe(false);

      // All done
      expect(
        isPracticeCompleted([task1, task2], [
          { practiceTaskId: 't1', status: 'DONE' },
          { practiceTaskId: 't2', status: 'DONE' },
        ])
      ).toBe(true);
    });

    it('canTakeQuiz respects requirePracticeDone module setting', () => {
      // 1. requirePracticeDone = false: quiz unlocks when all lessons are completed
      expect(
        canTakeQuiz({
          allLessonsCompleted: true,
          practiceCompleted: false,
          requirePracticeDone: false,
        })
      ).toBe(true);

      // 2. requirePracticeDone = true: quiz is LOCKED if practice is incomplete
      expect(
        canTakeQuiz({
          allLessonsCompleted: true,
          practiceCompleted: false,
          requirePracticeDone: true,
        })
      ).toBe(false);

      // 3. requirePracticeDone = true: quiz unlocks when both lessons and practice are complete
      expect(
        canTakeQuiz({
          allLessonsCompleted: true,
          practiceCompleted: true,
          requirePracticeDone: true,
        })
      ).toBe(true);
    });
  });

  describe('Live Session Join Window Validation', () => {
    const windowMinutes = 15;

    it('returns isTooEarly when current time is earlier than 15 mins before start', () => {
      const startsAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins in future
      const result = isWithinJoinWindow(startsAt, 60, windowMinutes);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TOO_EARLY');
    });

    it('allows join when within 15 minutes before scheduled start', () => {
      const startsAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins in future
      const result = isWithinJoinWindow(startsAt, 60, windowMinutes);

      expect(result.allowed).toBe(true);
    });

    it('allows join during ongoing live class', () => {
      const startsAt = new Date(Date.now() - 20 * 60 * 1000); // Started 20 mins ago, duration 60 mins
      const result = isWithinJoinWindow(startsAt, 60, windowMinutes);

      expect(result.allowed).toBe(true);
    });

    it('returns isEnded after scheduled class duration expires', () => {
      const startsAt = new Date(Date.now() - 70 * 60 * 1000); // Started 70 mins ago, duration 60 mins
      const result = isWithinJoinWindow(startsAt, 60, windowMinutes);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ENDED');
    });
  });

  describe('Storage Signed URL Generator & Expiry Verification', () => {
    it('generates a verifiable signed token that passes verification', () => {
      const fileKey = 'courses/fullstack/resources/cheatsheet.pdf';
      const signed = StorageService.generateSignedUrl(fileKey, 3600);

      expect(signed.token).toBeDefined();
      expect(signed.expiresAt).toBeGreaterThan(Date.now());

      const verified = StorageService.verifySignedToken(fileKey, signed.token);
      expect(verified).toBe(true);
    });

    it('rejects tampered or mismatched fileKey token', () => {
      const signed = StorageService.generateSignedUrl('file-A.pdf', 3600);
      const verified = StorageService.verifySignedToken('file-B-tampered.pdf', signed.token);

      expect(verified).toBe(false);
    });

    it('rejects expired signed tokens', () => {
      // Generate token that expired 10 seconds ago
      const fileKey = 'video.mp4';
      const signed = StorageService.generateSignedUrl(fileKey, -10);

      const verified = StorageService.verifySignedToken(fileKey, signed.token);
      expect(verified).toBe(false);
    });
  });
});
