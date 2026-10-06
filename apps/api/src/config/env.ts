import dotenv from 'dotenv';
import path from 'path';

// Load from current working directory (.env, .env.local) and api folder
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../api/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/academy_lms?schema=public',
  directUrl: process.env.DIRECT_URL,
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      'academy_access_token_secret_development_key_12345',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      'academy_refresh_token_secret_development_key_67890',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  clientUrl:
    process.env.CLIENT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  appUrl:
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'),
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : path.resolve(process.cwd(), 'uploads')),
  },
  payment: {
    defaultProvider: process.env.PAYMENT_PROVIDER || 'MOCK',
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    },
  },
  redisUrl: process.env.REDIS_URL || '',
  notifications: {
    channelsRegistration: (process.env.NOTIFY_CHANNELS_REGISTRATION || 'email,whatsapp,sms')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
    credentialDelivery: (process.env.CREDENTIAL_DELIVERY || 'setup_link') as 'password' | 'setup_link',
    fallbackEnabled: process.env.NOTIFY_FALLBACK !== 'false',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'Online Creative & IT Academy <noreply@creativeit.academy>',
    },
    whatsapp: {
      provider: (process.env.WHATSAPP_PROVIDER || 'LOG').toUpperCase(),
      meta: {
        phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
        accessToken: process.env.META_WA_ACCESS_TOKEN || '',
        accountId: process.env.META_WA_ACCOUNT_ID || '',
        apiVersion: process.env.META_WA_API_VERSION || 'v19.0',
      },
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_WA_FROM || '',
      },
      gupshup: {
        apiKey: process.env.GUPSHUP_API_KEY || '',
        appName: process.env.GUPSHUP_APP_NAME || '',
      },
    },
    sms: {
      provider: (process.env.SMS_PROVIDER || 'LOG').toUpperCase(),
      dltTemplateId: process.env.SMS_DLT_TE_ID || '',
      msg91: {
        authKey: process.env.MSG91_AUTH_KEY || '',
        senderId: process.env.MSG91_SENDER_ID || 'CRITAC',
      },
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_SMS_FROM || '',
      },
    },
  },
};

