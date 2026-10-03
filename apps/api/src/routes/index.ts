import { Router } from 'express';
import { publicRouter } from './public.routes.js';
import { studentRouter } from './student.routes.js';
import { adminRouter } from './admin.routes.js';

const router = Router();

// ==========================================
// Health & Diagnostic Endpoint (Task 2)
// GET /api/v1/health
// ==========================================
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
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
