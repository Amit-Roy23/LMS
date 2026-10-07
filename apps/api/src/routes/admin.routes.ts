import { Router, Request, Response, NextFunction } from 'express';
import { courseController } from '../controllers/course.controller.js';
import { enrollmentController } from '../controllers/enrollment.controller.js';
import { quizController } from '../controllers/quiz.controller.js';
import { assignmentController } from '../controllers/assignment.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { certificateController } from '../controllers/certificate.controller.js';
import { reportController, userController } from '../controllers/misc.controller.js';
import { adminStudentController } from '../controllers/admin-student.controller.js';
import { notificationController } from '../controllers/notification.controller.js';
import multer from 'multer';
import { adminQuizController } from '../controllers/admin-quiz.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/utils.js';
import {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  createLessonSchema,
  createQuizSchema,
  updateQuizSettingsSchema,
  createQuizQuestionSchema,
  updateQuizQuestionSchema,
  createAssignmentSchema,
  reviewSubmissionSchema,
  reviewFinalProjectSchema,
  createBatchSchema,
  Role,
} from '@academy/shared';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// Apply authentication and base staff authorization to all Layer 3 admin routes
router.use(authenticate);
router.use(authorizeRoles('ADMIN', 'INSTRUCTOR'));

// ==========================================
// Layer 3: Administration & Instructor AMS
// ==========================================

// Courses Management
router.get('/admin/courses', courseController.listAdminCourses);
router.post('/admin/courses', validateBody(createCourseSchema), courseController.createCourse);
router.put('/admin/courses/:id', validateBody(updateCourseSchema), courseController.updateCourse);
router.delete('/admin/courses/:id', courseController.deleteCourse);

// Modules Management
router.post('/admin/modules', validateBody(createModuleSchema), courseController.createModule);
router.put('/admin/modules/:moduleId', courseController.updateModule);
router.delete('/admin/modules/:moduleId', courseController.deleteModule);
router.post('/admin/modules/reorder', courseController.reorderModules);

// Lessons Management
router.post('/admin/lessons', validateBody(createLessonSchema), courseController.createLesson);
router.put('/admin/lessons/:lessonId', courseController.updateLesson);
router.delete('/admin/lessons/:lessonId', courseController.deleteLesson);
router.post('/admin/lessons/reorder', courseController.reorderLessons);

// Lesson Resources
router.post('/admin/lessons/:lessonId/resources', courseController.createLessonResource);
router.delete('/admin/resources/:resourceId', courseController.deleteLessonResource);

// Practice Tasks Management
router.post('/admin/practice-tasks', courseController.createPracticeTask);
router.put('/admin/practice-tasks/:id', courseController.updatePracticeTask);
router.delete('/admin/practice-tasks/:id', courseController.deletePracticeTask);

// Live Sessions Management
router.post('/admin/live-sessions', courseController.createLiveSession);
router.put('/admin/live-sessions/:id', courseController.updateLiveSession);
router.delete('/admin/live-sessions/:id', courseController.deleteLiveSession);


// Batches & Cohorts Management
router.get('/admin/batches', adminStudentController.listBatches);
router.post('/admin/batches', validateBody(createBatchSchema), adminStudentController.createBatch);

// Students Filtering & Performance (R7)
router.get('/admin/students', adminStudentController.listStudents);

// Inquiries & Admissions
router.get('/admin/inquiries', adminStudentController.listInquiries);
router.get('/admin/registrations', adminStudentController.listRegistrations);

// Manual Provisioning Trigger
router.post('/admin/registrations/:id/provision', notificationController.manualProvisionRegistration);

// Student Credentials Resend
router.post('/admin/students/:id/resend-credentials', notificationController.resendCredentials);

// Notification Logs & Retries
router.get('/admin/notifications', notificationController.listNotifications);
router.post('/admin/notifications/:id/retry', notificationController.retryNotification);

