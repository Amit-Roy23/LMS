import { Request, Response, NextFunction } from 'express';
import { assignmentService } from '../services/assignment.service.js';
import { sendSuccess } from '../lib/utils.js';

export class AssignmentController {
  async getAssignmentForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.assignmentId as string;
      const data = await assignmentService.getAssignmentForStudent(
        assignmentId,
        req.user!.userId,
        req.user!.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async submitAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const assignmentId = req.params.assignmentId as string;
      const { textContent, files, linkUrl } = req.body;
      const result = await assignmentService.submitAssignment({
        assignmentId,
        studentId: req.user!.userId,
        role: req.user!.role,
        textContent,
        files,
        linkUrl,
      });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = (req.params.moduleId || req.body.moduleId) as string;
      const assignment = await assignmentService.createAssignment({
        moduleId,
        ...req.body,
      });
      return sendSuccess(res, assignment, 201);
    } catch (err) {
      next(err);
    }
  }
}

export const assignmentController = new AssignmentController();
