import { Request, Response, NextFunction } from 'express';
import { adminStudentService } from '../services/admin-student.service.js';
import { sendSuccess, sendPaginated } from '../lib/utils.js';
import { prisma } from '../lib/prisma.js';

export class AdminStudentController {
  /**
   * R7: Filter students with section, class, batch, schedule, payment status, performance level
   */
  async listStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const courseId = req.query.courseId as string;
      const batchId = req.query.batchId as string;
      const section = req.query.section as string;
      const className = req.query.className as string;
      const paymentStatus = req.query.paymentStatus as any;
      const performanceLevel = req.query.performanceLevel as any;
      const search = req.query.search as string;

      const user = req.user!;
      const result = await adminStudentService.listStudents({
        page,
        limit,
        courseId,
        batchId,
        section,
        className,
        paymentStatus,
        performanceLevel,
        search,
        instructorId: user.userId,
        role: user.role,
      });

      return sendPaginated(res, result.items, result.total, result.page, result.limit);
    } catch (err) {
      next(err);
    }
  }

  async listBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.query.courseId as string;
      const user = req.user!;
      const batches = await adminStudentService.listBatches({
        courseId,
        instructorId: user.userId,
        role: user.role,
      });
      return sendSuccess(res, batches);
    } catch (err) {
      next(err);
    }
  }

  async createBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await adminStudentService.createBatch(req.body);
      return sendSuccess(res, batch, 201);
    } catch (err) {
      next(err);
    }
  }

  async listInquiries(req: Request, res: Response, next: NextFunction) {
    try {
      const inquiries = await adminStudentService.listInquiries(req.query);
      return sendSuccess(res, inquiries);
    } catch (err) {
      next(err);
    }
  }

  async createInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const inquiry = await prisma.inquiry.create({
        data: req.body,
      });
      return sendSuccess(res, inquiry, 201);
    } catch (err) {
      next(err);
    }
  }

  async listRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      const registrations = await adminStudentService.listRegistrations(req.query);
      return sendSuccess(res, registrations);
    } catch (err) {
      next(err);
    }
  }
}

export const adminStudentController = new AdminStudentController();
