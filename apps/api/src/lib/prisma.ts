import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';
import { logger } from './logger.js';

function createClient() {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || config.databaseUrl,
    // Video decryption keys never leave the database by accident: queries must ask for them explicitly
    omit: { lesson: { hlsKeyHex: true } },
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error', 'warn'],
  });
}

type Client = ReturnType<typeof createClient>;
const globalForPrisma = globalThis as unknown as { prisma?: Client };

export const prisma: Client = globalForPrisma.prisma || createClient();

// Always cache client on globalThis to prevent connection pool exhaustion in serverless lambdas
globalForPrisma.prisma = prisma;

// Log queries in debug mode if needed
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on?.('query', (e: any) => {
    logger.debug({ query: e.query, params: e.params, duration: `${e.duration}ms` }, 'Prisma Query');
  });
}
