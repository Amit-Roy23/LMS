import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { Role } from '@academy/shared';
import { deviceService } from '../services/device.service.js';
import { AppError } from '../lib/errors.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  name: string;
  studentId?: string | null;
  mustChangePassword?: boolean;
  /** UserDevice id of this session */
  sid?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check httpOnly cookie: accessToken
    if (!token && req.cookies && req.cookies.accessToken) {
      token = String(req.cookies.accessToken).trim();
    }

    if (!token || token === 'undefined' || token === 'null' || token === '') {
      throw new UnauthorizedError('Authentication required. No token provided.');
    }

    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthUser;
    // A device signed out elsewhere (device limit, "sign out device", password reset) loses access at once
    if (payload.sid && !(await deviceService.isActive(payload.sid))) {
      throw new AppError('You were signed out on this device. Please sign in again.', 401, 'SESSION_REVOKED');
    }
    req.user = payload;
    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Access token expired. Please refresh your token.', 401, 'TOKEN_EXPIRED'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid access token.'));
    } else {
      next(error);
    }
  }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.accessToken) {
      token = String(req.cookies.accessToken).trim();
    }

    if (token && token !== 'undefined' && token !== 'null' && token !== '') {
      const payload = jwt.verify(token, config.jwt.accessSecret) as AuthUser;
      req.user = payload;
    }
  } catch (error) {
    // Ignore error for optional auth
  }
  next();
}

/**
 * Middleware that enforces password change if mustChangePassword === true
 */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    // Allow password change and identity check endpoints
    const path = req.path || '';
    if (path.includes('/auth/change-password') || path.includes('/auth/me') || path.includes('/auth/logout')) {
      return next();
    }
    return next(
      new ForbiddenError('Password change required. You must change your temporary password at /student/change-password before accessing courses.')
    );
  }
  next();
}
