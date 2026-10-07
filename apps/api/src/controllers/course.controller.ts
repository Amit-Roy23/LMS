import { Role } from '@academy/shared';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { courseService } from '../services/course.service.js';
import { progressionService } from '../services/progression.service.js';
import { sendSuccess, sendPaginated } from '../lib/utils.js';

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
      return sendSuccess(res, course);
    } catch (err) {
      next(err);
    }
  }

  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await courseService.createCourse(req.body, req.user!.userId);
      return sendSuccess(res, course, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const course = await courseService.updateCourse(id, req.body);
      return sendSuccess(res, course);
    } catch (err) {
      next(err);
    }
  }

  async deleteCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await courseService.deleteCourse(id);
      return sendSuccess(res, { message: 'Course deleted successfully' });
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
      return sendSuccess(res, mod, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const mod = await courseService.updateModule(moduleId, req.body);
      return sendSuccess(res, mod);
    } catch (err) {
      next(err);
    }
  }

  async deleteModule(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      await courseService.deleteModule(moduleId);
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
      return sendSuccess(res, lesson, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const lesson = await courseService.updateLesson(lessonId, req.body);
      return sendSuccess(res, lesson);
    } catch (err) {
      next(err);
    }
  }

  async deleteLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      await courseService.deleteLesson(lessonId);
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
      return sendSuccess(res, resource, 201);
    } catch (err) {
      next(err);
    }
  }

  async deleteLessonResource(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceId = req.params.resourceId as string;
      await prisma.lessonResource.delete({ where: { id: resourceId } });
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
      return sendSuccess(res, task, 201);
    } catch (err) {
      next(err);
    }
  }

  async updatePracticeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const task = await prisma.practiceTask.update({
        where: { id },
        data: req.body,
      });
      return sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  }

  async deletePracticeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.practiceTask.delete({ where: { id } });
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
      return sendSuccess(res, session, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateLiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const session = await prisma.liveSession.update({
        where: { id },
        data: {
          ...req.body,
          ...(req.body.startsAt ? { startsAt: new Date(req.body.startsAt) } : {}),
        },
      });
      return sendSuccess(res, session);
    } catch (err) {
      next(err);
    }
  }

  async deleteLiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.liveSession.delete({ where: { id } });
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

