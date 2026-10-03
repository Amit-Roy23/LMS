import { prisma } from '../lib/prisma.js';
import { PaymentStatus, CertificateStatus, SubmissionStatus } from '@academy/shared';

export class ReportService {
  async getAdminAnalytics() {
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
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count({ where: { deletedAt: null } }),
      prisma.enrollment.count(),
      prisma.certificate.count({ where: { status: CertificateStatus.VALID } }),
      prisma.assignmentSubmission.count({ where: { status: SubmissionStatus.PENDING } }),
      prisma.projectSubmission.count({ where: { status: SubmissionStatus.PENDING } }),
      prisma.payment.findMany({
        where: { status: PaymentStatus.COMPLETED },
        select: { amount: true, currency: true, createdAt: true },
      }),
      prisma.enrollment.findMany({
        take: 5,
        orderBy: { enrolledAt: 'desc' },
        include: {
          student: { select: { name: true, email: true, avatar: true } },
          course: { select: { title: true, price: true } },
        },
      }),
    ]);

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

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
      },
      recentEnrollments,
    };
  }
}

export const reportService = new ReportService();
