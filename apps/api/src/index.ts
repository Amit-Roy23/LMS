import app, { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { initializeDomainSubscribers } from './events/subscribers.js';
import { notificationService } from './services/notification/notification.service.js';
import { provisioningService } from './services/provisioning.service.js';

// Initialize domain event subscribers
initializeDomainSubscribers();

// Seed notification templates asynchronously
notificationService.seedDefaultTemplates().catch((err) => {
  logger.error({ error: err.message }, 'Failed to seed default notification templates');
});

// Setup 10-minute reconciliation cron interval
let reconciliationInterval: NodeJS.Timeout | null = null;
if (!process.env.VERCEL) {
  reconciliationInterval = setInterval(async () => {
    try {
      const res = await provisioningService.runReconciliationJob();
      if (res.checked > 0) {
        logger.info(res, 'Periodic provisioning reconciliation completed');
      }
    } catch (e: any) {
      logger.error({ error: e.message }, 'Reconciliation cron failed');
    }
  }, 10 * 60 * 1000); // Every 10 minutes
}

// Only bind TCP listener in standalone mode, not in Vercel Serverless
if (!process.env.VERCEL) {
  const server = app.listen(config.port, () => {
    logger.info(`🚀 Academy LMS Backend API running on port ${config.port} (${config.env})`);
    logger.info(`📚 Swagger Documentation available at http://localhost:${config.port}/api/docs`);
    logger.info(`🌐 Health check at http://localhost:${config.port}/api/health`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, closing server gracefully...`);
    if (reconciliationInterval) clearInterval(reconciliationInterval);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Database disconnected and server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
export { app, createApp };
