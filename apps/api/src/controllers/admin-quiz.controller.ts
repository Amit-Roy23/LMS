import { Request, Response, NextFunction } from 'express';
import { assessmentService } from '../services/assessment.service.js';
import { sendSuccess } from '../lib/utils.js';
import { QuestionDifficulty, QuestionStatus, QuizAttemptStatus } from '@academy/shared';

export class AdminQuizController {
  /**
   * GET /admin/modules/:moduleId/quiz or GET /admin/quizzes/:quizId/config
   */
  async getQuizConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const id = (req.params.moduleId || req.params.quizId) as string;
      const data = await assessmentService.getAdminQuizConfig(
        id,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /admin/quizzes/:quizId
   */
  async updateQuizSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const data = await assessmentService.updateQuizSettings(
        quizId,
        req.body,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/quizzes/:quizId/publish
   */
  async publishQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const data = await assessmentService.publishQuiz(
        quizId,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/quizzes/:quizId/questions
   */
  async listQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const { difficulty, status, tag, search } = req.query;

      const questions = await assessmentService.listQuestions(
        quizId,
        {
          difficulty: difficulty as QuestionDifficulty | undefined,
          status: status as QuestionStatus | undefined,
          tag: tag as string | undefined,
          search: search as string | undefined,
        },
        req.user?.userId,
        req.user?.role
      );

      return sendSuccess(res, questions);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/quizzes/:quizId/questions
   */
  async createQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const question = await assessmentService.createQuestion(
        quizId,
        req.body,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, question, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /admin/questions/:questionId
   */
  async updateQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      const updated = await assessmentService.updateQuestion(
        questionId,
        req.body,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /admin/questions/:questionId
   */
  async deleteQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      const permanent = req.query.permanent === 'true';
      const result = await assessmentService.deleteQuestion(
        questionId,
        permanent,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/questions/:questionId/duplicate
   */
  async duplicateQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      const cloned = await assessmentService.duplicateQuestion(
        questionId,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, cloned, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/quizzes/:quizId/questions/bulk
   */
  async bulkQuestionsAction(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const { action, questionIds } = req.body;
      const result = await assessmentService.bulkQuestionAction(
        quizId,
        action,
        questionIds || [],
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/quizzes/template/csv
   */
  async downloadCsvTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const csv = assessmentService.generateCsvTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="question-bank-template.csv"');
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/quizzes/:quizId/questions/import
   */
  async importQuestionsCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const dryRun = req.query.dryRun === 'true' || req.body.dryRun === true;
      let csvContent = '';

      if (req.file) {
        csvContent = req.file.buffer.toString('utf-8');
      } else if (req.body.csvContent) {
        csvContent = req.body.csvContent;
      }

      const result = await assessmentService.importQuestionsFromCsv(
        quizId,
        csvContent,
        dryRun,
        req.user?.userId,
        req.user?.role
      );

      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/quizzes/:quizId/questions/export
   */
  async exportQuestionsCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const csv = await assessmentService.exportQuestionsToCsv(
        quizId,
        req.user?.userId,
        req.user?.role
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="quiz-${quizId}-questions.csv"`);
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/quizzes/:quizId/attempts
   */
  async listQuizAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const { batchId, studentId, status, passed, page, limit } = req.query;

      const data = await assessmentService.getQuizAttemptsForAdmin(
        quizId,
        {
          batchId: batchId as string | undefined,
          studentId: studentId as string | undefined,
          status: status as QuizAttemptStatus | undefined,
          passed: passed !== undefined ? passed === 'true' : undefined,
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20,
        },
        req.user?.userId,
        req.user?.role
      );

      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/students/:studentId/assessments
   */
  async getStudentAssessments(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId as string;
      const data = await assessmentService.getStudentAssessmentsForAdmin(
        studentId,
        req.user!.role,
        req.user?.userId
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/quizzes/:quizId/analytics
   */
  async getQuizAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const data = await assessmentService.getQuizAnalytics(
        quizId,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/quizzes/:quizId/override/reset-attempts
   */
  async resetStudentAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const quizId = req.params.quizId as string;
      const { studentId, reason } = req.body;
      const result = await assessmentService.adminResetStudentAttempts(
        quizId,
        studentId,
        req.user!.userId,
        reason
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/modules/:moduleId/quiz/override/pass
   */
  async passModuleQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = req.params.moduleId as string;
      const { studentId, reason } = req.body;
      const result = await assessmentService.adminPassModuleQuiz(
        moduleId,
        studentId,
        req.user!.userId,
        reason || 'Admin manual override'
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/attempts/:attemptId/override/invalidate
   */
  async invalidateAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const attemptId = req.params.attemptId as string;
      const { reason } = req.body;
      const result = await assessmentService.adminInvalidateAttempt(
        attemptId,
        req.user!.userId,
        reason || 'Admin manual invalidation'
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const adminQuizController = new AdminQuizController();
