import { NotificationChannel } from '@academy/shared';

export interface SendNotificationParams {
  to: string;
  templateKey: string;
  variables: Record<string, any>;
  userId?: string;
  locale?: string;
  idempotencyKey?: string;
}

export interface SendNotificationResult {
  providerMessageId: string;
  provider: string;
  details?: Record<string, any>;
}

export interface INotificationChannel {
  readonly channel: NotificationChannel;
  send(params: SendNotificationParams): Promise<SendNotificationResult>;
}
