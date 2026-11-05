import { Router, Request, Response, NextFunction } from 'express';
import { courseController } from '../controllers/course.controller.js';
import { enrollmentController } from '../controllers/enrollment.controller.js';
import { quizController } from '../controllers/quiz.controller.js';
import { assignmentController } from '../controllers/assignment.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { certificateController } from '../controllers/certificate.controller.js';
import { reportController, userController, consoleUserController } from '../controllers/misc.controller.js';
import { billingController } from '../controllers/billing.controller.js';
import { consoleController } from '../controllers/console.controller.js';
import { CONSOLE_ROLES, ownCourse, ownStudent, courseOf, scopedCourseIds } from '../lib/access.js';
import { streamService } from '../services/stream.service.js';
import { instructorService } from '../services/instructor.service.js';
import { recordAudit } from '../lib/audit.js';
import { requireStepUp } from '../services/step-up.service.js';
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

// Apply authentication and base console authorization to all Layer 3 admin routes
router.use(authenticate);
router.use(authorizeRoles(...CONSOLE_ROLES));

const ADMIN = Role.ADMIN;
const STAFF = Role.STAFF;
const INSTRUCTOR = Role.INSTRUCTOR;
/** Admins and staff only (admissions, enquiries, notifications) */
const office = authorizeRoles(ADMIN, STAFF);
/** Admins and the course's own instructor (grading, quiz overrides) */
const teaching = authorizeRoles(ADMIN, INSTRUCTOR);

/** Price changes need a main admin with PIN + OTP; staff and instructors cannot change prices. */
async function guardPriceChange(req: Request, res: Response, next: NextFunction) {
  try {
    const priceKeys = ['price', 'recordedPrice', 'livePrice', 'currency'];
    if (!priceKeys.some((k) => k in (req.body || {}))) return next();
    const course = await prisma.course.findUnique({ where: { id: req.params.id as string } });
    if (!course) return next();
    const changed = priceKeys.some(
      (k) => k in req.body && String(req.body[k] ?? '') !== String((course as any)[k] ?? '')
    );
    if (!changed) return next();
    return requireStepUp('change course prices')(req, res, next);
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Layer 3: Administration & Instructor AMS
// ==========================================

// Admin security: PIN and step-up confirmation (PIN + OTP)
router.get('/admin/security', consoleController.securityStatus);
router.put('/admin/security/pin', authorizeRoles(ADMIN), consoleController.setPin);
router.post('/admin/security/step-up', authorizeRoles(ADMIN), consoleController.startStepUp);
router.post('/admin/security/step-up/verify', authorizeRoles(ADMIN), consoleController.verifyStepUp);

// Own public instructor profile (instructors and admins who teach)
router.get('/admin/instructor-profile', teaching, async (req: Request, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await instructorService.getOwn(req.user!.userId));
  } catch (err) {
    next(err);
  }
});
router.put('/admin/instructor-profile', teaching, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await instructorService.upsertOwn(req.user!.userId, req.body || {});
    await recordAudit(req, { action: 'INSTRUCTORPROFILE_UPDATED', entityType: 'InstructorProfile', entityId: profile.id, details: { slug: profile.slug } });
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
});

// Activity log with undo (main admins)
router.get('/admin/activity', authorizeRoles(ADMIN), consoleController.listActivity);
router.post('/admin/activity/:id/revert', authorizeRoles(ADMIN), consoleController.revertActivity);

// Approvals: mobile number changes
router.get('/admin/change-requests', office, consoleController.listChangeRequests);
router.post('/admin/change-requests/:id/approve', authorizeRoles(ADMIN), consoleController.approveChangeRequest);
router.post('/admin/change-requests/:id/reject', authorizeRoles(ADMIN), consoleController.rejectChangeRequest);

// Courses Management
router.get('/admin/courses', courseController.listAdminCourses);
router.post('/admin/courses', validateBody(createCourseSchema), courseController.createCourse);
router.put('/admin/courses/:id', ownCourse(courseOf.courseParam()), guardPriceChange, validateBody(updateCourseSchema), courseController.updateCourse);
router.delete('/admin/courses/:id', requireStepUp('delete a course'), courseController.deleteCourse);

