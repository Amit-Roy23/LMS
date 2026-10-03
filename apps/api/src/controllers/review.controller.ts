import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service.js';
import { sendSuccess } from '../lib/utils.js';
import { Role } from '@academy/shared';

export class ReviewController {
  async getPendingReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const instructorId = req.user!.role === Role.ADMIN ? undefined : req.user!.userId;
      const data = await reviewService.getPendingReviews({
        instructorId,
        courseId: req.query.courseId as string,
      });
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async reviewAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const submissionId = req.params.submissionId as string;
      const { status, feedback, grade } = req.body;
      const result = await reviewService.reviewAssignmentSubmission({
        submissionId,
        reviewerId: req.user!.userId,
        status,
        feedback,
        grade,
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async reviewProject(req: Request, res: Response, next: NextFunction) {
    try {
      const submissionId = req.params.submissionId as string;
      const { status, feedback, grade } = req.body;
      const result = await reviewService.reviewProjectSubmission({
        submissionId,
        reviewerId: req.user!.userId,
        status,
        feedback,
        grade,
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const reviewController = new ReviewController();