// Quizzes & Assessment Engine (Prompt 5)
router.get('/admin/modules/:moduleId/quiz', adminQuizController.getQuizConfig);
router.get('/admin/quizzes/:quizId/config', adminQuizController.getQuizConfig);
router.get('/admin/quizzes/:quizId', adminQuizController.getQuizConfig);
router.put('/admin/quizzes/:quizId', validateBody(updateQuizSettingsSchema), adminQuizController.updateQuizSettings);
router.post('/admin/quizzes/:quizId/publish', adminQuizController.publishQuiz);

// Question Bank CRUD
router.get('/admin/quizzes/:quizId/questions', adminQuizController.listQuestions);
router.post('/admin/quizzes/:quizId/questions', validateBody(createQuizQuestionSchema), adminQuizController.createQuestion);
router.put('/admin/questions/:questionId', validateBody(updateQuizQuestionSchema), adminQuizController.updateQuestion);
router.delete('/admin/questions/:questionId', adminQuizController.deleteQuestion);
router.post('/admin/questions/:questionId/duplicate', adminQuizController.duplicateQuestion);
router.post('/admin/quizzes/:quizId/questions/bulk', adminQuizController.bulkQuestionsAction);

// CSV Bulk Import & Export
router.get('/admin/quizzes/template/csv', adminQuizController.downloadCsvTemplate);
router.post('/admin/quizzes/:quizId/questions/import', upload.single('file'), adminQuizController.importQuestionsCsv);
router.get('/admin/quizzes/:quizId/questions/export', adminQuizController.exportQuestionsCsv);

// Assessment Analytics & Student Performance
router.get('/admin/quizzes/:quizId/attempts', adminQuizController.listQuizAttempts);
router.get('/admin/students/:studentId/assessments', adminQuizController.getStudentAssessments);
router.get('/admin/quizzes/:quizId/analytics', adminQuizController.getQuizAnalytics);

// Admin Overrides (with Audit Logs)
router.post('/admin/quizzes/:quizId/override/reset-attempts', adminQuizController.resetStudentAttempts);
router.post('/admin/modules/:moduleId/quiz/override/pass', adminQuizController.passModuleQuiz);
router.post('/admin/attempts/:attemptId/override/invalidate', adminQuizController.invalidateAttempt);

// Quizzes & Assignments Management
router.post('/admin/quizzes', validateBody(createQuizSchema), quizController.createQuiz);
router.post('/admin/assignments', validateBody(createAssignmentSchema), assignmentController.createAssignment);

// Review Queue (Instructor / Admin)
router.get('/reviews/pending', reviewController.getPendingReviews);
router.post('/reviews/assignments/:submissionId', validateBody(reviewSubmissionSchema), reviewController.reviewAssignment);
router.post('/reviews/projects/:submissionId', validateBody(reviewFinalProjectSchema), reviewController.reviewProject);

// Enrollments & Billing
router.get('/admin/enrollments', enrollmentController.listAllEnrollments);

// Reports & Analytics
router.get('/admin/reports/analytics', reportController.getAnalytics);

// ==========================================
// Super-Admin Only Routes (ADMIN role required)
// ==========================================
router.post('/admin/certificates/:certificateId/revoke', authorizeRoles('ADMIN'), certificateController.revokeCertificate);
router.get('/admin/users', authorizeRoles('ADMIN'), userController.listUsers);
router.get('/admin/users/:id', authorizeRoles('ADMIN'), userController.getUser);
router.put('/admin/users/:id/status', authorizeRoles('ADMIN'), userController.updateUserStatus);

// System Settings Management
router.get('/admin/settings', authorizeRoles('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    return sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
});

router.put('/admin/settings/:key', authorizeRoles('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key as string;
    const { value, category, description } = req.body;
    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value), category: (category as string) || 'GENERAL', description: description as string },
      update: { value: String(value), ...(category ? { category: category as string } : {}), ...(description ? { description: description as string } : {}) },
    });
    return sendSuccess(res, setting);
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };
