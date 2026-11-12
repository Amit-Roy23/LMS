import { fileService } from '../services/file.service.js';
import { siteService } from '../services/site.service.js';
import { sendSuccess } from '../lib/utils.js';
import { instructorService } from '../services/instructor.service.js';
import { streamService } from '../services/stream.service.js';
import { billingController } from '../controllers/billing.controller.js';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authController } from '../controllers/auth.controller.js';
import { courseController } from '../controllers/course.controller.js';
import { certificateController } from '../controllers/certificate.controller.js';
import { adminStudentController } from '../controllers/admin-student.controller.js';
import { notificationController } from '../controllers/notification.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createInquirySchema,
} from '@academy/shared';

const router = Router();

// ==========================================
// Layer 1: Public Marketing & Auth Routes
// ==========================================

// Website settings (contact details, SEO, analytics IDs) and editable pages
router.get('/site-config', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return sendSuccess(res, await siteService.publicConfig());
  } catch (err) {
    next(err);
  }
});
router.get('/site-pages/:slug', async (req, res, next) => {
  try {
    const page = await siteService.getPage(String(req.params.slug));
    res.setHeader('Cache-Control', 'public, max-age=60');
    return sendSuccess(res, { slug: page.slug, title: page.title, content: page.content, updatedAt: page.updatedAt });
  } catch (err) {
    next(err);
  }
});

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    layer: 'L1 Marketing / Public API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Database check for the operator: reachable, schema up to date, demo data present (no secrets returned)
router.get('/health/db', async (req, res) => {
  const out: Record<string, unknown> = { database: 'unknown' };
  try {
    await prisma.$queryRaw`SELECT 1`;
    out.database = 'ok';
    const rows = await prisma.$queryRaw<{ t: string | null }[]>`SELECT to_regclass('"SitePage"')::text AS t`;
    out.schemaUpToDate = !!rows[0]?.t;
    out.users = await prisma.user.count();
    out.demoAdmin = !!(await prisma.user.findFirst({ where: { email: 'admin@creativeit.academy' }, select: { id: true } }));
    res.status(200).json(out);
  } catch (err: any) {
    out.database = 'error';
    out.code = err?.code || err?.errorCode || err?.name;
    res.status(503).json(out);
  }
});

// Authentication
router.post('/auth/register/request-otp', authRateLimiter, authController.requestRegistrationOtp);
router.post('/auth/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/auth/login/verify-otp', authRateLimiter, authController.verifyLoginOtp);
router.post('/auth/forgot-password/otp', authRateLimiter, authController.forgotPasswordOtp);
router.post('/auth/reset-password/otp', authRateLimiter, authController.resetPasswordOtp);
router.post('/auth/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/auth/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/reset-password', authRateLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authController.logout);

// Online Admission & Registration Flow
router.post('/admissions/apply', notificationController.applyAdmission);
router.post('/admissions/verify', notificationController.verifyAdmissionPayment);
router.get('/registrations/:id', notificationController.getRegistrationById);

// Public Course Catalog
router.get('/courses', courseController.listPublicCourses);
router.get('/courses/:slug', optionalAuthenticate, courseController.getCourseBySlug);

// Public Inquiries & Lead Generation
router.post('/inquiries', authRateLimiter, validateBody(createInquirySchema), adminStudentController.createInquiry);

// Public instructor profiles
router.get('/instructors', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    res.json({ success: true, data: await instructorService.listPublic() });
  } catch (err) {
    next(err);
  }
});
router.get('/instructors/:slug', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    res.json({ success: true, data: await instructorService.getPublic(String(req.params.slug)) });
  } catch (err) {
    next(err);
  }
});

// Public Certificate Verification
router.get('/certificates/verify/:certificateId', certificateController.verifyCertificate);

// Webhook status stubs
router.post('/webhooks/whatsapp', notificationController.webhookWhatsApp);
router.post('/webhooks/razorpay', billingController.razorpayWebhook);
router.get('/payments/config', billingController.checkoutConfig);

// Uploaded files: public profile photos, and study materials behind a per-student signed link
router.get('/files/:id', async (req, res, next) => {
  try {
    const { file, bytes } = await fileService.read(String(req.params.id));
    if (!file.isPublic) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(bytes);
  } catch (err) {
    next(err);
  }
});
router.get('/files/:id/download', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    fileService.verifyDownload(id, String(req.query.u || ''), String(req.query.exp || ''), String(req.query.sig || ''));
    const { file, bytes } = await fileService.read(id);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(bytes);
  } catch (err) {
    next(err);
  }
});

// Protected HLS: signed playlist and decryption key (the link itself authenticates)
router.get('/stream/lessons/:id/playlist.m3u8', async (req, res, next) => {
  try {
    const body = await streamService.playlist(req, String(req.params.id), String(req.query.t || ''));
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(body);
  } catch (err) {
    next(err);
  }
});
router.get('/stream/lessons/:id/key', async (req, res, next) => {
  try {
    const key = await streamService.key(req, String(req.params.id), String(req.query.t || ''));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(key);
  } catch (err) {
    next(err);
  }
});
router.get('/invoices/:id/pdf', billingController.publicInvoicePdf);
router.post('/webhooks/sms', notificationController.webhookSms);

export { router as publicRouter };
