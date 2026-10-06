import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { swaggerSpec } from './docs/swagger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRateLimiter } from './middleware/rate-limit.middleware.js';

export function createApp() {
  const app = express();

  // Trust proxy for reverse proxies / Vercel serverless
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.vercel.app') ||
          (config.clientUrl && origin === config.clientUrl)
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Static Uploads Serving (Safe for Serverless)
  const uploadPath = process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : path.resolve(process.cwd(), 'uploads'));
  app.use('/uploads', express.static(uploadPath));

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health Check
  app.get(['/api/health', '/health'], (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API Version 1
  app.use('/api/v1', apiRateLimiter, apiRouter);
  app.use('/v1', apiRateLimiter, apiRouter);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

// Default export so Vercel's Express preset (which picks src/app.ts as the
// entrypoint because it imports express) has an app instance to serve.
const app = createApp();
export default app;
