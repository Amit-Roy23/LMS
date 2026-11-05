import { Role } from '@academy/shared';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { courseService } from '../services/course.service.js';
import { progressionService } from '../services/progression.service.js';
import { sendSuccess, sendPaginated } from '../lib/utils.js';
import { recordAudit, changedFields } from '../lib/audit.js';
import { isInstructor } from '../lib/access.js';

/** Removes `isCorrect` from every question option in a course payload. */
function stripAnswerKeys<T>(course: T): T {
  const clean = (questions?: any[]) =>
    questions?.map((q) => ({ ...q, options: q.options?.map(({ isCorrect, ...o }: any) => o) }));
  const c: any = course;
  return {
    ...c,
    modules: c.modules?.map((m: any) => (m.quiz ? { ...m, quiz: { ...m.quiz, questions: clean(m.quiz.questions) } } : m)),
    mockTest: c.mockTest ? { ...c.mockTest, questions: clean(c.mockTest.questions) } : c.mockTest,
    finalAssessment: c.finalAssessment
      ? { ...c.finalAssessment, questions: clean(c.finalAssessment.questions) }
      : c.finalAssessment,
  };
}

// Edge cache for public, non-personalised responses (served stale while refreshing)
const PUBLIC_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

export class CourseController {
  async listPublicCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const category = req.query.category as string;
      const level = req.query.level as any;
      const search = req.query.search as string;

      const result = await courseService.listCourses({
        page,
        limit,
        category,
        level,
        status: 'PUBLISHED' as any,
        search,
      });

