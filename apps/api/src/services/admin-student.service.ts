import { prisma } from '../lib/prisma.js';
import { Role, PaymentStatus, PerformanceLevel, DeliveryMode } from '@academy/shared';

export interface FilterStudentsParams {
  page?: number;
  limit?: number;
  courseId?: string;
  batchId?: string;
  section?: string;
  className?: string;
  paymentStatus?: PaymentStatus;
  performanceLevel?: PerformanceLevel;
  search?: string;
  instructorId?: string;
  role?: Role;
}

export class AdminStudentService {
  /**
   * R7: Filter students with section, class, batch, schedule, payment status, performance level, and progress.
   * Instructors only see their own batches unless they are ADMIN.
   */
  async listStudents(params: FilterStudentsParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const enrollmentWhere: any = {};

    // Role-based scoping: Instructors only see students in their own batches
    if (params.role === Role.INSTRUCTOR && params.instructorId) {
      enrollmentWhere.batch = { instructorId: params.instructorId };
    }

    if (params.courseId) enrollmentWhere.courseId = params.courseId;
    if (params.batchId) enrollmentWhere.batchId = params.batchId;
    if (params.paymentStatus) enrollmentWhere.paymentStatus = params.paymentStatus;

    if (params.section || params.className) {
      enrollmentWhere.batch = {
        ...enrollmentWhere.batch,
        ...(params.section ? { section: params.section } : {}),
        ...(params.className ? { className: params.className } : {}),
      };
    }

    const userWhere: any = {
      role: Role.STUDENT,
      deletedAt: null,
      enrollments: {
        some: enrollmentWhere,
      },
    };

    if (params.search) {
      userWhere.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.performanceLevel) {
      userWhere.studentProfile = {
        performanceLevel: params.performanceLevel,
      };
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          studentProfile: true,
          enrollments: {
            where: enrollmentWhere,
            include: {
              course: { select: { id: true, title: true, slug: true } },
              batch: {
                select: {
                  id: true,
                  name: true,
                  section: true,
                  className: true,
                  scheduleText: true,
                  mode: true,
                  instructor: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          moduleProgress: {
            select: { moduleId: true, status: true, completedAt: true },
          },
          quizAttempts: {
            select: { id: true, quizId: true, isPassed: true, scorePercent: true },
          },
          assignmentSubmissions: {
            select: { id: true, assignmentId: true, status: true, grade: true },
          },
          certificates: {
            select: { id: true, certificateId: true, courseId: true, issuedAt: true, status: true },
          },
        },
      }),
      prisma.user.count({ where: userWhere }),
    ]);

    const formattedItems = students.map((s) => {
      const primaryEnrollment = s.enrollments[0];
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone || s.studentProfile?.phone,
        whatsappNumber: s.studentProfile?.whatsappNumber,
        city: s.studentProfile?.city,
        education: s.studentProfile?.education,
        performanceLevel: s.studentProfile?.performanceLevel || PerformanceLevel.GOOD,
        status: s.status,
        createdAt: s.createdAt,
        enrollment: primaryEnrollment
          ? {
              id: primaryEnrollment.id,
              courseId: primaryEnrollment.courseId,
              courseTitle: primaryEnrollment.course.title,
              mode: primaryEnrollment.mode,
              batchId: primaryEnrollment.batchId,
              batchName: primaryEnrollment.batch?.name || 'Self-Paced Track',
              section: primaryEnrollment.batch?.section || 'Default',
              className: primaryEnrollment.batch?.className || 'Standard',
              scheduleText: primaryEnrollment.batch?.scheduleText || 'Self-Paced (24/7 Access)',
              paymentStatus: primaryEnrollment.paymentStatus,
              accessStatus: primaryEnrollment.accessStatus,
              enrolledAt: primaryEnrollment.enrolledAt,
              instructor: primaryEnrollment.batch?.instructor?.name || 'Academy Faculty',
            }
          : null,
        stats: {
          modulesCompleted: s.moduleProgress.filter((m) => m.status === 'COMPLETED').length,
          quizzesPassed: s.quizAttempts.filter((q) => q.isPassed).length,
          assignmentsApproved: s.assignmentSubmissions.filter((a) => a.status === 'APPROVED').length,
          hasCertificate: s.certificates.length > 0,
        },
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List Batches for admin/instructor selection
   */
  async listBatches(params: { courseId?: string; instructorId?: string; role?: Role }) {
    const where: any = {};
    if (params.courseId) where.courseId = params.courseId;
    if (params.role === Role.INSTRUCTOR && params.instructorId) {
      where.instructorId = params.instructorId;
    }

    return prisma.batch.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, liveSessions: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Create Batch
   */
  async createBatch(data: {
    courseId: string;
    name: string;
    section: string;
    className?: string;
    mode: DeliveryMode;
    instructorId?: string;
    startDate: Date;
    endDate?: Date;
    scheduleText?: string;
    weeklySchedule?: any;
    capacity?: number;
  }) {
    return prisma.batch.create({
      data: {
        courseId: data.courseId,
        name: data.name,
        section: data.section,
        className: data.className,
        mode: data.mode,
        instructorId: data.instructorId,
        startDate: data.startDate,
        endDate: data.endDate,
        scheduleText: data.scheduleText,
        weeklySchedule: data.weeklySchedule || {},
        capacity: data.capacity || 50,
      },
    });
  }

  /**
   * List Inquiries (L1 Leads)
   */
  async listInquiries(params: { status?: any; courseId?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.courseId) where.courseId = params.courseId;

    return prisma.inquiry.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List Registrations (Admissions)
   */
  async listRegistrations(params: { status?: any; courseId?: string; batchId?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.courseId) where.courseId = params.courseId;
    if (params.batchId) where.batchId = params.batchId;

    return prisma.registration.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true, section: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const adminStudentService = new AdminStudentService();
