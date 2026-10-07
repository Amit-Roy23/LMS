import {
  PrismaClient,
  Role,
  UserStatus,
  DeliveryMode,
  BatchStatus,
  CourseStatus,
  CourseLevel,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  AnswerReviewPolicy,
  ScoringMode,
  QuizAttemptStatus,
  QuizStatus,
  PaymentProvider,
  PaymentStatus,
  EnrollmentStatus,
  AccessStatus,
  LiveProvider,
  LiveSessionStatus,
  AttendanceStatus,
  InquiryStatus,
  RegistrationStatus,
  PerformanceLevel,
  NotificationChannel,
  NotificationStatus,
  SubmissionStatus,
  ModuleStatus,
  CertificateStatus,
  LessonType,
  VideoProvider,
  PracticeTaskType,
  PracticeStatus,
  CompletionSource,
  ResourceType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedDemoCatalog } from './seed-catalog';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for Online Creative & IT Academy...');

  // 1. Clean existing data in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.finalAssessmentOption.deleteMany();
  await prisma.finalAssessmentQuestion.deleteMany();
  await prisma.finalAssessment.deleteMany();
  await prisma.projectSubmission.deleteMany();
  await prisma.finalProject.deleteMany();
  await prisma.mockTestAttempt.deleteMany();
  await prisma.mockTestOption.deleteMany();
  await prisma.mockTestQuestion.deleteMany();
  await prisma.mockTest.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.attemptAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.practiceProgress.deleteMany();
  await prisma.practiceTask.deleteMany();
  await prisma.lessonNote.deleteMany();
  await prisma.lessonBookmark.deleteMany();
  await prisma.lessonResource.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.liveAttendance.deleteMany();
  await prisma.liveSession.deleteMany();

  await prisma.module.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash Passwords
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const instructorPassword = await bcrypt.hash('Instructor@123', 10);
  const studentPassword = await bcrypt.hash('Student@123', 10);

  // 3. Create Users with Profiles (Admin, Instructor, 5 distinct Student Personas)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@creativeit.academy',
      name: 'System Administrator',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      phone: '+91 98765 43210',
      status: UserStatus.ACTIVE,
    },
  });

  const instructor = await prisma.user.create({
    data: {
      email: 'instructor@creativeit.academy',
      name: 'Prof. Alex Morgan',
      passwordHash: instructorPassword,
      role: Role.INSTRUCTOR,
      phone: '+91 98765 43211',
      status: UserStatus.ACTIVE,
    },
  });

  // Student 1: In Progress, Module 1 Complete, Working on Module 2
  const student1 = await prisma.user.create({
    data: {
      email: 'student1@creativeit.academy',
      name: 'John Doe',
      passwordHash: studentPassword,
      role: Role.STUDENT,
      phone: '+91 98765 43212',
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          phone: '+91 98765 43212',
          whatsappNumber: '+91 98765 43212',
          address: '42 Silicon Valley Boulevard',
          city: 'Bangalore',
          education: 'B.Tech Computer Science (Final Year)',
          performanceLevel: PerformanceLevel.EXCELLENT,
        },
      },
    },
  });

  // Student 2: Certified Graduate with Verified Diploma & QR Code
  const student2 = await prisma.user.create({
    data: {
      email: 'student2@creativeit.academy',
      name: 'Jane Smith',
      passwordHash: studentPassword,
      role: Role.STUDENT,
      phone: '+91 98765 43213',
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          phone: '+91 98765 43213',
          whatsappNumber: '+91 98765 43213',
          address: '77 Bandra Kurla Complex',
          city: 'Mumbai',
          education: 'M.Sc Information Technology',
          performanceLevel: PerformanceLevel.EXCELLENT,
        },
      },
    },
  });

  // Student 3: Live Batch Student with Retakes & Pending Assignment Review
  const student3 = await prisma.user.create({
    data: {
      email: 'student3@creativeit.academy',
      name: 'Rahul Sharma',
      passwordHash: studentPassword,
      role: Role.STUDENT,
      phone: '+91 98765 43214',
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          phone: '+91 98765 43214',
          whatsappNumber: '+91 98765 43214',
          city: 'New Delhi',
          education: 'BCA Cloud Technology',
          performanceLevel: PerformanceLevel.GOOD,
        },
      },
    },
  });

  // Student 4: Student with incomplete video watch progress (Quiz is Locked)
  const student4 = await prisma.user.create({
    data: {
      email: 'student4@creativeit.academy',
      name: 'Vikram Singh',
      passwordHash: studentPassword,
      role: Role.STUDENT,
      phone: '+91 98765 43215',
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          phone: '+91 98765 43215',
          whatsappNumber: '+91 98765 43215',
          city: 'Hyderabad',
          education: 'Diploma in Web Design',
          performanceLevel: PerformanceLevel.NEEDS_ATTENTION,
        },
      },
    },
  });

  // Student 5: Applicant with Pending Payment / Suspended Access
  const studentPending = await prisma.user.create({
    data: {
      email: 'student_pending@creativeit.academy',
      name: 'Ananya Roy (Pending Payment)',
      passwordHash: studentPassword,
      role: Role.STUDENT,
      phone: '+91 98765 43216',
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          phone: '+91 98765 43216',
          city: 'Kolkata',
          performanceLevel: PerformanceLevel.AVERAGE,
        },
      },
    },
  });

  console.log('✅ Seeded Users and StudentProfiles (Admin, Instructor, 5 Student Personas)');

  // 4. Create Flagship Course 1 (Full-Stack & AI Engineering)
  const course1 = await prisma.course.create({
    data: {
      title: 'Full-Stack Web Development & Modern AI Engineering',
      slug: 'fullstack-ai-engineering',
      description:
        'Master modern full-stack web development with Next.js 15, TypeScript, Node.js, Express, PostgreSQL, Prisma, progression state machines, and LLM Agentic AI integration.',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
      price: 4999.0,
      recordedPrice: 4999.0,
      livePrice: 9999.0,
      currency: 'INR',
      hasRecorded: true,
      hasLive: true,
      level: CourseLevel.INTERMEDIATE,
      category: 'Full-Stack Engineering',
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      settings: {
        passingQuizScorePercent: 70,
        maxQuizAttempts: 3,
        sequentialLessonsLock: true,
        lessonCompletionThresholdPercent: 90,
        mockTestPassingPercent: 75,
        finalAssessmentPassingPercent: 80,
        timeGatedByLiveSession: false,
      },
    },
  });

  // Create Secondary Course 2 (Python & Data Science)
  const course2 = await prisma.course.create({
    data: {
      title: 'Python Data Science, Machine Learning & Agentic AI',
      slug: 'python-ai-data-science',
      description:
        'Comprehensive bootcamp covering Python numerical computing, Pandas data analysis, Scikit-learn machine learning, PyTorch neural networks, and LangChain autonomous agent workflows.',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
      price: 5999.0,
      recordedPrice: 5999.0,
      livePrice: 11999.0,
      currency: 'INR',
      hasRecorded: true,
      hasLive: true,
      level: CourseLevel.ADVANCED,
      category: 'Data Science & AI',
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      settings: {
        passingQuizScorePercent: 70,
        maxQuizAttempts: 3,
        sequentialLessonsLock: true,
        lessonCompletionThresholdPercent: 90,
        mockTestPassingPercent: 75,
        finalAssessmentPassingPercent: 80,
      },
    },
  });

  console.log(`✅ Created Courses: ${course1.title} and ${course2.title}`);

  // 5. Create Batches (Recorded Self-Paced & Live Cohorts)
  const recordedBatch1 = await prisma.batch.create({
    data: {
      courseId: course1.id,
      name: 'Self-Paced Recorded Track 2026',
      section: 'SP-01',
      className: 'Self-Paced',
      mode: DeliveryMode.RECORDED,
      instructorId: instructor.id,
      scheduleText: '24/7 On-Demand Self-Paced Video Lessons',
      capacity: 500,
      status: BatchStatus.RUNNING,
    },
  });

  const liveBatchAlpha = await prisma.batch.create({
    data: {
      courseId: course1.id,
      name: 'Live Interactive Evening Cohort - April 2026',
      section: 'LIVE-01',
      className: 'Cohort Alpha',
      mode: DeliveryMode.LIVE,
      instructorId: instructor.id,
      startDate: new Date('2026-04-15T13:30:00.000Z'),
      endDate: new Date('2026-07-15T15:00:00.000Z'),
      scheduleText: 'Mon, Wed, Fri 7:00 PM - 8:30 PM IST',
      weeklySchedule: [
        { day: 'Monday', time: '19:00 - 20:30 IST' },
        { day: 'Wednesday', time: '19:00 - 20:30 IST' },
        { day: 'Friday', time: '19:00 - 20:30 IST' },
      ],
      capacity: 35,
      status: BatchStatus.RUNNING,
    },
  });

  const liveBatchWeekend = await prisma.batch.create({
    data: {
      courseId: course1.id,
      name: 'Weekend Fast-Track Live Cohort - May 2026',
      section: 'WKND-01',
      className: 'Cohort Pro',
      mode: DeliveryMode.LIVE,
      instructorId: instructor.id,
      startDate: new Date('2026-05-02T04:30:00.000Z'),
      endDate: new Date('2026-08-01T07:30:00.000Z'),
      scheduleText: 'Sat, Sun 10:00 AM - 1:00 PM IST',
      weeklySchedule: [
        { day: 'Saturday', time: '10:00 - 13:00 IST' },
        { day: 'Sunday', time: '10:00 - 13:00 IST' },
      ],
      capacity: 25,
      status: BatchStatus.RUNNING,
    },
  });

  // 6. Create Live Sessions & Attendance
  const session1 = await prisma.liveSession.create({
    data: {
      batchId: liveBatchAlpha.id,
      title: 'Live Workshop 01: System Architecture & Monorepos Kickoff',
      startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (Past)
      durationMinutes: 90,
      provider: LiveProvider.ZOOM,
      joinUrl: 'https://zoom.us/j/98765432101?pwd=mockPassword123',
      recordingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      status: LiveSessionStatus.COMPLETED,
    },
  });

  const session2 = await prisma.liveSession.create({
    data: {
      batchId: liveBatchAlpha.id,
      title: 'Live Workshop 02: PostgreSQL Indexing & Prisma State Machine',
      startsAt: new Date(Date.now() - 5 * 60 * 1000), // Started 5 mins ago (LIVE NOW)
      durationMinutes: 60,
      provider: LiveProvider.MEET,
      joinUrl: 'https://meet.google.com/abc-defg-hij',
      status: LiveSessionStatus.LIVE,
    },
  });

  const session3 = await prisma.liveSession.create({
    data: {
      batchId: liveBatchAlpha.id,
      title: 'Live Workshop 03: Microservices & Event-Driven Subscriptions',
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days in future (UPCOMING)
      durationMinutes: 90,
      provider: LiveProvider.ZOOM,
      joinUrl: 'https://zoom.us/j/98765432102?pwd=mockPassword456',
      status: LiveSessionStatus.SCHEDULED,
    },
  });

  // Seed Live Attendance for Student 2
  await prisma.liveAttendance.create({
    data: {
      sessionId: session1.id,
      studentId: student2.id,
      joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 120000),
      status: AttendanceStatus.PRESENT,
    },
  });

  console.log(`✅ Created Batches & Live Sessions with attendance`);

  // 7. Course 1: Module 1 (with 20-Question MCQ Quiz to test 14/20 passing rule)
  const module1 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Module 1: Foundations of Modern Web Architecture',
      description: 'Master HTTP protocols, RESTful contract design, monorepo architectures, and robust database modeling.',
      order: 1,
      requiresAssignment: true,
      requiresQuiz: true,
      requirePracticeDone: false,
    },
  });

  const lesson1_1 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: '1.1 HTTP Protocols, RESTful API Principles & Monorepos',
      description: 'Deep dive into HTTP/2, idempotent verbs, status codes, and npm/pnpm monorepo structure.',
      type: LessonType.VIDEO,
      videoProvider: VideoProvider.MP4,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      durationSeconds: 600,
      order: 1,
      isPreview: true,
    },
  });

  const lesson1_2 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: '1.2 TypeScript Mastery, Generics & Runtime Zod Schema Validation',
      description: 'How to write bulletproof types and share single source of truth schemas across API and Client.',
      type: LessonType.VIDEO,
      videoProvider: VideoProvider.MP4,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      durationSeconds: 720,
      order: 2,
      isPreview: false,
    },
  });

  const lesson1_3 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: '1.3 Database Modeling with Prisma ORM & PostgreSQL',
      description: 'Relational database schema design, foreign keys, indexes, migrations, and query optimization.',
      type: LessonType.VIDEO,
      videoProvider: VideoProvider.MP4,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      durationSeconds: 840,
      order: 3,
      isPreview: false,
    },
  });

  // Seed Lesson Resources
  await prisma.lessonResource.createMany({
    data: [
      {
        lessonId: lesson1_1.id,
        title: 'Module 1 Architecture Diagram & HTTP Verbs Cheatsheet',
        type: ResourceType.PDF,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        sizeBytes: 1048576,
      },
      {
        lessonId: lesson1_1.id,
        title: 'Starter Code Repository & Environment Setup',
        type: ResourceType.LINK,
        url: 'https://github.com/example/fullstack-starter',
      },
      {
        lessonId: lesson1_2.id,
        title: 'Advanced TypeScript & Zod Utility Types Pack',
        type: ResourceType.ZIP,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        sizeBytes: 2097152,
      },
    ],
  });

  // Seed Practice Tasks
  const practiceTask1 = await prisma.practiceTask.create({
    data: {
      lessonId: lesson1_1.id,
      moduleId: module1.id,
      title: 'Personal Practice 1: Initialize Monorepo & Configure Workspaces',
      instructions: 'Create a root package.json with workspaces for `apps/*` and `packages/*`. Set up TypeScript base configuration with strict mode.',
      type: PracticeTaskType.CHECKLIST,
      expectedOutcome: 'A compiling TypeScript monorepo with shared validation schemas.',
      order: 1,
    },
  });

  const practiceTask2 = await prisma.practiceTask.create({
    data: {
      lessonId: lesson1_2.id,
      moduleId: module1.id,
      title: 'Personal Practice 2: Write Zod Schemas for Custom Entities',
      instructions: 'Define runtime schemas with refine guards and export the inferred static TypeScript types.',
      type: PracticeTaskType.EXERCISE,
      expectedOutcome: 'Zero-runtime type mismatches between client forms and backend validation.',
      order: 2,
    },
  });


  // Helper for seeding question banks
  const seedQuestionsHelper = async (
    quizId: string,
    questions: Array<{
      text: string;
      explanation: string;
      type: QuestionType;
      difficulty: QuestionDifficulty;
      tags: string[];
      correct: string[];
      wrong: string[];
    }>
  ) => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const created = await prisma.question.create({
        data: {
          quizId,
          text: q.text,
          explanation: q.explanation,
          type: q.type,
          order: i + 1,
          points: 1.0,
          marks: 1.0,
          difficulty: q.difficulty,
          tags: q.tags,
          status: QuestionStatus.ACTIVE,
          version: 1,
          options: {
            create: [
              ...q.correct.map((c) => ({ text: c, isCorrect: true })),
              ...q.wrong.map((w) => ({ text: w, isCorrect: false })),
            ],
          },
        },
      });
    }
  };

  // 7. Course 1: Module 1 Quiz (30 questions in pool, configured for 20 questions at 70%)
  const quiz1 = await prisma.quiz.create({
    data: {
      moduleId: module1.id,
      title: 'Module 1 Mastery Assessment: Architecture & Data Modeling',
      description: 'Test your understanding across REST protocols, TypeScript validation, and PostgreSQL database schemas. (14/20 = 70% to pass)',
      questionCount: 20,
      passPercentage: 70.0,
      passingScorePercent: 70.0,
      maxAttempts: 5,
      cooldownMinutes: 5,
      timeLimitMinutes: 20,
      shuffleQuestions: true,
      shuffleOptions: true,
      showAnswersAfterSubmit: AnswerReviewPolicy.AFTER_PASS,
      scoringMode: ScoringMode.ALL_OR_NOTHING,
      status: QuizStatus.PUBLISHED,
    },
  });

  const quiz1QuestionsList = [
    { text: 'Which HTTP verb is guaranteed to be idempotent and replaces the entire resource?', explanation: 'PUT is idempotent and replaces the resource target in full.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['http', 'rest'], correct: ['PUT'], wrong: ['POST', 'PATCH', 'CONNECT'] },
    { text: 'What is the primary benefit of shared Zod schemas in a monorepo?', explanation: 'Enforces unified validation rules at runtime and compile-time across client and server.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['typescript', 'zod'], correct: ['Single source of truth for runtime validation and compile types'], wrong: ['Shrinks CSS bundle', 'Encrypts TCP packets', 'Replaces SQL engine'] },
    { text: 'Which Prisma attribute enforces a 1:1 relationship between models?', explanation: '@unique on the foreign key ensures only one relation record can match.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['prisma', 'sql'], correct: ['@unique on the foreign key column'], wrong: ['@id on both', '@index without unique', '@default(now())'] },
    { text: 'What HTTP status code represents an unauthenticated request?', explanation: '401 Unauthorized is returned when credentials are missing or invalid.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['http', 'auth'], correct: ['401 Unauthorized'], wrong: ['403 Forbidden', '404 Not Found', '400 Bad Request'] },
    { text: 'What HTTP status code represents an authenticated request lacking permission?', explanation: '403 Forbidden indicates the server understands identity but refuses authorization.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['http', 'auth'], correct: ['403 Forbidden'], wrong: ['401 Unauthorized', '500 Server Error', '405 Method Not Allowed'] },
    { text: 'Which TypeScript utility type constructs a type with all properties of T set to optional?', explanation: 'Partial<T> wraps every property in optional modifer ?.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['typescript'], correct: ['Partial<T>'], wrong: ['Required<T>', 'Readonly<T>', 'Record<K, T>'] },
    { text: 'In PostgreSQL, which index type is best suited for exact matches and range scans?', explanation: 'B-Tree is the default indexing algorithm for comparisons and ranges.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['sql', 'postgres'], correct: ['B-Tree'], wrong: ['Hash', 'GIN', 'BRIN'] },
    { text: 'What is the primary purpose of an abstract storage driver in our backend?', explanation: 'Decouples business logic from specific cloud storage vendors.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['architecture', 'storage'], correct: ['Allows seamless swapping between local disk, AWS S3, and Cloudinary'], wrong: ['Increases RAM speed', 'Replaces PostgreSQL', 'Encrypts user passwords'] },
    { text: 'Which header prevents clickjacking attacks in web browsers?', explanation: 'X-Frame-Options and frame-ancestors CSP directive prevent iframe hijacking.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['security'], correct: ['X-Frame-Options / Content-Security-Policy'], wrong: ['X-Powered-By', 'Accept-Encoding', 'Set-Cookie'] },
    { text: 'How is state machine progression validated in our LMS?', explanation: 'All unlock transitions are authoritatively calculated server-side from database records.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['progression', 'architecture'], correct: ['Strict server-side validation against database state on every request'], wrong: ['Client localStorage', 'CSS display property', 'URL hash parameters'] },
    { text: 'What is the standard watch percentage threshold for video lesson completion?', explanation: '90% of duration must be watched or server marked complete.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['progression'], correct: ['90.0%'], wrong: ['50.0%', '25.0%', '10.0%'] },
    { text: 'What HTTP status code is returned when a requested resource does not exist?', explanation: '404 indicates resource route or ID was not found.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['http'], correct: ['404 Not Found'], wrong: ['400 Bad Request', '401 Unauthorized', '502 Bad Gateway'] },
    { text: 'In Node.js Express, which middleware parses incoming JSON request bodies?', explanation: 'express.json() parses application/json payloads into req.body.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['express', 'node'], correct: ['express.json()'], wrong: ['express.urlencoded()', 'express.static()', 'express.router()'] },
    { text: 'What is the role of refresh tokens stored in httpOnly cookies?', explanation: 'httpOnly cookies cannot be read by JavaScript, defending against XSS.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['auth', 'security'], correct: ['Enables silent access token renewal while preventing XSS theft'], wrong: ['Speeds up DNS lookups', 'Compresses images', 'Controls CSS layout'] },
    { text: 'Which git command creates and switches to a new branch simultaneously?', explanation: 'git checkout -b <name> or git switch -c <name> branches and switches in one step.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['git'], correct: ['git checkout -b <name> / git switch -c <name>'], wrong: ['git branch <name>', 'git merge <name>', 'git pull <name>'] },
    { text: 'What does ACID stand for in relational database management systems?', explanation: 'ACID guarantees database transaction reliability.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['database', 'postgres'], correct: ['Atomicity, Consistency, Isolation, Durability'], wrong: ['Async, Cached, Indexed, Distributed', 'Action, Control, Input, Data', 'Api, Client, Interface, Database'] },
    { text: 'Which HTTP status code signifies that a resource was successfully created?', explanation: '201 Created indicates successful POST/PUT resulting in new resource.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['http'], correct: ['201 Created'], wrong: ['200 OK', '204 No Content', '202 Accepted'] },
    { text: 'What is the purpose of rate limiting on authentication routes?', explanation: 'Throttles repeated requests to defend against automated brute-force attempts.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['security'], correct: ['Mitigates brute-force credential stuffing and DoS attacks'], wrong: ['Reduces database storage', 'Improves CSS rendering', 'Enforces dark mode'] },
    { text: 'In TypeScript, what keyword defines an immutable variable binding?', explanation: 'const creates a block-scoped binding that cannot be reassigned.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['typescript'], correct: ['const'], wrong: ['var', 'let', 'static'] },
    { text: 'How are verifiable diplomas authenticated on our public registry?', explanation: 'QR codes link directly to verified server database records with cryptographic hashes.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['certificates'], correct: ['Via unique serial number and dynamic QR code linked to server verification endpoint'], wrong: ['Client screenshot', 'Watermark font', 'Unverified email'] },
    // 10 Multiple Choice Questions for Module 1
    { text: 'Select all valid HTTP methods that are designed to be idempotent (Select all that apply):', explanation: 'GET, PUT, DELETE, and HEAD are idempotent by HTTP spec.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['http', 'rest'], correct: ['GET', 'PUT', 'DELETE'], wrong: ['POST', 'PATCH'] },
    { text: 'Select all features provided by Prisma ORM in TypeScript projects (Select all that apply):', explanation: 'Prisma generates type-safe queries, migration scripts, and relation filters.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['prisma'], correct: ['Type-safe query builder', 'Declarative schema migrations', 'Automatic relational join queries'], wrong: ['Direct hardware memory management'] },
    { text: 'Select all valid Zod validation primitives (Select all that apply):', explanation: 'z.string(), z.number(), and z.object() are core Zod schemas.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['zod'], correct: ['z.string()', 'z.number()', 'z.object()'], wrong: ['z.compile()'] },
    { text: 'Which of the following are true regarding PostgreSQL indexes? (Select all that apply):', explanation: 'Indexes accelerate SELECTs but introduce overhead on INSERT/UPDATE/DELETE.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['postgres', 'sql'], correct: ['Speed up WHERE clause lookups', 'Can enforce uniqueness constraints', 'Increase disk storage and write overhead'], wrong: ['Automatically delete duplicate rows without error'] },
    { text: 'Select all security best practices for JWT authentication (Select all that apply):', explanation: 'Short access token expiry and httpOnly cookie storage mitigate token theft.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['security', 'auth'], correct: ['Short lifespan for access tokens (e.g. 15m)', 'Store refresh tokens in httpOnly SameSite cookies', 'Validate signature on every protected request'], wrong: ['Store private keys in public git repository'] },
    { text: 'Which headers are involved in Cross-Origin Resource Sharing (CORS)? (Select all that apply):', explanation: 'Access-Control-Allow-Origin, Methods, and Headers govern CORS exchanges.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['http', 'security'], correct: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'], wrong: ['X-Forwarded-Host-Only'] },
    { text: 'Select all valid TypeScript utility types for transforming object types (Select all that apply):', explanation: 'Pick, Omit, and Record are built-in type transformers.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['typescript'], correct: ['Pick<T, K>', 'Omit<T, K>', 'Record<K, T>'], wrong: ['Transform<T>'] },
    { text: 'Which factors trigger a module quiz lock in the LMS? (Select all that apply):', explanation: 'Unwatched lessons or previous module lock state lock the quiz.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['progression'], correct: ['Unwatched video lessons in the module (<90%)', 'Previous module in course is still locked', 'Active cooldown timer between failed attempts'], wrong: ['Student profile has avatar uploaded'] },
    { text: 'Select all attributes of a scalable monorepo setup (Select all that apply):', explanation: 'Shared configurations, atomic commits, and centralized tooling define monorepos.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['monorepo'], correct: ['Unified workspace dependencies', 'Shared contract libraries across apps', 'Single CI pipeline validation'], wrong: ['Duplicate copies of node_modules in git history'] },
    { text: 'Which HTTP status codes represent server-side failure? (Select all that apply):', explanation: '500, 502, and 503 are 5xx server errors.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['http'], correct: ['500 Internal Server Error', '502 Bad Gateway', '503 Service Unavailable'], wrong: ['400 Bad Request', '403 Forbidden'] },
  ];

  await seedQuestionsHelper(quiz1.id, quiz1QuestionsList);

  // Module 1 Assignment
  const assignment1 = await prisma.assignment.create({
    data: {
      moduleId: module1.id,
      title: 'Practical Project: Monorepo REST API with Zod Validation',
      description:
        'Construct a modular Express REST API using TypeScript in an npm workspace. Implement input validation middleware using Zod, create at least two Prisma models with relations, and write unit tests.',
      maxScore: 100,
    },
  });

  // 8. Course 1: Module 2 (30 questions in pool, configured for 10 questions at 70%)
  const module2 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Module 2: Frontend Engineering with Next.js 15 & Design Systems',
      description: 'Build interactive, responsive, high-performance web applications with React Server Components, Tailwind CSS, and TanStack Query.',
      order: 2,
      requiresAssignment: false, // Per-module toggle: Assignment is skipped for this module!
      requiresQuiz: true,
    },
  });

  const lesson2_1 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      title: '2.1 Next.js App Router, Server Components & Streaming SSR',
      description: 'Understand the difference between React Server Components (RSC) and Client Components with Suspense boundaries.',
      type: LessonType.VIDEO,
      videoProvider: VideoProvider.YOUTUBE,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationSeconds: 650,
      order: 1,
    },
  });

  const lesson2_2 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      title: '2.2 Server State Management with TanStack Query & Optimistic Updates',
      description: 'Query caching, mutation lifecycle, cache invalidation, and seamless optimistic UI rollbacks.',
      type: LessonType.VIDEO,
      videoProvider: VideoProvider.MP4,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      durationSeconds: 700,
      order: 2,
    },
  });

  const lesson2_3 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      title: '2.3 Responsive Design Systems with Tailwind CSS & Micro-Animations',
      description: 'Design tokens, dark/light themes, accessible modal dialogs, and smooth interactive micro-interactions.',
      type: LessonType.VIDEO,
      videoProvider: VideoProvider.VIMEO,
      videoUrl: 'https://vimeo.com/76979871',
      durationSeconds: 750,
      order: 3,
    },
  });

  const quiz2 = await prisma.quiz.create({
    data: {
      moduleId: module2.id,
      title: 'Module 2 Assessment: Next.js & Client State',
      description: 'Evaluate your knowledge of Next.js App Router, React 19 hooks, and TanStack Query caching.',
      questionCount: 10,
      passPercentage: 70.0,
      passingScorePercent: 70.0,
      maxAttempts: 3,
      cooldownMinutes: 5,
      timeLimitMinutes: 15,
      shuffleQuestions: true,
      shuffleOptions: true,
      showAnswersAfterSubmit: AnswerReviewPolicy.AFTER_PASS,
      scoringMode: ScoringMode.ALL_OR_NOTHING,
      status: QuizStatus.PUBLISHED,
    },
  });

  const quiz2QuestionsList = [
    { text: 'In Next.js App Router, what directive is required at the top of a file to use useState and useEffect?', explanation: '"use client" marks boundary where component runs in browser client context.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['nextjs', 'react'], correct: ['"use client"'], wrong: ['"use server"', '"use dynamic"', '"use react"'] },
    { text: 'What is the primary benefit of React Server Components (RSC)?', explanation: 'RSC code and dependencies execute purely on server, sending zero JS bundle to client.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['react', 'nextjs'], correct: ['Zero bundle size shipped to client for server dependencies'], wrong: ['Eliminates HTML output', 'Forces all components to re-render every second', 'Disables TypeScript checking'] },
    { text: 'In TanStack Query, which option determines how long data remains fresh before refetching?', explanation: 'staleTime specifies duration in ms before data is considered stale.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['tanstack-query'], correct: ['staleTime'], wrong: ['gcTime', 'cacheDuration', 'retryDelay'] },
    { text: 'Which Next.js file defines the root layout shell shared across sub-routes?', explanation: 'layout.tsx defines shared UI wrapper that preserves state across page navigation.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['nextjs'], correct: ['layout.tsx'], wrong: ['page.tsx', 'template.tsx', 'head.tsx'] },
    { text: 'Which Tailwind class enables flexbox layout with centered children?', explanation: 'flex items-center justify-center centers along both axes.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['css', 'tailwind'], correct: ['flex items-center justify-center'], wrong: ['block center', 'grid-auto-flow', 'align-center'] },
    { text: 'What is the purpose of Next.js route groups like (marketing) or (student)?', explanation: 'Parentheses folders organize files without modifying URL route paths.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['nextjs'], correct: ['Organize routes into logical folders without affecting the URL pathname'], wrong: ['Add HTTP basic auth', 'Disable SSR', 'Force TypeScript compilation'] },
    { text: 'How does Next.js 15 handle route caching by default for fetch requests?', explanation: 'Next.js 15 defaults fetch to uncached no-store for predictability.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['nextjs'], correct: ['Uncached (no-store) by default unless explicitly configured'], wrong: ['Permanently cached indefinitely', 'Saved to client localStorage', 'Sent to Redis only'] },
    { text: 'Which React hook memoizes an expensive computed calculation between renders?', explanation: 'useMemo caches computed values based on dependency arrays.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['react'], correct: ['useMemo'], wrong: ['useCallback', 'useEffect', 'useRef'] },
    { text: 'Which React hook memoizes a function callback reference across renders?', explanation: 'useCallback preserves callback reference identity across re-renders.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['react'], correct: ['useCallback'], wrong: ['useMemo', 'useState', 'useLayoutEffect'] },
    { text: 'What HTML5 element provides semantic container for navigation links?', explanation: '<nav> communicates navigation section to accessibility screen readers.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['html', 'accessibility'], correct: ['<nav>'], wrong: ['<div>', '<aside>', '<section>'] },
    { text: 'What is the purpose of React Suspense boundaries?', explanation: 'Suspense displays fallback UI while asynchronous children are loading.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['react'], correct: ['Display fallback UI while children are fetching data or loading code'], wrong: ['Catch JavaScript runtime errors', 'Encrypt cookies', 'Throttle keyboard inputs'] },
    { text: 'Which Next.js hook provides access to the current URL pathname?', explanation: 'usePathname() returns current URL pathname in client components.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['nextjs'], correct: ['usePathname()'], wrong: ['useRouter().pathname', 'useLocation()', 'useUrl()'] },
    { text: 'What hook is used in React 19 for optimistic UI state updates?', explanation: 'useOptimistic allows immediate optimistic UI transitions before async actions finish.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['react'], correct: ['useOptimistic()'], wrong: ['useInstant()', 'useFast()', 'useDeferredValue()'] },
    { text: 'In Tailwind CSS, what prefix enables responsive styling at screen width 768px+?', explanation: 'md: prefix targets medium breakpoints (768px).', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['tailwind'], correct: ['md:'], wrong: ['sm:', 'lg:', 'xl:'] },
    { text: 'What CSS property allows glassmorphism frosted glass backgrounds?', explanation: 'backdrop-filter: blur() creates frosted glass effects over elements below.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['css'], correct: ['backdrop-filter: blur(...)'], wrong: ['filter: invert()', 'opacity: 0.1', 'box-shadow: inset'] },
    { text: 'Which TanStack Query hook is used for mutating server data (POST/PUT/DELETE)?', explanation: 'useMutation handles asynchronous mutations, variables, and side-effects.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['tanstack-query'], correct: ['useMutation'], wrong: ['useQuery', 'useFetch', 'useAction'] },
    { text: 'What is the purpose of queryClient.invalidateQueries()?', explanation: 'Marks matching queries as stale and triggers background refetching.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['tanstack-query'], correct: ['Marks cached queries as stale and triggers background refetching'], wrong: ['Deletes user auth tokens', 'Clears browser cookies', 'Reloads entire webpage'] },
    { text: 'In Next.js, what does the notFound() function do when invoked in a Server Component?', explanation: 'notFound() halts rendering and renders the closest not-found.tsx boundary.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['nextjs'], correct: ['Renders the closest not-found.tsx UI and sends a 404 HTTP status'], wrong: ['Throws unhandled fatal exception', 'Redirects to /', 'Reloads current page'] },
    { text: 'Which React hook holds a mutable reference that does not trigger re-renders on change?', explanation: 'useRef creates a mutable .current container that persists across renders.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['react'], correct: ['useRef'], wrong: ['useState', 'useMemo', 'useId'] },
    { text: 'How do you prevent default form submission reloading in React?', explanation: 'e.preventDefault() halts native form submit action.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['react', 'html'], correct: ['e.preventDefault()'], wrong: ['e.stopPropagation()', 'return false', 'e.halt()'] },
    // 10 Multiple Choice Questions for Module 2
    { text: 'Select all features supported by TanStack Query (Select all that apply):', explanation: 'TanStack Query handles caching, deduplication, auto-retry, and window refocusing.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['tanstack-query'], correct: ['Automatic background refetching on window focus', 'Query key caching & deduplication', 'Automatic exponential backoff retries'], wrong: ['Direct SQL database query execution'] },
    { text: 'Select all valid Next.js App Router special file conventions (Select all that apply):', explanation: 'page, layout, loading, error, and not-found are special reserved names.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['nextjs'], correct: ['page.tsx', 'layout.tsx', 'loading.tsx', 'error.tsx'], wrong: ['controller.tsx'] },
    { text: 'Which techniques improve Core Web Vitals in Next.js applications? (Select all that apply):', explanation: 'Image optimization, code splitting, and font preloading boost performance.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['performance', 'nextjs'], correct: ['Using next/image for automatic WebP/AVIF formatting and lazy loading', 'Streaming server rendering with Suspense boundaries', 'Using next/font for zero-layout-shift font loading'], wrong: ['Loading entire video files into memory on page load'] },
    { text: 'Select all valid Tailwind CSS utility categories (Select all that apply):', explanation: 'Flexbox, typography, spacing, and grid are standard Tailwind utilities.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['tailwind'], correct: ['Flexbox & Grid utilities', 'Spacing & Sizing classes', 'Typography & Color classes'], wrong: ['Assembly language compilers'] },
    { text: 'Which statements are true about React Server Components? (Select all that apply):', explanation: 'RSC runs only on server and cannot use state hooks or browser event listeners.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['react', 'nextjs'], correct: ['They can directly query databases without creating API routes', 'They reduce client JavaScript bundle size', 'They cannot use useState or onClick listeners directly'], wrong: ['They only work in Google Chrome'] },
    { text: 'Select all accessibility (a11y) best practices for web UI (Select all that apply):', explanation: 'Proper ARIA labels, semantic tags, and keyboard focus outlines ensure accessibility.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['accessibility'], correct: ['Ensure high contrast ratio between text and background', 'Provide visible focus outlines for keyboard navigation', 'Use semantic HTML elements (<button>, <input>, <nav>)'], wrong: ['Use generic <div> elements for all interactive buttons'] },
    { text: 'Which React hooks are provided natively in React 19? (Select all that apply):', explanation: 'useActionState, useOptimistic, and useFormStatus are React 19 additions.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['react'], correct: ['useActionState', 'useOptimistic'], wrong: ['useBlockchain', 'useRedux'] },
    { text: 'Select all benefits of responsive mobile-first CSS design (Select all that apply):', explanation: 'Mobile-first optimizes mobile performance and scales up cleanly.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['css'], correct: ['Ensures smooth experience across all device form factors', 'Reduces layout shifting on mobile browsers', 'Prioritizes essential content first'], wrong: ['Disables JavaScript completely'] },
    { text: 'Which states are tracked by TanStack Query mutation result object? (Select all that apply):', explanation: 'isPending, isSuccess, isError, and data are mutation properties.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['tanstack-query'], correct: ['isPending', 'isSuccess', 'isError', 'data'], wrong: ['isRebooting'] },
    { text: 'Select all valid CSS positioning modes (Select all that apply):', explanation: 'static, relative, absolute, fixed, and sticky are CSS position values.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['css'], correct: ['relative', 'absolute', 'fixed', 'sticky'], wrong: ['floating-air'] },
  ];

  await seedQuestionsHelper(quiz2.id, quiz2QuestionsList);

  // 9. Course 1: Module 3 (30 questions in pool, configured for 10 questions at 70%)
  const module3 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Module 3: Progression Engines, PDF Certificates & Production Systems',
      description: 'Implement server-enforced progression state machines, automated testing, secure PDF certificate generation with QR verification.',
      order: 3,
      requiresAssignment: true,
      requiresQuiz: true,
    },
  });

  const lesson3_1 = await prisma.lesson.create({
    data: {
      moduleId: module3.id,
      title: '3.1 Server-Enforced State Machines & Progression Logic',
      description: 'Design deterministic state transitions where client input is never trusted for progression unlocking.',
      type: LessonType.VIDEO,
      videoProvider: VideoProvider.MP4,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      durationSeconds: 700,
      order: 1,
    },
  });

  const lesson3_2 = await prisma.lesson.create({
    data: {
      moduleId: module3.id,
      title: '3.2 Vector PDF Diploma Generation with Embedded Anti-Tamper QR Codes',
      description: 'Use pdf-lib to render high-resolution certificate diplomas with dynamic verification links.',
      type: LessonType.READING,
      videoProvider: VideoProvider.OTHER,
      videoUrl: '',
      durationSeconds: 400,
      order: 2,
    },
  });

  const quiz3 = await prisma.quiz.create({
    data: {
      moduleId: module3.id,
      title: 'Module 3 Mastery Assessment: Progression & Certification',
      description: 'Test your understanding of progression security, PDF generation, and automated testing.',
      questionCount: 10,
      passPercentage: 70.0,
      passingScorePercent: 70.0,
      maxAttempts: 3,
      cooldownMinutes: 5,
      timeLimitMinutes: 15,
      shuffleQuestions: true,
      shuffleOptions: true,
      showAnswersAfterSubmit: AnswerReviewPolicy.AFTER_PASS,
      scoringMode: ScoringMode.ALL_OR_NOTHING,
      status: QuizStatus.PUBLISHED,
    },
  });

  const quiz3QuestionsList = [
    { text: 'Why MUST module progression be validated on the backend rather than client cookies?', explanation: 'Client state is prone to tampering; only server state guarantees verifiable progression.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['security', 'progression'], correct: ['To prevent tampering, unauthorized access, and ensure strict course completion'], wrong: ['Only to save CSS bandwidth', 'To avoid using TypeScript', 'Cookies cannot store strings'] },
    { text: 'What library is used in our backend for server-side vector PDF diploma creation?', explanation: 'pdf-lib provides fast, standalone PDF rendering without needing headless Chrome.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['pdf', 'certificates'], correct: ['pdf-lib'], wrong: ['puppeteer-only', 'html2canvas', 'jspdf-client'] },
    { text: 'How does anti-tamper QR verification work on our diplomas?', explanation: 'QR codes point to unique certificate verification endpoints validated against the database.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['certificates'], correct: ['Scans point to /verify/[id] where the server checks database authenticity and issue date'], wrong: ['Static link to Google', 'Hardcoded text inside the PDF image', 'QR contains user password'] },
    { text: 'In Vitest, which assertion tests whether a calculated value strictly equals expected output?', explanation: 'expect(value).toBe(expected) performs strict Object.is equality.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['testing'], correct: ['expect(value).toBe(expected)'], wrong: ['assert.truthy()', 'check.equals()', 'verify()'] },
    { text: 'Which HTTP status represents a successfully processed asynchronous webhook?', explanation: '200 OK or 202 Accepted confirms webhook reception.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['http', 'webhooks'], correct: ['200 OK / 202 Accepted'], wrong: ['404 Not Found', '500 Server Error', '301 Moved'] },
    { text: 'What is the purpose of question snapshots in quiz attempts?', explanation: 'Snapshots freeze questions and options order at attempt start so later question edits never alter historical grading.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['quiz', 'integrity'], correct: ['Freezes question text, options order, and correct answers at attempt creation'], wrong: ['Saves screenshot of the student monitor', 'Compresses image files', 'Deletes questions from bank'] },
    { text: 'What occurs when a student scores 14 out of 20 on a quiz with a 70% pass mark?', explanation: '14 / 20 = 70.0% which satisfies the >= 70% pass threshold.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['progression', 'grading'], correct: ['The attempt passes, and next module unlocks (if assignment not required)'], wrong: ['The attempt fails because 15 is required', 'Quiz resets attempt count to 0', 'Course is deleted'] },
    { text: 'What occurs when a student scores 13 out of 20 on a quiz with a 70% pass mark?', explanation: '13 / 20 = 65.0% which is strictly less than 70%, keeping next module locked.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['progression', 'grading'], correct: ['The attempt fails, next module remains locked, and student may retry'], wrong: ['Next module unlocks automatically', 'Student account is suspended', 'Certificate is issued'] },
    { text: 'What is a database transaction used for during quiz grading?', explanation: 'Ensures grading result, module completion, and next module unlock happen atomically.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['database', 'prisma'], correct: ['Ensures grading, module progress update, and unlock happen atomically in one operation'], wrong: ['Sends emails only', 'Increases network bandwidth', 'Saves CSS styles'] },
    { text: 'How does negative marking function when enabled on multiple-choice quizzes?', explanation: 'Deducts configured penalty marks for incorrect options while rewarding correct ones.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['quiz', 'grading'], correct: ['Deducts a fractional point penalty for incorrect answers to discourage guessing'], wrong: ['Deletes the question from the quiz', 'Permanently locks the student account', 'Doubles the total exam time'] },
    { text: 'What is the purpose of cooldown periods after failed quiz attempts?', explanation: 'Encourages students to review module tutorial videos before re-attempting.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['quiz'], correct: ['Requires student to wait a configured duration to review lessons before retrying'], wrong: ['Limits server CPU usage only', 'Forces password change', 'Charges additional fees'] },
    { text: 'Which header prevents sensitive assessment pages from being cached by proxy servers?', explanation: 'Cache-Control: no-store, no-cache prevents intermediary proxy storage.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['security', 'http'], correct: ['Cache-Control: no-store, no-cache, must-revalidate'], wrong: ['Age: 3600', 'Expires: next year', 'ETag: static'] },
    { text: 'In unit testing, what is a pure function?', explanation: 'A function that given the same inputs always returns the same output with no side effects.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['testing'], correct: ['A deterministic function with no side-effects that depends only on its input arguments'], wrong: ['A function that connects to external databases', 'A function written in C++', 'An async timer loop'] },
    { text: 'What is the role of AuditLog entries in LMS administration?', explanation: 'Tracks admin overrides like manual unlocks or score adjustments for accountability.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['audit', 'admin'], correct: ['Records administrative override actions with user ID, timestamps, and justification reasons'], wrong: ['Stores marketing emails', 'Caches video files', 'Counts website page views'] },
    { text: 'How should expired quiz attempts be handled by the assessment engine?', explanation: 'Automatically submit and grade with whatever answers were saved prior to expiration.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['quiz', 'timer'], correct: ['Auto-submitted and graded server-side based on saved answers in snapshot'], wrong: ['Silently deleted without grading', 'Given 100% score automatically', 'Timer restarted infinitely'] },
    { text: 'Which encryption algorithm is standard for hashing passwords before database storage?', explanation: 'bcrypt / argon2 are slow, salted hashing algorithms resistant to brute force.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['security'], correct: ['bcrypt / argon2 with salt rounds'], wrong: ['MD5 plain', 'SHA-1', 'Base64 encoding'] },
    { text: 'What is the primary objective of automated end-to-end integration tests?', explanation: 'Validates that multiple system components and services work together correctly across real user workflows.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['testing'], correct: ['Verifies full user workflows across API endpoints, database transactions, and business logic'], wrong: ['Tests single isolated helper function only', 'Checks CSS color spelling', 'Measures network latency exclusively'] },
    { text: 'In event-driven architecture, what is the role of the EventBus?', explanation: 'Decouples event publishers from asynchronous background subscribers.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['architecture', 'events'], correct: ['Decouples domain event emission from asynchronous subscribers like notifications and analytics'], wrong: ['Renders React UI components', 'Compiles TypeScript into bytecode', 'Directly manages PostgreSQL connection pooling'] },
    { text: 'What is the function of the requiresAssignment flag on a module model?', explanation: 'Controls whether a module unlocks the next module immediately upon quiz pass or requires an approved assignment.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['progression', 'schema'], correct: ['Determines if practical assignment approval is required before the next module unlocks'], wrong: ['Forces students to pay additional fees', 'Disables video playback', 'Hides course from dashboard'] },
    { text: 'What is the recommended approach for CSV question bank import validation?', explanation: 'Dry-run validation checks all rows and reports specific line errors before committing data.', type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['csv', 'admin'], correct: ['Dry-run mode validates rows, columns, and correct option mappings before executing database writes'], wrong: ['Blindly inserting raw CSV strings into SQL queries', 'Requiring manual input of every row', 'Exporting database to Excel without validation'] },
    // 10 Multiple Choice Questions for Module 3
    { text: 'Select all key capabilities of the Assessment Engine in this platform (Select all that apply):', explanation: 'Anti-cheat snapshots, randomized draws, timer enforcement, and instant grading.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['quiz'], correct: ['Immutable question snapshots per attempt', 'Server-authoritative timers & auto-submission', 'Deterministic grading with progression integration', 'Randomized question & option shuffling'], wrong: ['Sharing correct answers in client network payloads before submit'] },
    { text: 'Select all valid AnswerReviewPolicy enum options (Select all that apply):', explanation: 'NEVER, AFTER_PASS, AFTER_EACH_ATTEMPT, and AFTER_MAX_ATTEMPTS are the 4 supported review policies.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['quiz', 'policy'], correct: ['NEVER', 'AFTER_PASS', 'AFTER_EACH_ATTEMPT', 'AFTER_MAX_ATTEMPTS'], wrong: ['BEFORE_START'] },
    { text: 'Which security measures protect student quiz integrity? (Select all that apply):', explanation: 'No answer leakage, server-side timer verification, and rate limiting.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['security', 'quiz'], correct: ['Excluding correctOptionIds and explanations from attempt start & resume payloads', 'Validating submission timestamps against server expiresAt', 'Recording light integrity telemetry (tab visibility changes)'], wrong: ['Storing correct answer IDs in client cookie'] },
    { text: 'Select all components verified when checking if a student can take a quiz (Select all that apply):', explanation: 'Enrollment payment status, module unlock state, video watch completion, and attempt limits.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['progression'], correct: ['Active paid enrollment in the course', 'Module is unlocked in student progression', 'All module video lessons are completed (>=90%)', 'Max attempt limits and cooldown timer elapsed'], wrong: ['Student has completed university degree'] },
    { text: 'Select all verifiable data items printed on generated diplomas (Select all that apply):', explanation: 'Student name, course title, unique certificate ID, issue date, and verification QR code.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['certificates'], correct: ['Recipient student name', 'Course title & distinction grade', 'Unique certificate serial ID', 'Dynamic QR verification URL'], wrong: ['Student password hash'] },
    { text: 'Which events are dispatched during assessment grading? (Select all that apply):', explanation: 'quiz.submitted, quiz.passed/failed, and module.completed events.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['events'], correct: ['quiz.submitted', 'quiz.passed (on passing score)', 'quiz.failed (on failing score)', 'module.completed (when all module criteria met)'], wrong: ['server.rebooted'] },
    { text: 'Select all valid admin override capabilities supported in the LMS (Select all that apply):', explanation: 'Resetting attempts, manually passing quiz, and invalidating attempts with audit logs.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['admin', 'audit'], correct: ['Resetting student attempt count with audit reason', 'Manually marking module quiz as passed by instructor/admin', 'Invalidating compromised attempts with audit logging'], wrong: ['Deleting entire database history without log'] },
    { text: 'Which assertions are standard in Vitest test suites? (Select all that apply):', explanation: 'toBe, toEqual, toBeDefined, and rejects.toThrow are core Vitest matchers.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.EASY, tags: ['testing'], correct: ['expect(a).toBe(b)', 'expect(a).toEqual(b)', 'expect(fn).rejects.toThrow()'], wrong: ['assert.fly()'] },
    { text: 'Select all features of the Question Bank management interface (Select all that apply):', explanation: 'CRUD, versioning, difficulty filters, search, and CSV import/export.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.MEDIUM, tags: ['question-bank'], correct: ['Question versioning on edit', 'Difficulty and tag filtering', 'Bulk activate/archive actions', 'CSV bulk import and export'], wrong: ['Auto-generating false certificates'] },
    { text: 'Which database tables are updated during a successful quiz pass transaction? (Select all that apply):', explanation: 'QuizAttempt, AttemptAnswer, and ModuleProgress.', type: QuestionType.MULTIPLE_CHOICE, difficulty: QuestionDifficulty.HARD, tags: ['database', 'prisma'], correct: ['QuizAttempt (status, score, passed, submittedAt)', 'AttemptAnswer (pointsEarned, isCorrect)', 'ModuleProgress (COMPLETED / AVAILABLE next module)'], wrong: ['Course (title deleted)'] },
  ];

  await seedQuestionsHelper(quiz3.id, quiz3QuestionsList);

  const assignment3 = await prisma.assignment.create({
    data: {
      moduleId: module3.id,
      title: 'Practical Project: Server-Enforced Progression Engine with Test Suite',
      description: 'Implement pure progression functions and generate verifiable PDF certificates with comprehensive tests.',
      maxScore: 100,
    },
  });

  // 10. Post-Curriculum Stages: Mock Test, Final Project, Final Assessment
  const mockTest = await prisma.mockTest.create({
    data: {
      courseId: course1.id,
      title: 'Comprehensive Final Mock Examination',
      description: 'A timed 20-minute simulated examination testing your full-stack knowledge across all modules. Passing threshold: 75%.',
      durationMinutes: 20,
      passingScorePercent: 75,
      maxAttempts: 3,
    },
  });

  const mt1 = await prisma.mockTestQuestion.create({
    data: {
      mockTestId: mockTest.id,
      text: 'What is the primary architectural principle behind monorepos in enterprise SaaS development?',
      type: QuestionType.SINGLE_CHOICE,
      order: 1,
      points: 25,
    },
  });
  await prisma.mockTestOption.createMany({
    data: [
      { questionId: mt1.id, text: 'Shared types, atomic commits, unified tooling, and consolidated dependency management', isCorrect: true },
      { questionId: mt1.id, text: 'Running everything inside a single monolithic index.html file', isCorrect: false },
      { questionId: mt1.id, text: 'Eliminating the need for a database', isCorrect: false },
    ],
  });

  const mt2 = await prisma.mockTestQuestion.create({
    data: {
      mockTestId: mockTest.id,
      text: 'Which PostgreSQL constraint guarantees that a user cannot have two active enrollments in the same course?',
      type: QuestionType.SINGLE_CHOICE,
      order: 2,
      points: 25,
    },
  });
  await prisma.mockTestOption.createMany({
    data: [
      { questionId: mt2.id, text: '@@unique([studentId, courseId]) compound unique index', isCorrect: true },
      { questionId: mt2.id, text: '@default(now()) timestamp index', isCorrect: false },
    ],
  });

  const finalProject = await prisma.finalProject.create({
    data: {
      courseId: course1.id,
      title: 'Capstone Project: Enterprise Learning Management System',
      description:
        'Architect, build, test, and deploy a complete production-ready LMS platform featuring a 3-layer architecture, dual delivery modes, server-enforced progression state machine, and verifiable PDF certification.',
    },
  });

  const finalAssessment = await prisma.finalAssessment.create({
    data: {
      courseId: course1.id,
      title: 'Official Final Certification Assessment',
      description: 'Comprehensive 30-minute timed final certification exam. Passing score is 80%.',
      durationMinutes: 30,
      passingScorePercent: 80,
      maxAttempts: 3,
    },
  });

  const fa1 = await prisma.finalAssessmentQuestion.create({
    data: {
      finalAssessmentId: finalAssessment.id,
      text: 'Which architectural design pattern provides strict separation of concerns between HTTP transport, domain business logic, and database persistence?',
      type: QuestionType.SINGLE_CHOICE,
      order: 1,
      points: 50,
    },
  });
  await prisma.finalAssessmentOption.createMany({
    data: [
      { questionId: fa1.id, text: 'Controller-Service-Repository pattern with shared validation contracts', isCorrect: true },
      { questionId: fa1.id, text: 'Executing raw SQL inside client-side onClick event handlers', isCorrect: false },
    ],
  });

  // 11. Seed Student 1 Progress (In-Progress persona: Module 1 Done, Module 2 In-Progress)
  const payment1 = await prisma.payment.create({
    data: {
      studentId: student1.id,
      courseId: course1.id,
      provider: PaymentProvider.MOCK,
      amount: 4999.0,
      currency: 'INR',
      status: PaymentStatus.COMPLETED,
      providerRef: 'PAY-MOCK-STUDENT1-001',
      metadata: { mode: 'RECORDED' },
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student1.id,
      courseId: course1.id,
      batchId: recordedBatch1.id,
      mode: DeliveryMode.RECORDED,
      status: EnrollmentStatus.ACTIVE,
      paymentStatus: PaymentStatus.PAID,
      accessStatus: AccessStatus.ACTIVE,
      paymentId: payment1.id,
      enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Student 1 watched Module 1 lessons 100%
  await prisma.lessonProgress.createMany({
    data: [
      {
        studentId: student1.id,
        lessonId: lesson1_1.id,
        watchedSeconds: 600,
        lastPositionSeconds: 600,
        watchedSegments: [{ start: 0, end: 600 }],
        percent: 100,
        completedAt: new Date(),
        completionSource: CompletionSource.AUTO,
      },
      {
        studentId: student1.id,
        lessonId: lesson1_2.id,
        watchedSeconds: 720,
        lastPositionSeconds: 720,
        watchedSegments: [{ start: 0, end: 720 }],
        percent: 100,
        completedAt: new Date(),
        completionSource: CompletionSource.AUTO,
      },
      {
        studentId: student1.id,
        lessonId: lesson1_3.id,
        watchedSeconds: 840,
        lastPositionSeconds: 840,
        watchedSegments: [{ start: 0, end: 840 }],
        percent: 100,
        completedAt: new Date(),
        completionSource: CompletionSource.AUTO,
      },
      // Started watching Module 2 lesson 1
      {
        studentId: student1.id,
        lessonId: lesson2_1.id,
        watchedSeconds: 250,
        lastPositionSeconds: 250,
        watchedSegments: [{ start: 0, end: 250 }],
        percent: 38,
        completedAt: null,
      },
    ],
  });

  // Student 1 Practice Progress
  await prisma.practiceProgress.createMany({
    data: [
      {
        studentId: student1.id,
        practiceTaskId: practiceTask1.id,
        status: PracticeStatus.DONE,
        notes: 'Monorepo workspace setup completed with TypeScript strict configuration and pnpm/npm filters.',
      },
      {
        studentId: student1.id,
        practiceTaskId: practiceTask2.id,
        status: PracticeStatus.IN_PROGRESS,
        notes: 'Drafted Zod schemas, refining email regex and nested transform pipelines.',
      },
    ],
  });

  // Student 1 Lesson Notes
  await prisma.lessonNote.createMany({
    data: [
      {
        studentId: student1.id,
        lessonId: lesson1_1.id,
        timestampSeconds: 125,
        text: 'PUT vs PATCH: PUT replaces the full resource (idempotent), PATCH modifies fields.',
      },
      {
        studentId: student1.id,
        lessonId: lesson1_1.id,
        timestampSeconds: 340,
        text: 'Monorepo layout: shared packages must be linked under packages/shared and referenced in tsconfig paths.',
      },
    ],
  });

  // Student 1 Bookmark
  await prisma.lessonBookmark.create({
    data: {
      studentId: student1.id,
      lessonId: lesson1_2.id,
    },
  });

  // Student 1 passed Quiz 1 with 18/20 (90%)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      studentId: student1.id,
      attemptNumber: 1,
      status: QuizAttemptStatus.SUBMITTED,
      score: 18,
      maxScore: 20,
      percentage: 90,
      passed: true,
      scorePercent: 90,
      totalPoints: 20,
      earnedPoints: 18,
      isPassed: true,
    },
  });

  // Student 1 submitted Practical Assignment 1 -> APPROVED by Instructor with 95/100
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment1.id,
      studentId: student1.id,
      version: 1,
      status: SubmissionStatus.APPROVED,
      textContent: 'Completed modular REST API in monorepo with full Zod validation and 100% test coverage.',
      linkUrl: 'https://github.com/student1/lms-rest-api',
      grade: 95,
      feedback: 'Excellent code architecture, clean error handling, and comprehensive unit tests. Approved!',
      reviewedById: instructor.id,
      reviewedAt: new Date(),
    },
  });

  // Module Progress for Student 1
  await prisma.moduleProgress.create({
    data: { studentId: student1.id, moduleId: module1.id, status: ModuleStatus.COMPLETED, completedAt: new Date() },
  });
  await prisma.moduleProgress.create({
    data: { studentId: student1.id, moduleId: module2.id, status: ModuleStatus.IN_PROGRESS },
  });

  // 12. Seed Student 2 Progress (Certified Graduate Persona)
  const payment2 = await prisma.payment.create({
    data: {
      studentId: student2.id,
      courseId: course1.id,
      provider: PaymentProvider.RAZORPAY,
      amount: 9999.0,
      currency: 'INR',
      status: PaymentStatus.COMPLETED,
      providerRef: 'pay_live_cohort_alpha_002',
      metadata: { mode: 'LIVE' },
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student2.id,
      courseId: course1.id,
      batchId: liveBatchAlpha.id,
      mode: DeliveryMode.LIVE,
      status: EnrollmentStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      accessStatus: AccessStatus.ACTIVE,
      paymentId: payment2.id,
      enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      completedAt: new Date(),
    },
  });

  // Student 2 completed all lessons across modules 1, 2, 3
  await prisma.lessonProgress.createMany({
    data: [
      { studentId: student2.id, lessonId: lesson1_1.id, watchedSeconds: 600, percent: 100, completedAt: new Date() },
      { studentId: student2.id, lessonId: lesson1_2.id, watchedSeconds: 720, percent: 100, completedAt: new Date() },
      { studentId: student2.id, lessonId: lesson1_3.id, watchedSeconds: 840, percent: 100, completedAt: new Date() },
      { studentId: student2.id, lessonId: lesson2_1.id, watchedSeconds: 650, percent: 100, completedAt: new Date() },
      { studentId: student2.id, lessonId: lesson2_2.id, watchedSeconds: 700, percent: 100, completedAt: new Date() },
      { studentId: student2.id, lessonId: lesson2_3.id, watchedSeconds: 750, percent: 100, completedAt: new Date() },
      { studentId: student2.id, lessonId: lesson3_1.id, watchedSeconds: 700, percent: 100, completedAt: new Date() },
      { studentId: student2.id, lessonId: lesson3_2.id, watchedSeconds: 800, percent: 100, completedAt: new Date() },
    ],
  });

  // Student 2 has watched all lessons and is ready to take Quiz (State: AVAILABLE)

  // Student 2 approved assignments
  await prisma.assignmentSubmission.createMany({
    data: [
      {
        assignmentId: assignment1.id,
        studentId: student2.id,
        version: 1,
        status: SubmissionStatus.APPROVED,
        textContent: 'Enterprise REST API architecture with PostgreSQL & TypeScript.',
        linkUrl: 'https://github.com/janesmith/monorepo-lms',
        grade: 100,
        feedback: 'Flawless engineering and clean modular structure.',
        reviewedById: instructor.id,
        reviewedAt: new Date(),
      },
      {
        assignmentId: assignment3.id,
        studentId: student2.id,
        version: 1,
        status: SubmissionStatus.APPROVED,
        textContent: 'Progression state engine with automated Vitest test suite.',
        linkUrl: 'https://github.com/janesmith/progression-state-engine',
        grade: 98,
        feedback: 'Superb test coverage and strict validation logic.',
        reviewedById: instructor.id,
        reviewedAt: new Date(),
      },
    ],
  });

  // Student 2 completed all modules
  await prisma.moduleProgress.createMany({
    data: [
      { studentId: student2.id, moduleId: module1.id, status: ModuleStatus.COMPLETED, completedAt: new Date() },
      { studentId: student2.id, moduleId: module2.id, status: ModuleStatus.COMPLETED, completedAt: new Date() },
      { studentId: student2.id, moduleId: module3.id, status: ModuleStatus.COMPLETED, completedAt: new Date() },
    ],
  });

  // Student 2 Mock Test Passed (88%)
  await prisma.mockTestAttempt.create({
    data: {
      mockTestId: mockTest.id,
      studentId: student2.id,
      attemptNumber: 1,
      scorePercent: 88,
      timeSpentSeconds: 950,
      isPassed: true,
    },
  });

  // Student 2 Capstone Project Approved
  await prisma.projectSubmission.create({
    data: {
      finalProjectId: finalProject.id,
      studentId: student2.id,
      description: 'Production-ready Learning Management System monorepo with verifiable certification and 3-layer architecture.',
      linkUrl: 'https://github.com/janesmith/creativeit-lms',
      status: SubmissionStatus.APPROVED,
      grade: 98,
      feedback: 'Production grade capstone project. Exceptional work across all 3 layers!',
      reviewedById: instructor.id,
      reviewedAt: new Date(),
    },
  });

  // Student 2 Final Assessment Passed (92%)
  await prisma.examAttempt.create({
    data: {
      finalAssessmentId: finalAssessment.id,
      studentId: student2.id,
      attemptNumber: 1,
      scorePercent: 92,
      timeSpentSeconds: 1240,
      isPassed: true,
    },
  });

  // Student 2 Issued Certificate with dynamic QR verification
  const certificate2 = await prisma.certificate.create({
    data: {
      certificateId: 'CERT-2026-AI-001',
      studentId: student2.id,
      courseId: course1.id,
      status: CertificateStatus.VALID,
      issuedAt: new Date(),
      pdfUrl: '/uploads/certificates/CERT-2026-AI-001.pdf',
      metadata: {
        recipientName: 'Jane Smith',
        courseTitle: course1.title,
        gradeEarned: 'Distinction (96%)',
        issuer: 'Online Creative & IT Academy Academic Council',
      },
    },
  });

  // 13. Seed Student 3 Progress (Live Student with Failed Quiz then Passed Retake, Assignment Pending Review)
  const payment3 = await prisma.payment.create({
    data: {
      studentId: student3.id,
      courseId: course1.id,
      provider: PaymentProvider.RAZORPAY,
      amount: 9999.0,
      currency: 'INR',
      status: PaymentStatus.COMPLETED,
      providerRef: 'pay_live_wknd_003',
      metadata: { mode: 'LIVE' },
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student3.id,
      courseId: course1.id,
      batchId: liveBatchWeekend.id,
      mode: DeliveryMode.LIVE,
      status: EnrollmentStatus.ACTIVE,
      paymentStatus: PaymentStatus.PAID,
      accessStatus: AccessStatus.ACTIVE,
      paymentId: payment3.id,
      enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.lessonProgress.createMany({
    data: [
      { studentId: student3.id, lessonId: lesson1_1.id, watchedSeconds: 600, percent: 100, completedAt: new Date() },
      { studentId: student3.id, lessonId: lesson1_2.id, watchedSeconds: 720, percent: 100, completedAt: new Date() },
      { studentId: student3.id, lessonId: lesson1_3.id, watchedSeconds: 840, percent: 100, completedAt: new Date() },
    ],
  });

  // Attempt 1: Failed (13/20 = 65% FAIL at 70% threshold)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      studentId: student3.id,
      attemptNumber: 1,
      status: QuizAttemptStatus.SUBMITTED,
      score: 13,
      maxScore: 20,
      percentage: 65,
      passed: false,
      scorePercent: 65,
      totalPoints: 20,
      earnedPoints: 13,
      isPassed: false,
      submittedAt: new Date(Date.now() - 2 * 60 * 1000), // Submitted 2 mins ago
    },
  });

  // Module Progress for Student 3 (Module 1 in progress, Module 2 locked)
  await prisma.moduleProgress.createMany({
    data: [
      { studentId: student3.id, moduleId: module1.id, status: ModuleStatus.IN_PROGRESS },
      { studentId: student3.id, moduleId: module2.id, status: ModuleStatus.LOCKED },
    ],
  });

  // 14. Seed Student 4 Progress (Incomplete lessons, Quiz Locked)
  await prisma.enrollment.create({
    data: {
      studentId: student4.id,
      courseId: course1.id,
      batchId: recordedBatch1.id,
      mode: DeliveryMode.RECORDED,
      status: EnrollmentStatus.ACTIVE,
      paymentStatus: PaymentStatus.PAID,
      accessStatus: AccessStatus.ACTIVE,
      enrolledAt: new Date(),
    },
  });

  await prisma.lessonProgress.create({
    data: {
      studentId: student4.id,
      lessonId: lesson1_1.id,
      watchedSeconds: 240,
      percent: 40,
      completedAt: null,
    },
  });

  // 15. Seed Admissions / Registrations in Various Lifecycle States
  await prisma.registration.createMany({
    data: [
      {
        applicantName: 'Ananya Roy',
        email: 'student_pending@creativeit.academy',
        phone: '+91 98765 43216',
        whatsappNumber: '+91 98765 43216',
        courseId: course1.id,
        batchId: liveBatchAlpha.id,
        mode: DeliveryMode.LIVE,
        status: RegistrationStatus.PENDING_PAYMENT,
        amount: 9999.0,
        currency: 'INR',
        userId: studentPending.id,
      },
      {
        applicantName: 'Amitav Ghosh',
        email: 'amitav.ghosh@example.com',
        phone: '+91 98765 43217',
        whatsappNumber: '+91 98765 43217',
        courseId: course1.id,
        batchId: recordedBatch1.id,
        mode: DeliveryMode.RECORDED,
        status: RegistrationStatus.DRAFT,
        amount: 4999.0,
        currency: 'INR',
      },
      {
        applicantName: 'Jane Smith',
        email: 'student2@creativeit.academy',
        phone: '+91 98765 43213',
        whatsappNumber: '+91 98765 43213',
        courseId: course1.id,
        batchId: liveBatchAlpha.id,
        mode: DeliveryMode.LIVE,
        status: RegistrationStatus.ACCOUNT_CREATED,
        amount: 9999.0,
        currency: 'INR',
        paymentId: payment2.id,
        userId: student2.id,
      },
    ],
  });

  // 16. Seed Inquiries (L1 Marketing Leads)
  await prisma.inquiry.createMany({
    data: [
      {
        name: 'Priya Patel',
        phone: '+91 98765 43299',
        email: 'priya.patel@example.com',
        courseId: course1.id,
        message: 'Interested in the April 2026 Live Evening Cohort. Are class recordings provided for revision after live sessions?',
        source: 'LANDING_HERO',
        status: InquiryStatus.NEW,
      },
      {
        name: 'Rohan Verma',
        phone: '+91 98765 43298',
        email: 'rohan.verma@example.com',
        courseId: course2.id,
        message: 'Can I pay via corporate invoice / UPI for the Python AI track? Does it include hands-on LLM projects?',
        source: 'COURSE_DETAILS',
        status: InquiryStatus.CONTACTED,
        assignedToId: instructor.id,
        notes: 'Called candidate, explained curriculum and sent UPI payment link.',
      },
      {
        name: 'Sneha Mukherjee',
        phone: '+91 98765 43297',
        email: 'sneha.m@example.com',
        courseId: course1.id,
        message: 'Applying for admission. Want to confirm if weekend batch timing conflicts with IST work hours.',
        source: 'CONTACT_PAGE',
        status: InquiryStatus.CONVERTED,
        assignedToId: admin.id,
        notes: 'Converted to Weekend Live Cohort registration.',
      },
    ],
  });

  // 17. Seed Notification Templates & Dispatched Logs (R3)
  await prisma.notificationTemplate.createMany({
    data: [
      {
        key: 'REGISTRATION_CONFIRMATION',
        channel: NotificationChannel.EMAIL,
        subject: 'Welcome to Online Creative & IT Academy - Admission Confirmed',
        body: 'Dear {{name}}, your enrollment in {{courseTitle}} ({{mode}} track) is confirmed. Your Student ID: {{studentId}}. Dashboard: {{dashboardUrl}}',
      },
      {
        key: 'REGISTRATION_CONFIRMATION',
        channel: NotificationChannel.WHATSAPP,
        body: 'Hello {{name}}! Welcome to Online Creative & IT Academy. Your admission in {{courseTitle}} is confirmed. Access your learning portal: {{dashboardUrl}}',
      },
      {
        key: 'LIVE_CLASS_REMINDER',
        channel: NotificationChannel.WHATSAPP,
        body: 'Reminder: Your live class {{sessionTitle}} starts at {{startsAt}}. Join link: {{joinUrl}}',
      },
      {
        key: 'PAYMENT_RECEIPT',
        channel: NotificationChannel.SMS,
        body: 'Online Creative & IT Academy: Payment of INR {{amount}} received for {{courseTitle}}. Ref: {{paymentRef}}',
      },
      {
        key: 'ASSIGNMENT_APPROVED',
        channel: NotificationChannel.EMAIL,
        subject: 'Practical Assignment Approved - {{moduleTitle}}',
        body: 'Congratulations {{name}}! Your practical assignment for {{moduleTitle}} has been approved with grade {{grade}}/100. Feedback: {{feedback}}',
      },
    ],
  });

  // Seed Notification Dispatch Audit Logs
  await prisma.notificationLog.createMany({
    data: [
      {
        channel: NotificationChannel.WHATSAPP,
        to: '+91 98765 43213',
        templateKey: 'REGISTRATION_CONFIRMATION',
        status: NotificationStatus.SENT,
        provider: 'WHATSAPP_BUSINESS_API',
        userId: student2.id,
      },
      {
        channel: NotificationChannel.EMAIL,
        to: 'student2@creativeit.academy',
        templateKey: 'REGISTRATION_CONFIRMATION',
        status: NotificationStatus.SENT,
        provider: 'SENDGRID',
        userId: student2.id,
      },
      {
        channel: NotificationChannel.SMS,
        to: '+91 98765 43212',
        templateKey: 'PAYMENT_RECEIPT',
        status: NotificationStatus.SENT,
        provider: 'FAST2SMS',
        userId: student1.id,
      },
      {
        channel: NotificationChannel.EMAIL,
        to: 'student1@creativeit.academy',
        templateKey: 'ASSIGNMENT_APPROVED',
        status: NotificationStatus.SENT,
        provider: 'SENDGRID',
        userId: student1.id,
      },
    ],
  });

  console.log('✅ Seeded Enrollments, Registrations, Inquiries, Notification Templates & Logs');
  // 14. Demo catalogue: more courses, instructors, rendered lesson videos and learners
  await seedDemoCatalog(prisma, { defaultInstructorId: instructor.id, adminId: admin.id });

  console.log('🎉 Comprehensive database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
