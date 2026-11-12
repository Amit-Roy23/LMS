import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { Role, UserStatus } from '@academy/shared';
import {
  generateStudentId,
  generateVerificationToken,
  hashToken,
  maskRecipient,
} from '../lib/student-id.js';
import { eventBus } from '../events/event-bus.js';
import { logger } from '../lib/logger.js';
import { Request } from 'express';
import { normalizePhone, looksLikePhone } from '../lib/phone.js';
import { otpService } from './otp.service.js';
import { deviceService } from './device.service.js';
import { getDeviceId } from '../lib/request-info.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  studentId?: string | null;
  mustChangePassword?: boolean;
  /** UserDevice id of the signed-in browser/phone (absent for legacy tokens). */
  sid?: string | null;
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  studentId: true,
  role: true,
  phone: true,
  avatar: true,
  status: true,
  mustChangePassword: true,
  createdAt: true,
  studentProfile: true,
} as const;

export class AuthService {
  generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    name: string;
    studentId?: string | null;
    mustChangePassword?: boolean;
  }, sid?: string | null) {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      studentId: user.studentId || null,
      mustChangePassword: Boolean(user.mustChangePassword),
      sid: sid || null,
    };

    // A unique token id (jti) keeps tokens distinct even when the same user signs in
    // twice within one second (double click, two tabs); refresh tokens are stored as unique.
    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as any,
      jwtid: randomUUID(),
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
      jwtid: randomUUID(),
    });

    return { accessToken, refreshToken };
  }

  /** Creates the refresh-token record for a new session bound to a device. */
  private async startSession(user: { id: string; email: string; role: any; name: string; studentId?: string | null; mustChangePassword?: boolean }, sid: string | null) {
    const tokens = this.generateTokens({ ...user, role: user.role as Role }, sid);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        deviceSid: sid,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return tokens;
  }

  /** Step 1 of registration: check the email and mobile are free and text an OTP to the mobile. */
  async requestRegistrationOtp(params: { email: string; phone: string }) {
    const email = String(params.email || '').toLowerCase().trim();
    const phone = normalizePhone(params.phone);
    if (!email || !email.includes('@')) throw new BadRequestError('Please enter a valid email address');
    if (!phone) throw new BadRequestError('Please enter a valid 10-digit mobile number');

    const [emailTaken, phoneTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { phone }, select: { id: true } }),
    ]);
    if (emailTaken) throw new BadRequestError('An account with this email address already exists. Please sign in instead.');
    if (phoneTaken) {
      throw new BadRequestError('This mobile number is already registered. Each student can have only one account; please sign in instead.');
    }

    return otpService.issue({ purpose: 'REGISTER', target: phone, metadata: { email } });
  }

  async register(
    params: {
      name: string;
      email: string;
      password: string;
      phone?: string | null;
      role?: Role;
      challengeId?: string;
      otpCode?: string;
    },
    req?: Request
  ) {
    const normalizedEmail = params.email.toLowerCase().trim();
    const phone = normalizePhone(params.phone);
    if (params.phone && !phone) throw new BadRequestError('Please enter a valid 10-digit mobile number');
    if (config.security.requireOtpRegistration && !phone) {
      throw new BadRequestError('A mobile number is required to create an account');
    }

    const [existing, phoneTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
      phone ? prisma.user.findUnique({ where: { phone }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (existing) {
      throw new BadRequestError('An account with this email address already exists');
    }
    if (phoneTaken) {
      throw new BadRequestError('This mobile number is already registered. Each student can have only one account.');
    }

    if (config.security.requireOtpRegistration) {
      if (!params.challengeId || !params.otpCode) {
        throw new BadRequestError('Please verify your mobile number with the OTP first', { reason: 'OTP_REQUIRED' });
      }
      await otpService.verify({ challengeId: params.challengeId, code: params.otpCode, purpose: 'REGISTER', target: phone! });
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    // Every student gets an official ID (ADS-2026-000123) at registration; it also works as a login
    const user = await prisma.$transaction(async (tx) => {
      const studentId = await generateStudentId(tx);
      return tx.user.create({
      data: {
        studentId,
        name: params.name,
        email: normalizedEmail,
        passwordHash,
        phone,
        // Public sign-up always creates students; staff accounts are created by an admin
        role: Role.STUDENT,
        status: 'ACTIVE',
        mustChangePassword: false,
        studentProfile: { create: { phone } },
      },
      select: USER_SELECT,
      });
    });

    const deviceId = req ? getDeviceId(req) : null;
    const sid = deviceId && req ? (await deviceService.trust(user.id, deviceId, req, { enforceLimit: true })).device.id : null;
    const tokens = await this.startSession(user, sid);
    return { user, tokens };
  }

  /** Finds a user by student ID, email or mobile number (any common phone format). */
  private findByIdentifier(identifier: string) {
    const phone = looksLikePhone(identifier) ? normalizePhone(identifier) : null;
    return prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: identifier.toLowerCase() },
          { studentId: identifier.toUpperCase() },
          { studentId: identifier },
          { phone: identifier },
          ...(phone ? [{ phone }] : []),
        ],
      },
      include: { studentProfile: true },
    });
  }

  /**
   * Student / Staff Login
   * Supports Student ID (ADS-2026-000123) OR Email OR Phone + Password
   * Implements account lockout (5 attempts -> 15 min lock) and generic responses for enumeration safety.
   * A browser/phone the account has not verified before gets an OTP challenge instead of tokens.
   */
  async login(params: { email?: string; identifier?: string; password: string }, req?: Request) {
    const identifier = (params.identifier || params.email || '').trim();
    const password = params.password;

    if (!identifier || !password) {
      throw new BadRequestError('Student ID / Email / Phone and password are required');
    }

    const user = await this.findByIdentifier(identifier);

    if (!user) {
      // Enumeration-safe generic error
      throw new UnauthorizedError('Invalid login credentials. Please check your Student ID, Email, or Phone and password.');
    }

    // Account Status Check
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Your account has been suspended. Please contact academy support.');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenError('Your account is currently inactive. Please contact academy support.');
    }

    // Lockout Check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      throw new UnauthorizedError(
        `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`
      );
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const newFailedCount = (user.failedLoginAttempts || 0) + 1;
      let lockedUntilDate: Date | null = null;

      if (newFailedCount >= 5) {
        lockedUntilDate = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
        logger.warn(
          { userId: user.id, email: maskRecipient(user.email) },
          'Account locked for 15 minutes due to 5 consecutive failed login attempts'
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedCount,
          lockedUntil: lockedUntilDate,
        },
      });

      throw new UnauthorizedError('Invalid login credentials. Please check your Student ID, Email, or Phone and password.');
    }

    const deviceId = req ? getDeviceId(req) : null;
    const knownDevice = deviceId ? await deviceService.findActive(user.id, deviceId) : null;

    // New browser/phone: confirm with an OTP before issuing a session. Demo staff accounts are
    // exempt so reviewers can switch roles quickly; demo students follow the real student rules.
    if (config.security.requireOtpNewDevice && !this.deviceRulesExempt(user) && !knownDevice) {
      if (!deviceId) {
        throw new BadRequestError('Device identifier missing. Please refresh the page and try again.', { reason: 'DEVICE_ID_REQUIRED' });
      }
      const target = user.phone || user.email;
      const otp = await otpService.issue({ purpose: 'LOGIN_DEVICE', target, userId: user.id, metadata: { deviceId } });
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
      return { otpRequired: true as const, reason: 'NEW_DEVICE', ...otp };
    }

    // Reset lockout counters on successful authentication
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    let sid: string | null = null;
    let signedOut: string[] = [];
    if (deviceId && req) {
      const trusted = await deviceService.trust(user.id, deviceId, req, {
        enforceLimit: user.role === Role.STUDENT,
      });
      sid = trusted.device.id;
      signedOut = trusted.signedOut;
    }

    await this.ensureStudentId(user);
    const tokens = await this.startSession(user, sid);
    return { otpRequired: false as const, user: this.publicUser(user), tokens, signedOut };
  }

  /** Completes a new-device sign-in once the OTP is confirmed. */
  async verifyLoginOtp(params: { challengeId: string; code: string }, req: Request) {
    const challenge = await otpService.verify({ challengeId: params.challengeId, code: params.code, purpose: 'LOGIN_DEVICE' });
    const deviceId = (challenge.metadata as any)?.deviceId || getDeviceId(req);
    if (!challenge.userId || !deviceId) throw new BadRequestError('This sign-in request is no longer valid. Please sign in again.');

    const user = await prisma.user.findUnique({ where: { id: challenge.userId }, include: { studentProfile: true } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new ForbiddenError('Account is not active');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const { device, signedOut } = await deviceService.trust(user.id, deviceId, req, {
      enforceLimit: user.role === Role.STUDENT,
    });
    await this.ensureStudentId(user);
    const tokens = await this.startSession(user, device.id);
    return { user: this.publicUser(user), tokens, signedOut };
  }

  /** Only demo staff accounts skip the new-device OTP; students (demo or real) never do. */
  private deviceRulesExempt(user: { isDemo?: boolean | null; role: any }) {
    return !!user.isDemo && user.role !== Role.STUDENT;
  }

  /** Every student must have an official ID; older accounts without one get it on next sign-in. */
  private async ensureStudentId(user: { id: string; role: any; studentId?: string | null }) {
    if (user.role !== Role.STUDENT || user.studentId) return;
    user.studentId = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { studentId: true } });
      if (fresh?.studentId) return fresh.studentId;
      const id = await generateStudentId(tx);
      await tx.user.update({ where: { id: user.id }, data: { studentId: id } });
      return id;
    });
  }

  private publicUser(user: any) {
    return {
      id: user.id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status as UserStatus,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      studentProfile: user.studentProfile,
    };
  }

  /** Password reset by OTP to the registered mobile (or email when no mobile is on file). */
  async forgotPasswordOtp(identifier: string) {
    const cleanId = String(identifier || '').trim();
    if (!cleanId) throw new BadRequestError('Student ID, email or mobile number is required');
    const user = await this.findByIdentifier(cleanId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      // Same response shape so the form does not reveal whether an account exists
      return { challengeId: randomUUID(), channel: 'SMS', maskedTarget: 'your registered mobile number', expiresAt: new Date(Date.now() + 600000) };
    }
    return otpService.issue({ purpose: 'PASSWORD_RESET', target: user.phone || user.email, userId: user.id });
  }

  async resetPasswordWithOtp(params: { challengeId: string; code: string; password: string }) {
    if (!params.password || params.password.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }
    const challenge = await otpService.verify({ challengeId: params.challengeId, code: params.code, purpose: 'PASSWORD_RESET' });
    if (!challenge.userId) throw new BadRequestError('This code is invalid or has expired. Please request a new one.');
    const passwordHash = await bcrypt.hash(params.password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: challenge.userId },
        data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.refreshToken.updateMany({ where: { userId: challenge.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password reset successfully. You may now sign in with your new password.' };
  }

  /**
   * Request Password Reset (Enumeration-Safe)
   */
  async forgotPassword(identifier: string) {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new BadRequestError('Email or Phone number is required');
    }

    const user = await this.findByIdentifier(cleanId);

    if (user && user.status === UserStatus.ACTIVE) {
      const { plainToken, tokenHash } = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      await prisma.verificationToken.create({
        data: {
          tokenHash,
          userId: user.id,
          type: 'PASSWORD_RESET',
          expiresAt,
        },
      });

      const resetUrl = `${config.clientUrl}/reset-password?token=${plainToken}`;

      await eventBus.emit('password.reset_requested', {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsappNumber: user.studentProfile?.whatsappNumber,
        resetToken: plainToken,
        resetUrl,
        expiresInHours: 1,
        occurredAt: new Date(),
      });
    }

    // Always return constant message for enumeration safety
    return {
      message: 'If an account matches this identifier, password reset instructions have been dispatched.',
    };
  }

  /**
   * Complete Password Reset using Single-Use Token
   */
  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestError('Token and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }

    const tokenHash = hashToken(token);

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new BadRequestError('Invalid or expired password reset link. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password, mark token as used, and invalidate all existing refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: verificationToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info({ userId: verificationToken.userId }, 'User successfully reset password via verification token');

    return { message: 'Password reset successfully. You may now sign in with your new password.' };
  }

  /**
   * Change Password (from Student Portal or Forced Initial Password Change)
   */
  async changePassword(userId: string, currentPassword?: string, newPassword?: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // If user is not forced to change password, require current password validation
    if (!user.mustChangePassword && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestError('Current password is incorrect');
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      }),
      // Revoke all existing refresh tokens
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info({ userId }, 'User changed password successfully');

    return { message: 'Password updated successfully' };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            include: { studentProfile: true },
          },
        },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const user = storedToken.user;
      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenError('Account is not active');
      }
      if (storedToken.deviceSid && !(await deviceService.isActive(storedToken.deviceSid))) {
        throw new UnauthorizedError('This device was signed out');
      }

      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role as Role,
        name: user.name,
        studentId: user.studentId,
        mustChangePassword: user.mustChangePassword,
      }, storedToken.deviceSid);

      // Token rotation: Revoke old and create new refresh token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          deviceSid: storedToken.deviceSid,
          expiresAt,
        },
      });

      return {
        user: {
          id: user.id,
          studentId: user.studentId,
          name: user.name,
          email: user.email,
          role: user.role as Role,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status as UserStatus,
          mustChangePassword: user.mustChangePassword,
          createdAt: user.createdAt,
          studentProfile: user.studentProfile,
        },
        tokens,
      };
    } catch (e) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async logoutEverywhere(userId: string) {
    const devices = await prisma.userDevice.findMany({ where: { userId, revokedAt: null }, select: { id: true } });
    for (const d of devices) await deviceService.revoke(d.id, 'Signed out from all devices');
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out of all sessions' };
  }

  async getMe(userId: string) {
    if (!userId) {
      throw new UnauthorizedError('User ID required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
        studentProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }
    await this.ensureStudentId(user);
    return user;
  }
}

export const authService = new AuthService();
