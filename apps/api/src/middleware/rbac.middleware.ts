import { Request, Response, NextFunction } from 'express';
import { Role } from '@academy/shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('User is not authenticated.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: requires one of [${allowedRoles.join(', ')}] roles, but user has [${req.user.role}]`
        )
      );
    }

    next();
  };
}
