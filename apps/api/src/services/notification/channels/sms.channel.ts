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

export interface ISmsProvider {
  name: string;
  sendSms(params: {
    to: string;
    message: string;
    templateKey: string;
    dltTemplateId?: string;
  }): Promise<{ providerMessageId: string; details?: any }>;
}

/**
 * Dev / Local Log SMS Provider
 */
export class LogSmsProvider implements ISmsProvider {
  name = 'LOG_SMS';

  async sendSms(params: { to: string; message: string; templateKey: string; dltTemplateId?: string }) {
    const providerMessageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info(
      {
        to: maskRecipient(params.to),
        templateKey: params.templateKey,
        providerMessageId,
      },
      '📱 [DEV LOG SMS PROVIDER] SMS message dispatched'
    );

    console.log('\n================== [DEV LOG SMS PROVIDER] ==================');
    console.log(`TO:       ${maskRecipient(params.to)}`);
    console.log(`TEMPLATE: ${params.templateKey}`);
    if (params.dltTemplateId) {
      console.log(`DLT ID:   ${params.dltTemplateId}`);
    }
    console.log(`MESSAGE:\n${params.message}`);
    console.log('===========================================================\n');

    return { providerMessageId, details: { simulated: true } };
  }
}

/**
 * MSG91 SMS Provider Adapter (Stub with DLT template mapping for India)
 */
export class Msg91SmsProvider implements ISmsProvider {
  name = 'MSG91_SMS';

  async sendSms(params: { to: string; message: string; templateKey: string; dltTemplateId?: string }) {
    // TODO(client-requirement): Configure MSG91 Auth Key and DLT Template registration
    const { authKey, senderId } = config.notifications.sms.msg91;
    const dltId = params.dltTemplateId || config.notifications.sms.dltTemplateId;

    if (!authKey) {
      logger.warn('MSG91 auth key missing; fallback to log provider');
      return new LogSmsProvider().sendSms(params);
    }

    const payload = {
      sender: senderId,
      route: '4', // Transactional
      country: '91',
      sms: [
        {
          message: params.message,
          to: [params.to.replace(/\D/g, '')],
        },
      ],
      DLT_TE_ID: dltId,
    };

    const response = await fetch('https://api.msg91.com/api/v2/sendsms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();
    return {
      providerMessageId: data.message || `msg91_${Date.now()}`,
      details: data,
    };
  }
}

/**
 * Twilio SMS Provider Adapter (Stub)
 */
export class TwilioSmsProvider implements ISmsProvider {
  name = 'TWILIO_SMS';

  async sendSms(params: { to: string; message: string; templateKey: string; dltTemplateId?: string }) {
    // TODO(client-requirement): Configure Twilio international SMS sender
    const { accountSid, authToken, fromNumber } = config.notifications.sms.twilio;
    if (!accountSid || !authToken || !fromNumber) {
      logger.warn('Twilio SMS credentials missing; fallback to log provider');
      return new LogSmsProvider().sendSms(params);
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: fromNumber,
      To: params.to,
      Body: params.message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data: any = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Twilio SMS failed');
    }

    return { providerMessageId: data.sid, details: data };
  }
}

export class SmsChannel implements INotificationChannel {
  readonly channel = NotificationChannel.SMS;
  private provider: ISmsProvider;

  constructor() {
    const configuredProvider = config.notifications.sms.provider;
    switch (configuredProvider) {
      case 'MSG91':
        this.provider = new Msg91SmsProvider();
        break;
      case 'TWILIO':
        this.provider = new TwilioSmsProvider();
        break;
      case 'LOG':
      default:
        this.provider = new LogSmsProvider();
        break;
    }
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    const locale = params.locale || 'en';

    let template = await prisma.notificationTemplate.findUnique({
      where: {
        key_channel_locale: {
          key: params.templateKey,
          channel: NotificationChannel.SMS,
          locale,
        },
      },
    });

    if (!template && locale !== 'en') {
      template = await prisma.notificationTemplate.findUnique({
        where: {
          key_channel_locale: {
            key: params.templateKey,
            channel: NotificationChannel.SMS,
            locale: 'en',
          },
        },
      });
    }

    const fallbackSeed = SEED_TEMPLATES.find(
      (t) => t.key === params.templateKey && t.channel === 'SMS' && t.locale === locale
    ) || SEED_TEMPLATES.find(
      (t) => t.key === params.templateKey && t.channel === 'SMS' && t.locale === 'en'
    );

    const bodyTemplate = template?.body || fallbackSeed?.body || '';
    const renderedText = renderTemplate(bodyTemplate, params.variables, { isHtml: false });

    const result = await this.provider.sendSms({
      to: params.to,
      message: renderedText,
      templateKey: params.templateKey,
      dltTemplateId: config.notifications.sms.dltTemplateId,
    });

    return {
      providerMessageId: result.providerMessageId,
      provider: this.provider.name,
      details: result.details,
    };
  }
}
