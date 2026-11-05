import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { AppError, BadRequestError, ForbiddenError, TooManyRequestsError } from '../lib/errors.js';
import { otpService } from './otp.service.js';
import { Role } from '@academy/shared';

const TOKEN_MINUTES = 10;
const pinAttempts = new Map<string, { count: number; until: number }>();

/**
 * "Step-up" confirmation for sensitive admin actions (prices, refunds, roles, deletions,
 * settings): the admin re-enters a personal PIN and an OTP sent to their phone/email, and
 * gets a 10-minute token that the API requires on those requests.
 */
export class StepUpService {
  async hasPin(userId: string) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
    return !!u?.pinHash;
  }

  /** Sets or changes the admin PIN; needs the account password (and the current PIN when changing). */
  async setPin(userId: string, params: { pin: string; password: string; currentPin?: string }) {
    if (!/^\d{4,6}$/.test(params.pin || '')) throw new BadRequestError('The PIN must be 4 to 6 digits');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.ADMIN) throw new ForbiddenError('Only main admins have a security PIN');
    if (!(await bcrypt.compare(params.password || '', user.passwordHash))) throw new BadRequestError('Your password is incorrect');
    if (user.pinHash && !(await bcrypt.compare(params.currentPin || '', user.pinHash))) {
      throw new BadRequestError('Your current PIN is incorrect');
    }
    await prisma.user.update({ where: { id: userId }, data: { pinHash: await bcrypt.hash(params.pin, 10) } });
    return { message: 'Security PIN saved' };
  }

  /** Step 1: check the PIN, then send an OTP. */
  async start(userId: string, pin: string) {
    const lock = pinAttempts.get(userId);
    if (lock && lock.until > Date.now()) throw new TooManyRequestsError('Too many wrong PIN attempts. Try again in 15 minutes.');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.ADMIN) throw new ForbiddenError('Only main admins can confirm this action');
    if (!user.pinHash) throw new AppError('Set your security PIN first (Admin console → My security).', 403, 'PIN_NOT_SET');
    if (!(await bcrypt.compare(String(pin || ''), user.pinHash))) {
      const count = (lock && lock.until <= Date.now() ? 0 : lock?.count || 0) + 1;
      pinAttempts.set(userId, { count, until: count >= 5 ? Date.now() + 15 * 60_000 : 0 });
      throw new BadRequestError(`Incorrect PIN${count >= 5 ? '. Locked for 15 minutes.' : ''}`);
    }
    pinAttempts.delete(userId);
    return otpService.issue({ purpose: 'STEP_UP', target: user.phone || user.email, userId });
  }

  /** Step 2: confirm the OTP and issue the short-lived step-up token. */
  async verify(userId: string, challengeId: string, code: string) {
    await otpService.verify({ challengeId, code, purpose: 'STEP_UP', userId });
    const expiresAt = new Date(Date.now() + TOKEN_MINUTES * 60_000);
    const token = jwt.sign({ sub: userId, typ: 'step-up' }, config.security.signingSecret, { expiresIn: `${TOKEN_MINUTES}m` });
    return { stepUpToken: token, expiresAt };
  }

  isValid(req: Request): boolean {
    const token = req.headers['x-step-up-token'] as string;
    if (!token || !req.user) return false;
    try {
      const payload = jwt.verify(token, config.security.signingSecret) as any;
      return payload.typ === 'step-up' && payload.sub === req.user.userId;
    } catch {
      return false;
    }
  }
}

export const stepUpService = new StepUpService();

/** Main admins only, confirmed with PIN + OTP within the last 10 minutes. */
export function requireStepUp(actionLabel: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== Role.ADMIN) throw new ForbiddenError(`Only a main admin can ${actionLabel}.`);
      if (!stepUpService.isValid(req)) {
        const code = (await stepUpService.hasPin(req.user.userId)) ? 'STEP_UP_REQUIRED' : 'PIN_NOT_SET';
        throw new AppError(`Confirm with your PIN and OTP to ${actionLabel}.`, 403, code, { action: actionLabel });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
