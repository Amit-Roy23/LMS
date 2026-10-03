import { Request, Response, NextFunction } from 'express';
import { quizService } from '../services/quiz.service.js';
import { sendSuccess } from '../lib/utils.js';

export class QuizController {
  async getQuizForRunner(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const data = await quizService.getQuizForRunner(
        quizId,
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
      const quizId = req.params.quizId as string;
      const { answers } = req.body;
      const result = await quizService.submitQuizAttempt({
        quizId,
        studentId: req.user!.userId,
        role: req.user!.role,
        answers,
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = (req.params.moduleId || req.body.moduleId) as string;
      const quiz = await quizService.createQuiz({
        moduleId,
        ...req.body,
      });
      return sendSuccess(res, quiz, 201);
    } catch (err) {
      next(err);
    }
  }
}

export const quizController = new QuizController();
