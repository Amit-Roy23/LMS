import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma.js';
import { ForbiddenError, NotFoundError } from './errors.js';
import { Role } from '@academy/shared';

/**
 * Permission model for the admin console
 *  - ADMIN (max 3): everything; sensitive actions need PIN + OTP (see step-up middleware)
 *  - STAFF: day-to-day work (admissions, enquiries, schedules, content upload); no deletes,
 *    prices, refunds, roles or settings, and every change can be undone by an admin
 *  - INSTRUCTOR: only their own courses, the students enrolled in them and their reviews
 */
export const CONSOLE_ROLES = [Role.ADMIN, Role.STAFF, Role.INSTRUCTOR];

export const isInstructor = (req: Request) => req.user?.role === Role.INSTRUCTOR;

type CourseResolver = (req: Request) => Promise<string | string[] | null | undefined>;

/** Lets instructors through only when every course the request touches is theirs. */
export function ownCourse(resolve: CourseResolver) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!isInstructor(req)) return next();
      const raw = await resolve(req);
      const ids = Array.from(new Set(([] as (string | null | undefined)[]).concat(raw).filter(Boolean))) as string[];
      if (!ids.length) throw new NotFoundError('Course not found');
      const owned = await prisma.course.count({ where: { id: { in: ids }, instructorId: req.user!.userId } });
      if (owned !== ids.length) throw new ForbiddenError('You can only manage your own courses.');
      next();
    } catch (err) {
      next(err);
    }
  };
}

const p = (req: Request, key: string) => (req.params[key] as string) || undefined;

export const courseOf = {
  courseParam: (key = 'id'): CourseResolver => async (req) => p(req, key),
  courseBody: (): CourseResolver => async (req) => req.body?.courseId,
  module: (key = 'moduleId'): CourseResolver => async (req) => {
    const id = p(req, key) || req.body?.moduleId;
    if (!id) return null;
    return (await prisma.module.findUnique({ where: { id }, select: { courseId: true } }))?.courseId;
  },
  lesson: (key = 'lessonId'): CourseResolver => async (req) => {
    const id = p(req, key) || req.body?.lessonId;
    if (!id) return null;
    return (await prisma.lesson.findUnique({ where: { id }, select: { module: { select: { courseId: true } } } }))?.module.courseId;
  },
  resource: (): CourseResolver => async (req) => {
    const r = await prisma.lessonResource.findUnique({
      where: { id: p(req, 'resourceId') },
      select: { lesson: { select: { module: { select: { courseId: true } } } } },
    });
    return r?.lesson.module.courseId;
  },
  practiceTask: (): CourseResolver => async (req) => {
    const id = p(req, 'id');
    if (id) {
      const t = await prisma.practiceTask.findUnique({
        where: { id },
        select: { lesson: { select: { module: { select: { courseId: true } } } }, module: { select: { courseId: true } } },
      });
      return t?.lesson?.module.courseId || t?.module?.courseId;
    }
    return (await courseOf.lesson()(req)) || (await courseOf.module()(req));
  },
  liveSession: (): CourseResolver => async (req) => {
    const id = p(req, 'id');
    if (id) {
      return (await prisma.liveSession.findUnique({ where: { id }, select: { batch: { select: { courseId: true } } } }))?.batch.courseId;
    }
    if (!req.body?.batchId) return null;
    return (await prisma.batch.findUnique({ where: { id: req.body.batchId }, select: { courseId: true } }))?.courseId;
  },
  quiz: (key = 'quizId'): CourseResolver => async (req) => {
    const id = p(req, key) || req.body?.quizId;
    if (!id) return null;
    return (await prisma.quiz.findUnique({ where: { id }, select: { module: { select: { courseId: true } } } }))?.module.courseId;
  },
  question: (): CourseResolver => async (req) => {
    const q = await prisma.question.findUnique({
      where: { id: p(req, 'questionId') },
      select: { quiz: { select: { module: { select: { courseId: true } } } } },
    });
    return q?.quiz.module.courseId;
  },
  attempt: (): CourseResolver => async (req) => {
    const a = await prisma.quizAttempt.findUnique({
      where: { id: p(req, 'attemptId') },
      select: { quiz: { select: { module: { select: { courseId: true } } } } },
    });
    return a?.quiz.module.courseId;
  },
  reorderModules: (): CourseResolver => async (req) => {
    const ids = (req.body?.orders || []).map((o: any) => o.id);
    const rows = await prisma.module.findMany({ where: { id: { in: ids } }, select: { courseId: true } });
    return rows.length === ids.length ? rows.map((r) => r.courseId) : null;
  },
  reorderLessons: (): CourseResolver => async (req) => {
    const ids = (req.body?.orders || []).map((o: any) => o.id);
    const rows = await prisma.lesson.findMany({ where: { id: { in: ids } }, select: { module: { select: { courseId: true } } } });
    return rows.length === ids.length ? rows.map((r) => r.module.courseId) : null;
  },
};

/** Instructors may look at a student only when the student is enrolled in one of their courses. */
export function ownStudent(key = 'studentId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!isInstructor(req)) return next();
      const enrolled = await prisma.enrollment.count({
        where: { studentId: p(req, key), course: { instructorId: req.user!.userId } },
      });
      if (!enrolled) throw new ForbiddenError('This student is not enrolled in any of your courses.');
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Course ids an instructor teaches, or null (no restriction) for admins and staff. */
export async function scopedCourseIds(req: Request): Promise<string[] | null> {
  if (!isInstructor(req)) return null;
  const rows = await prisma.course.findMany({ where: { instructorId: req.user!.userId, deletedAt: null }, select: { id: true } });
  return rows.map((r) => r.id);
}
