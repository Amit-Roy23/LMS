import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { BadRequestError, TooManyRequestsError } from '../lib/errors.js';
import { maskEmail, maskPhone } from '../lib/phone.js';
import { notificationService } from './notification/notification.service.js';
import { NotificationChannel } from '@academy/shared';

export type OtpPurpose = 'REGISTER' | 'LOGIN_DEVICE' | 'PASSWORD_RESET' | 'PHONE_CHANGE' | 'STEP_UP';

const PURPOSE_LABELS: Record<OtpPurpose, string> = {
  REGISTER: 'verify your mobile number',
  LOGIN_DEVICE: 'sign in on a new device',
  PASSWORD_RESET: 'reset your password',
  PHONE_CHANGE: 'confirm your new mobile number',
  STEP_UP: 'confirm a protected admin action',
};

const TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_PER_HOUR = 6;

export interface IssuedOtp {
  challengeId: string;
  channel: NotificationChannel;
  maskedTarget: string;
  expiresAt: Date;
  /** Only present in demo mode (no SMS gateway configured). */
  devCode?: string;
}

function hashCode(challengeId: string, code: string): string {
  return crypto.createHmac('sha256', config.security.signingSecret).update(`${challengeId}:${code}`).digest('hex');
}

export class OtpService {
  /** Creates a challenge and sends a 6-digit code to a phone (SMS/WhatsApp) or email address. */
  async issue(params: {
    purpose: OtpPurpose;
    target: string;
    userId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<IssuedOtp> {
    const target = params.target.trim().toLowerCase();
    const isEmail = target.includes('@');
    const channel = isEmail
      ? NotificationChannel.EMAIL
      : config.security.otpPhoneChannel === 'WHATSAPP'
        ? NotificationChannel.WHATSAPP
        : NotificationChannel.SMS;

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.otpChallenge.findMany({
      where: { target, purpose: params.purpose, createdAt: { gt: hourAgo } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent.length >= MAX_PER_HOUR) {
      throw new TooManyRequestsError('Too many codes requested. Please try again in an hour.');
    }
    if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - recent[0].createdAt.getTime()) / 1000);
      throw new TooManyRequestsError(`Please wait ${wait} seconds before requesting another code.`, { retryAfter: wait });
    }

    const id = crypto.randomUUID();
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

    await prisma.otpChallenge.create({
      data: {
        id,
        userId: params.userId || null,
        purpose: params.purpose,
        channel,
        target,
        codeHash: hashCode(id, code),
        expiresAt,
        metadata: params.metadata || undefined,
      },
    });

    try {
      await notificationService.enqueueNotification({
        to: target,
        channel,
        templateKey: 'otp_code',
        variables: { code, purposeLabel: PURPOSE_LABELS[params.purpose], minutes: TTL_MINUTES },
        userId: params.userId || undefined,
        idempotencyKey: `otp_${id}`,
        fallbackChannels: [],
      });
    } catch (err) {
      logger.error({ err, purpose: params.purpose }, 'Failed to dispatch OTP');
    }

    return {
      challengeId: id,
      channel,
      maskedTarget: isEmail ? maskEmail(target) : maskPhone(target),
      expiresAt,
      devCode: config.security.otpDemoMode ? code : undefined,
    };
  }

  /**
   * Checks a code and consumes the challenge (single use). Throws with the number of
   * attempts left on a wrong code; locks the challenge after too many attempts.
   */
  async verify(params: { challengeId: string; code: string; purpose: OtpPurpose; target?: string; userId?: string }) {
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: params.challengeId } });
    const invalid = () => new BadRequestError('This code is invalid or has expired. Please request a new one.', { reason: 'OTP_INVALID' });

    if (!challenge || challenge.purpose !== params.purpose || challenge.consumedAt) throw invalid();
    if (params.target && challenge.target !== params.target.trim().toLowerCase()) throw invalid();
    if (params.userId && challenge.userId && challenge.userId !== params.userId) throw invalid();
    if (challenge.expiresAt < new Date()) throw invalid();
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new TooManyRequestsError('Too many incorrect attempts. Please request a new code.');
    }

    const expected = Buffer.from(challenge.codeHash, 'hex');
    const actual = Buffer.from(hashCode(challenge.id, String(params.code || '').trim()), 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      const updated = await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true, maxAttempts: true },
      });
      const left = Math.max(0, updated.maxAttempts - updated.attempts);
      throw new BadRequestError(
        left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Please request a new code.',
        { reason: 'OTP_INCORRECT', attemptsLeft: left }
      );
    }

    // Single use: a second verify with the same challenge fails
    const consumed = await prisma.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date(), verifiedAt: new Date() },
    });
    if (consumed.count === 0) throw invalid();
    return challenge;
  }
}

export const otpService = new OtpService();
