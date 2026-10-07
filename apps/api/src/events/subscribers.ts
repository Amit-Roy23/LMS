import { eventBus } from './event-bus.js';
import { provisioningService } from '../services/provisioning.service.js';
import { notificationService } from '../services/notification/notification.service.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { NotificationChannel } from '@academy/shared';


export function initializeDomainSubscribers(): void {
  // 1. Payment Succeeded -> Account Provisioning
  eventBus.on('payment.succeeded', async (event) => {
    logger.info({ paymentId: event.paymentId }, 'Subscriber executing for payment.succeeded');
    await provisioningService.handlePaymentSucceeded(event);
  });

  // 2. Password Reset Requested -> Notification Dispatch
  eventBus.on('password.reset_requested', async (event) => {
    logger.info({ userId: event.userId, email: event.email }, 'Subscriber executing for password.reset_requested');

    const variables = {
      name: event.name,
      resetUrl: event.resetUrl,
      expiresInHours: event.expiresInHours,
    };

    // Dispatch via Email
    if (event.email) {
      await notificationService.enqueueNotification({
        to: event.email,
        channel: NotificationChannel.EMAIL,
        templateKey: 'password_reset',
        locale: 'en',
        variables,
        userId: event.userId,
        idempotencyKey: `pwd_reset_email_${event.userId}_${Date.now()}`,
      });
    }

    // Dispatch via WhatsApp if available
    const wa = event.whatsappNumber || event.phone;
    if (wa) {
      await notificationService.enqueueNotification({
        to: wa,
        channel: NotificationChannel.WHATSAPP,
        templateKey: 'password_reset',
        locale: 'en',
        variables,
        userId: event.userId,
        idempotencyKey: `pwd_reset_wa_${event.userId}_${Date.now()}`,
      });
    }
  });

  // 3. Live Session Reminder Due -> Queue batch_reminder notification
  eventBus.on('live_session.reminder_due', async (event) => {
    logger.info(
      { sessionId: event.sessionId, reminderType: event.reminderType },
      'Subscriber executing for live_session.reminder_due'
    );

    try {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          batchId: event.batchId,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
        include: { student: true },
      });

      for (const enrollment of enrollments) {
        const student = enrollment.student;
        if (!student) continue;

        const variables = {
          name: student.name,
          courseTitle: event.courseTitle,
          batchName: event.batchName,
          sessionTitle: event.sessionTitle,
          startsAt: event.startsAt.toISOString(),
          joinUrl: event.joinUrl,
          reminderType: event.reminderType,
        };

        if (student.email) {
          await notificationService.enqueueNotification({
            to: student.email,
            channel: NotificationChannel.EMAIL,
            templateKey: 'batch_reminder',
            locale: 'en',
            variables,
            userId: student.id,
            idempotencyKey: `live_rem_email_${event.sessionId}_${student.id}_${event.reminderType}`,
          });
        }

        const phone = student.phone;
        if (phone) {
          await notificationService.enqueueNotification({
            to: phone,
            channel: NotificationChannel.WHATSAPP,
            templateKey: 'batch_reminder',
            locale: 'en',
            variables,
            userId: student.id,
            idempotencyKey: `live_rem_wa_${event.sessionId}_${student.id}_${event.reminderType}`,
          });
        }
      }
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed sending live session reminders');
    }
  });

  // 4. Lesson Completed & Module Completed
  eventBus.on('lesson.completed', async (event) => {
    logger.info(
      { studentId: event.studentId, lessonId: event.lessonId, source: event.completionSource },
      'Subscriber received lesson.completed event'
    );
  });

  eventBus.on('module.lessons_completed', async (event) => {
    logger.info(
      { studentId: event.studentId, moduleId: event.moduleId },
      'Subscriber received module.lessons_completed event'
    );
  });

  logger.info('Domain event subscribers initialized successfully');
}

