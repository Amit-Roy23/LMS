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

  // 2. Upload errors (file too large, too many files) are the client's to fix
  if (err?.name === 'MulterError') {
    statusCode = 400;
    code = 'UPLOAD_REJECTED';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'The file is too large.' : 'The upload was rejected.';
  }

  // 3. Handle Prisma known request errors
  if (err?.code === 'P2002') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with these unique details already exists.';
  } else if (err?.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Requested record was not found.';
  } else if (
    err?.name === 'PrismaClientInitializationError' ||
    ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(err?.code) ||
    /prepared statement|Can't reach database|connection pool|Authentication failed against database/i.test(String(err?.message || ''))
  ) {
    // Database down, unreachable, wrong credentials, or pool exhausted: say so instead of a generic 500
    const ref = err?.code || err?.errorCode || err?.name || 'DB';
    logger.error({ prismaCode: ref, errorMessage: err?.message, url: req.originalUrl }, 'Database unavailable');
    return sendError(
      res,
      `The database is not reachable right now (${ref}). Check that the Supabase project is running and that DATABASE_URL / DIRECT_URL on the server are correct, then try again.`,
      503,
      'DB_UNAVAILABLE'
    );
  } else if (err?.code === 'P2021' || err?.code === 'P2022') {
    // Table or column missing: the code was deployed but the database was not updated
    logger.error({ prismaCode: err.code, meta: err.meta, url: req.originalUrl }, 'Database schema is out of date');
    return sendError(
      res,
      'The database needs an update after the latest release. An administrator must run "npm run db:push" (and "npm run db:seed" for the demo data).',
      503,
      'DB_SCHEMA_OUTDATED'
    );
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
  // A short reference (error type + id) lets the matching server log line be found without exposing details
  const ref = `${String(err?.code || err?.name || 'ERR').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40)}-${Math.random().toString(36).slice(2, 8)}`;
  logger.error({ ref }, 'Error reference');
  return sendError(
    res,
    isDev ? message : `An unexpected error occurred (ref ${ref}). Please try again later.`,
    500,
    'INTERNAL_SERVER_ERROR',
    isDev ? { stack: err?.stack, name: err?.name } : undefined
  );
}
