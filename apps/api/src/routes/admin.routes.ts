import { Router } from 'express';
import { courseController } from '../controllers/course.controller.js';
import { enrollmentController } from '../controllers/enrollment.controller.js';
import { quizController } from '../controllers/quiz.controller.js';
import { assignmentController } from '../controllers/assignment.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { certificateController } from '../controllers/certificate.controller.js';
import { reportController, userController } from '../controllers/misc.controller.js';
import { adminStudentController } from '../controllers/admin-student.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  createLessonSchema,
  createQuizSchema,
  createAssignmentSchema,
  reviewSubmissionSchema,
  reviewFinalProjectSchema,
  createBatchSchema,
  Role,
} from '@academy/shared';

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

// Lessons Management
router.post('/admin/lessons', validateBody(createLessonSchema), courseController.createLesson);
router.put('/admin/lessons/:lessonId', courseController.updateLesson);
router.delete('/admin/lessons/:lessonId', courseController.deleteLesson);

// Batches & Cohorts Management
router.get('/admin/batches', adminStudentController.listBatches);
router.post('/admin/batches', validateBody(createBatchSchema), adminStudentController.createBatch);

// Students Filtering & Performance (R7)
router.get('/admin/students', adminStudentController.listStudents);

// Inquiries & Admissions
router.get('/admin/inquiries', adminStudentController.listInquiries);
router.get('/admin/registrations', adminStudentController.listRegistrations);

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

export { router as adminRouter };
