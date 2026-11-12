import { Request, Response, NextFunction } from 'express';
import { adminStudentService } from '../services/admin-student.service.js';
import { sendSuccess, sendPaginated } from '../lib/utils.js';
import { prisma } from '../lib/prisma.js';
import { recordAudit, changedFields } from '../lib/audit.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import { normalizePhone } from '../lib/phone.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';
import { siteService } from '../services/site.service.js';
import { notificationService } from '../services/notification/notification.service.js';
import { NotificationChannel } from '@academy/shared';

async function alertAdmissionsTeam(inquiry: { id: string; name: string; phone: string; email: string; message: string; source: string }, courseTitle?: string) {
  const recipients = config.notifications.admissionsEmails.length
    ? config.notifications.admissionsEmails
    : (await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'STAFF'] }, status: 'ACTIVE', deletedAt: null }, select: { email: true } })).map((u) => u.email);
  const variables = {
    name: inquiry.name,
    phone: inquiry.phone,
    email: inquiry.email,
    message: inquiry.message,
    messageShort: inquiry.message.slice(0, 120),
    courseTitle: courseTitle || 'General enquiry',
    courseSuffix: courseTitle ? ` about ${courseTitle}` : '',
    source: inquiry.source.replace(/_/g, ' ').toLowerCase(),
    inboxUrl: `${config.clientUrl}/admin/enquiries`,
  };
  for (const to of recipients) {
    await notificationService.enqueueNotification({ to, channel: NotificationChannel.EMAIL, templateKey: 'inquiry_alert', variables, idempotencyKey: `inquiry_${inquiry.id}_${to}` });
  }
  // Number is editable in the console (Website settings); falls back to env, then the academy's default
  const whatsapp = await siteService.admissionsWhatsapp();
  if (whatsapp) {
    await notificationService.enqueueNotification({
      to: whatsapp,
      channel: NotificationChannel.WHATSAPP,
      templateKey: 'inquiry_alert',
      variables,
      idempotencyKey: `inquiry_${inquiry.id}_wa`,
    });
  }
}

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

  /** Public enquiry form: saves the lead and alerts the admissions team by email/WhatsApp. */
  async createInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      // Bots fill the hidden "website" field; pretend success and drop it
      if ((req.body as any).website) return sendSuccess(res, { id: 'ok' }, 201);
      const phone = normalizePhone(req.body.phone) || String(req.body.phone).trim();
      const course = req.body.courseId
        ? await prisma.course.findFirst({ where: { id: req.body.courseId, deletedAt: null }, select: { id: true, title: true } })
        : null;
      const inquiry = await prisma.inquiry.create({
        data: {
          name: String(req.body.name).trim(),
          email: String(req.body.email).trim().toLowerCase(),
          phone,
          courseId: course?.id || null,
          message: String(req.body.message).trim(),
          source: String(req.body.source || 'WEBSITE').toUpperCase().replace(/[^A-Z_]/g, '').slice(0, 40) || 'WEBSITE',
        },
      });
      alertAdmissionsTeam(inquiry, course?.title).catch((err) => logger.error({ err }, 'Enquiry alert failed'));
      return sendSuccess(res, { id: inquiry.id, message: 'Thanks! Our admissions team will contact you shortly.' }, 201);
    } catch (err) {
      next(err);
    }
  }

  /** Update an enquiry's follow-up status, notes or owner. */
  async updateInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { status, notes, assignedToId } = req.body || {};
      if (status && !['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'].includes(status)) throw new BadRequestError('Unknown status');
      const existing = await prisma.inquiry.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Enquiry not found');
      const patch: any = {};
      if (status !== undefined) patch.status = status;
      if (notes !== undefined) patch.notes = notes ? String(notes).slice(0, 2000) : null;
      if (assignedToId !== undefined) patch.assignedToId = assignedToId || null;
      const inquiry = await prisma.inquiry.update({
        where: { id },
        data: patch,
        include: { course: { select: { id: true, title: true } }, assignedTo: { select: { id: true, name: true } } },
      });
      const diff = changedFields(existing, patch);
      if (Object.keys(diff.after).length) {
        await recordAudit(req, { action: 'INQUIRY_UPDATED', entityType: 'Inquiry', entityId: id, ...diff, details: { name: existing.name } });
      }
      return sendSuccess(res, inquiry);
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
