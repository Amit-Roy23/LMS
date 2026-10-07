import { Router, Request, Response, NextFunction } from 'express';
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
import { studentPlayerController } from '../controllers/student-player.controller.js';
import { authenticate, requirePasswordChanged } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/utils.js';
import {
  updateLessonProgressSchema,
  submitQuizAttemptSchema,
  submitAssignmentSchema,
  checkoutEnrollmentSchema,
  submitMockTestSchema,
  submitFinalProjectSchema,
  submitFinalAssessmentSchema,
  changePasswordSchema,
  updateProfileSchema,
  createLessonNoteSchema,
  updatePracticeProgressSchema,
} from '@academy/shared';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();

// ==========================================
// Public/Pre-Auth Storage Download Link
// ==========================================
router.get('/storage/download', studentPlayerController.downloadResource);

// Apply authentication to all student portal routes
router.use(authenticate);

// ==========================================
// Layer 2: Student LMS Auth & Profile Routes
// ==========================================

// User Identity & Security
router.get('/auth/me', authController.getMe);
router.post('/auth/change-password', validateBody(changePasswordSchema), authController.changePassword);
router.post('/auth/logout-everywhere', authController.logoutEverywhere);

// Student Profile Management
router.put('/student/profile', validateBody(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { name, phone, whatsappNumber, address, city, education, avatar } = req.body;

    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(avatar ? { avatar } : {}),
        },
      }),
      prisma.studentProfile.upsert({
        where: { userId },
        create: {
          userId,
          phone: phone || null,
          whatsappNumber: whatsappNumber || null,
          address: address || null,
          city: city || null,
          education: education || null,
          avatar: avatar || null,
        },
        update: {
          ...(phone !== undefined ? { phone } : {}),
          ...(whatsappNumber !== undefined ? { whatsappNumber } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(city !== undefined ? { city } : {}),
          ...(education !== undefined ? { education } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
        },
      }),
    ]);

    return sendSuccess(res, {
      ...updatedUser,
      studentProfile: updatedProfile,
    });
  } catch (err) {
    next(err);
  }
});

// Student Receipts
router.get('/student/receipts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const [payments, registrations] = await Promise.all([
      prisma.payment.findMany({
        where: { studentId: userId },
        include: { course: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.registration.findMany({
        where: {
          OR: [
            { userId },
            ...(user?.email ? [{ email: user.email }] : []),
            ...(user?.phone ? [{ phone: user.phone }] : []),
          ],
        },
        include: { course: true, batch: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return sendSuccess(res, { payments, registrations });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Guard: Force Password Change before Accessing Courses
// ==========================================
router.use(requirePasswordChanged);

// Course Player & Progression Routes (Layer 2)
router.get('/student/courses', studentPlayerController.getMyCourses);
router.get('/student/courses/:courseId/curriculum', studentPlayerController.getCourseCurriculum);
router.get('/student/lessons/:lessonId', studentPlayerController.getLesson);
router.post('/student/lessons/:lessonId/progress', validateBody(updateLessonProgressSchema), studentPlayerController.updateProgress);
router.post('/student/lessons/:lessonId/complete', studentPlayerController.markLessonComplete);
router.post('/student/lessons/:lessonId/bookmark', studentPlayerController.toggleBookmark);
router.delete('/student/lessons/:lessonId/bookmark', studentPlayerController.toggleBookmark);

// Notes CRUD
router.get('/student/lessons/:lessonId/notes', studentPlayerController.getLessonNotes);
router.post('/student/lessons/:lessonId/notes', validateBody(createLessonNoteSchema), studentPlayerController.createLessonNote);
router.delete('/student/notes/:noteId', studentPlayerController.deleteLessonNote);

// Personal Practice Tasks
router.put('/student/practice/:taskId', validateBody(updatePracticeProgressSchema), studentPlayerController.updatePracticeProgress);

// Live Classes
router.get('/student/live-sessions', studentPlayerController.listLiveSessions);
router.get('/student/live-sessions/:id/join', studentPlayerController.joinLiveSession);
router.get('/student/live-sessions/:id/ical', studentPlayerController.getLiveSessionICal);

// Legacy course progress / progression routes
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

