import { Router } from 'express';
import multer from 'multer';
import { authController } from '../controllers/auth.controller.js';
import { courseController } from '../controllers/course.controller.js';
import { enrollmentController } from '../controllers/enrollment.controller.js';
import { quizController } from '../controllers/quiz.controller.js';
import { assignmentController } from '../controllers/assignment.controller.js';
import { mockTestController } from '../controllers/mock-test.controller.js';
import { finalProjectController } from '../controllers/final-project.controller.js';
import { finalAssessmentController } from '../controllers/final-assessment.controller.js';
import { certificateController } from '../controllers/certificate.controller.js';
import { uploadController } from '../controllers/misc.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  updateLessonProgressSchema,
  submitQuizAttemptSchema,
  submitAssignmentSchema,
  checkoutEnrollmentSchema,
  submitMockTestSchema,
  submitFinalProjectSchema,
  submitFinalAssessmentSchema,
} from '@academy/shared';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();

// Apply authentication to all student portal routes
router.use(authenticate);

// ==========================================
// Layer 2: Student LMS Routes
// ==========================================

// User Identity
router.get('/auth/me', authController.getMe);

// Course & Progression
router.get('/courses/id/:id', courseController.getCourseById);
router.get('/courses/:id/progression', courseController.getCourseProgression);
router.post('/lessons/:lessonId/progress', validateBody(updateLessonProgressSchema), courseController.updateLessonProgress);

// Enrollments & Checkout
router.get('/enrollments/my', enrollmentController.listMyEnrollments);
router.post('/enrollments/checkout', validateBody(checkoutEnrollmentSchema), enrollmentController.createCheckout);
router.post('/enrollments/verify', enrollmentController.verifyPayment);

// Quizzes (MCQ Assessments)
router.get('/quizzes/:quizId', quizController.getQuizForRunner);
router.post('/quizzes/:quizId/attempt', validateBody(submitQuizAttemptSchema), quizController.submitAttempt);

// Practical Assignments
router.get('/assignments/:assignmentId', assignmentController.getAssignmentForStudent);
router.post('/assignments/:assignmentId/submit', validateBody(submitAssignmentSchema), assignmentController.submitAssignment);

// Mock Tests
router.get('/mock-tests/:mockTestId', mockTestController.getMockTest);
router.post('/mock-tests/:mockTestId/submit', validateBody(submitMockTestSchema), mockTestController.submitAttempt);

// Final Project
router.get('/final-projects/:projectId', finalProjectController.getProject);
router.post('/final-projects/:projectId/submit', validateBody(submitFinalProjectSchema), finalProjectController.submitProject);

// Final Assessment
router.get('/final-assessments/:assessmentId', finalAssessmentController.getAssessment);
router.post('/final-assessments/:assessmentId/submit', validateBody(submitFinalAssessmentSchema), finalAssessmentController.submitAssessment);

// Certificates
router.get('/certificates/my', certificateController.getMyCertificates);
router.post('/certificates/claim', certificateController.claimCertificate);

// Uploads
router.post('/uploads', upload.single('file'), uploadController.uploadFile);

export { router as studentRouter };
