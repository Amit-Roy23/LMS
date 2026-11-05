import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service.js';
import { userService } from '../services/user.service.js';
import { storageService } from '../services/storage/storage.service.js';
import { sendSuccess, sendPaginated } from '../lib/utils.js';
import { BadRequestError } from '../lib/errors.js';
import { scopedCourseIds } from '../lib/access.js';
import { recordAudit } from '../lib/audit.js';
import { Role } from '@academy/shared';

export class ReportController {
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.getAdminAnalytics(await scopedCourseIds(req));
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}

export class UploadController {
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const folder = (req.body.folder as string) || 'submissions';
      const fileInfo = await storageService.saveFile(req.file, folder);
      return sendSuccess(res, fileInfo, 201);
    } catch (err) {
      next(err);
    }
  }
}

export class UserController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const role = req.query.role as any;
      const search = req.query.search as string;

      const result = await userService.listUsers({ page, limit, role, search });
      return sendPaginated(res, result.items, result.total, result.page, result.limit);
    } catch (err) {
      next(err);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const user = await userService.getUserById(id);
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (id === req.user!.userId) throw new BadRequestError('You cannot change your own account status');
      const before = await userService.getUserById(id);
      const user = await userService.updateUserStatus(id, req.body.status);
      await recordAudit(req, { action: 'USER_STATUS_CHANGED', entityType: 'User', entityId: id, before: { status: before.status }, after: { status: user.status }, details: { email: user.email } });
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
}

export class ConsoleUserController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tempPassword } = await userService.createConsoleUser(req.body || {});
      await recordAudit(req, { action: 'USER_CREATED', entityType: 'User', entityId: user.id, after: { role: user.role, email: user.email } });
      return sendSuccess(res, { user, tempPassword }, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { before, user } = await userService.updateRole(req.user!.userId, String(req.params.id), req.body?.role as Role);
      await recordAudit(req, { action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: user.id, before, after: { role: user.role }, details: { email: user.email } });
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
}

export const consoleUserController = new ConsoleUserController();
export const reportController = new ReportController();
export const uploadController = new UploadController();
export const userController = new UserController();
