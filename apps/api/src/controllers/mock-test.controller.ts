import { Request, Response, NextFunction } from 'express';
import { mockTestService } from '../services/mock-test.service.js';
import { sendSuccess } from '../lib/utils.js';

export class MockTestController {
  async getMockTest(req: Request, res: Response, next: NextFunction) {
    try {
      const mockTestId = req.params.mockTestId as string;
      const data = await mockTestService.getMockTestForRunner(
        mockTestId,
        req.user!.userId,
        req.user!.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async submitAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const mockTestId = req.params.mockTestId as string;
      const { answers, timeSpentSeconds } = req.body;
      const result = await mockTestService.submitMockTest({
        mockTestId,
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

export const mockTestController = new MockTestController();
