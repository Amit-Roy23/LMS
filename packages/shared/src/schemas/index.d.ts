import { z } from 'zod';
import { Role, DeliveryMode, BatchStatus, CourseLevel, CourseStatus, QuestionType, SubmissionStatus, PaymentProvider, LiveProvider, LiveSessionStatus, AttendanceStatus, InquiryStatus, PerformanceLevel } from '../enums/index';
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    role: z.ZodDefault<z.ZodNativeEnum<typeof Role>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string | null | undefined;
}, {
    name: string;
    email: string;
    password: string;
    phone?: string | null | undefined;
    role?: Role | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    whatsappNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    education: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    avatar: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    performanceLevel: z.ZodOptional<z.ZodNativeEnum<typeof PerformanceLevel>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    phone?: string | null | undefined;
    whatsappNumber?: string | null | undefined;
    address?: string | null | undefined;
    city?: string | null | undefined;
    education?: string | null | undefined;
    avatar?: string | null | undefined;
    performanceLevel?: PerformanceLevel | undefined;
}, {
    name?: string | undefined;
    phone?: string | null | undefined;
    whatsappNumber?: string | null | undefined;
    address?: string | null | undefined;
    city?: string | null | undefined;
    education?: string | null | undefined;
    avatar?: string | null | undefined;
    performanceLevel?: PerformanceLevel | undefined;
}>;
export declare const courseSettingsSchema: z.ZodObject<{
    passingQuizScorePercent: z.ZodDefault<z.ZodNumber>;
    maxQuizAttempts: z.ZodDefault<z.ZodNumber>;
    sequentialLessonsLock: z.ZodDefault<z.ZodBoolean>;
    lessonCompletionThresholdPercent: z.ZodDefault<z.ZodNumber>;
    mockTestPassingPercent: z.ZodDefault<z.ZodNumber>;
    finalAssessmentPassingPercent: z.ZodDefault<z.ZodNumber>;
    timeGatedByLiveSession: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    passingQuizScorePercent: number;
    maxQuizAttempts: number;
    sequentialLessonsLock: boolean;
    lessonCompletionThresholdPercent: number;
    mockTestPassingPercent: number;
    finalAssessmentPassingPercent: number;
    timeGatedByLiveSession: boolean;
}, {
    passingQuizScorePercent?: number | undefined;
    maxQuizAttempts?: number | undefined;
    sequentialLessonsLock?: boolean | undefined;
    lessonCompletionThresholdPercent?: number | undefined;
    mockTestPassingPercent?: number | undefined;
    finalAssessmentPassingPercent?: number | undefined;
    timeGatedByLiveSession?: boolean | undefined;
}>;
export declare const createCourseSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodString;
    thumbnail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    price: z.ZodDefault<z.ZodNumber>;
    recordedPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    livePrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    currency: z.ZodDefault<z.ZodString>;
    hasRecorded: z.ZodDefault<z.ZodBoolean>;
    hasLive: z.ZodDefault<z.ZodBoolean>;
    level: z.ZodDefault<z.ZodNativeEnum<typeof CourseLevel>>;
    category: z.ZodString;
    status: z.ZodDefault<z.ZodNativeEnum<typeof CourseStatus>>;
    settings: z.ZodOptional<z.ZodObject<{
        passingQuizScorePercent: z.ZodDefault<z.ZodNumber>;
        maxQuizAttempts: z.ZodDefault<z.ZodNumber>;
        sequentialLessonsLock: z.ZodDefault<z.ZodBoolean>;
        lessonCompletionThresholdPercent: z.ZodDefault<z.ZodNumber>;
        mockTestPassingPercent: z.ZodDefault<z.ZodNumber>;
        finalAssessmentPassingPercent: z.ZodDefault<z.ZodNumber>;
        timeGatedByLiveSession: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        passingQuizScorePercent: number;
        maxQuizAttempts: number;
        sequentialLessonsLock: boolean;
        lessonCompletionThresholdPercent: number;
        mockTestPassingPercent: number;
        finalAssessmentPassingPercent: number;
        timeGatedByLiveSession: boolean;
    }, {
        passingQuizScorePercent?: number | undefined;
        maxQuizAttempts?: number | undefined;
        sequentialLessonsLock?: boolean | undefined;
        lessonCompletionThresholdPercent?: number | undefined;
        mockTestPassingPercent?: number | undefined;
        finalAssessmentPassingPercent?: number | undefined;
        timeGatedByLiveSession?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: CourseStatus;
    title: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    hasRecorded: boolean;
    hasLive: boolean;
    level: CourseLevel;
    category: string;
    thumbnail?: string | null | undefined;
    recordedPrice?: number | null | undefined;
    livePrice?: number | null | undefined;
    settings?: {
        passingQuizScorePercent: number;
        maxQuizAttempts: number;
        sequentialLessonsLock: boolean;
        lessonCompletionThresholdPercent: number;
        mockTestPassingPercent: number;
        finalAssessmentPassingPercent: number;
        timeGatedByLiveSession: boolean;
    } | undefined;
}, {
    title: string;
    slug: string;
    description: string;
    category: string;
    status?: CourseStatus | undefined;
    thumbnail?: string | null | undefined;
    price?: number | undefined;
    recordedPrice?: number | null | undefined;
    livePrice?: number | null | undefined;
    currency?: string | undefined;
    hasRecorded?: boolean | undefined;
    hasLive?: boolean | undefined;
    level?: CourseLevel | undefined;
    settings?: {
        passingQuizScorePercent?: number | undefined;
        maxQuizAttempts?: number | undefined;
        sequentialLessonsLock?: boolean | undefined;
        lessonCompletionThresholdPercent?: number | undefined;
        mockTestPassingPercent?: number | undefined;
        finalAssessmentPassingPercent?: number | undefined;
        timeGatedByLiveSession?: boolean | undefined;
    } | undefined;
}>;
export declare const updateCourseSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    thumbnail: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    price: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    recordedPrice: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    livePrice: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    hasRecorded: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    hasLive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    level: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof CourseLevel>>>;
    category: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof CourseStatus>>>;
    settings: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        passingQuizScorePercent: z.ZodDefault<z.ZodNumber>;
        maxQuizAttempts: z.ZodDefault<z.ZodNumber>;
        sequentialLessonsLock: z.ZodDefault<z.ZodBoolean>;
        lessonCompletionThresholdPercent: z.ZodDefault<z.ZodNumber>;
        mockTestPassingPercent: z.ZodDefault<z.ZodNumber>;
        finalAssessmentPassingPercent: z.ZodDefault<z.ZodNumber>;
        timeGatedByLiveSession: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        passingQuizScorePercent: number;
        maxQuizAttempts: number;
        sequentialLessonsLock: boolean;
        lessonCompletionThresholdPercent: number;
        mockTestPassingPercent: number;
        finalAssessmentPassingPercent: number;
        timeGatedByLiveSession: boolean;
    }, {
        passingQuizScorePercent?: number | undefined;
        maxQuizAttempts?: number | undefined;
        sequentialLessonsLock?: boolean | undefined;
        lessonCompletionThresholdPercent?: number | undefined;
        mockTestPassingPercent?: number | undefined;
        finalAssessmentPassingPercent?: number | undefined;
        timeGatedByLiveSession?: boolean | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    status?: CourseStatus | undefined;
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | undefined;
    thumbnail?: string | null | undefined;
    price?: number | undefined;
    recordedPrice?: number | null | undefined;
    livePrice?: number | null | undefined;
    currency?: string | undefined;
    hasRecorded?: boolean | undefined;
    hasLive?: boolean | undefined;
    level?: CourseLevel | undefined;
    category?: string | undefined;
    settings?: {
        passingQuizScorePercent: number;
        maxQuizAttempts: number;
        sequentialLessonsLock: boolean;
        lessonCompletionThresholdPercent: number;
        mockTestPassingPercent: number;
        finalAssessmentPassingPercent: number;
        timeGatedByLiveSession: boolean;
    } | undefined;
}, {
    status?: CourseStatus | undefined;
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | undefined;
    thumbnail?: string | null | undefined;
    price?: number | undefined;
    recordedPrice?: number | null | undefined;
    livePrice?: number | null | undefined;
    currency?: string | undefined;
    hasRecorded?: boolean | undefined;
    hasLive?: boolean | undefined;
    level?: CourseLevel | undefined;
    category?: string | undefined;
    settings?: {
        passingQuizScorePercent?: number | undefined;
        maxQuizAttempts?: number | undefined;
        sequentialLessonsLock?: boolean | undefined;
        lessonCompletionThresholdPercent?: number | undefined;
        mockTestPassingPercent?: number | undefined;
        finalAssessmentPassingPercent?: number | undefined;
        timeGatedByLiveSession?: boolean | undefined;
    } | undefined;
}>;
export declare const createBatchSchema: z.ZodObject<{
    courseId: z.ZodString;
    name: z.ZodString;
    section: z.ZodDefault<z.ZodString>;
    className: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    mode: z.ZodDefault<z.ZodNativeEnum<typeof DeliveryMode>>;
    instructorId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    scheduleText: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    weeklySchedule: z.ZodDefault<z.ZodOptional<z.ZodAny>>;
    capacity: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodNativeEnum<typeof BatchStatus>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: BatchStatus;
    courseId: string;
    section: string;
    mode: DeliveryMode;
    capacity: number;
    className?: string | null | undefined;
    instructorId?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    scheduleText?: string | null | undefined;
    weeklySchedule?: any;
}, {
    name: string;
    courseId: string;
    status?: BatchStatus | undefined;
    section?: string | undefined;
    className?: string | null | undefined;
    mode?: DeliveryMode | undefined;
    instructorId?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    scheduleText?: string | null | undefined;
    weeklySchedule?: any;
    capacity?: number | undefined;
}>;
export declare const updateBatchSchema: z.ZodObject<{
    courseId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    section: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    className: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    mode: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof DeliveryMode>>>;
    instructorId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    startDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    scheduleText: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    weeklySchedule: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodAny>>>;
    capacity: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof BatchStatus>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    status?: BatchStatus | undefined;
    courseId?: string | undefined;
    section?: string | undefined;
    className?: string | null | undefined;
    mode?: DeliveryMode | undefined;
    instructorId?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    scheduleText?: string | null | undefined;
    weeklySchedule?: any;
    capacity?: number | undefined;
}, {
    name?: string | undefined;
    status?: BatchStatus | undefined;
    courseId?: string | undefined;
    section?: string | undefined;
    className?: string | null | undefined;
    mode?: DeliveryMode | undefined;
    instructorId?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    scheduleText?: string | null | undefined;
    weeklySchedule?: any;
    capacity?: number | undefined;
}>;
export declare const createLiveSessionSchema: z.ZodObject<{
    batchId: z.ZodString;
    moduleId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodString;
    startsAt: z.ZodString;
    durationMinutes: z.ZodDefault<z.ZodNumber>;
    provider: z.ZodDefault<z.ZodNativeEnum<typeof LiveProvider>>;
    joinUrl: z.ZodString;
    recordingUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodNativeEnum<typeof LiveSessionStatus>>;
}, "strip", z.ZodTypeAny, {
    status: LiveSessionStatus;
    title: string;
    batchId: string;
    startsAt: string;
    durationMinutes: number;
    provider: LiveProvider;
    joinUrl: string;
    moduleId?: string | null | undefined;
    recordingUrl?: string | null | undefined;
}, {
    title: string;
    batchId: string;
    startsAt: string;
    joinUrl: string;
    status?: LiveSessionStatus | undefined;
    moduleId?: string | null | undefined;
    durationMinutes?: number | undefined;
    provider?: LiveProvider | undefined;
    recordingUrl?: string | null | undefined;
}>;
export declare const updateLiveSessionSchema: z.ZodObject<{
    batchId: z.ZodOptional<z.ZodString>;
    moduleId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    title: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodString>;
    durationMinutes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    provider: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof LiveProvider>>>;
    joinUrl: z.ZodOptional<z.ZodString>;
    recordingUrl: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof LiveSessionStatus>>>;
}, "strip", z.ZodTypeAny, {
    status?: LiveSessionStatus | undefined;
    title?: string | undefined;
    batchId?: string | undefined;
    moduleId?: string | null | undefined;
    startsAt?: string | undefined;
    durationMinutes?: number | undefined;
    provider?: LiveProvider | undefined;
    joinUrl?: string | undefined;
    recordingUrl?: string | null | undefined;
}, {
    status?: LiveSessionStatus | undefined;
    title?: string | undefined;
    batchId?: string | undefined;
    moduleId?: string | null | undefined;
    startsAt?: string | undefined;
    durationMinutes?: number | undefined;
    provider?: LiveProvider | undefined;
    joinUrl?: string | undefined;
    recordingUrl?: string | null | undefined;
}>;
export declare const recordLiveAttendanceSchema: z.ZodObject<{
    sessionId: z.ZodString;
    studentId: z.ZodString;
    status: z.ZodDefault<z.ZodNativeEnum<typeof AttendanceStatus>>;
}, "strip", z.ZodTypeAny, {
    status: AttendanceStatus;
    sessionId: string;
    studentId: string;
}, {
    sessionId: string;
    studentId: string;
    status?: AttendanceStatus | undefined;
}>;
export declare const createInquirySchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    email: z.ZodString;
    courseId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    message: z.ZodString;
    source: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    phone: string;
    message: string;
    source: string;
    courseId?: string | null | undefined;
}, {
    name: string;
    email: string;
    phone: string;
    message: string;
    courseId?: string | null | undefined;
    source?: string | undefined;
}>;
export declare const updateInquirySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodNativeEnum<typeof InquiryStatus>>;
    assignedToId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: InquiryStatus | undefined;
    assignedToId?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    status?: InquiryStatus | undefined;
    assignedToId?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const createRegistrationSchema: z.ZodObject<{
    applicantName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    whatsappNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    courseId: z.ZodString;
    batchId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    mode: z.ZodDefault<z.ZodNativeEnum<typeof DeliveryMode>>;
    amount: z.ZodDefault<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    phone: string;
    currency: string;
    courseId: string;
    mode: DeliveryMode;
    applicantName: string;
    amount: number;
    whatsappNumber?: string | null | undefined;
    batchId?: string | null | undefined;
}, {
    email: string;
    phone: string;
    courseId: string;
    applicantName: string;
    whatsappNumber?: string | null | undefined;
    currency?: string | undefined;
    mode?: DeliveryMode | undefined;
    batchId?: string | null | undefined;
    amount?: number | undefined;
}>;
export declare const createModuleSchema: z.ZodObject<{
    courseId: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    order: z.ZodNumber;
    requiresAssignment: z.ZodDefault<z.ZodBoolean>;
    requiresQuiz: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    courseId: string;
    order: number;
    requiresAssignment: boolean;
    requiresQuiz: boolean;
    description?: string | null | undefined;
}, {
    title: string;
    courseId: string;
    order: number;
    description?: string | null | undefined;
    requiresAssignment?: boolean | undefined;
    requiresQuiz?: boolean | undefined;
}>;
export declare const updateModuleSchema: z.ZodObject<{
    courseId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    order: z.ZodOptional<z.ZodNumber>;
    requiresAssignment: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    requiresQuiz: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | null | undefined;
    courseId?: string | undefined;
    order?: number | undefined;
    requiresAssignment?: boolean | undefined;
    requiresQuiz?: boolean | undefined;
}, {
    title?: string | undefined;
    description?: string | null | undefined;
    courseId?: string | undefined;
    order?: number | undefined;
    requiresAssignment?: boolean | undefined;
    requiresQuiz?: boolean | undefined;
}>;
export declare const createLessonSchema: z.ZodObject<{
    moduleId: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    videoUrl: z.ZodString;
    durationSeconds: z.ZodDefault<z.ZodNumber>;
    order: z.ZodNumber;
    resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        url: z.ZodString;
        type: z.ZodEnum<["pdf", "link", "zip", "code"]>;
    }, "strip", z.ZodTypeAny, {
        type: "pdf" | "link" | "zip" | "code";
        title: string;
        url: string;
    }, {
        type: "pdf" | "link" | "zip" | "code";
        title: string;
        url: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    moduleId: string;
    order: number;
    videoUrl: string;
    durationSeconds: number;
    resources: {
        type: "pdf" | "link" | "zip" | "code";
        title: string;
        url: string;
    }[];
    description?: string | null | undefined;
}, {
    title: string;
    moduleId: string;
    order: number;
    videoUrl: string;
    description?: string | null | undefined;
    durationSeconds?: number | undefined;
    resources?: {
        type: "pdf" | "link" | "zip" | "code";
        title: string;
        url: string;
    }[] | undefined;
}>;
export declare const updateLessonProgressSchema: z.ZodObject<{
    lessonId: z.ZodString;
    watchedSeconds: z.ZodNumber;
    percent: z.ZodNumber;
    markComplete: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    lessonId: string;
    watchedSeconds: number;
    percent: number;
    markComplete: boolean;
}, {
    lessonId: string;
    watchedSeconds: number;
    percent: number;
    markComplete?: boolean | undefined;
}>;
export declare const createQuizOptionSchema: z.ZodObject<{
    text: z.ZodString;
    isCorrect: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    text: string;
    isCorrect: boolean;
}, {
    text: string;
    isCorrect: boolean;
}>;
export declare const createQuizQuestionSchema: z.ZodObject<{
    text: z.ZodString;
    explanation: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    type: z.ZodDefault<z.ZodNativeEnum<typeof QuestionType>>;
    order: z.ZodNumber;
    points: z.ZodDefault<z.ZodNumber>;
    marks: z.ZodDefault<z.ZodNumber>;
    options: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        isCorrect: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        text: string;
        isCorrect: boolean;
    }, {
        text: string;
        isCorrect: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    options: {
        text: string;
        isCorrect: boolean;
    }[];
    type: QuestionType;
    order: number;
    text: string;
    points: number;
    marks: number;
    explanation?: string | null | undefined;
}, {
    options: {
        text: string;
        isCorrect: boolean;
    }[];
    order: number;
    text: string;
    type?: QuestionType | undefined;
    explanation?: string | null | undefined;
    points?: number | undefined;
    marks?: number | undefined;
}>;
export declare const createQuizSchema: z.ZodObject<{
    moduleId: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    questionCount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    passPercentage: z.ZodDefault<z.ZodNumber>;
    passingScorePercent: z.ZodDefault<z.ZodNumber>;
    maxAttempts: z.ZodDefault<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    shuffleQuestions: z.ZodDefault<z.ZodBoolean>;
    shuffleOptions: z.ZodDefault<z.ZodBoolean>;
    showAnswersAfterSubmit: z.ZodDefault<z.ZodBoolean>;
    questions: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        explanation: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        type: z.ZodDefault<z.ZodNativeEnum<typeof QuestionType>>;
        order: z.ZodNumber;
        points: z.ZodDefault<z.ZodNumber>;
        marks: z.ZodDefault<z.ZodNumber>;
        options: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            isCorrect: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            text: string;
            isCorrect: boolean;
        }, {
            text: string;
            isCorrect: boolean;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        options: {
            text: string;
            isCorrect: boolean;
        }[];
        type: QuestionType;
        order: number;
        text: string;
        points: number;
        marks: number;
        explanation?: string | null | undefined;
    }, {
        options: {
            text: string;
            isCorrect: boolean;
        }[];
        order: number;
        text: string;
        type?: QuestionType | undefined;
        explanation?: string | null | undefined;
        points?: number | undefined;
        marks?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    moduleId: string;
    passPercentage: number;
    passingScorePercent: number;
    maxAttempts: number | null;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showAnswersAfterSubmit: boolean;
    questions: {
        options: {
            text: string;
            isCorrect: boolean;
        }[];
        type: QuestionType;
        order: number;
        text: string;
        points: number;
        marks: number;
        explanation?: string | null | undefined;
    }[];
    description?: string | null | undefined;
    questionCount?: number | null | undefined;
}, {
    title: string;
    moduleId: string;
    questions: {
        options: {
            text: string;
            isCorrect: boolean;
        }[];
        order: number;
        text: string;
        type?: QuestionType | undefined;
        explanation?: string | null | undefined;
        points?: number | undefined;
        marks?: number | undefined;
    }[];
    description?: string | null | undefined;
    questionCount?: number | null | undefined;
    passPercentage?: number | undefined;
    passingScorePercent?: number | undefined;
    maxAttempts?: number | null | undefined;
    shuffleQuestions?: boolean | undefined;
    shuffleOptions?: boolean | undefined;
    showAnswersAfterSubmit?: boolean | undefined;
}>;
export declare const submitQuizAttemptSchema: z.ZodObject<{
    quizId: z.ZodString;
    answers: z.ZodArray<z.ZodObject<{
        questionId: z.ZodString;
        selectedOptionIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        questionId: string;
        selectedOptionIds: string[];
    }, {
        questionId: string;
        selectedOptionIds: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    quizId: string;
    answers: {
        questionId: string;
        selectedOptionIds: string[];
    }[];
}, {
    quizId: string;
    answers: {
        questionId: string;
        selectedOptionIds: string[];
    }[];
}>;
export declare const createAssignmentSchema: z.ZodObject<{
    moduleId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    maxScore: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    moduleId: string;
    maxScore: number;
}, {
    title: string;
    description: string;
    moduleId: string;
    maxScore?: number | undefined;
}>;
export declare const submitAssignmentSchema: z.ZodObject<{
    assignmentId: z.ZodString;
    textContent: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    files: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    linkUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    assignmentId: string;
    files: string[];
    textContent?: string | null | undefined;
    linkUrl?: string | null | undefined;
}, {
    assignmentId: string;
    textContent?: string | null | undefined;
    files?: string[] | undefined;
    linkUrl?: string | null | undefined;
}>;
export declare const reviewSubmissionSchema: z.ZodObject<{
    submissionId: z.ZodString;
    status: z.ZodEnum<[SubmissionStatus.APPROVED, SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED]>;
    feedback: z.ZodString;
    grade: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: SubmissionStatus.CHANGES_REQUESTED | SubmissionStatus.APPROVED | SubmissionStatus.REJECTED;
    submissionId: string;
    feedback: string;
    grade?: number | null | undefined;
}, {
    status: SubmissionStatus.CHANGES_REQUESTED | SubmissionStatus.APPROVED | SubmissionStatus.REJECTED;
    submissionId: string;
    feedback: string;
    grade?: number | null | undefined;
}>;
export declare const checkoutEnrollmentSchema: z.ZodObject<{
    courseId: z.ZodString;
    batchId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    mode: z.ZodDefault<z.ZodNativeEnum<typeof DeliveryMode>>;
    paymentProvider: z.ZodDefault<z.ZodNativeEnum<typeof PaymentProvider>>;
}, "strip", z.ZodTypeAny, {
    courseId: string;
    mode: DeliveryMode;
    paymentProvider: PaymentProvider;
    batchId?: string | null | undefined;
}, {
    courseId: string;
    mode?: DeliveryMode | undefined;
    batchId?: string | null | undefined;
    paymentProvider?: PaymentProvider | undefined;
}>;
export declare const submitMockTestSchema: z.ZodObject<{
    mockTestId: z.ZodString;
    answers: z.ZodArray<z.ZodObject<{
        questionId: z.ZodString;
        selectedOptionIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        questionId: string;
        selectedOptionIds: string[];
    }, {
        questionId: string;
        selectedOptionIds: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    answers: {
        questionId: string;
        selectedOptionIds: string[];
    }[];
    mockTestId: string;
}, {
    answers: {
        questionId: string;
        selectedOptionIds: string[];
    }[];
    mockTestId: string;
}>;
export declare const submitFinalProjectSchema: z.ZodObject<{
    finalProjectId: z.ZodString;
    description: z.ZodString;
    files: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    linkUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    files: string[];
    finalProjectId: string;
    linkUrl?: string | null | undefined;
}, {
    description: string;
    finalProjectId: string;
    files?: string[] | undefined;
    linkUrl?: string | null | undefined;
}>;
export declare const reviewFinalProjectSchema: z.ZodObject<{
    submissionId: z.ZodString;
    status: z.ZodEnum<[SubmissionStatus.APPROVED, SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED]>;
    feedback: z.ZodString;
    grade: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: SubmissionStatus.CHANGES_REQUESTED | SubmissionStatus.APPROVED | SubmissionStatus.REJECTED;
    submissionId: string;
    feedback: string;
    grade?: number | null | undefined;
}, {
    status: SubmissionStatus.CHANGES_REQUESTED | SubmissionStatus.APPROVED | SubmissionStatus.REJECTED;
    submissionId: string;
    feedback: string;
    grade?: number | null | undefined;
}>;
export declare const submitFinalAssessmentSchema: z.ZodObject<{
    finalAssessmentId: z.ZodString;
    answers: z.ZodArray<z.ZodObject<{
        questionId: z.ZodString;
        selectedOptionIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        questionId: string;
        selectedOptionIds: string[];
    }, {
        questionId: string;
        selectedOptionIds: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    answers: {
        questionId: string;
        selectedOptionIds: string[];
    }[];
    finalAssessmentId: string;
}, {
    answers: {
        questionId: string;
        selectedOptionIds: string[];
    }[];
    finalAssessmentId: string;
}>;
