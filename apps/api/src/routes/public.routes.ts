import { Router } from 'express';
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

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    layer: 'L1 Marketing / Public API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Authentication
router.post('/auth/register', authRateLimiter, validateBody(registerSchema), authController.register);
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
router.post('/inquiries', validateBody(createInquirySchema), adminStudentController.createInquiry);

// Public Certificate Verification
router.get('/certificates/verify/:certificateId', certificateController.verifyCertificate);

// Webhook status stubs
router.post('/webhooks/whatsapp', notificationController.webhookWhatsApp);
router.post('/webhooks/sms', notificationController.webhookSms);

export { router as publicRouter };