// Modules Management
router.post('/admin/modules', ownCourse(courseOf.courseBody()), validateBody(createModuleSchema), courseController.createModule);
router.put('/admin/modules/:moduleId', ownCourse(courseOf.module()), courseController.updateModule);
router.delete('/admin/modules/:moduleId', requireStepUp('delete a module'), courseController.deleteModule);
router.post('/admin/modules/reorder', ownCourse(courseOf.reorderModules()), courseController.reorderModules);

// Lessons Management
router.post('/admin/lessons', ownCourse(courseOf.module()), validateBody(createLessonSchema), courseController.createLesson);
router.put('/admin/lessons/:lessonId', ownCourse(courseOf.lesson()), courseController.updateLesson);
router.delete('/admin/lessons/:lessonId', requireStepUp('delete a lesson'), courseController.deleteLesson);
router.post('/admin/lessons/reorder', ownCourse(courseOf.reorderLessons()), courseController.reorderLessons);

// Lesson Resources
router.post('/admin/lessons/:lessonId/resources', ownCourse(courseOf.lesson()), courseController.createLessonResource);
router.delete('/admin/resources/:resourceId', teaching, ownCourse(courseOf.resource()), courseController.deleteLessonResource);

// Practice Tasks Management
router.post('/admin/practice-tasks', ownCourse(courseOf.practiceTask()), courseController.createPracticeTask);
router.put('/admin/practice-tasks/:id', ownCourse(courseOf.practiceTask()), courseController.updatePracticeTask);
router.delete('/admin/practice-tasks/:id', teaching, ownCourse(courseOf.practiceTask()), courseController.deletePracticeTask);

// Live Sessions Management
router.post('/admin/live-sessions', ownCourse(courseOf.liveSession()), courseController.createLiveSession);
router.put('/admin/live-sessions/:id', ownCourse(courseOf.liveSession()), courseController.updateLiveSession);
router.delete('/admin/live-sessions/:id', requireStepUp('delete a live class'), courseController.deleteLiveSession);

// Batches & Cohorts Management
router.get('/admin/batches', adminStudentController.listBatches);
router.post('/admin/batches', ownCourse(courseOf.courseBody()), validateBody(createBatchSchema), adminStudentController.createBatch);

// Students Filtering & Performance (R7)
router.get('/admin/students', adminStudentController.listStudents);
router.get('/admin/users/:id/devices', office, consoleController.userDevices);
router.delete('/admin/users/:id/devices/:deviceId', office, consoleController.revokeUserDevice);

// Inquiries & Admissions
router.get('/admin/inquiries', office, adminStudentController.listInquiries);
router.put('/admin/inquiries/:id', office, adminStudentController.updateInquiry);
router.get('/admin/registrations', office, adminStudentController.listRegistrations);

// Manual Provisioning Trigger
router.post('/admin/registrations/:id/provision', office, notificationController.manualProvisionRegistration);

// Student Credentials Resend
router.post('/admin/students/:id/resend-credentials', office, notificationController.resendCredentials);

// Notification Logs & Retries
router.get('/admin/notifications', office, notificationController.listNotifications);
router.post('/admin/notifications/:id/retry', office, notificationController.retryNotification);

// Quizzes & Assessment Engine (Prompt 5)
router.get('/admin/modules/:moduleId/quiz', ownCourse(courseOf.module()), adminQuizController.getQuizConfig);
router.get('/admin/quizzes/:quizId/config', ownCourse(courseOf.quiz()), adminQuizController.getQuizConfig);
router.get('/admin/quizzes/:quizId', ownCourse(courseOf.quiz()), adminQuizController.getQuizConfig);
router.put('/admin/quizzes/:quizId', ownCourse(courseOf.quiz()), validateBody(updateQuizSettingsSchema), adminQuizController.updateQuizSettings);
router.post('/admin/quizzes/:quizId/publish', ownCourse(courseOf.quiz()), adminQuizController.publishQuiz);

