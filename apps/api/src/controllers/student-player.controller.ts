import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { progressionService, mergeWatchedIntervals } from '../services/progression.service.js';
import { storageService } from '../services/storage.service.js';
import { eventBus } from '../events/event-bus.js';
import { sendSuccess } from '../lib/utils.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  LessonAccessDeniedError,
} from '../lib/errors.js';
import {
  Role,
  LessonType,
  VideoProvider,
  PracticeStatus,
  CompletionSource,
} from '@academy/shared';

export class StudentPlayerController {
  /**
   * GET /student/courses – Enrolled courses only (Active & Paid)
   */
  async getMyCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;

      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
        include: {
          course: {
            include: {
              instructor: {
                select: { id: true, name: true, avatar: true },
              },
              _count: {
                select: { modules: true },
              },
            },
          },
          batch: true,
        },
        orderBy: { enrolledAt: 'desc' },
      });

      const coursesWithProgress = await Promise.all(
        enrollments.map(async (enr) => {
          const progression = await progressionService.getCourseProgression(
            enr.courseId,
            studentId
          );

          return {
            enrollmentId: enr.id,
            courseId: enr.course.id,
            title: enr.course.title,
            slug: enr.course.slug,
            description: enr.course.description,
            thumbnail: enr.course.thumbnail,
            category: enr.course.category,
            level: enr.course.level,
            mode: enr.mode,
            batch: enr.batch
              ? {
                  id: enr.batch.id,
                  name: enr.batch.name,
                  section: enr.batch.section,
                  scheduleText: enr.batch.scheduleText,
                }
              : null,
            instructor: enr.course.instructor,
            modulesCount: enr.course._count.modules,
            coursePercent: progression.coursePercent,
            completedModules: progression.completedModules,
            totalModules: progression.totalModules,
            nextUpLesson: progression.nextUpLesson,
            isCompleted: progression.isAllModulesCompleted,
            certificateEligible: progression.certificateEligible,
            enrolledAt: enr.enrolledAt.toISOString(),
          };
        })
      );

      return sendSuccess(res, coursesWithProgress);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /student/courses/:courseId/curriculum – Server-computed state
   */
  async getCourseCurriculum(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const courseId = req.params.courseId as string;

      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
        include: { batch: true, course: true },
      });

      if (!enrollment) {
        throw new LessonAccessDeniedError(
          'NOT_ENROLLED',
          'You are not enrolled in this course.'
        );
      }

      if (enrollment.paymentStatus !== 'PAID') {
        throw new LessonAccessDeniedError(
          'PAYMENT_PENDING',
          'Course enrollment payment is pending.'
        );
      }

      const progression = await progressionService.getCourseProgression(courseId, studentId);

      return sendSuccess(res, {
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          slug: enrollment.course.slug,
          description: enrollment.course.description,
          thumbnail: enrollment.course.thumbnail,
          mode: enrollment.mode,
          batch: enrollment.batch,
        },
        progression,
        // Flat fields used directly by the curriculum and lesson pages
        id: enrollment.course.id,
        title: enrollment.course.title,
        mode: enrollment.mode,
        batch: enrollment.batch,
        modules: progression.modules,
        progressPercent: progression.coursePercent,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /student/lessons/:lessonId – Authorized player payload
   */
  async getLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const role = req.user!.role as Role;
      const lessonId = req.params.lessonId as string;

      // Enforce the server-side guard while loading the lesson (Promise.all rejects if access is denied)
      const [, lesson] = await Promise.all([
        progressionService.assertCanAccessLesson(lessonId, studentId, role),
        prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            module: {
              include: {
                course: true,
                lessons: {
                  where: { deletedAt: null },
                  orderBy: { order: 'asc' },
                  select: { id: true, title: true, order: true, durationSeconds: true },
                },
              },
            },
            lessonResources: true,
            practiceTasks: {
              orderBy: { order: 'asc' },
              include: {
                progress: {
                  where: { studentId },
                },
              },
            },
            notes: {
              where: { studentId },
              orderBy: { createdAt: 'desc' },
            },
            bookmarks: {
              where: { studentId },
            },
            progress: {
              where: { studentId },
            },
          },
        }),
      ]);

      if (!lesson) {
        throw new NotFoundError('Lesson not found');
      }

      // Generate authorized playable URL
      const { playableUrl } = storageService.getPlayableVideoUrl(
        {
          id: lesson.id,
          videoUrl: lesson.videoUrl,
          videoProvider: lesson.videoProvider as VideoProvider,
        },
        studentId
      );

      // Sign resource download URLs
      const resourcesWithSignedUrls = lesson.lessonResources.map((resItem) => ({
        id: resItem.id,
        title: resItem.title,
        type: resItem.type,
        url: storageService.getSignedUrl(resItem.url),
        sizeBytes: resItem.sizeBytes,
        createdAt: resItem.createdAt.toISOString(),
      }));

      const practiceTasks = lesson.practiceTasks.map((pt) => ({
        id: pt.id,
        lessonId: pt.lessonId,
        moduleId: pt.moduleId,
        title: pt.title,
        instructions: pt.instructions,
        type: pt.type,
        expectedOutcome: pt.expectedOutcome,
        order: pt.order,
        myProgress: pt.progress[0]
          ? {
              id: pt.progress[0].id,
              studentId: pt.progress[0].studentId,
              practiceTaskId: pt.progress[0].practiceTaskId,
              status: pt.progress[0].status,
              notes: pt.progress[0].notes,
              attachmentKey: pt.progress[0].attachmentKey
                ? storageService.getSignedUrl(pt.progress[0].attachmentKey)
                : null,
              completedAt: pt.progress[0].completedAt?.toISOString() || null,
              updatedAt: pt.progress[0].updatedAt.toISOString(),
            }
          : null,
      }));

      const userProgress = lesson.progress[0];
      const isBookmarked = lesson.bookmarks.length > 0;

      // Find previous and next lesson IDs
      const moduleLessons = lesson.module.lessons;
      const currentIndex = moduleLessons.findIndex((l) => l.id === lesson.id);
      const prevLesson = currentIndex > 0 ? moduleLessons[currentIndex - 1] : null;
      const nextLesson =
        currentIndex < moduleLessons.length - 1 ? moduleLessons[currentIndex + 1] : null;

      const courseSettings = (lesson.module.course.settings || {}) as any;

      return sendSuccess(res, {
        lesson: {
          id: lesson.id,
          moduleId: lesson.moduleId,
          courseId: lesson.module.courseId,
          courseTitle: lesson.module.course.title,
          moduleTitle: lesson.module.title,
          title: lesson.title,
          description: lesson.description,
          type: lesson.type,
          videoProvider: lesson.videoProvider,
          playableUrl,
          durationSeconds: lesson.durationSeconds,
          order: lesson.order,
          resources: resourcesWithSignedUrls,
          practiceTasks,
          notes: lesson.notes.map((n) => ({
            id: n.id,
            timestampSeconds: n.timestampSeconds,
            text: n.text,
            createdAt: n.createdAt.toISOString(),
          })),
          isBookmarked,
          progress: {
            watchedSeconds: userProgress?.watchedSeconds || 0,
            percent: userProgress?.percent || 0,
            lastPositionSeconds: userProgress?.lastPositionSeconds || 0,
            completedAt: userProgress?.completedAt?.toISOString() || null,
            completionSource: userProgress?.completionSource || null,
          },
          navigation: {
            prevLesson,
            nextLesson,
            isLastInModule: currentIndex === moduleLessons.length - 1,
          },
          courseSettings: {
            lessonCompletionThresholdPercent:
              courseSettings.lessonCompletionThresholdPercent || 90,
            watermarkEnabled: courseSettings.watermarkEnabled !== false,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /student/lessons/:lessonId/progress – Heartbeat & Anti-Cheat
   */
  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const role = req.user!.role as Role;
      const lessonId = (req.params.lessonId || req.body.lessonId) as string;
      const { positionSeconds, playedIntervals, playbackRate } = req.body;

      // Access check, lesson and existing progress are independent lookups: run them together
      const [progressionBefore, lesson, existingProgress] = await Promise.all([
        progressionService.assertCanAccessLesson(lessonId, studentId, role),
        prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            module: {
              include: {
                course: true,
                lessons: { where: { deletedAt: null } },
              },
            },
          },
        }),
        prisma.lessonProgress.findUnique({
          where: { studentId_lessonId: { studentId, lessonId } },
        }),
      ]);

      if (!lesson) {
        throw new NotFoundError('Lesson not found');
      }

      const existingSegments = (existingProgress?.watchedSegments as [number, number][]) || [];
      const incomingIntervals: [number, number][] = playedIntervals || [];

      // If positionSeconds is provided, add small interval [positionSeconds - 12, positionSeconds] if no intervals sent
      if (incomingIntervals.length === 0 && positionSeconds > 0) {
        incomingIntervals.push([Math.max(0, positionSeconds - 12), positionSeconds]);
      }

      // Merge watched intervals tamper-resistantly
      const { merged, totalUniqueSeconds, percent } = mergeWatchedIntervals(
        existingSegments,
        incomingIntervals,
        lesson.durationSeconds,
        { maxPlaybackRate: playbackRate || 2.0 }
      );

      const courseSettings = (lesson.module.course.settings || {}) as any;
      const threshold = courseSettings.lessonCompletionThresholdPercent || 90;

      const highestPercent = Math.max(existingProgress?.percent || 0, percent);
      const isComplete = highestPercent >= threshold;

      const completedAt =
        existingProgress?.completedAt || (isComplete ? new Date() : null);
      const completionSource = existingProgress?.completedAt
        ? existingProgress.completionSource
        : isComplete
        ? CompletionSource.AUTO
        : CompletionSource.AUTO;

      const updatedProgress = await prisma.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId, lessonId } },
        update: {
          watchedSeconds: Math.max(
            existingProgress?.watchedSeconds || 0,
            Math.round(totalUniqueSeconds)
          ),
          lastPositionSeconds: positionSeconds !== undefined ? Number(positionSeconds) : existingProgress?.lastPositionSeconds || 0,
          watchedSegments: merged,
          percent: highestPercent,
          completedAt,
          completionSource,
        },
        create: {
          studentId,
          lessonId,
          watchedSeconds: Math.round(totalUniqueSeconds),
          lastPositionSeconds: Number(positionSeconds) || 0,
          watchedSegments: merged,
          percent: highestPercent,
          completedAt,
          completionSource,
        },
      });

      // If just newly completed, trigger domain events
      if (isComplete && !existingProgress?.completedAt) {
        await eventBus.emit('lesson.completed', {
          studentId,
          lessonId,
          moduleId: lesson.moduleId,
          courseId: lesson.module.courseId,
          completionSource: CompletionSource.AUTO,
          percent: highestPercent,
          occurredAt: new Date(),
        });

        // Check if all lessons in module are complete
        const allModuleLessons = lesson.module.lessons;
        const progresses = await prisma.lessonProgress.findMany({
          where: {
            studentId,
            lessonId: { in: allModuleLessons.map((l: { id: string }) => l.id) },
          },
        });

        const allLessonsDone = allModuleLessons.every((l: { id: string }) => {
          const lp = progresses.find((p) => p.lessonId === l.id);
          return lp && (lp.completedAt || lp.percent >= threshold);
        });

        if (allLessonsDone) {
          await eventBus.emit('module.lessons_completed', {
            studentId,
            moduleId: lesson.moduleId,
            courseId: lesson.module.courseId,
            occurredAt: new Date(),
          });
        }
      }

      // Only a newly completed lesson can change the progression; ordinary heartbeats reuse
      // the progression computed by the access check.
      const newlyCompleted = isComplete && !existingProgress?.completedAt;
      const progression =
        newlyCompleted || !progressionBefore
          ? await progressionService.getCourseProgression(lesson.module.courseId, studentId)
          : progressionBefore;

      return sendSuccess(res, {
        progress: {
          watchedSeconds: updatedProgress.watchedSeconds,
          lastPositionSeconds: updatedProgress.lastPositionSeconds,
          percent: updatedProgress.percent,
          isCompleted: !!updatedProgress.completedAt,
          completedAt: updatedProgress.completedAt?.toISOString() || null,
        },
        coursePercent: progression.coursePercent,
        thresholdMet: isComplete,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /student/lessons/:lessonId/complete – Manual completion (for READING or threshold verified VIDEO)
   */
  async markLessonComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const role = req.user!.role as Role;
      const lessonId = (req.params.lessonId || req.body.lessonId) as string;

      await progressionService.assertCanAccessLesson(lessonId, studentId, role);

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          module: { include: { course: true, lessons: true } },
          progress: { where: { studentId } },
        },
      });

      if (!lesson) {
        throw new NotFoundError('Lesson not found');
      }

      const existingProgress = lesson.progress[0];
      const courseSettings = (lesson.module.course.settings || {}) as any;
      const threshold = courseSettings.lessonCompletionThresholdPercent || 90;

      // If it's a VIDEO lesson, verify threshold
      if (lesson.type === LessonType.VIDEO) {
        const currentPercent = existingProgress?.percent || 0;
        if (currentPercent < threshold && !existingProgress?.completedAt) {
          throw new ConflictError(
            `Cannot mark video lesson complete. You have watched ${currentPercent}%, but ${threshold}% is required.`
          );
        }
      }

      const updatedProgress = await prisma.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId, lessonId } },
        update: {
          percent: Math.max(existingProgress?.percent || 0, 100),
          completedAt: existingProgress?.completedAt || new Date(),
          completionSource: existingProgress?.completionSource || CompletionSource.MANUAL,
        },
        create: {
          studentId,
          lessonId,
          watchedSeconds: lesson.durationSeconds,
          percent: 100,
          completedAt: new Date(),
          completionSource: CompletionSource.MANUAL,
        },
      });

      // Emit event
      await eventBus.emit('lesson.completed', {
        studentId,
        lessonId,
        moduleId: lesson.moduleId,
        courseId: lesson.module.courseId,
        completionSource: CompletionSource.MANUAL,
        percent: 100,
        occurredAt: new Date(),
      });

      const progression = await progressionService.getCourseProgression(
        lesson.module.courseId,
        studentId
      );

      return sendSuccess(res, {
        progress: updatedProgress,
        isCompleted: true,
        coursePercent: progression.coursePercent,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bookmark Toggle
   */
  async toggleBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const lessonId = (req.params.lessonId || req.body.lessonId) as string;

      const existing = await prisma.lessonBookmark.findUnique({
        where: { studentId_lessonId: { studentId, lessonId } },
      });

      if (existing) {
        await prisma.lessonBookmark.delete({
          where: { studentId_lessonId: { studentId, lessonId } },
        });
        return sendSuccess(res, { isBookmarked: false });
      } else {
        await prisma.lessonBookmark.create({
          data: { studentId, lessonId },
        });
        return sendSuccess(res, { isBookmarked: true });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Practice Task Progress Update
   */
  async updatePracticeProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const taskId = req.params.taskId as string;
      const { status, notes, attachmentKey } = req.body;

      const task = await prisma.practiceTask.findUnique({
        where: { id: taskId },
        include: {
          lesson: { include: { module: true } },
          module: true,
        },
      });

      if (!task) {
        throw new NotFoundError('Practice task not found');
      }

      const progress = await prisma.practiceProgress.upsert({
        where: { studentId_practiceTaskId: { studentId, practiceTaskId: taskId } },
        update: {
          status,
          ...(notes !== undefined ? { notes } : {}),
          ...(attachmentKey !== undefined ? { attachmentKey } : {}),
          completedAt: status === PracticeStatus.DONE ? new Date() : null,
        },
        create: {
          studentId,
          practiceTaskId: taskId,
          status,
          notes,
          attachmentKey,
          completedAt: status === PracticeStatus.DONE ? new Date() : null,
        },
      });

      return sendSuccess(res, progress);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Notes CRUD
   */
  async getLessonNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const lessonId = req.params.lessonId as string;

      const notes = await prisma.lessonNote.findMany({
        where: { studentId, lessonId },
        orderBy: { timestampSeconds: 'asc' },
      });

      return sendSuccess(res, notes);
    } catch (err) {
      next(err);
    }
  }

  async createLessonNote(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const lessonId = req.params.lessonId as string;
      const { text, timestampSeconds } = req.body;

      const note = await prisma.lessonNote.create({
        data: {
          studentId,
          lessonId,
          text,
          timestampSeconds: timestampSeconds !== undefined && timestampSeconds !== null ? Number(timestampSeconds) : null,
        },
      });

      return sendSuccess(res, note, 201);
    } catch (err) {
      next(err);
    }
  }

  async deleteLessonNote(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const noteId = req.params.noteId as string;

      const note = await prisma.lessonNote.findUnique({
        where: { id: noteId },
      });

      if (!note || note.studentId !== studentId) {
        throw new ForbiddenError('You can only delete your own notes');
      }

      await prisma.lessonNote.delete({ where: { id: noteId } });
      return sendSuccess(res, { message: 'Note deleted' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * LIVE CLASSES: List Live Sessions
   */
  async listLiveSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;

      // Get student active live enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          batchId: { not: null },
        },
        include: {
          batch: true,
          course: true,
        },
      });

      const batchIds = enrollments.map((e) => e.batchId!).filter(Boolean);

      const liveSessions = await prisma.liveSession.findMany({
        where: {
          batchId: { in: batchIds },
        },
        include: {
          batch: { include: { course: true } },
          attendances: { where: { studentId } },
        },
        orderBy: { startsAt: 'asc' },
      });

      const now = new Date();
      const joinWindowMinutes = parseInt(process.env.LIVE_JOIN_WINDOW_MINUTES || '15', 10);

      const formatted = liveSessions.map((session) => {
        const startsAt = new Date(session.startsAt);
        const endsAt = new Date(startsAt.getTime() + session.durationMinutes * 60000);
        const joinWindowStart = new Date(startsAt.getTime() - joinWindowMinutes * 60000);

        const canJoin = now >= joinWindowStart && now <= endsAt;
        const isPast = now > endsAt;
        const isUpcoming = now < joinWindowStart;

        return {
          id: session.id,
          batchId: session.batchId,
          batchName: session.batch.name,
          courseId: session.batch.course.id,
          courseTitle: session.batch.course.title,
          title: session.title,
          startsAt: session.startsAt.toISOString(),
          durationMinutes: session.durationMinutes,
          provider: session.provider,
          recordingUrl: session.recordingUrl,
          hasRecording: Boolean(session.recordingUrl),
          canJoin,
          isPast,
          isUpcoming,
          status: session.status,
          attendanceRecorded: session.attendances.length > 0,
        };
      });

      return sendSuccess(res, formatted);
    } catch (err) {
      next(err);
    }
  }

  /**
   * LIVE CLASSES: Join Session (Within window, records attendance)
   */
  async joinLiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;

      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: { batch: true },
      });

      if (!session) {
        throw new NotFoundError('Live session not found');
      }

      // Check student enrollment in this batch
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId,
          batchId: session.batchId,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
      });

      if (!enrollment) {
        throw new ForbiddenError('You are not enrolled in the batch for this live session.');
      }

      const now = new Date();
      const startsAt = new Date(session.startsAt);
      const endsAt = new Date(startsAt.getTime() + session.durationMinutes * 60000);
      const joinWindowMinutes = parseInt(process.env.LIVE_JOIN_WINDOW_MINUTES || '15', 10);
      const joinWindowStart = new Date(startsAt.getTime() - joinWindowMinutes * 60000);

      if (now < joinWindowStart) {
        throw new LessonAccessDeniedError(
          'LIVE_SESSION_NOT_STARTED',
          `This live session is scheduled to start at ${startsAt.toLocaleTimeString()}. You may join ${joinWindowMinutes} minutes prior.`
        );
      }

      if (now > endsAt) {
        throw new LessonAccessDeniedError(
          'LIVE_SESSION_ENDED',
          'This live session has already concluded. Please check back for the recording.'
        );
      }

      // Idempotently record attendance
      await prisma.liveAttendance.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId },
        },
        update: {},
        create: {
          sessionId,
          studentId,
          joinedAt: new Date(),
          status: 'PRESENT',
        },
      });

      // TODO(client-requirement): Integrate Zoom Meeting SDK / OAuth API for dynamic signature generation and attendance synchronization.
      return sendSuccess(res, {
        joinUrl: session.joinUrl,
        provider: session.provider,
        title: session.title,
        startsAt: session.startsAt,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * LIVE CLASSES: Generate iCal (.ics) Calendar Event
   */
  async getLiveSessionICal(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.id as string;
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: { batch: { include: { course: true } } },
      });

      if (!session || !session.batch) {
        throw new NotFoundError('Live session not found');
      }

      const startsAt = new Date(session.startsAt);
      const endsAt = new Date(startsAt.getTime() + session.durationMinutes * 60000);

      const formatICalDate = (date: Date) =>
        date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Creative & IT Academy//Student LMS//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${session.id}@academy.com`,
        `DTSTAMP:${formatICalDate(new Date())}`,
        `DTSTART:${formatICalDate(startsAt)}`,
        `DTEND:${formatICalDate(endsAt)}`,
        `SUMMARY:${session.batch.course.title} - ${session.title}`,
        `DESCRIPTION:Batch: ${session.batch.name}\\nJoin URL: ${session.joinUrl}`,
        `URL:${session.joinUrl}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="session-${session.id}.ics"`
      );
      return res.send(ics);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Storage Download Endpoint (Verifies HMAC signature)
   */
  async downloadResource(req: Request, res: Response, next: NextFunction) {
    try {
      const { key, expires, signature } = req.query;

      if (!key || !expires || !signature) {
        throw new ForbiddenError('Invalid signed resource URL');
      }

      const isValid = storageService.verifySignedUrl(
        key as string,
        parseInt(expires as string, 10),
        signature as string
      );

      if (!isValid) {
        throw new ForbiddenError('Resource URL signature is invalid or has expired');
      }

      // If key is a path/url, redirect or stream
      return res.redirect(key as string);
    } catch (err) {
      next(err);
    }
  }
}

export const studentPlayerController = new StudentPlayerController();
