import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { sendError } from '../lib/utils.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn({ err, url: req.originalUrl, method: req.method }, `AppError [${err.code}]: ${err.message}`);
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle unexpected unhandled errors
  logger.error({ err, url: req.originalUrl, method: req.method, stack: err.stack }, 'Unhandled Server Error');

  const isDev = process.env.NODE_ENV === 'development';
  return sendError(
    res,
    isDev ? err.message || 'Internal Server Error' : 'An unexpected error occurred. Please try again later.',
    500,
    'INTERNAL_SERVER_ERROR',
    isDev ? { stack: err.stack } : undefined
  );
}
