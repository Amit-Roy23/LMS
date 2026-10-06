import nodemailer from 'nodemailer';
import { prisma } from '../../../lib/prisma.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { maskRecipient } from '../../../lib/student-id.js';
import {
  INotificationChannel,
  SendNotificationParams,
  SendNotificationResult,
} from '../notification-channel.interface.js';
import { renderTemplate, SEED_TEMPLATES } from '../template.engine.js';
import { NotificationChannel } from '@academy/shared';

export class EmailChannel implements INotificationChannel {
  readonly channel = NotificationChannel.EMAIL;
  private transporter: any = null;

  private getTransporter(): any {
    if (this.transporter) return this.transporter;

    const { host, port, secure, user, pass } = config.notifications.smtp;
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    const locale = params.locale || 'en';

    // 1. Fetch template from DB or fallback to seed
    let template = await prisma.notificationTemplate.findUnique({
      where: {
        key_channel_locale: {
          key: params.templateKey,
          channel: NotificationChannel.EMAIL,
          locale,
        },
      },
    });

    if (!template && locale !== 'en') {
      // Fallback to English
      template = await prisma.notificationTemplate.findUnique({
        where: {
          key_channel_locale: {
            key: params.templateKey,
            channel: NotificationChannel.EMAIL,
            locale: 'en',
          },
        },
      });
    }

    // In-memory fallback
    const fallbackSeed = SEED_TEMPLATES.find(
      (t) => t.key === params.templateKey && t.channel === 'EMAIL' && t.locale === locale
    ) || SEED_TEMPLATES.find(
      (t) => t.key === params.templateKey && t.channel === 'EMAIL' && t.locale === 'en'
    );

    const subjectTemplate = template?.subject || fallbackSeed?.subject || 'Academy Notification';
    const bodyTemplate = template?.body || fallbackSeed?.body || '';

    const renderedSubject = renderTemplate(subjectTemplate, params.variables, { isHtml: false });
    const renderedHtml = renderTemplate(bodyTemplate, params.variables, { isHtml: true });

    const transporter = this.getTransporter();

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: config.notifications.smtp.from,
          to: params.to,
          subject: renderedSubject,
          html: renderedHtml,
          text: renderedHtml.replace(/<[^>]+>/g, ' '),
        });

        logger.info(
          {
            to: maskRecipient(params.to),
            templateKey: params.templateKey,
            messageId: info.messageId,
          },
          'Email sent successfully via SMTP'
        );

        return {
          providerMessageId: info.messageId || `smtp_${Date.now()}`,
          provider: 'SMTP',
          details: { response: info.response },
        };
      } catch (err: any) {
        logger.error({ error: err.message, to: maskRecipient(params.to) }, 'SMTP email sending failed');
        throw err;
      }
    } else {
      // Development Log Driver
      const mockId = `mock_email_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      logger.info(
        {
          to: maskRecipient(params.to),
          templateKey: params.templateKey,
          subject: renderedSubject,
          mockId,
        },
        '📧 [DEV LOG EMAIL DRIVER] Simulated email dispatch to recipient'
      );

      console.log('\n================== [DEV LOG EMAIL DRIVER] ==================');
      console.log(`TO:      ${maskRecipient(params.to)}`);
      console.log(`SUBJECT: ${renderedSubject}`);
      console.log(`CONTENT:\n${renderedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
      console.log('===========================================================\n');

      return {
        providerMessageId: mockId,
        provider: 'LOG_EMAIL',
        details: { simulated: true },
      };
    }
  }
}
