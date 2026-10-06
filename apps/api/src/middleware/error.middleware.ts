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
  // 1. Identify status code and error code safely
  const isAppError = err instanceof AppError || (err && typeof err.statusCode === 'number');
  let statusCode = err?.statusCode || err?.status || (isAppError ? err.statusCode : 500);
  let code = err?.code || (
    statusCode === 400 ? 'BAD_REQUEST' :
    statusCode === 401 ? 'UNAUTHORIZED' :
    statusCode === 403 ? 'FORBIDDEN' :
    statusCode === 404 ? 'NOT_FOUND' :
    statusCode === 409 ? 'CONFLICT' :
    statusCode === 429 ? 'TOO_MANY_REQUESTS' :
    'INTERNAL_SERVER_ERROR'
  );
  let message = err?.message || 'An unexpected error occurred. Please try again later.';
  const details = err?.details;

  // 2. Handle Prisma known request errors
  if (err?.code === 'P2002') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with these unique details already exists.';
  } else if (err?.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Requested record was not found.';
  }

  // 3. Handle Client / Domain Errors (4xx)
  if (statusCode < 500) {
    logger.warn(
      {
        url: req.originalUrl,
        method: req.method,
        statusCode,
        code,
        message,
      },
      `Client Error [${code}]: ${message}`
    );
    return sendError(res, message, statusCode, code, details);
  }

  // 4. Handle Unexpected Server Errors (500+)
  // Log safely without leaking passwords, tokens, cookies, or secrets
  logger.error(
    {
      errorName: err?.name || 'Error',
      errorMessage: err?.message || 'Internal server error',
      errorCode: err?.code || 'INTERNAL_SERVER_ERROR',
      url: req.originalUrl,
      method: req.method,
      stack: err?.stack,
    },
    'Unhandled Server Error'
  );

  const isDev = process.env.NODE_ENV === 'development';
  return sendError(
    res,
    isDev ? message : 'An unexpected error occurred. Please try again later.',
    500,
    'INTERNAL_SERVER_ERROR',
    isDev ? { stack: err?.stack, name: err?.name } : undefined
  );
}
