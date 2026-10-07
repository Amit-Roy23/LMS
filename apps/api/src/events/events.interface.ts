import { DeliveryMode, PaymentProvider } from '@academy/shared';

export interface PaymentSucceededEvent {
  paymentId: string;
  registrationId?: string | null;
  studentId?: string; // Existing student ID if known
  courseId: string;
  batchId?: string | null;
  mode: DeliveryMode;
  amount: number;
  currency: string;
  provider: PaymentProvider | string;
  providerRef?: string | null;
  applicantName: string;
  email: string;
  phone: string;
  whatsappNumber?: string | null;
  city?: string | null;
  education?: string | null;
  metadata?: Record<string, any>;
  occurredAt: Date;
}

export interface AccountCreatedEvent {
  userId: string;
  studentId: string; // e.g. OCA-2026-000123
  name: string;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  tempPassword?: string; // In memory only, never written to DB or notification log
  setupToken?: string; // In memory plain token, token hash stored in DB
  courseId: string;
  courseTitle: string;
  batchId?: string | null;
  batchName?: string;
  mode: DeliveryMode;
  isNewAccount: boolean;
  loginUrl: string;
  occurredAt: Date;
}

export interface EnrollmentCreatedEvent {
  enrollmentId: string;
  userId: string;
  studentId: string;
  courseId: string;
  courseTitle: string;
  batchId?: string | null;
  batchName?: string;
  mode: DeliveryMode;
  isNewAccount: boolean;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  name: string;
  occurredAt: Date;
}

export interface PasswordResetRequestedEvent {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  resetToken: string; // Plain token in memory
  resetUrl: string;
  expiresInHours: number;
  occurredAt: Date;
}

export interface LessonCompletedEvent {
  studentId: string;
  lessonId: string;
  moduleId: string;
  courseId: string;
  completionSource: string;
  percent: number;
  occurredAt: Date;
}

export interface ModuleLessonsCompletedEvent {
  studentId: string;
  moduleId: string;
  courseId: string;
  occurredAt: Date;
}

export interface LiveSessionReminderDueEvent {
  sessionId: string;
  batchId: string;
  courseId: string;
  courseTitle: string;
  batchName: string;
  sessionTitle: string;
  startsAt: Date;
  joinUrl: string;
  reminderType: '24H' | '1H';
  occurredAt: Date;
}

export interface DomainEventsMap {
  'payment.succeeded': PaymentSucceededEvent;
  'account.created': AccountCreatedEvent;
  'enrollment.created': EnrollmentCreatedEvent;
  'password.reset_requested': PasswordResetRequestedEvent;
  'lesson.completed': LessonCompletedEvent;
  'module.lessons_completed': ModuleLessonsCompletedEvent;
  'live_session.reminder_due': LiveSessionReminderDueEvent;
}

