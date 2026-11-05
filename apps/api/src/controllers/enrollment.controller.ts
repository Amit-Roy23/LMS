import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { paymentService } from '../services/payment/payment.service.js';
import { sendSuccess, sendPaginated } from '../lib/utils.js';

export class EnrollmentController {
  async listMyEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user!.userId },
        include: {
          course: {
            include: {
              instructor: { select: { id: true, name: true, avatar: true } },
              _count: { select: { modules: true } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      return sendSuccess(res, enrollments);
    } catch (err) {
      next(err);
    }
  }

  async listAllEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      // Instructors see enrolments in their own courses only
      const where = req.user!.role === 'INSTRUCTOR' ? { course: { instructorId: req.user!.userId } } : {};

      const [items, total] = await Promise.all([
        prisma.enrollment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { enrolledAt: 'desc' },
          include: {
            student: { select: { id: true, name: true, email: true, avatar: true } },
            course: { select: { id: true, title: true, price: true } },
            payment: true,
          },
        }),
        prisma.enrollment.count({ where }),
      ]);

      return sendPaginated(res, items, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, billing } = req.body;
      // The gateway is chosen by the server; any provider sent by the browser is ignored
      const order = await paymentService.createEnrollmentOrder(req.user!.userId, courseId, undefined, billing);
      return sendSuccess(res, order, 201);
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      // Razorpay Checkout returns razorpay_order_id, razorpay_payment_id and razorpay_signature
      const { paymentId, providerRef, signature, razorpayPaymentId, razorpaySignature } = req.body;
      const result = await paymentService.verifyAndCompleteEnrollment(
        paymentId,
        providerRef,
        razorpaySignature || signature,
        req.user!.userId,
        razorpayPaymentId
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const enrollmentController = new EnrollmentController();
