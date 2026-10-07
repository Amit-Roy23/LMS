import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification/notification.service.js';
import { provisioningService } from '../services/provisioning.service.js';
import { paymentService } from '../services/payment/payment.service.js';
import { sendSuccess, sendPaginated } from '../lib/utils.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { NotificationChannel, NotificationStatus } from '@academy/shared';

export class NotificationController {
  /**
   * Admin: List Notification Logs with filters
   * GET /api/v1/admin/notifications
   */
  async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const channel = req.query.channel as NotificationChannel;
      const status = req.query.status as NotificationStatus;
      const templateKey = req.query.templateKey as string;
      const userId = req.query.userId as string;
      const search = req.query.search as string;

      const result = await notificationService.listLogs({
        page,
        limit,
        channel,
        status,
        templateKey,
        userId,
        search,
      });

      return sendPaginated(res, result.items, result.total, result.page, result.limit);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Retry a failed notification
   * POST /api/v1/admin/notifications/:id/retry
   */
  async retryNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await notificationService.retryNotification(id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Resend credentials for a student
   * POST /api/v1/admin/students/:id/resend-credentials
   */
  async resendCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const channel = req.body?.channel as NotificationChannel;
      const result = await provisioningService.resendCredentials(id, channel);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Manually trigger account provisioning for a registration
   * POST /api/v1/admin/registrations/:id/provision
   */
  async manualProvisionRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await provisioningService.provisionRegistration(id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: Apply for Admission / Create Registration Order
   * POST /api/v1/admissions/apply
   */
  async applyAdmission(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.createRegistrationOrder(req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: Verify Admission Payment
   * POST /api/v1/admissions/verify
   */
  async verifyAdmissionPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { registrationId, providerRef, signature } = req.body;
      const result = await paymentService.verifyRegistrationPayment(registrationId, providerRef, signature);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: Get Registration / Receipt by ID
   * GET /api/v1/registrations/:id
   */
  async getRegistrationById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const registration = await prisma.registration.findUnique({
        where: { id },
        include: {
          course: true,
          batch: true,
          user: {
            select: { id: true, studentId: true, name: true, email: true },
          },
        },
      });

      if (!registration) {
        throw new NotFoundError('Registration not found');
      }

      return sendSuccess(res, registration);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Webhook: Meta WhatsApp Status Callback (Stub)
   * POST /api/v1/webhooks/whatsapp
   */
  async webhookWhatsApp(req: Request, res: Response) {
    // Acknowledge webhook delivery
    return res.status(200).json({ status: 'received' });
  }

  /**
   * Public Webhook: SMS Status Callback (Stub)
   * POST /api/v1/webhooks/sms
   */
  async webhookSms(req: Request, res: Response) {
    return res.status(200).json({ status: 'received' });
  }
}

export const notificationController = new NotificationController();
