import { Request, Response, NextFunction } from 'express';
import { finalProjectService } from '../services/final-project.service.js';
import { sendSuccess } from '../lib/utils.js';

export class FinalProjectController {
  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const data = await finalProjectService.getProjectForStudent(
        projectId,
        req.user!.userId,
        req.user!.role
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async submitProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { description, files, linkUrl } = req.body;
      const result = await finalProjectService.submitProject({
        finalProjectId: projectId,
        studentId: req.user!.userId,
        description,
        files,
        linkUrl,
      });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }
}

export const finalProjectController = new FinalProjectController();
