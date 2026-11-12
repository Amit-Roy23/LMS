import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../lib/errors.js';
import { SubmissionStatus, NotificationType, Role } from '@academy/shared';
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
                  course: { select: { id: true, title: true, slug: true, settings: true } },
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
    reviewerRole?: Role | string;
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

    // Instructors may only review work from courses they teach; admins can review everything
    if (params.reviewerRole === Role.INSTRUCTOR && submission.assignment.module.course.instructorId !== params.reviewerId) {
      throw new ForbiddenError('You can only review submissions for courses you teach.');
    }

    // Pass mark: an assignment passes only with a grade of at least the course's assignment
    // pass mark (default 80% of its marks); a lower grade goes back to the student to resubmit
    const settings = (submission.assignment.module.course.settings || {}) as Record<string, any>;
    const passPercent = Number(settings.assignmentPassingPercent ?? 80);
    const maxScore = submission.assignment.maxScore || 100;
    const requiredGrade = Math.ceil((passPercent / 100) * maxScore * 100) / 100;
    let status = params.status;
    let feedback = params.feedback;
    let belowPassMark = false;
    if (status === SubmissionStatus.APPROVED) {
      if (params.grade === undefined || params.grade === null || Number.isNaN(Number(params.grade))) {
        throw new BadRequestError(`Enter a grade to approve (pass mark ${passPercent}%: ${requiredGrade} of ${maxScore}).`);
      }
      if (Number(params.grade) < requiredGrade) {
        status = SubmissionStatus.CHANGES_REQUESTED;
        belowPassMark = true;
        feedback = `${feedback}\n\nGrade ${params.grade}/${maxScore} is below the pass mark of ${passPercent}% (${requiredGrade}). Please improve and resubmit.`.trim();
      }
    }
    if (params.grade !== undefined && params.grade !== null && (Number(params.grade) < 0 || Number(params.grade) > maxScore)) {
      throw new BadRequestError(`Grade must be between 0 and ${maxScore}.`);
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: params.submissionId },
      data: {
        status,
        feedback,
        grade: params.grade ?? null,
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: submission.studentId,
        title: `Assignment Review: ${status.replace('_', ' ')}`,
        message: belowPassMark
          ? `Your submission for "${submission.assignment.title}" scored ${params.grade}/${maxScore}, below the ${passPercent}% pass mark. Please improve it and resubmit.`
          : `Your submission for "${submission.assignment.title}" has been reviewed by your instructor. Status: ${status}.`,
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
      passMark: { percent: passPercent, requiredGrade, maxScore, belowPassMark },
    };
  }

  async reviewProjectSubmission(params: {
    submissionId: string;
    reviewerId: string;
    reviewerRole?: Role | string;
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

    // Instructors may only review work from courses they teach; admins can review everything
    if (params.reviewerRole === Role.INSTRUCTOR && submission.project.course.instructorId !== params.reviewerId) {
      throw new ForbiddenError('You can only review submissions for courses you teach.');
    }

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
