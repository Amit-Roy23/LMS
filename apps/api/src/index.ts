import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 Academy LMS Backend API running on port ${config.port} (${config.env})`);
  logger.info(`📚 Swagger Documentation available at http://localhost:${config.port}/api/docs`);
  logger.info(`🌐 Health check at http://localhost:${config.port}/api/health`);
});

// Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, closing server gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Database disconnected and server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
