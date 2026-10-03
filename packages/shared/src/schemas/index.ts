import { z } from 'zod';
import {
  Role,
  DeliveryMode,
  BatchStatus,
  CourseLevel,
  CourseStatus,
  QuestionType,
  SubmissionStatus,
  PaymentProvider,
  LiveProvider,
  LiveSessionStatus,
  AttendanceStatus,
  InquiryStatus,
  RegistrationStatus,
  PerformanceLevel,
  NotificationChannel,
} from '../enums/index.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(Role).default(Role.STUDENT),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  performanceLevel: z.nativeEnum(PerformanceLevel).optional(),
});

export const courseSettingsSchema = z.object({
  passingQuizScorePercent: z.number().min(0).max(100).default(70),
  maxQuizAttempts: z.number().min(1).max(20).default(3),
  sequentialLessonsLock: z.boolean().default(true),
  lessonCompletionThresholdPercent: z.number().min(50).max(100).default(90),
  mockTestPassingPercent: z.number().min(0).max(100).default(75),
  finalAssessmentPassingPercent: z.number().min(0).max(100).default(80),
  timeGatedByLiveSession: z.boolean().default(false),
});

export const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  thumbnail: z.string().url().optional().nullable(),
  price: z.number().min(0, 'Price must be non-negative').default(0),
  recordedPrice: z.number().min(0).optional().nullable(),
  livePrice: z.number().min(0).optional().nullable(),
  currency: z.string().default('INR'),
  hasRecorded: z.boolean().default(true),
  hasLive: z.boolean().default(false),
  level: z.nativeEnum(CourseLevel).default(CourseLevel.BEGINNER),
  category: z.string().min(2),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
  settings: courseSettingsSchema.optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createBatchSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().min(2, 'Batch name is required').max(100),
  section: z.string().min(1, 'Section is required').max(50).default('A'),
  className: z.string().optional().nullable(),
  mode: z.nativeEnum(DeliveryMode).default(DeliveryMode.LIVE),
  instructorId: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  scheduleText: z.string().optional().nullable(),
  weeklySchedule: z.any().optional().default([]),
  capacity: z.number().int().min(1).default(50),
  status: z.nativeEnum(BatchStatus).default(BatchStatus.UPCOMING),
});

export const updateBatchSchema = createBatchSchema.partial();

export const createLiveSessionSchema = z.object({
  batchId: z.string().uuid(),
  moduleId: z.string().uuid().optional().nullable(),
  title: z.string().min(2, 'Session title is required').max(200),
  startsAt: z.string().datetime('Must be valid ISO timestamp'),
  durationMinutes: z.number().int().min(15).max(360).default(60),
  provider: z.nativeEnum(LiveProvider).default(LiveProvider.ZOOM),
  joinUrl: z.string().url('Must be a valid meeting URL'),
  recordingUrl: z.string().url().optional().nullable(),
  status: z.nativeEnum(LiveSessionStatus).default(LiveSessionStatus.SCHEDULED),
});

export const updateLiveSessionSchema = createLiveSessionSchema.partial();

export const recordLiveAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.nativeEnum(AttendanceStatus).default(AttendanceStatus.PRESENT),
});

export const createInquirySchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  phone: z.string().min(8, 'Phone number is required').max(20),
  email: z.string().email('Valid email is required'),
  courseId: z.string().uuid().optional().nullable(),
  message: z.string().min(5, 'Message must be at least 5 characters').max(1000),
  source: z.string().default('WEBSITE'),
});

export const updateInquirySchema = z.object({
  status: z.nativeEnum(InquiryStatus).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createRegistrationSchema = z.object({
  applicantName: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(8, 'Phone number is required').max(20),
  whatsappNumber: z.string().max(20).optional().nullable(),
  courseId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  mode: z.nativeEnum(DeliveryMode).default(DeliveryMode.RECORDED),
  amount: z.number().min(0).default(0),
  currency: z.string().default('INR'),
});

export const createModuleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2, 'Module title is required').max(200),
  description: z.string().optional().nullable(),
  order: z.number().int().min(1),
  requiresAssignment: z.boolean().default(true),
  requiresQuiz: z.boolean().default(true),
});

export const updateModuleSchema = createModuleSchema.partial();

export const createLessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(2, 'Lesson title is required').max(200),
  description: z.string().optional().nullable(),
  videoUrl: z.string().url('Must be a valid video URL'),
  durationSeconds: z.number().int().min(0).default(0),
  order: z.number().int().min(1),
  resources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        type: z.enum(['pdf', 'link', 'zip', 'code']),
      })
    )
    .default([]),
});

export const updateLessonProgressSchema = z.object({
  lessonId: z.string().uuid(),
  watchedSeconds: z.number().min(0),
  percent: z.number().min(0).max(100),
  markComplete: z.boolean().optional().default(false),
});

export const createQuizOptionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty'),
  isCorrect: z.boolean(),
});

export const createQuizQuestionSchema = z.object({
  text: z.string().min(3, 'Question text must be at least 3 characters'),
  explanation: z.string().optional().nullable(),
  type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
  order: z.number().int().min(1),
  points: z.number().min(1).default(1),
  marks: z.number().min(1).default(1),
  options: z.array(createQuizOptionSchema).min(2, 'Must have at least 2 options'),
});

export const createQuizSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().optional().nullable(),
  questionCount: z.number().int().min(1).optional().nullable(),
  passPercentage: z.number().min(0).max(100).default(70),
  passingScorePercent: z.number().min(0).max(100).default(70),
  maxAttempts: z.number().int().min(1).optional().nullable().default(3),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showAnswersAfterSubmit: z.boolean().default(true),
  questions: z.array(createQuizQuestionSchema).min(1, 'Must include at least 1 question'),
});

export const submitQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionIds: z.array(z.string().uuid()),
    })
  ),
});

export const createAssignmentSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().min(10),
  maxScore: z.number().min(1).default(100),
});

export const submitAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  textContent: z.string().optional().nullable(),
  files: z.array(z.string()).default([]),
  linkUrl: z.string().url().optional().nullable(),
});

export const reviewSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum([
    SubmissionStatus.APPROVED,
    SubmissionStatus.CHANGES_REQUESTED,
    SubmissionStatus.REJECTED,
  ]),
  feedback: z.string().min(5, 'Feedback is required for review'),
  grade: z.number().min(0).max(100).optional().nullable(),
});

export const checkoutEnrollmentSchema = z.object({
  courseId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  mode: z.nativeEnum(DeliveryMode).default(DeliveryMode.RECORDED),
  paymentProvider: z.nativeEnum(PaymentProvider).default(PaymentProvider.MOCK),
});

export const submitMockTestSchema = z.object({
  mockTestId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionIds: z.array(z.string().uuid()),
    })
  ),
});

export const submitFinalProjectSchema = z.object({
  finalProjectId: z.string().uuid(),
  description: z.string().min(10, 'Project description is required'),
  files: z.array(z.string()).default([]),
  linkUrl: z.string().url().optional().nullable(),
});

export const reviewFinalProjectSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum([
    SubmissionStatus.APPROVED,
    SubmissionStatus.CHANGES_REQUESTED,
    SubmissionStatus.REJECTED,
  ]),
  feedback: z.string().min(5, 'Feedback is required'),
  grade: z.number().min(0).max(100).optional().nullable(),
});

export const submitFinalAssessmentSchema = z.object({
  finalAssessmentId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionIds: z.array(z.string().uuid()),
    })
  ),
});
