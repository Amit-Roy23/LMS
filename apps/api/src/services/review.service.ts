import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import { SubmissionStatus, NotificationType } from '@academy/shared';
import { progressionService } from './progression.service.js';
import { certificateService } from './certificate.service.js';
import { logger } from '../lib/logger.js';

export class ReviewService {
  async getPendingReviews(params: { instructorId?: string; courseId?: string }) {
    const where: any = {
      status: SubmissionStatus.PENDING,
    };

    if (params.courseId) {
      where.assignment = { module: { courseId: params.courseId } };
    }

    if (params.instructorId) {
      where.assignment = {
        ...where.assignment,
        module: { course: { instructorId: params.instructorId } },
      };
    }

    const [assignmentSubmissions, projectSubmissions] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          student: { select: { id: true, name: true, email: true, avatar: true } },
          assignment: {
            include: {
              module: {
                include: {
                  course: { select: { id: true, title: true, slug: true } },
                },
              },
            },
          },
        },
      }),
      prisma.projectSubmission.findMany({
        where: { status: SubmissionStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        include: {
          student: { select: { id: true, name: true, email: true, avatar: true } },
          project: {
            include: {
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      }),
    ]);

    return {
      assignmentSubmissions,
      projectSubmissions,
      totalPending: assignmentSubmissions.length + projectSubmissions.length,
    };
  }

  async reviewAssignmentSubmission(params: {
    submissionId: string;
    reviewerId: string;
    status: SubmissionStatus;
    feedback: string;
    grade?: number | null;
  }) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: params.submissionId },
      include: {
        assignment: { include: { module: { include: { course: true } } } },
        student: true,
      },
    });

    if (!submission) throw new NotFoundError('Submission not found');

    const updated = await prisma.assignmentSubmission.update({
      where: { id: params.submissionId },
      data: {
        status: params.status,
        feedback: params.feedback,
        grade: params.grade ?? null,
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: submission.studentId,
        title: `Assignment Review: ${params.status.replace('_', ' ')}`,
        message: `Your submission for "${submission.assignment.title}" has been reviewed by your instructor. Status: ${params.status}.`,
        type: NotificationType.REVIEW_FEEDBACK,
        link: `/student/courses/${submission.assignment.module.courseId}/learn`,
      },
    });

    // Re-evaluate progression & check certificate
    const courseId = submission.assignment.module.courseId;
    const progression = await progressionService.getCourseProgression(courseId, submission.studentId);

    if (progression.certificateEligible) {
      try {
        await certificateService.issueCertificateIfEligible(courseId, submission.studentId);
      } catch (e) {
        logger.error({ e }, 'Auto certificate issuance failed during review');
      }
    }

    return {
      submission: updated,
      progression,
    };
  }

  async reviewProjectSubmission(params: {
    submissionId: string;
    reviewerId: string;
    status: SubmissionStatus;
    feedback: string;
    grade?: number | null;
  }) {
    const submission = await prisma.projectSubmission.findUnique({
      where: { id: params.submissionId },
      include: {
        project: { include: { course: true } },
        student: true,
      },
    });

    if (!submission) throw new NotFoundError('Project submission not found');

    const updated = await prisma.projectSubmission.update({
      where: { id: params.submissionId },
      data: {
        status: params.status,
        feedback: params.feedback,
        grade: params.grade ?? null,
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
      },
    });

    const courseId = submission.project.courseId;
    const progression = await progressionService.getCourseProgression(courseId, submission.studentId);

    if (progression.certificateEligible) {
      try {
        await certificateService.issueCertificateIfEligible(courseId, submission.studentId);
      } catch (e) {
        logger.error({ e }, 'Auto certificate issuance failed during project review');
      }
    }

    return {
      submission: updated,
      progression,
    };
  }
}

export const reviewService = new ReviewService();
