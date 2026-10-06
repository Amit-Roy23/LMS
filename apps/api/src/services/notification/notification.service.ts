import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { maskRecipient } from '../../lib/student-id.js';
import { NotificationChannel, NotificationStatus } from '@academy/shared';
import { INotificationChannel, SendNotificationParams } from './notification-channel.interface.js';
import { EmailChannel } from './channels/email.channel.js';
import { WhatsAppChannel } from './channels/whatsapp.channel.js';
import { SmsChannel } from './channels/sms.channel.js';
import {
  createNotificationQueue,
  INotificationQueue,
  NotificationJobData,
} from './queue/notification.queue.js';
import { SEED_TEMPLATES } from './template.engine.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';

export interface EnqueueNotificationParams {
  to: string;
  channel: NotificationChannel;
  templateKey: string;
  locale?: string;
  variables: Record<string, any>;
  userId?: string;
  idempotencyKey?: string;
  fallbackChannels?: NotificationChannel[];
}

export class NotificationService {
  private channels: Map<NotificationChannel, INotificationChannel> = new Map();
  private queue: INotificationQueue;

  constructor() {
    this.channels.set(NotificationChannel.EMAIL, new EmailChannel());
    this.channels.set(NotificationChannel.WHATSAPP, new WhatsAppChannel());
    this.channels.set(NotificationChannel.SMS, new SmsChannel());

    this.queue = createNotificationQueue(this.processNotificationJob.bind(this));
  }

  getChannel(channel: NotificationChannel): INotificationChannel {
    const instance = this.channels.get(channel);
    if (!instance) {
      throw new BadRequestError(`Unsupported notification channel: ${channel}`);
    }
    return instance;
  }

  /**
   * Seed default notification templates if they don't exist yet in DB
   */
  async seedDefaultTemplates(): Promise<void> {
    for (const t of SEED_TEMPLATES) {
      await prisma.notificationTemplate.upsert({
        where: {
          key_channel_locale: {
            key: t.key,
            channel: t.channel as NotificationChannel,
            locale: t.locale,
          },
        },
        update: {},
        create: {
          key: t.key,
          channel: t.channel as NotificationChannel,
          locale: t.locale,
          subject: t.subject,
          body: t.body,
        },
      });
    }
    logger.info('Notification templates initialized/verified in database');
  }

  /**
   * Enqueue a notification for asynchronous delivery with idempotency protection
   */
  async enqueueNotification(params: EnqueueNotificationParams): Promise<void> {
    const locale = params.locale || 'en';
    const idempotencyKey =
      params.idempotencyKey ||
      `notif_${params.templateKey}_${params.channel}_${params.to.replace(/\s+/g, '')}_${Date.now()}`;

    // 1. Idempotency Check in DB
    const existingLog = await prisma.notificationLog.findUnique({
      where: { idempotencyKey },
    });

    if (existingLog && existingLog.status === NotificationStatus.SENT) {
      logger.info(
        { idempotencyKey, channel: params.channel, to: maskRecipient(params.to) },
        'Skipping duplicate notification dispatch (idempotency key matched SENT log)'
      );
      return;
    }

    // 2. Create or Update NotificationLog in QUEUED status
    await prisma.notificationLog.upsert({
      where: { idempotencyKey },
      create: {
        channel: params.channel,
        to: params.to,
        templateKey: params.templateKey,
        locale,
        status: NotificationStatus.QUEUED,
        userId: params.userId || null,
        idempotencyKey,
        attempts: 1,
        metadata: {
          variables: params.variables ? this.sanitizeVariablesForAudit(params.variables) : {},
        },
      },
      update: {
        status: NotificationStatus.QUEUED,
        attempts: { increment: 1 },
      },
    });

    // 3. Add to processing queue
    await this.queue.enqueue({
      to: params.to,
      channel: params.channel,
      templateKey: params.templateKey,
      locale,
      variables: params.variables,
      userId: params.userId,
      idempotencyKey,
      fallbackChannels: params.fallbackChannels,
    });
  }

