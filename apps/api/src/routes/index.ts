import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { publicRouter } from './public.routes.js';
import { studentRouter } from './student.routes.js';
import { adminRouter } from './admin.routes.js';

const router = Router();

// ==========================================
// Health & Diagnostic Endpoint (Task 2)
// GET /api/v1/health
// ==========================================
router.get('/health', async (req, res) => {
  // Checks the database is reachable and has the latest structure (new tables and columns)
  let database = 'ok';
  try {
    await Promise.all([
      prisma.user.findFirst({ select: { id: true, isDemo: true, pinHash: true } }),
      prisma.instructorProfile.count(),
      prisma.invoice.count(),
      prisma.videoViewLog.count(),
    ]);
  } catch (err: any) {
    database = err?.code === 'P2021' || err?.code === 'P2022' ? 'schema_outdated: run npm run db:push' : 'unreachable';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    database,
    status: database === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    layers: {
      l1Marketing: 'ONLINE',
      l2StudentLMS: 'ONLINE',
      l3AdminAMS: 'ONLINE',
    },
  });
});

// ==========================================
// Layer 1: Public Marketing & Auth Routes
// ==========================================
router.use('/', publicRouter);

// ==========================================
// Layer 2: Student LMS Routes
// ==========================================
router.use('/', studentRouter);

// ==========================================
// Layer 3: Administration & Instructor AMS
// ==========================================
router.use('/', adminRouter);

export { router as apiRouter };
