import {
  PrismaClient,
  Role,
  UserStatus,
  DeliveryMode,
  BatchStatus,
  CourseStatus,
  CourseLevel,
  QuestionType,
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


  // Quiz 1 with 20 questions
  const quiz1 = await prisma.quiz.create({
    data: {
      moduleId: module1.id,
      title: 'Module 1 Comprehensive Assessment (20 MCQs)',
      description: 'Test your understanding across REST protocols, TypeScript validation, and PostgreSQL database schemas. (14/20 = 70% to pass)',
      questionCount: 20,
      passPercentage: 70.0,
      passingScorePercent: 70.0,
      maxAttempts: 5,
      shuffleQuestions: true,
      shuffleOptions: true,
      showAnswersAfterSubmit: true,
    },
  });

  const quiz1Questions = [
    { text: 'Which HTTP verb is guaranteed to be idempotent and replaces the entire resource?', correct: 'PUT', wrong: ['POST', 'PATCH', 'CONNECT'] },
    { text: 'What is the primary benefit of shared Zod schemas in a monorepo?', correct: 'Single source of truth for runtime validation and compile types', wrong: ['Shrinks CSS bundle', 'Encrypts TCP packets', 'Replaces SQL engine'] },
    { text: 'Which Prisma attribute enforces a 1:1 relationship between models?', correct: '@unique on the foreign key column', wrong: ['@id on both', '@index without unique', '@default(now())'] },
    { text: 'What HTTP status code represents an unauthenticated request?', correct: '401 Unauthorized', wrong: ['403 Forbidden', '404 Not Found', '400 Bad Request'] },
    { text: 'What HTTP status code represents an authenticated request lacking permission?', correct: '403 Forbidden', wrong: ['401 Unauthorized', '500 Server Error', '405 Method Not Allowed'] },
    { text: 'Which TypeScript utility type constructs a type with all properties of T set to optional?', correct: 'Partial<T>', wrong: ['Required<T>', 'Readonly<T>', 'Record<K, T>'] },
    { text: 'In PostgreSQL, which index type is best suited for exact matches and range scans?', correct: 'B-Tree', wrong: ['Hash', 'GIN', 'BRIN'] },
    { text: 'What is the primary purpose of an abstract storage driver in our backend?', correct: 'Allows seamless swapping between local disk, AWS S3, and Cloudinary', wrong: ['Increases RAM speed', 'Replaces PostgreSQL', 'Encrypts user passwords'] },
    { text: 'Which header prevents clickjacking attacks in web browsers?', correct: 'X-Frame-Options / Content-Security-Policy', wrong: ['X-Powered-By', 'Accept-Encoding', 'Set-Cookie'] },
    { text: 'How is state machine progression validated in our LMS?', correct: 'Strict server-side validation against database state on every request', wrong: ['Client localStorage', 'CSS display property', 'URL hash parameters'] },
    { text: 'What is the standard watch percentage threshold for video lesson completion?', correct: '90.0%', wrong: ['50.0%', '25.0%', '10.0%'] },
    { text: 'What HTTP status code is returned when a requested resource does not exist?', correct: '404 Not Found', wrong: ['400 Bad Request', '401 Unauthorized', '502 Bad Gateway'] },
    { text: 'In Node.js Express, which middleware parses incoming JSON request bodies?', correct: 'express.json()', wrong: ['express.urlencoded()', 'express.static()', 'express.router()'] },
    { text: 'What is the role of refresh tokens stored in httpOnly cookies?', correct: 'Enables silent access token renewal while preventing XSS theft', wrong: ['Speeds up DNS lookups', 'Compresses images', 'Controls CSS layout'] },
    { text: 'Which git command creates and switches to a new branch simultaneously?', correct: 'git checkout -b <name> / git switch -c <name>', wrong: ['git branch <name>', 'git merge <name>', 'git pull <name>'] },
    { text: 'What does ACID stand for in relational database management systems?', correct: 'Atomicity, Consistency, Isolation, Durability', wrong: ['Async, Cached, Indexed, Distributed', 'Action, Control, Input, Data', 'Api, Client, Interface, Database'] },
    { text: 'Which HTTP status code signifies that a resource was successfully created?', correct: '201 Created', wrong: ['200 OK', '204 No Content', '202 Accepted'] },
    { text: 'What is the purpose of rate limiting on authentication routes?', correct: 'Mitigates brute-force credential stuffing and DoS attacks', wrong: ['Reduces database storage', 'Improves CSS rendering', 'Enforces dark mode'] },
    { text: 'In TypeScript, what keyword defines an immutable variable binding?', correct: 'const', wrong: ['var', 'let', 'static'] },
    { text: 'How are verifiable diplomas authenticated on our public registry?', correct: 'Via unique serial number and dynamic QR code linked to server verification endpoint', wrong: ['Client screenshot', 'Watermark font', 'Unverified email'] },
  ];

  for (let i = 0; i < quiz1Questions.length; i++) {
    const qData = quiz1Questions[i];
    const createdQ = await prisma.question.create({
      data: {
        quizId: quiz1.id,
        text: `${i + 1}. ${qData.text}`,
        type: QuestionType.SINGLE_CHOICE,
        order: i + 1,
        points: 1,
        marks: 1,
      },
    });

    await prisma.option.createMany({
      data: [
        { questionId: createdQ.id, text: qData.correct, isCorrect: true },
        ...qData.wrong.map((w) => ({ questionId: createdQ.id, text: w, isCorrect: false })),
      ],
    });
  }

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

  // 8. Course 1: Module 2 (Demonstrating requiresAssignment: false per-module toggle!)
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
      passPercentage: 70,
      passingScorePercent: 70,
      maxAttempts: 3,
    },
  });

  const quiz2Questions = [
    { text: 'In Next.js App Router, what directive is required at the top of a file to use useState and useEffect?', correct: '"use client"', wrong: ['"use server"', '"use dynamic"', '"use react"'] },
    { text: 'What is the primary benefit of React Server Components (RSC)?', correct: 'Zero bundle size shipped to client for server dependencies', wrong: ['Eliminates HTML output', 'Forces all components to re-render every second', 'Disables TypeScript checking'] },
    { text: 'In TanStack Query, which option determines how long data remains fresh before refetching?', correct: 'staleTime', wrong: ['gcTime', 'cacheDuration', 'retryDelay'] },
    { text: 'Which Next.js file defines the root layout shell shared across sub-routes?', correct: 'layout.tsx', wrong: ['page.tsx', 'template.tsx', 'head.tsx'] },
    { text: 'Which Tailwind class enables flexbox layout with centered children?', correct: 'flex items-center justify-center', wrong: ['block center', 'grid-auto-flow', 'align-center'] },
    { text: 'What is the purpose of Next.js route groups like (marketing) or (student)?', correct: 'Organize routes into logical folders without affecting the URL pathname', wrong: ['Add HTTP basic auth', 'Disable SSR', 'Force TypeScript compilation'] },
    { text: 'How does Next.js 15 handle route caching by default for fetch requests?', correct: 'Uncached (no-store) by default unless explicitly configured', wrong: ['Permanently cached indefinitely', 'Saved to client localStorage', 'Sent to Redis only'] },
    { text: 'Which React hook memoizes an expensive computed calculation between renders?', correct: 'useMemo', wrong: ['useCallback', 'useEffect', 'useRef'] },
    { text: 'Which React hook memoizes a function callback reference across renders?', correct: 'useCallback', wrong: ['useMemo', 'useState', 'useLayoutEffect'] },
    { text: 'What HTML5 element provides semantic container for navigation links?', correct: '<nav>', wrong: ['<div>', '<aside>', '<section>'] },
  ];

  for (let i = 0; i < quiz2Questions.length; i++) {
    const qData = quiz2Questions[i];
    const createdQ = await prisma.question.create({
      data: {
        quizId: quiz2.id,
        text: `${i + 1}. ${qData.text}`,
        type: QuestionType.SINGLE_CHOICE,
        order: i + 1,
        points: 1,
        marks: 1,
      },
    });

    await prisma.option.createMany({
      data: [
        { questionId: createdQ.id, text: qData.correct, isCorrect: true },
        ...qData.wrong.map((w) => ({ questionId: createdQ.id, text: w, isCorrect: false })),
      ],
    });
  }

  // 9. Course 1: Module 3 (Progression Engines & PDF Verification)
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
      title: 'Module 3 Assessment Quiz',
      description: 'Test your understanding of progression security, PDF generation, and automated testing.',
      questionCount: 5,
      passPercentage: 70,
      passingScorePercent: 70,
      maxAttempts: 3,
    },
  });

  const quiz3Questions = [
    { text: 'Why MUST module progression be validated on the backend rather than client cookies?', correct: 'To prevent tampering, unauthorized access, and ensure strict course completion', wrong: ['Only to save CSS bandwidth', 'To avoid using TypeScript', 'Cookies cannot store strings'] },
    { text: 'What library is used in our backend for server-side vector PDF diploma creation?', correct: 'pdf-lib', wrong: ['puppeteer-only', 'html2canvas', 'jspdf-client'] },
    { text: 'How does anti-tamper QR verification work on our diplomas?', correct: 'Scans point to /verify/[id] where the server checks database authenticity and issue date', wrong: ['Static link to Google', 'Hardcoded text inside the PDF image', 'QR contains user password'] },
    { text: 'In Vitest, which assertion tests whether a calculated value strictly equals expected output?', correct: 'expect(value).toBe(expected)', wrong: ['assert.truthy()', 'check.equals()', 'verify()'] },
    { text: 'Which HTTP status represents a successfully processed asynchronous webhook?', correct: '200 OK / 202 Accepted', wrong: ['404 Not Found', '500 Server Error', '301 Moved'] },
  ];

  for (let i = 0; i < quiz3Questions.length; i++) {
    const qData = quiz3Questions[i];
    const createdQ = await prisma.question.create({
      data: {
        quizId: quiz3.id,
        text: `${i + 1}. ${qData.text}`,
        type: QuestionType.SINGLE_CHOICE,
        order: i + 1,
        points: 2,
        marks: 2,
      },
    });

    await prisma.option.createMany({
      data: [
        { questionId: createdQ.id, text: qData.correct, isCorrect: true },
        ...qData.wrong.map((w) => ({ questionId: createdQ.id, text: w, isCorrect: false })),
      ],
    });
  }

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

  // Student 2 passed all quizzes
  await prisma.quizAttempt.createMany({
    data: [
      { quizId: quiz1.id, studentId: student2.id, attemptNumber: 1, scorePercent: 100, totalPoints: 20, earnedPoints: 20, isPassed: true },
      { quizId: quiz2.id, studentId: student2.id, attemptNumber: 1, scorePercent: 100, totalPoints: 10, earnedPoints: 10, isPassed: true },
      { quizId: quiz3.id, studentId: student2.id, attemptNumber: 1, scorePercent: 100, totalPoints: 10, earnedPoints: 10, isPassed: true },
    ],
  });

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

  // Attempt 1: Failed (12/20 = 60%)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      studentId: student3.id,
      attemptNumber: 1,
      scorePercent: 60,
      totalPoints: 20,
      earnedPoints: 12,
      isPassed: false,
    },
  });

  // Attempt 2 (Retake): Passed (16/20 = 80%)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      studentId: student3.id,
      attemptNumber: 2,
      scorePercent: 80,
      totalPoints: 20,
      earnedPoints: 16,
      isPassed: true,
    },
  });

  // Submitted Assignment in PENDING state (waiting in instructor queue!)
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment1.id,
      studentId: student3.id,
      version: 1,
      status: SubmissionStatus.PENDING,
      textContent: 'Completed the monorepo REST API with Zod validation. Ready for review.',
      linkUrl: 'https://github.com/rahulsharma/monorepo-api',
    },
  });

  await prisma.moduleProgress.create({
    data: { studentId: student3.id, moduleId: module1.id, status: ModuleStatus.AWAITING_REVIEW },
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
