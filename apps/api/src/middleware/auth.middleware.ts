import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';
import { Role } from '@academy/shared';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Check httpOnly cookie: accessToken
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No token provided.');
    }

    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthUser;
    req.user = payload;
    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token expired. Please refresh your token.'));
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
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const payload = jwt.verify(token, config.jwt.accessSecret) as AuthUser;
      req.user = payload;
    }
  } catch (error) {
    // Ignore error for optional auth
  }
  next();
}
