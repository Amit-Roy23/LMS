import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors.js';
import { Role, UserStatus } from '@academy/shared';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export class AuthService {
  generateTokens(user: { id: string; email: string; role: Role; name: string }) {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as any,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }

  async register(params: { name: string; email: string; password: string; phone?: string | null; role?: Role }) {
    const existing = await prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestError('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const user = await prisma.user.create({
      data: {
        name: params.name,
        email: params.email.toLowerCase(),
        passwordHash,
        phone: params.phone || null,
        role: (params.role || 'STUDENT') as Role,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
      },
    });

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      name: user.name,
    });

    // Save refresh token
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

  async login(params: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });

    if (!user || user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(params.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      name: user.name,
    });

    // Save refresh token
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
        name: user.name,
        email: user.email,
        role: user.role as Role,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status as UserStatus,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const user = storedToken.user;
      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role as Role,
        name: user.name,
      });

      // Revoke old and create new refresh token
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
          name: user.name,
          email: user.email,
          role: user.role as Role,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status as UserStatus,
          createdAt: user.createdAt,
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

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}

export const authService = new AuthService();