// Question Bank CRUD
router.get('/admin/quizzes/:quizId/questions', ownCourse(courseOf.quiz()), adminQuizController.listQuestions);
router.post('/admin/quizzes/:quizId/questions', ownCourse(courseOf.quiz()), validateBody(createQuizQuestionSchema), adminQuizController.createQuestion);
router.put('/admin/questions/:questionId', ownCourse(courseOf.question()), validateBody(updateQuizQuestionSchema), adminQuizController.updateQuestion);
router.delete('/admin/questions/:questionId', teaching, ownCourse(courseOf.question()), adminQuizController.deleteQuestion);
router.post('/admin/questions/:questionId/duplicate', ownCourse(courseOf.question()), adminQuizController.duplicateQuestion);
router.post('/admin/quizzes/:quizId/questions/bulk', ownCourse(courseOf.quiz()), adminQuizController.bulkQuestionsAction);

// CSV Bulk Import & Export
router.get('/admin/quizzes/template/csv', adminQuizController.downloadCsvTemplate);
router.post('/admin/quizzes/:quizId/questions/import', ownCourse(courseOf.quiz()), upload.single('file'), adminQuizController.importQuestionsCsv);
router.get('/admin/quizzes/:quizId/questions/export', ownCourse(courseOf.quiz()), adminQuizController.exportQuestionsCsv);

// Assessment Analytics & Student Performance
router.get('/admin/quizzes/:quizId/attempts', ownCourse(courseOf.quiz()), adminQuizController.listQuizAttempts);
router.get('/admin/students/:studentId/assessments', ownStudent(), adminQuizController.getStudentAssessments);
router.get('/admin/quizzes/:quizId/analytics', ownCourse(courseOf.quiz()), adminQuizController.getQuizAnalytics);

// Admin Overrides (with Audit Logs)
router.post('/admin/quizzes/:quizId/override/reset-attempts', teaching, ownCourse(courseOf.quiz()), adminQuizController.resetStudentAttempts);
router.post('/admin/modules/:moduleId/quiz/override/pass', teaching, ownCourse(courseOf.module()), adminQuizController.passModuleQuiz);
router.post('/admin/attempts/:attemptId/override/invalidate', teaching, ownCourse(courseOf.attempt()), adminQuizController.invalidateAttempt);

// Quizzes & Assignments Management
router.post('/admin/quizzes', ownCourse(courseOf.module()), validateBody(createQuizSchema), quizController.createQuiz);
router.post('/admin/assignments', ownCourse(courseOf.module()), validateBody(createAssignmentSchema), assignmentController.createAssignment);

// Review Queue (Instructor / Admin)
router.get('/reviews/pending', teaching, reviewController.getPendingReviews);
router.post('/reviews/assignments/:submissionId', teaching, validateBody(reviewSubmissionSchema), reviewController.reviewAssignment);
router.post('/reviews/projects/:submissionId', teaching, validateBody(reviewFinalProjectSchema), reviewController.reviewProject);

// Enrollments & Billing
router.get('/admin/enrollments', enrollmentController.listAllEnrollments);
router.get('/admin/payments', office, billingController.listPayments);
router.get('/admin/invoices/:id/pdf', office, billingController.adminInvoicePdf);
router.post('/admin/payments/:id/refund', requireStepUp('refund a payment'), billingController.refund);

// Reports & Analytics
router.get('/admin/reports/analytics', reportController.getAnalytics);

// Video viewing log (who watched what, from which device and network)
router.get('/admin/video-activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await streamService.viewLog({
      courseIds: await scopedCourseIds(req),
      userId: req.query.userId as string,
      take: parseInt(req.query.take as string) || 100,
    });
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Main-Admin Only Routes (ADMIN role; sensitive ones need PIN + OTP)
// ==========================================
router.post('/admin/certificates/:certificateId/revoke', requireStepUp('revoke a certificate'), certificateController.revokeCertificate);
router.get('/admin/users', authorizeRoles(ADMIN), userController.listUsers);
router.post('/admin/users', requireStepUp('create a staff, instructor or admin account'), consoleUserController.create);
router.get('/admin/users/:id', authorizeRoles(ADMIN), userController.getUser);
router.put('/admin/users/:id/status', requireStepUp('suspend or reactivate an account'), userController.updateUserStatus);
router.put('/admin/users/:id/role', requireStepUp('change a role'), consoleUserController.updateRole);

// System Settings Management
router.get('/admin/settings', authorizeRoles(ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    return sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
});

router.put('/admin/settings/:key', requireStepUp('change system settings'), async (req: Request, res: Response, next: NextFunction) => {
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
