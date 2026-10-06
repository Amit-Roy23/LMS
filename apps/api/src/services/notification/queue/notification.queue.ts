import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { NotificationChannel, NotificationStatus } from '@academy/shared';
import { maskRecipient } from '../../../lib/student-id.js';
import { prisma } from '../../../lib/prisma.js';

export interface NotificationJobData {
  to: string;
  channel: NotificationChannel;
  templateKey: string;
  locale?: string;
  variables: Record<string, any>;
  userId?: string;
  idempotencyKey?: string;
  attemptCount?: number;
  fallbackChannels?: NotificationChannel[];
}

export interface INotificationQueue {
  enqueue(data: NotificationJobData): Promise<void>;
  processJob(data: NotificationJobData): Promise<void>;
}

export type JobProcessor = (data: NotificationJobData) => Promise<void>;

/**
 * In-Memory Async Queue with exponential backoff retry and concurrency support
 */
export class InMemoryNotificationQueue implements INotificationQueue {
  private queue: NotificationJobData[] = [];
  private isProcessing = false;
  private processor: JobProcessor | null = null;

  setProcessor(processor: JobProcessor) {
    this.processor = processor;
  }

  async enqueue(data: NotificationJobData): Promise<void> {
    this.queue.push({ ...data, attemptCount: data.attemptCount || 1 });
    this.processNext();
  }

  async processJob(data: NotificationJobData): Promise<void> {
    if (this.processor) {
      await this.processor(data);
    }
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0 || !this.processor) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    if (job) {
      try {
        await this.processor(job);
      } catch (err: any) {
        logger.error(
          {
            error: err.message,
            channel: job.channel,
            to: maskRecipient(job.to),
            attempt: job.attemptCount,
          },
          'Queue job processing failed'
        );

        // Exponential backoff retry up to 5 attempts
        const currentAttempt = job.attemptCount || 1;
        if (currentAttempt < 5) {
          const delayMs = Math.min(1000 * Math.pow(2, currentAttempt), 30000);
          setTimeout(() => {
            this.enqueue({
              ...job,
              attemptCount: currentAttempt + 1,
            });
          }, delayMs);
        }
      } finally {
        this.isProcessing = false;
        setImmediate(() => this.processNext());
      }
    } else {
      this.isProcessing = false;
    }
  }
}

/**
 * BullMQ + Redis Queue Implementation
 */
export class BullMQNotificationQueue implements INotificationQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private processor: JobProcessor | null = null;

  constructor(redisUrl: string) {
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

    this.queue = new Queue('academy-notifications', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  setProcessor(processor: JobProcessor) {
    this.processor = processor;
    if (!this.worker) {
      const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
      this.worker = new Worker(
        'academy-notifications',
        async (job: Job<NotificationJobData>) => {
          await this.processJob(job.data);
        },
        { connection, concurrency: 5 }
      );

      this.worker.on('failed', (job, err) => {
        logger.error(
          {
            jobId: job?.id,
            error: err.message,
            attemptsMade: job?.attemptsMade,
          },
          'BullMQ notification job failed'
        );
      });
    }
  }

  async enqueue(data: NotificationJobData): Promise<void> {
    await this.queue.add(data.templateKey, data, {
      jobId: data.idempotencyKey || undefined,
    });
  }

  async processJob(data: NotificationJobData): Promise<void> {
    if (this.processor) {
      await this.processor(data);
    }
  }
}

/**
 * Queue Factory
 */
export function createNotificationQueue(processor?: JobProcessor): INotificationQueue {
  let queueInstance: INotificationQueue;

  if (config.redisUrl && config.redisUrl.trim() !== '') {
    try {
      const bullQueue = new BullMQNotificationQueue(config.redisUrl);
      if (processor) bullQueue.setProcessor(processor);
      queueInstance = bullQueue;
      logger.info('Initialized BullMQ Redis notification queue');
    } catch (e: any) {
      logger.warn({ error: e.message }, 'Failed to connect to Redis; falling back to in-memory queue');
      const inMemoryQueue = new InMemoryNotificationQueue();
      if (processor) inMemoryQueue.setProcessor(processor);
      queueInstance = inMemoryQueue;
    }
  } else {
    const inMemoryQueue = new InMemoryNotificationQueue();
    if (processor) inMemoryQueue.setProcessor(processor);
    queueInstance = inMemoryQueue;
    logger.info('Initialized In-Memory async notification queue');
  }

  return queueInstance;
}
