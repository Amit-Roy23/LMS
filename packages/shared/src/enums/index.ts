export enum Role {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum DeliveryMode {
  RECORDED = 'RECORDED',
  LIVE = 'LIVE',
}

export enum BatchStatus {
  UPCOMING = 'UPCOMING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  ALL_LEVELS = 'ALL_LEVELS',
}

export enum ModuleStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_REVIEW = 'AWAITING_REVIEW',
  COMPLETED = 'COMPLETED',
}

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum AccessStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentProvider {
  MOCK = 'MOCK',
  RAZORPAY = 'RAZORPAY',
  UPI = 'UPI',
  MANUAL = 'MANUAL',
}

export enum LiveProvider {
  ZOOM = 'ZOOM',
  MEET = 'MEET',
  YOUTUBE = 'YOUTUBE',
  OTHER = 'OTHER',
}

export enum LiveSessionStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum InquiryStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CONVERTED = 'CONVERTED',
  CLOSED = 'CLOSED',
}

export enum RegistrationStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  CANCELLED = 'CANCELLED',
}

export enum PerformanceLevel {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  AVERAGE = 'AVERAGE',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
}

export enum CertificateStatus {
  VALID = 'VALID',
  REVOKED = 'REVOKED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  ENROLLMENT = 'ENROLLMENT',
  REVIEW_FEEDBACK = 'REVIEW_FEEDBACK',
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  QUIZ_RESULT = 'QUIZ_RESULT',
  LIVE_CLASS_REMINDER = 'LIVE_CLASS_REMINDER',
}
