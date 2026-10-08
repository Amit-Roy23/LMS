import { prisma } from '../lib/prisma.js';
import { CourseStatus, CourseLevel, Role } from '@academy/shared';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import { progressionService } from './progression.service.js';

export class CourseService {
  async listCourses(params: {
    page?: number;
    limit?: number;
    category?: string;
    level?: CourseLevel;
    status?: CourseStatus;
    search?: string;
    instructorId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (params.status) {
      where.status = params.status;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.level) {
      where.level = params.level;
    }

    if (params.instructorId) {
      where.instructorId = params.instructorId;
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          _count: {
            select: {
              modules: true,
              enrollments: true,
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    // Lesson counts and review stats for the course cards, fetched together in one round trip
    const ids = items.map((c) => c.id);
    const [moduleLessonCounts, ratings] = await Promise.all([
      prisma.module.findMany({
        where: { courseId: { in: ids }, deletedAt: null },
        select: { courseId: true, _count: { select: { lessons: { where: { deletedAt: null } } } } },
      }),
      prisma.feedback.groupBy({
        by: ['courseId'],
        where: { courseId: { in: ids } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    const lessonsByCourse = new Map<string, number>();
    moduleLessonCounts.forEach((m) =>
      lessonsByCourse.set(m.courseId, (lessonsByCourse.get(m.courseId) || 0) + m._count.lessons)
    );
    const ratingByCourse = new Map(ratings.map((r) => [r.courseId, r]));

    const formatted = items.map((c) => ({
      ...c,
      modulesCount: c._count.modules,
      lessonsCount: lessonsByCourse.get(c.id) || 0,
      enrolledStudentsCount: c._count.enrollments,
      averageRating: ratingByCourse.get(c.id)?._avg.rating ?? null,
      reviewsCount: ratingByCourse.get(c.id)?._count._all ?? 0,
    }));

    return { items: formatted, total, page, limit };
  }

  async getCourseBySlug(slug: string, studentId?: string) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        instructor: { select: { id: true, name: true, email: true, avatar: true } },
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                durationSeconds: true,
                order: true,
                isPreview: true,
                videoUrl: true,
                videoProvider: true,
              },
            },
            quiz: { select: { id: true, title: true, passingScorePercent: true } },
            assignment: { select: { id: true, title: true, maxScore: true } },
          },
        },
        mockTest: { select: { id: true, title: true, durationMinutes: true } },
        finalProject: { select: { id: true, title: true } },
        finalAssessment: { select: { id: true, title: true, durationMinutes: true } },
        _count: { select: { enrollments: true } },
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { id: true, rating: true, comment: true, createdAt: true, student: { select: { name: true } } },
        },
      },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundError('Course not found');
    }

    const [enrollment, rating] = await Promise.all([
      studentId
        ? prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId: course.id } } })
        : null,
      prisma.feedback.aggregate({ where: { courseId: course.id }, _avg: { rating: true }, _count: { _all: true } }),
    ]);
    const isEnrolled = !!enrollment && enrollment.status === 'ACTIVE';

    return {
      ...course,
      // Only free preview lessons expose their video publicly
      modules: course.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map(({ videoUrl, videoProvider, ...lesson }) =>
          lesson.isPreview ? { ...lesson, videoUrl, videoProvider } : lesson
        ),
      })),
      enrolledStudentsCount: course._count.enrollments,
      averageRating: rating._avg.rating,
      reviewsCount: rating._count._all,
      isEnrolled,
    };
  }

  async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true, email: true, avatar: true } },
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
            },
            quiz: { include: { questions: { include: { options: true } } } },
            assignment: true,
          },
        },
        mockTest: { include: { questions: { include: { options: true } } } },
        finalProject: true,
        finalAssessment: { include: { questions: { include: { options: true } } } },
      },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundError('Course not found');
    }

    return course;
  }

  async createCourse(data: any, instructorId: string) {
    const existing = await prisma.course.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new BadRequestError('A course with this URL slug already exists');
    }

    return prisma.course.create({
      data: {
        ...data,
        instructorId,
      },
      include: { instructor: true },
    });
  }

  async updateCourse(id: string, data: any) {
    return prisma.course.update({
      where: { id },
      data,
    });
  }

  async deleteCourse(id: string) {
    return prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Module CRUD
  async createModule(data: { courseId: string; title: string; description?: string | null; order: number }) {
    return prisma.module.create({
      data,
    });
  }

  async updateModule(id: string, data: any) {
    return prisma.module.update({
      where: { id },
      data,
    });
  }

  async deleteModule(id: string) {
    return prisma.module.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Lesson CRUD
  async createLesson(data: any) {
    return prisma.lesson.create({
      data,
    });
  }

  async updateLesson(id: string, data: any) {
    return prisma.lesson.update({
      where: { id },
      data,
    });
  }

  async deleteLesson(id: string) {
    return prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Record Lesson Progress
  async recordLessonProgress(
    studentId: string,
    lessonId: string,
    watchedSeconds: number,
    percent: number,
    markComplete = false,
    role: Role = Role.STUDENT
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) throw new NotFoundError('Lesson not found');

    // Progress can only be recorded on lessons the student is enrolled in and has unlocked.
    // The access check and the existing-progress lookup are independent, so run them together.
    const [progressionBefore, existing] = await Promise.all([
      progressionService.assertCanAccessLesson(lessonId, studentId, role),
      prisma.lessonProgress.findUnique({
        where: { studentId_lessonId: { studentId, lessonId } },
      }),
    ]);

    const courseSettings = (lesson.module.course.settings || {}) as any;
    const threshold = courseSettings.lessonCompletionThresholdPercent || 90;

    const isComplete = markComplete || percent >= threshold;

    const highestPercent = existing ? Math.max(existing.percent, percent) : percent;
    const completedAt = (existing?.completedAt || (isComplete ? new Date() : null));

    const progress = await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: {
        watchedSeconds: Math.max(existing?.watchedSeconds || 0, watchedSeconds),
        percent: highestPercent,
        completedAt,
      },
      create: {
        studentId,
        lessonId,
        watchedSeconds,
        percent: highestPercent,
        completedAt,
      },
    });

    // Only a newly completed lesson can change module/course progression; regular
    // watch heartbeats reuse the progression computed by the access check.
    const newlyCompleted = !existing?.completedAt && !!completedAt;
    const progression =
      newlyCompleted || !progressionBefore
        ? await progressionService.getCourseProgression(lesson.module.courseId, studentId)
        : progressionBefore;

    return {
      progress,
      isCompleted: !!completedAt,
      coursePercent: progression.coursePercent,
    };
  }
}

export const courseService = new CourseService();