  /**
   * Internal worker job processor
   */
  async processNotificationJob(job: NotificationJobData): Promise<void> {
    const channelInstance = this.getChannel(job.channel);

    try {
      const result = await channelInstance.send({
        to: job.to,
        templateKey: job.templateKey,
        locale: job.locale || 'en',
        variables: job.variables,
        userId: job.userId,
        idempotencyKey: job.idempotencyKey,
      });

      // Update log to SENT
      if (job.idempotencyKey) {
        await prisma.notificationLog.update({
          where: { idempotencyKey: job.idempotencyKey },
          data: {
            status: NotificationStatus.SENT,
            provider: result.provider,
            providerMessageId: result.providerMessageId,
            error: null,
          },
        });
      }

      logger.info(
        {
          channel: job.channel,
          to: maskRecipient(job.to),
          templateKey: job.templateKey,
          provider: result.provider,
          messageId: result.providerMessageId,
        },
        'Notification sent successfully'
      );
    } catch (err: any) {
      const errorMsg = err.message || 'Notification transmission failed';

      // Update log to FAILED
      if (job.idempotencyKey) {
        await prisma.notificationLog.update({
          where: { idempotencyKey: job.idempotencyKey },
          data: {
            status: NotificationStatus.FAILED,
            error: errorMsg,
          },
        });
      }

      // Check fallback channel policy
      if (
        config.notifications.fallbackEnabled &&
        job.fallbackChannels &&
        job.fallbackChannels.length > 0
      ) {
        const nextFallback = job.fallbackChannels[0];
        const remainingFallbacks = job.fallbackChannels.slice(1);

        logger.warn(
          {
            failedChannel: job.channel,
            fallbackChannel: nextFallback,
            to: maskRecipient(job.to),
          },
          'Channel dispatch failed; executing automatic notification fallback'
        );

        await this.enqueueNotification({
          to: job.to,
          channel: nextFallback,
          templateKey: job.templateKey,
          locale: job.locale,
          variables: job.variables,
          userId: job.userId,
          idempotencyKey: `${job.idempotencyKey}_fallback_${nextFallback}`,
          fallbackChannels: remainingFallbacks,
        });
      }

      throw err;
    }
  }

  /**
   * Sanitizes variables for storage in audit log (removes plain passwords/tokens)
   */
  private sanitizeVariablesForAudit(variables: Record<string, any>): Record<string, any> {
    const sanitized = { ...variables };
    if ('tempPassword' in sanitized) {
      sanitized.tempPassword = '[REDACTED_SECRET]';
    }
    if ('rawPassword' in sanitized) {
      sanitized.rawPassword = '[REDACTED_SECRET]';
    }
    if ('setupToken' in sanitized) {
      sanitized.setupToken = '[REDACTED_TOKEN]';
    }
    if ('resetToken' in sanitized) {
      sanitized.resetToken = '[REDACTED_TOKEN]';
    }
    return sanitized;
  }

  /**
   * Admin: List Notification Logs with filters and pagination
   */
  async listLogs(params: {
    page?: number;
    limit?: number;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    templateKey?: string;
    userId?: string;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.channel) where.channel = params.channel;
    if (params.status) where.status = params.status;
    if (params.templateKey) where.templateKey = params.templateKey;
    if (params.userId) where.userId = params.userId;

    if (params.search) {
      where.OR = [
        { to: { contains: params.search, mode: 'insensitive' } },
        { templateKey: { contains: params.search, mode: 'insensitive' } },
        { providerMessageId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, studentId: true },
          },
        },
      }),
      prisma.notificationLog.count({ where }),
    ]);

    // Mask recipients in admin list
    const maskedLogs = logs.map((log) => ({
      ...log,
      to: maskRecipient(log.to),
    }));

    return {
      items: maskedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Retry a failed notification
   */
  async retryNotification(logId: string) {
    const log = await prisma.notificationLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundError('Notification log entry not found');
    }

    const metadata = (log.metadata as Record<string, any>) || {};

    await this.enqueueNotification({
      to: log.to,
      channel: log.channel,
      templateKey: log.templateKey,
      locale: log.locale,
      variables: metadata.variables || {},
      userId: log.userId || undefined,
      idempotencyKey: `retry_${log.id}_${Date.now()}`,
    });

    return { message: 'Notification queued for retry' };
  }
}

export const notificationService = new NotificationService();
