import { prisma } from '../lib/prisma.js';
import { PaymentStatus, CertificateStatus, SubmissionStatus } from '@academy/shared';

export class ReportService {
  /** Academy-wide figures, or only the given courses (instructors see their own courses). */
  async getAdminAnalytics(courseIds: string[] | null = null) {
    const inCourses = courseIds ? { courseId: { in: courseIds } } : {};
    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalCourses,
      totalEnrollments,
      totalCertificates,
      pendingAssignmentReviews,
      pendingProjectReviews,
      payments,
      recentEnrollments,
      enrollmentRows,
      courses,
    ] = await Promise.all([
      courseIds ? prisma.enrollment.findMany({ where: inCourses, distinct: ['studentId'], select: { studentId: true } }).then((r) => r.length) : prisma.user.count(),
      courseIds
        ? prisma.enrollment.findMany({ where: inCourses, distinct: ['studentId'], select: { studentId: true } }).then((r) => r.length)
        : prisma.user.count({ where: { role: 'STUDENT' } }),
      courseIds ? Promise.resolve(1) : prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count({ where: { deletedAt: null, ...(courseIds ? { id: { in: courseIds } } : {}) } }),
      prisma.enrollment.count({ where: inCourses }),
      prisma.certificate.count({ where: { status: CertificateStatus.VALID, ...inCourses } }),
      prisma.assignmentSubmission.count({
        where: { status: SubmissionStatus.PENDING, ...(courseIds ? { assignment: { module: { courseId: { in: courseIds } } } } : {}) },
      }),
      prisma.projectSubmission.count({
        where: { status: SubmissionStatus.PENDING, ...(courseIds ? { project: { courseId: { in: courseIds } } } : {}) },
      }),
      prisma.payment.findMany({
        where: { status: PaymentStatus.COMPLETED, ...inCourses },
        select: { amount: true, currency: true, createdAt: true, courseId: true },
      }),
      prisma.enrollment.findMany({
        where: inCourses,
        take: 5,
        orderBy: { enrolledAt: 'desc' },
        include: {
          student: { select: { name: true, email: true, avatar: true } },
          course: { select: { title: true, price: true } },
        },
      }),
      prisma.enrollment.findMany({ where: inCourses, select: { courseId: true, enrolledAt: true } }),
      prisma.course.findMany({ where: { deletedAt: null, ...(courseIds ? { id: { in: courseIds } } : {}) }, select: { id: true, title: true, slug: true } }),
    ]);

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

    // Weekly trend for the last 8 weeks (oldest first)
    const WEEK = 7 * 86400000;
    const now = Date.now();
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const start = now - (8 - i) * WEEK;
      return { weekStart: new Date(start).toISOString(), enrollments: 0, revenue: 0 };
    });
    const bucket = (d: Date) => Math.floor((d.getTime() - (now - 8 * WEEK)) / WEEK);
    enrollmentRows.forEach((e) => {
      const b = bucket(e.enrolledAt);
      if (b >= 0 && b < 8) weekly[b].enrollments++;
    });
    payments.forEach((p) => {
      const b = bucket(p.createdAt);
      if (b >= 0 && b < 8) weekly[b].revenue += p.amount;
    });

    // Per-course performance, best sellers first
    const byCourse = courses
      .map((c) => ({
        courseId: c.id,
        title: c.title,
        slug: c.slug,
        enrollments: enrollmentRows.filter((e) => e.courseId === c.id).length,
        revenue: payments.filter((p) => p.courseId === c.id).reduce((n, p) => n + p.amount, 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      summary: {
        totalUsers,
        totalStudents,
        totalInstructors,
        totalCourses,
        totalEnrollments,
        totalCertificates,
        pendingReviewsCount: pendingAssignmentReviews + pendingProjectReviews,
        totalRevenue,
        certificationRate: totalEnrollments ? Math.round((totalCertificates / totalEnrollments) * 100) : 0,
      },
      weekly,
      byCourse,
      recentEnrollments,
    };
  }
}

export const reportService = new ReportService();
