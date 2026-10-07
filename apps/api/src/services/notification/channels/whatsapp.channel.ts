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

export interface IWhatsAppProvider {
  name: string;
  sendMessage(params: {
    to: string;
    bodyText: string;
    templateKey: string;
    locale: string;
    variables: Record<string, any>;
  }): Promise<{ providerMessageId: string; details?: any }>;
}

/**
 * Dev / Local Log WhatsApp Provider
 * Outputs structured WhatsApp logs to terminal & logger with secrets redacted.
 */
export class LogWhatsAppProvider implements IWhatsAppProvider {
  name = 'LOG_WHATSAPP';

  async sendMessage(params: {
    to: string;
    bodyText: string;
    templateKey: string;
    locale: string;
    variables: Record<string, any>;
  }) {
    const providerMessageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info(
      {
        to: maskRecipient(params.to),
        templateKey: params.templateKey,
        providerMessageId,
      },
      '💬 [DEV LOG WHATSAPP PROVIDER] WhatsApp message dispatched'
    );

    console.log('\n================ [DEV LOG WHATSAPP PROVIDER] ===============');
    console.log(`TO:       ${maskRecipient(params.to)}`);
    console.log(`TEMPLATE: ${params.templateKey} (${params.locale})`);
    console.log(`MESSAGE:\n${params.bodyText}`);
    console.log('===========================================================\n');

    return { providerMessageId, details: { simulated: true } };
  }
}

/**
 * Production Meta WhatsApp Cloud API Provider
 * Uses graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
 */
export class MetaWhatsAppCloudApiProvider implements IWhatsAppProvider {
  name = 'META_WHATSAPP';

  async sendMessage(params: {
    to: string;
    bodyText: string;
    templateKey: string;
    locale: string;
    variables: Record<string, any>;
  }) {
    const { phoneNumberId, accessToken, apiVersion } = config.notifications.whatsapp.meta;

    if (!phoneNumberId || !accessToken) {
      throw new Error(
        'Meta WhatsApp Cloud API credentials missing (META_WA_PHONE_NUMBER_ID / META_WA_ACCESS_TOKEN)'
      );
    }

    // Clean phone number (remove +, spaces, hyphens)
    const recipientPhone = params.to.replace(/\D/g, '');

    // Map template variables according to approved template parameters
    // Production Meta templates require pre-approved template names and positional components
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: params.bodyText,
      },
    };

    const url = `https://graph.facebook.com/${apiVersion || 'v19.0'}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok || data.error) {
      const errMsg = data.error?.message || `Meta WhatsApp API error: ${response.statusText}`;
      logger.error({ error: data.error, to: maskRecipient(params.to) }, 'Meta WhatsApp API request failed');
      throw new Error(errMsg);
    }

    const messageId = data.messages?.[0]?.id || `meta_wa_${Date.now()}`;
    return {
      providerMessageId: messageId,
      details: data,
    };
  }
}

/**
 * Twilio WhatsApp Provider Adapter (Stub)
 */
export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  name = 'TWILIO_WHATSAPP';

  async sendMessage(params: {
    to: string;
    bodyText: string;
    templateKey: string;
    locale: string;
    variables: Record<string, any>;
  }) {
    // TODO(client-requirement): Configure Twilio WhatsApp Sender (whatsapp:+14155238886) and account SID
    const { accountSid, authToken, fromNumber } = config.notifications.whatsapp.twilio;
    if (!accountSid || !authToken) {
      logger.warn('Twilio credentials not configured; falling back to log emulation');
      return new LogWhatsAppProvider().sendMessage(params);
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
      To: params.to.startsWith('whatsapp:') ? params.to : `whatsapp:${params.to}`,
      Body: params.bodyText,
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
      throw new Error(data.message || 'Twilio WhatsApp API Error');
    }

    return { providerMessageId: data.sid, details: data };
  }
}

/**
 * Gupshup WhatsApp Enterprise Provider Adapter (Stub)
 */
export class GupshupWhatsAppProvider implements IWhatsAppProvider {
  name = 'GUPSHUP_WHATSAPP';

  async sendMessage(params: {
    to: string;
    bodyText: string;
    templateKey: string;
    locale: string;
    variables: Record<string, any>;
  }) {
    // TODO(client-requirement): Integrate enterprise Gupshup API with approved templates for Bangladesh / India WhatsApp campaigns
    logger.info({ to: maskRecipient(params.to) }, 'Gupshup WhatsApp provider called (stub)');
    return new LogWhatsAppProvider().sendMessage(params);
  }
}

export class WhatsAppChannel implements INotificationChannel {
  readonly channel = NotificationChannel.WHATSAPP;
  private provider: IWhatsAppProvider;

  constructor() {
    const configuredProvider = config.notifications.whatsapp.provider;
    switch (configuredProvider) {
      case 'META':
        this.provider = new MetaWhatsAppCloudApiProvider();
        break;
      case 'TWILIO':
        this.provider = new TwilioWhatsAppProvider();
        break;
      case 'GUPSHUP':
        this.provider = new GupshupWhatsAppProvider();
        break;
      case 'LOG':
      default:
        this.provider = new LogWhatsAppProvider();
        break;
    }
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    const locale = params.locale || 'en';

    // 1. Fetch template from DB or fallback to seed
    let template = await prisma.notificationTemplate.findUnique({
      where: {
        key_channel_locale: {
          key: params.templateKey,
          channel: NotificationChannel.WHATSAPP,
          locale,
        },
      },
    });

    if (!template && locale !== 'en') {
      template = await prisma.notificationTemplate.findUnique({
        where: {
          key_channel_locale: {
            key: params.templateKey,
            channel: NotificationChannel.WHATSAPP,
            locale: 'en',
          },
        },
      });
    }

    const fallbackSeed = SEED_TEMPLATES.find(
      (t) => t.key === params.templateKey && t.channel === 'WHATSAPP' && t.locale === locale
    ) || SEED_TEMPLATES.find(
      (t) => t.key === params.templateKey && t.channel === 'WHATSAPP' && t.locale === 'en'
    );

    const bodyTemplate = template?.body || fallbackSeed?.body || '';

    // If variables include credential details, format them
    const vars = { ...params.variables };
    if (vars.tempPassword) {
      vars.credentialDetails = `• *Password:* ${vars.tempPassword}\n_(Please change password upon initial login)_`;
    } else if (vars.setupUrl) {
      vars.credentialDetails = `• *Set Password Link:* ${vars.setupUrl}\n_(Single-use link valid for 72 hours)_`;
    } else {
      vars.credentialDetails = `• Use your existing student password to sign in.`;
    }

    const renderedText = renderTemplate(bodyTemplate, vars, { isHtml: false });

    const result = await this.provider.sendMessage({
      to: params.to,
      bodyText: renderedText,
      templateKey: params.templateKey,
      locale,
      variables: vars,
    });

    return {
      providerMessageId: result.providerMessageId,
      provider: this.provider.name,
      details: result.details,
    };
  }
}
