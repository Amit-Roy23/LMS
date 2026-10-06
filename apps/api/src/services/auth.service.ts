import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { Role, UserStatus } from '@academy/shared';
import {
  generateVerificationToken,
  hashToken,
  maskRecipient,
} from '../lib/student-id.js';
import { eventBus } from '../events/event-bus.js';
import { logger } from '../lib/logger.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  studentId?: string | null;
  mustChangePassword?: boolean;
}

export class AuthService {
  generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    name: string;
    studentId?: string | null;
    mustChangePassword?: boolean;
  }) {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      studentId: user.studentId || null,
      mustChangePassword: Boolean(user.mustChangePassword),
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as any,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }

  async register(params: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
    role?: Role;
  }) {
    const normalizedEmail = params.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new BadRequestError('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const user = await prisma.user.create({
      data: {
        name: params.name,
        email: normalizedEmail,
        passwordHash,
        phone: params.phone?.trim() || null,
        role: (params.role || Role.STUDENT) as Role,
        status: 'ACTIVE',
        mustChangePassword: false,
      },
      select: {
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
      },
    });

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      name: user.name,
      studentId: user.studentId,
      mustChangePassword: user.mustChangePassword,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user, tokens };
  }

  /**
   * Student / Staff Login
   * Supports Student ID (OCA-2026-000123) OR Email OR Phone + Password
   * Implements account lockout (5 attempts -> 15 min lock) and generic responses for enumeration safety
   */
  async login(params: { email?: string; identifier?: string; password: string }) {
    const identifier = (params.identifier || params.email || '').trim();
    const password = params.password;

    if (!identifier || !password) {
      throw new BadRequestError('Student ID / Email / Phone and password are required');
    }

    // Lookup user by Student ID, Email, or Phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { studentId: identifier.toUpperCase() },
          { studentId: identifier },
          { phone: identifier },
        ],
      },
      include: {
        studentProfile: true,
      },
    });

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

    // Reset lockout counters on successful authentication
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      name: user.name,
      studentId: user.studentId,
      mustChangePassword: user.mustChangePassword,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
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
  }

  /**
   * Request Password Reset (Enumeration-Safe)
   */
  async forgotPassword(identifier: string) {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new BadRequestError('Email or Phone number is required');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId.toLowerCase() },
          { studentId: cleanId.toUpperCase() },
          { studentId: cleanId },
          { phone: cleanId },
        ],
      },
      include: { studentProfile: true },
    });

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

      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role as Role,
        name: user.name,
        studentId: user.studentId,
        mustChangePassword: user.mustChangePassword,
      });

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

    return user;
  }
}

export const authService = new AuthService();
