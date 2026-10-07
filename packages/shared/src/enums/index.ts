export const Role = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const DeliveryMode = {
  RECORDED: 'RECORDED',
  LIVE: 'LIVE',
} as const;
export type DeliveryMode = (typeof DeliveryMode)[keyof typeof DeliveryMode];

export const BatchStatus = {
  UPCOMING: 'UPCOMING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type BatchStatus = (typeof BatchStatus)[keyof typeof BatchStatus];

export const CourseStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const CourseLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  ALL_LEVELS: 'ALL_LEVELS',
} as const;
export type CourseLevel = (typeof CourseLevel)[keyof typeof CourseLevel];

export const ModuleStatus = {
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_REVIEW: 'AWAITING_REVIEW',
  COMPLETED: 'COMPLETED',
} as const;
export type ModuleStatus = (typeof ModuleStatus)[keyof typeof ModuleStatus];

export const QuestionType = {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const SubmissionStatus = {
  PENDING: 'PENDING',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const EnrollmentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const AccessStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
} as const;
export type AccessStatus = (typeof AccessStatus)[keyof typeof AccessStatus];

export const PaymentProvider = {
  MOCK: 'MOCK',
  RAZORPAY: 'RAZORPAY',
  UPI: 'UPI',
  MANUAL: 'MANUAL',
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const LiveProvider = {
  ZOOM: 'ZOOM',
  MEET: 'MEET',
  YOUTUBE: 'YOUTUBE',
  OTHER: 'OTHER',
} as const;
export type LiveProvider = (typeof LiveProvider)[keyof typeof LiveProvider];

export const LiveSessionStatus = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type LiveSessionStatus = (typeof LiveSessionStatus)[keyof typeof LiveSessionStatus];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const InquiryStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  CONVERTED: 'CONVERTED',
  CLOSED: 'CLOSED',
} as const;
export type InquiryStatus = (typeof InquiryStatus)[keyof typeof InquiryStatus];

export const RegistrationStatus = {
  DRAFT: 'DRAFT',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  CANCELLED: 'CANCELLED',
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const PerformanceLevel = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  AVERAGE: 'AVERAGE',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
} as const;
export type PerformanceLevel = (typeof PerformanceLevel)[keyof typeof PerformanceLevel];

export const CertificateStatus = {
  VALID: 'VALID',
  REVOKED: 'REVOKED',
} as const;
export type CertificateStatus = (typeof CertificateStatus)[keyof typeof CertificateStatus];

export const NotificationChannel = {
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  SMS: 'SMS',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const NotificationType = {
  SYSTEM: 'SYSTEM',
  ENROLLMENT: 'ENROLLMENT',
  REVIEW_FEEDBACK: 'REVIEW_FEEDBACK',
  CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',
  QUIZ_RESULT: 'QUIZ_RESULT',
  LIVE_CLASS_REMINDER: 'LIVE_CLASS_REMINDER',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const LessonType = {
  VIDEO: 'VIDEO',
  LIVE_CLASS: 'LIVE_CLASS',
  READING: 'READING',
} as const;
export type LessonType = (typeof LessonType)[keyof typeof LessonType];

export const VideoProvider = {
  YOUTUBE: 'YOUTUBE',
  VIMEO: 'VIMEO',
  MP4: 'MP4',
  HLS: 'HLS',
  OTHER: 'OTHER',
} as const;
export type VideoProvider = (typeof VideoProvider)[keyof typeof VideoProvider];

export const PracticeTaskType = {
  CHECKLIST: 'CHECKLIST',
  EXERCISE: 'EXERCISE',
  UPLOAD_OPTIONAL: 'UPLOAD_OPTIONAL',
} as const;
export type PracticeTaskType = (typeof PracticeTaskType)[keyof typeof PracticeTaskType];

export const PracticeStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;
export type PracticeStatus = (typeof PracticeStatus)[keyof typeof PracticeStatus];

export const CompletionSource = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL',
  LIVE_ATTENDANCE: 'LIVE_ATTENDANCE',
  ADMIN: 'ADMIN',
} as const;
export type CompletionSource = (typeof CompletionSource)[keyof typeof CompletionSource];

export const ResourceType = {
  PDF: 'PDF',
  ZIP: 'ZIP',
  LINK: 'LINK',
  IMAGE: 'IMAGE',
  CODE: 'CODE',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const QuestionDifficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;
export type QuestionDifficulty = (typeof QuestionDifficulty)[keyof typeof QuestionDifficulty];

export const QuestionStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type QuestionStatus = (typeof QuestionStatus)[keyof typeof QuestionStatus];

export const AnswerReviewPolicy = {
  NEVER: 'NEVER',
  AFTER_PASS: 'AFTER_PASS',
  AFTER_EACH_ATTEMPT: 'AFTER_EACH_ATTEMPT',
  AFTER_MAX_ATTEMPTS: 'AFTER_MAX_ATTEMPTS',
} as const;
export type AnswerReviewPolicy = (typeof AnswerReviewPolicy)[keyof typeof AnswerReviewPolicy];

export const ScoringMode = {
  ALL_OR_NOTHING: 'ALL_OR_NOTHING',
  PARTIAL: 'PARTIAL',
} as const;
export type ScoringMode = (typeof ScoringMode)[keyof typeof ScoringMode];

export const QuizAttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EXPIRED: 'EXPIRED',
  ABANDONED: 'ABANDONED',
} as const;
export type QuizAttemptStatus = (typeof QuizAttemptStatus)[keyof typeof QuizAttemptStatus];

export const QuizEventType = {
  TAB_HIDDEN: 'TAB_HIDDEN',
  TAB_VISIBLE: 'TAB_VISIBLE',
  COPY_ATTEMPT: 'COPY_ATTEMPT',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
} as const;
export type QuizEventType = (typeof QuizEventType)[keyof typeof QuizEventType];

export const QuizStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type QuizStatus = (typeof QuizStatus)[keyof typeof QuizStatus];