      // The public catalogue is identical for every visitor, so let the CDN serve it
      res.set('Cache-Control', PUBLIC_CACHE);
      return sendPaginated(res, result.items, result.total, result.page, result.limit);
    } catch (err) {
      next(err);
    }
  }

  async listAdminCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const result = await courseService.listCourses({
        page,
        limit,
        search,
        // Instructors see only the courses they teach
        instructorId: isInstructor(req) ? req.user!.userId : undefined,
      });

      return sendPaginated(res, result.items, result.total, result.page, result.limit);
    } catch (err) {
      next(err);
    }
  }

  async getCourseBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const course = await courseService.getCourseBySlug(slug, req.user?.userId);
      // Anonymous responses are shared; signed-in ones include the viewer's enrollment
      res.set('Cache-Control', req.user ? 'private, no-store' : PUBLIC_CACHE);
      return sendSuccess(res, course);
    } catch (err) {
      next(err);
    }
  }

  async getCourseById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const course = await courseService.getCourseById(id);
      const isStaff = req.user?.role === Role.ADMIN || req.user?.role === Role.STAFF || req.user?.role === Role.INSTRUCTOR;
      // Students may see questions and options, but never which option is correct
      return sendSuccess(res, isStaff ? course : stripAnswerKeys(course));
    } catch (err) {
      next(err);
    }
  }

  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      // Admins may assign the course to an instructor; everyone else creates their own
      const { instructorId, ...data } = req.body;
      const owner = req.user!.role === Role.ADMIN && instructorId ? instructorId : req.user!.userId;
      const course = await courseService.createCourse(data, owner);
      await recordAudit(req, { action: 'COURSE_CREATED', entityType: 'Course', entityId: course.id, after: { title: course.title } });
      return sendSuccess(res, course, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = { ...req.body };
      if (req.user!.role !== Role.ADMIN) delete data.instructorId; // only admins reassign courses
      const existing = await prisma.course.findUnique({ where: { id } });
      const course = await courseService.updateCourse(id, data);
      const diff = changedFields(existing, data);
      if (Object.keys(diff.after).length) {
        await recordAudit(req, { action: 'COURSE_UPDATED', entityType: 'Course', entityId: id, ...diff, details: { title: course.title } });
      }
      return sendSuccess(res, course);
    } catch (err) {
      next(err);
    }
  }

  async deleteCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const course = await courseService.deleteCourse(id);
      await recordAudit(req, { action: 'COURSE_DELETED', entityType: 'Course', entityId: id, details: { title: course.title } });
      return sendSuccess(res, { message: 'Course moved to trash. It can be restored from the activity log.' });
    } catch (err) {
      next(err);
    }
  }

  async getCourseProgression(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const progression = await progressionService.getCourseProgression(
        id,
        req.user!.userId
      );
      return sendSuccess(res, progression);
    } catch (err) {
      next(err);
    }
  }

  // Module endpoints
  async createModule(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = (req.params.courseId || req.body.courseId) as string;
      const mod = await courseService.createModule({
        courseId,
        ...req.body,
      });
      await recordAudit(req, { action: 'MODULE_CREATED', entityType: 'Module', entityId: mod.id, after: { title: mod.title } });
      return sendSuccess(res, mod, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const existing = await prisma.module.findUnique({ where: { id: moduleId } });
      const mod = await courseService.updateModule(moduleId, req.body);
      const diff = changedFields(existing, req.body);
      if (Object.keys(diff.after).length) {
        await recordAudit(req, { action: 'MODULE_UPDATED', entityType: 'Module', entityId: moduleId, ...diff, details: { title: mod.title } });
      }
      return sendSuccess(res, mod);
    } catch (err) {
      next(err);
    }
  }

  async deleteModule(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const mod = await courseService.deleteModule(moduleId);
      await recordAudit(req, { action: 'MODULE_DELETED', entityType: 'Module', entityId: moduleId, details: { title: mod.title } });
      return sendSuccess(res, { message: 'Module deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Lesson endpoints
  async createLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = (req.params.moduleId || req.body.moduleId) as string;
      const lesson = await courseService.createLesson({
        moduleId,
        ...req.body,
      });
      await recordAudit(req, { action: 'LESSON_CREATED', entityType: 'Lesson', entityId: lesson.id, after: { title: lesson.title } });
      return sendSuccess(res, lesson, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const { hlsKeyHex, ...patch } = req.body; // stream keys are managed by the video pipeline only
      const existing = await prisma.lesson.findUnique({ where: { id: lessonId } });
      const lesson = await courseService.updateLesson(lessonId, patch);
      const diff = changedFields(existing, patch);
      if (Object.keys(diff.after).length) {
        await recordAudit(req, { action: 'LESSON_UPDATED', entityType: 'Lesson', entityId: lessonId, ...diff, details: { title: lesson.title } });
      }
      return sendSuccess(res, { ...lesson, hlsKeyHex: undefined });
    } catch (err) {
      next(err);
    }
  }

  async deleteLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const lesson = await courseService.deleteLesson(lessonId);
      await recordAudit(req, { action: 'LESSON_DELETED', entityType: 'Lesson', entityId: lessonId, details: { title: lesson.title } });
      return sendSuccess(res, { message: 'Lesson deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Reordering
  async reorderModules(req: Request, res: Response, next: NextFunction) {
    try {
      const { orders } = req.body;
      await Promise.all(
        orders.map((item: { id: string; order: number }) =>
          prisma.module.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );
      return sendSuccess(res, { message: 'Modules reordered successfully' });
    } catch (err) {
      next(err);
    }
  }

  async reorderLessons(req: Request, res: Response, next: NextFunction) {
    try {
      const { orders } = req.body;
      await Promise.all(
        orders.map((item: { id: string; order: number }) =>
          prisma.lesson.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );
      return sendSuccess(res, { message: 'Lessons reordered successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Resources
  async createLessonResource(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId || req.body.lessonId;
      const { title, type, url, sizeBytes } = req.body;
      const resource = await prisma.lessonResource.create({
        data: {
          lessonId,
          title,
          type: type || 'PDF',
          url,
          sizeBytes: sizeBytes || null,
        },
      });
      await recordAudit(req, { action: 'LESSONRESOURCE_CREATED', entityType: 'LessonResource', entityId: resource.id, after: { title } });
      return sendSuccess(res, resource, 201);
    } catch (err) {
      next(err);
    }
  }

  async deleteLessonResource(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceId = req.params.resourceId as string;
      const snapshot = await prisma.lessonResource.delete({ where: { id: resourceId } });
      await recordAudit(req, { action: 'LESSONRESOURCE_DELETED', entityType: 'LessonResource', entityId: resourceId, before: snapshot, details: { title: snapshot.title } });
      return sendSuccess(res, { message: 'Resource deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Practice Tasks
  async createPracticeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { lessonId, moduleId, title, instructions, type, expectedOutcome, order } = req.body;
      const task = await prisma.practiceTask.create({
        data: {
          lessonId: lessonId || null,
          moduleId: moduleId || null,
          title,
          instructions,
          type: type || 'CHECKLIST',
          expectedOutcome: expectedOutcome || null,
          order: order || 1,
        },
      });
      await recordAudit(req, { action: 'PRACTICETASK_CREATED', entityType: 'PracticeTask', entityId: task.id, after: { title } });
      return sendSuccess(res, task, 201);
    } catch (err) {
      next(err);
    }
  }

  async updatePracticeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.practiceTask.findUnique({ where: { id } });
      const task = await prisma.practiceTask.update({
        where: { id },
        data: req.body,
      });
      const diff = changedFields(existing, req.body);
      if (Object.keys(diff.after).length) {
        await recordAudit(req, { action: 'PRACTICETASK_UPDATED', entityType: 'PracticeTask', entityId: id, ...diff, details: { title: task.title } });
      }
      return sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  }

  async deletePracticeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const snapshot = await prisma.practiceTask.delete({ where: { id } });
      await recordAudit(req, { action: 'PRACTICETASK_DELETED', entityType: 'PracticeTask', entityId: id, before: snapshot, details: { title: snapshot.title } });
      return sendSuccess(res, { message: 'Practice task deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Live Sessions
  async createLiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await prisma.liveSession.create({
        data: {
          ...req.body,
          startsAt: new Date(req.body.startsAt),
        },
      });
      await recordAudit(req, { action: 'LIVESESSION_CREATED', entityType: 'LiveSession', entityId: session.id, after: { title: session.title } });
      return sendSuccess(res, session, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateLiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.liveSession.findUnique({ where: { id } });
      const session = await prisma.liveSession.update({
        where: { id },
        data: {
          ...req.body,
          ...(req.body.startsAt ? { startsAt: new Date(req.body.startsAt) } : {}),
        },
      });
      const diff = changedFields(existing, { ...req.body, ...(req.body.startsAt ? { startsAt: new Date(req.body.startsAt).toISOString() } : {}) });
      if (Object.keys(diff.after).length) {
        await recordAudit(req, { action: 'LIVESESSION_UPDATED', entityType: 'LiveSession', entityId: id, ...diff, details: { title: session.title } });
      }
      return sendSuccess(res, session);
    } catch (err) {
      next(err);
    }
  }

  async deleteLiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const snapshot = await prisma.liveSession.delete({ where: { id } });
      await recordAudit(req, { action: 'LIVESESSION_DELETED', entityType: 'LiveSession', entityId: id, before: snapshot, details: { title: snapshot.title } });
      return sendSuccess(res, { message: 'Live session deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Lesson Progress
  async updateLessonProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { lessonId, watchedSeconds, percent, markComplete } = req.body;
      const targetLessonId = (lessonId || req.params.lessonId) as string;
      const result = await courseService.recordLessonProgress(
        req.user!.userId,
        targetLessonId,
        watchedSeconds,
        percent,
        markComplete,
        req.user!.role as Role
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const courseController = new CourseController();

