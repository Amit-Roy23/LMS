import { Request, Response, NextFunction } from 'express';
import { finalAssessmentService } from '../services/final-assessment.service.js';
import { sendSuccess } from '../lib/utils.js';

export class FinalAssessmentController {
  async getAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const assessmentId = req.params.assessmentId as string;
      const data = await finalAssessmentService.getAssessmentForRunner(
        assessmentId,
        req.user!.userId,
        req.user!.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async submitAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const assessmentId = req.params.assessmentId as string;
      const { answers, timeSpentSeconds } = req.body;
      const result = await finalAssessmentService.submitAssessment({
        finalAssessmentId: assessmentId,
        studentId: req.user!.userId,
        role: req.user!.role,
        answers,
        timeSpentSeconds,
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const finalAssessmentController = new FinalAssessmentController();
