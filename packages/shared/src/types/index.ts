import {
  Role,
  UserStatus,
  DeliveryMode,
  BatchStatus,
  CourseStatus,
  CourseLevel,
  ModuleStatus,
  QuestionType,
  SubmissionStatus,
  EnrollmentStatus,
  PaymentStatus,
  AccessStatus,
  PaymentProvider,
  LiveProvider,
  LiveSessionStatus,
  AttendanceStatus,
  InquiryStatus,
  RegistrationStatus,
  PerformanceLevel,
  CertificateStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  LessonType,
  VideoProvider,
  PracticeTaskType,
  PracticeStatus,
  CompletionSource,
  ResourceType,
} from '../enums/index';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSummary {
  id: string;
  studentId?: string | null;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  avatar?: string | null;
  status: UserStatus;
  mustChangePassword?: boolean;
  createdAt: string;
  studentProfile?: StudentProfileDetail | null;
}

export interface StudentProfileDetail {
  id: string;
  userId: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  address?: string | null;
  city?: string | null;
  education?: string | null;
  avatar?: string | null;
  performanceLevel: PerformanceLevel;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSettings {
  passingQuizScorePercent: number; // e.g. 70
  maxQuizAttempts: number; // e.g. 3
  sequentialLessonsLock: boolean; // default true
  lessonCompletionThresholdPercent: number; // default 90
  mockTestPassingPercent: number; // e.g. 75
  finalAssessmentPassingPercent: number; // e.g. 80
  requirePracticeDone?: boolean;
  watermarkEnabled?: boolean;
}

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  price: number;
  recordedPrice?: number | null;
  livePrice?: number | null;
  currency: string;
  hasRecorded: boolean;
  hasLive: boolean;
  level: CourseLevel;
  category: string;
  status: CourseStatus;
  instructorId: string;
  instructor?: UserSummary;
  settings: CourseSettings;
  modulesCount?: number;
  batchesCount?: number;
  totalDurationSeconds?: number;
  enrolledStudentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchSummary {
  id: string;
  courseId: string;
  courseTitle?: string;
  name: string;
  section: string;
  className?: string | null;
  mode: DeliveryMode;
  instructorId?: string | null;
  instructorName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  scheduleText?: string | null;
  weeklySchedule?: any;
  capacity: number;
  enrolledCount?: number;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BatchDetail extends BatchSummary {
  liveSessions?: LiveSessionDetail[];
  enrollments?: EnrollmentDetail[];
}

export interface LiveSessionDetail {
  id: string;
  batchId: string;
  moduleId?: string | null;
  title: string;
  startsAt: string;
  durationMinutes: number;
  provider: LiveProvider;
  joinUrl: string;
  recordingUrl?: string | null;
  status: LiveSessionStatus;
  batchName?: string;
  moduleTitle?: string;
  canJoin?: boolean;
  attendanceRecorded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveAttendanceDetail {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  joinedAt: string;
  status: AttendanceStatus;
}

export interface LessonResourceDetail {
  id: string;
  lessonId: string;
  title: string;
  type: ResourceType;
  url: string;
  sizeBytes?: number | null;
  createdAt?: string;
}

export interface PracticeProgressDetail {
  id: string;
  studentId: string;
  practiceTaskId: string;
  status: PracticeStatus;
  notes?: string | null;
  attachmentKey?: string | null;
  completedAt?: string | null;
  updatedAt: string;
}

export interface PracticeTaskDetail {
  id: string;
  lessonId?: string | null;
  moduleId?: string | null;
  title: string;
  instructions: string;
  type: PracticeTaskType;
  expectedOutcome?: string | null;
  order: number;
  myProgress?: PracticeProgressDetail | null;
  createdAt?: string;
}

export interface LessonNoteDetail {
  id: string;
  studentId: string;
  lessonId: string;
  timestampSeconds?: number | null;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonResource {
  title: string;
  url: string;
  type: 'pdf' | 'link' | 'zip' | 'code' | ResourceType;
}

export interface LessonDetail {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  type?: LessonType;
  videoProvider?: VideoProvider;
  videoUrl?: string;
  playableUrl?: string;
  durationSeconds: number;
  order: number;
  isPreview?: boolean;
  resources: LessonResourceDetail[] | LessonResource[];
  practiceTasks?: PracticeTaskDetail[];
  notes?: LessonNoteDetail[];
  notesCount?: number;
  isCompleted?: boolean;
  isLocked?: boolean;
  isBookmarked?: boolean;
  progressPercent?: number;
  lastPositionSeconds?: number;
  watchedSeconds?: number;
  lockReasonCode?: string | null;
  lockMessage?: string | null;
}


export interface OptionDetail {
  id: string;
  questionId: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuestionDetail {
  id: string;
  quizId?: string;
  text: string;
  explanation?: string | null;
  type: QuestionType;
  order: number;
  points: number;
  marks?: number;
  options: OptionDetail[];
}

export interface QuizDetail {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  questionCount?: number | null;
  passPercentage: number;
  passingScorePercent: number;
  maxAttempts?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showAnswersAfterSubmit?: boolean;
  questions: QuestionDetail[];
  attemptsCount?: number;
  userBestScore?: number | null;
  isPassed?: boolean;
  isLocked?: boolean;
}

export interface AssignmentSubmissionDetail {
  id: string;
  assignmentId: string;
  studentId: string;
  version: number;
  textContent?: string | null;
  files: string[];
  linkUrl?: string | null;
  status: SubmissionStatus;
  feedback?: string | null;
  grade?: number | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: UserSummary;
}

export interface AssignmentDetail {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  maxScore: number;
  latestSubmission?: AssignmentSubmissionDetail | null;
  submissionHistory?: AssignmentSubmissionDetail[];
  isApproved?: boolean;
  isLocked?: boolean;
}

export interface ModuleDetail {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
  requiresAssignment: boolean;
  requiresQuiz: boolean;
  requirePracticeDone?: boolean;
  lessons: LessonDetail[];
  practiceTasks?: PracticeTaskDetail[];
  quiz?: QuizDetail | null;
  assignment?: AssignmentDetail | null;
  status: ModuleStatus;
  isLocked: boolean;
  progressPercent: number;
}

export interface MockTestDetail {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passingScorePercent: number;
  questionsCount: number;
  isLocked: boolean;
  isPassed: boolean;
  bestScore?: number | null;
  attemptsCount?: number;
}

export interface FinalProjectDetail {
  id: string;
  courseId: string;
  title: string;
  description: string;
  isLocked: boolean;
  isApproved: boolean;
  submission?: {
    id: string;
    description: string;
    files: string[];
    linkUrl?: string | null;
    status: SubmissionStatus;
    feedback?: string | null;
    grade?: number | null;
    submittedAt: string;
  } | null;
}

export interface FinalAssessmentDetail {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passingScorePercent: number;
  maxAttempts: number;
  isLocked: boolean;
  isPassed: boolean;
  bestScore?: number | null;
  attemptsCount?: number;
}

export interface EnrollmentDetail {
  id: string;
  studentId: string;
  courseId: string;
  batchId?: string | null;
  mode: DeliveryMode;
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  accessStatus: AccessStatus;
  paymentId?: string | null;
  enrolledAt: string;
  completedAt?: string | null;
  student?: UserSummary;
  course?: CourseSummary;
  batch?: BatchSummary | null;
}

export interface CourseProgressionSummary {
  courseId: string;
  studentId: string;
  totalModules: number;
  completedModules: number;
  coursePercent: number;
  mode: DeliveryMode;
  accessStatus: AccessStatus;
  paymentStatus: PaymentStatus;
  modules: {
    id: string;
    order: number;
    title: string;
    status: ModuleStatus;
    requiresAssignment: boolean;
    requiresQuiz: boolean;
    lessonsCompleted: number;
    totalLessons: number;
    isQuizPassed: boolean;
    isAssignmentApproved: boolean;
    isLocked: boolean;
  }[];
  isAllModulesCompleted: boolean;
  mockTestPassed: boolean;
  finalProjectApproved: boolean;
  finalAssessmentPassed: boolean;
  certificateEligible: boolean;
  certificate?: {
    id: string;
    certificateId: string;
    issuedAt: string;
    pdfUrl: string;
    status: CertificateStatus;
  } | null;
}

export interface CertificateDetail {
  id: string;
  certificateId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  revokedAt?: string | null;
  status: CertificateStatus;
  pdfUrl: string;
  qrCodeUrl?: string;
  verificationUrl: string;
}

export interface InquiryDetail {
  id: string;
  name: string;
  phone: string;
  email: string;
  courseId?: string | null;
  courseTitle?: string | null;
  message: string;
  source: string;
  status: InquiryStatus;
  assignedToId?: string | null;
  assignedToName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationDetail {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  whatsappNumber?: string | null;
  courseId: string;
  courseTitle?: string;
  batchId?: string | null;
  batchName?: string | null;
  mode: DeliveryMode;
  status: RegistrationStatus;
  amount: number;
  currency: string;
  paymentId?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplateDetail {
  id: string;
  key: string;
  channel: NotificationChannel;
  locale: string;
  subject?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLogDetail {
  id: string;
  channel: NotificationChannel;
  to: string;
  templateKey: string;
  locale: string;
  status: NotificationStatus;
  provider?: string | null;
  providerMessageId?: string | null;
  error?: string | null;
  attempts: number;
  idempotencyKey?: string | null;
  userId?: string | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  user?: UserSummary | null;
}

export interface SettingDetail {
  key: string;
  value: string;
  category: string;
  description?: string | null;
  updatedAt: string;
}

export interface VerificationTokenDetail {
  id: string;
  userId: string;
  type: string;
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}
