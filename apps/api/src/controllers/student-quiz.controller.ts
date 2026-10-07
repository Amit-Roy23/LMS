import { Request, Response, NextFunction } from 'express';
import { assessmentService } from '../services/assessment.service.js';
import { sendSuccess } from '../lib/utils.js';

export class StudentQuizController {
  /**
   * GET /student/modules/:moduleId/quiz
   * Returns quiz metadata, time limits, cooldown, and server-computed state
   */
  async getModuleQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const studentId = req.user!.userId;
      const role = req.user!.role;

      const data = await assessmentService.getStudentQuizInfo(moduleId, studentId, role);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /student/quizzes/:quizId/attempts
   * Starts a new attempt or resumes an in-progress attempt
   */
  async startAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const studentId = req.user!.userId;
      const role = req.user!.role;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] as string;

      const data = await assessmentService.startQuizAttempt({
        quizId,
        studentId,
        role,
        ip,
        userAgent,
      });

      return sendSuccess(res, data, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /student/attempts/:attemptId/answers
   * Autosaves partial or complete answers
   */
  async saveAnswers(req: Request, res: Response, next: NextFunction) {
    try {
      const attemptId = req.params.attemptId as string;
      const studentId = req.user!.userId;
      const { answers } = req.body;

      const data = await assessmentService.saveAttemptAnswers({
        attemptId,
        studentId,
        answers: answers || [],
      });

      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /student/attempts/:attemptId
   * Resumes an attempt with server-calculated remaining time
   */
  async getAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const attemptId = req.params.attemptId as string;
      const studentId = req.user!.userId;

      const data = await assessmentService.getAttemptForResume(attemptId, studentId);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /student/attempts/:attemptId/submit
   * Grades attempt strictly from question snapshot and updates module progression
   */
  async submitAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const attemptId = req.params.attemptId as string;
      const studentId = req.user!.userId;
      const { answers } = req.body;

      const result = await assessmentService.submitQuizAttempt({
        attemptId,
        studentId,
        finalAnswers: answers,
      });

      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /student/attempts/:attemptId/result
   * Retrieves attempt result breakdown obeying showAnswersAfterSubmit policy
   */
  async getAttemptResult(req: Request, res: Response, next: NextFunction) {
    try {
      const attemptId = req.params.attemptId as string;
      const studentId = req.user!.userId;

      const result = await assessmentService.getAttemptResult(attemptId, studentId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /student/modules/:moduleId/quiz/history
   * Lists past attempt records for the module quiz
   */
  async getQuizHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const studentId = req.user!.userId;

      const history = await assessmentService.getStudentQuizHistory(moduleId, studentId);
      return sendSuccess(res, history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /student/attempts/:attemptId/events
   * Logs integrity events (tab hidden, copy attempt, etc.)
   */
  async logEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const attemptId = req.params.attemptId as string;
      const studentId = req.user!.userId;
      const { type, metadata } = req.body;

      await assessmentService.logQuizEvent(attemptId, studentId, type, metadata);
      return sendSuccess(res, { logged: true });
    } catch (err) {
      next(err);
    }
  }
}

export const studentQuizController = new StudentQuizController();
