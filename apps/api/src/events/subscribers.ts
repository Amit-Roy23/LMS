import { eventBus } from './event-bus.js';
import { provisioningService } from '../services/provisioning.service.js';
import { notificationService } from '../services/notification/notification.service.js';
import { logger } from '../lib/logger.js';
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

  logger.info('Domain event subscribers initialized successfully');
}
