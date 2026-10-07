# Online Creative & IT Academy — Enterprise LMS Monorepo

A production-quality Learning Management System (LMS) web application featuring a **three-layer architecture**, **dual delivery modes (RECORDED self-paced & LIVE scheduled batches)**, **server-enforced progression state machine**, video watch tracking ($\ge 90\%$), automated MCQ assessments, instructor-reviewed practical assignments with per-module toggles, timed mock exams, capstone projects, final certification assessments, and **cryptographically verifiable PDF certificates with anti-tamper QR verification**.

---

## 🏛️ Architecture & Three-Layer Structure

Built as an **npm workspaces monorepo** (`apps/web`, `apps/api`, `packages/shared`):

```text
LMS/
├── apps/
│   ├── api/                          # Express + TypeScript + Prisma ORM + PostgreSQL API
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # 35+ relational domain models, delivery modes, batches & indexes
│   │   │   └── seed.ts               # Database seed script (Recorded + Live batches, 20-MCQ quiz, enrollments)
│   │   ├── src/
│   │   │   ├── config/env.ts         # Environment loader & configuration
│   │   │   ├── lib/                  # Prisma singleton, Pino logger, standard errors, utils
│   │   │   ├── middleware/           # JWT auth, RBAC, Zod validation, rate limiting, error handling
│   │   │   ├── services/
│   │   │   │   ├── progression.service.ts   # Core pure state machine & server-side guards
│   │   │   │   ├── admin-student.service.ts # R7 student filtering by batch, section, schedule & level
│   │   │   │   ├── certificate.service.ts   # PDF generator (pdf-lib) & QR code engine
│   │   │   │   ├── payment/                 # Pluggable PaymentProvider (Mock + Razorpay stub)
│   │   │   │   ├── storage/                 # Pluggable StorageDriver (Local Disk + S3 stub)
│   │   │   │   ├── course.service.ts
│   │   │   │   ├── quiz.service.ts
│   │   │   │   ├── assignment.service.ts
│   │   │   │   ├── review.service.ts        # Instructor evaluation queue
│   │   │   │   ├── mock-test.service.ts
│   │   │   │   ├── final-project.service.ts
│   │   │   │   ├── final-assessment.service.ts
│   │   │   │   ├── report.service.ts
│   │   │   │   └── user.service.ts
│   │   │   ├── controllers/                 # REST controllers with error delegation
│   │   │   ├── routes/
│   │   │   │   ├── public.routes.ts         # Layer 1: Marketing, catalog, auth, inquiries & verification
│   │   │   │   ├── student.routes.ts        # Layer 2: Student portal, progress tracking, runner & submissions
│   │   │   │   ├── admin.routes.ts          # Layer 3: Staff admin portal, batch management, reviews, students
│   │   │   │   └── index.ts                 # Health endpoint (GET /api/v1/health) & route assembly
│   │   │   └── docs/swagger.ts              # OpenAPI Swagger specs (/api/docs)
│   │   └── tests/
│   │       ├── progression.service.test.ts  # Pure state machine unit tests (14/20 pass, 13/20 fail, toggles)
│   │       ├── certificate.service.test.ts  # PDF generation & QR embedding unit tests
│   │       └── progression.integration.test.ts # End-to-end learning flow integration tests
│   └── web/                          # Next.js 15 (App Router) + Tailwind CSS + Lucide Icons
│       └── src/
│           ├── app/
│           │   ├── page.tsx                 # L1 Marketing Landing Page & Curriculum Showcase
│           │   ├── courses/                 # L1 Public Course Catalog & [slug] syllabus details
│           │   ├── checkout/[courseId]/     # L1 Admission checkout & payment simulation
│           │   ├── verify/[certificateId]/  # L1 Public anti-tamper certificate verification
│           │   ├── login/ & register/       # L1 Auth forms + 1-Click Fast Demo Launchers
│           │   ├── student/                 # L2 Student Portal (/dashboard, /courses, /learn, /certificates, /profile)
│           │   └── admin/                   # L3 Admin & Instructor Portal (/dashboard, /courses, /reviews, /students, /reports, /users)
│           ├── components/
│           │   ├── ui/                      # Button, Badge, Card, Progress, Input, Modal, StateIndicator
│           │   ├── video/video-player.tsx   # Custom HTML5 video player with watch % tracking
│           │   ├── quiz/quiz-runner.tsx     # MCQ runner with instant grading
│           │   ├── assignment/              # Practical assignment submitter & instructor feedback
│           │   ├── mock-test/               # Timed exam runner with countdown & breakdown
│           │   ├── certificate/             # Certificate card & verification preview
│           │   └── common/                  # Navbar, Footer, Sidebar
│           ├── lib/                         # API client with credentials, classnames utility
│           └── providers/                   # AuthProvider, ToastProvider, QueryProvider
├── packages/
│   └── shared/                       # Shared domain types, DeliveryMode/PaymentStatus enums & Zod schemas
├── docs/
│   └── REQUIREMENTS.md               # Requirements traceability matrix (R1-R8) & open decisions
├── docker-compose.yml                # PostgreSQL container
└── package.json                      # Monorepo workspace orchestration
```

---

## 🔒 The Core Learning Progression Flow

The platform enforces a deterministic, server-computed state machine. The client is **never trusted** to unlock lessons, quizzes, assignments, or certificates.

```mermaid
stateDiagram-v2
    [*] --> Locked
    Locked --> Available : Previous Module Completed (or Module 1)
    Available --> InProgress : Student Starts Video Lessons
    InProgress --> QuizUnlocked : All Module Lessons Watch Progress >= 90%
    QuizUnlocked --> AssignmentUnlocked : Module Quiz Passed (>= 70%)
    AssignmentUnlocked --> AwaitingReview : Practical Assignment Submitted (if requiresAssignment)
    AwaitingReview --> AssignmentUnlocked : Changes Requested (Resubmit)
    AwaitingReview --> Completed : Instructor Approves Submission
    Completed --> NextModule : Unlocks Module N+1

    state PostCurriculum {
        [*] --> MockTest : All Modules Completed
        MockTest --> FinalProject : Mock Test Passed (>= 75%)
        FinalProject --> FinalAssessment : Capstone Project Approved
        FinalAssessment --> CertificateIssued : Final Assessment Passed (>= 80%)
    }
```

### Pure Function Progression Rules:
- **`calculateQuizResult(correct, total, passPercentage)`**: Calculates percentage and pass status. E.g. $14 / 20 = 70.0\%$ ($\ge 70\%$ PASS); $13 / 20 = 65.0\%$ ($< 70\%$ FAIL). Handles 0 questions and partial scoring modes.
- **`canTakeQuiz`**: Unlocks quiz only when ALL video lessons in that module are completed ($\ge 90\%$).
- **`isModuleComplete`**: `lessonsDone && (quizPassed || !requiresQuiz) && (assignmentApproved || !requiresAssignment)`.
- **`canAccessNextModule`**: Unlocks next module when previous module is complete and enrollment is active + paid.
- **`isLessonTimeGated`**: RECORDED is always self-paced; LIVE delivery can be time-gated by scheduled session start date.

---

## ⚡ Quick Start & Run Instructions

### 1. Prerequisites
- **Node.js**: `v20+` or `v22+`
- **npm**: `v10+`
- **PostgreSQL**: Local instance or Docker Compose (port 5432)

### 2. Install Monorepo Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Default development environments are pre-configured:
- `apps/api/.env`:
  ```bash
  DATABASE_URL="postgresql://postgres:password@localhost:5432/academy_lms?schema=public"
  JWT_ACCESS_SECRET="super-secret-jwt-access-key-minimum-32-chars"
  JWT_REFRESH_SECRET="super-secret-jwt-refresh-key-minimum-32-chars"
  PORT=5000

  # Redis & Queue (optional, in-memory queue used if omitted)
  REDIS_URL="redis://localhost:6379"

  # Notification Channels & Fallback
  NOTIFY_CHANNELS_REGISTRATION="email,whatsapp,sms"
  NOTIFY_FALLBACK=true
  CREDENTIAL_DELIVERY="setup_link" # "setup_link" (72h token) or "password" (temporary password)

  # Email Delivery (SMTP / Nodemailer)
  SMTP_HOST="localhost"
  SMTP_PORT=1025
  SMTP_SECURE=false
  SMTP_USER=""
  SMTP_PASS=""
  SMTP_FROM="Creative & IT Academy <admissions@creativeit.academy>"

  # WhatsApp Delivery (LOG | META | TWILIO | GUPSHUP)
  WHATSAPP_PROVIDER="LOG"
  META_WA_PHONE_NUMBER_ID=""
  META_WA_ACCESS_TOKEN=""
  META_WA_BUSINESS_ACCOUNT_ID=""

  # SMS Delivery (LOG | MSG91 | TWILIO)
  SMS_PROVIDER="LOG"
  MSG91_AUTH_KEY=""
  MSG91_SENDER_ID="OCACAD"

  # Layer 2 Storage & Security Configuration
  STORAGE_DRIVER="LOCAL" # LOCAL | S3 | CLOUDINARY
  STORAGE_SECRET="academy-lms-secure-storage-secret-key"
  SIGNED_URL_TTL="3600" # URL expiry in seconds (default 1 hour)
  LIVE_JOIN_WINDOW_MINUTES="15" # Minutes before class start when join button activates
  ```
- `apps/web/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`)

### 4. Database & Infrastructure Setup
```bash
# Start PostgreSQL & Redis services via Docker
docker compose up -d

# Push schema to database
npm run db:push

# Seed default admin, instructor, students, recorded + live batches, notification templates, and 20-MCQ quiz
npm run db:seed
```

### 5. Run Automated Tests & Heartbeat Simulation Script
```bash
# Run Layer 2 unit tests (heartbeat anti-cheat, access control matrix, live join window)
npx vitest run tests/heartbeat-anti-cheat.test.ts tests/student-player.test.ts tests/progression.service.test.ts

# Run the automated tamper-proof heartbeat watch simulation script
npx tsx scripts/simulate-watch.ts
```

### 6. Start the Development Servers
```bash
# Run backend API (port 5000)
npm run dev:api

# In a separate terminal, run frontend web app (port 3000)
npm run dev:web
```

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Docs**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🔑 Pre-Seeded Demo Credentials

Use the **⚡ 1-Click Demo Login** button on the navbar/login page, or log in manually with the credentials below:

| Role | Email | Password | Pre-configured State |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@creativeit.academy` | `Admin@123` | Full access to users, batches, content management & certificates |
| **Instructor** | `instructor@creativeit.academy` | `Instructor@123` | Access to assigned batches, review queue & student progression |
| **Student 1** | `student1@creativeit.academy` | `Student@123` | Active paid enrollment (Recorded Track), Module 1 completed, Module 2 in progress |
| **Student 2** | `student2@creativeit.academy` | `Student@123` | Active paid enrollment (Live Evening Cohort Alpha), Certified Graduate |
| **Student 3** | `student3@creativeit.academy` | `Student@123` | Live student with passed retake quiz & pending assignment review |
| **Student 4** | `student4@creativeit.academy` | `Student@123` | Active student with 40% watch progress (Quiz is locked until 90% threshold) |
| **Student Pending** | `student_pending@creativeit.academy` | `Student@123` | Applicant with pending payment (`PAYMENT_PENDING` 403 guard) |
| **Design Instructor** | `priya.design@creativeit.academy` | `Instructor@123` | Teaches the UI/UX and Graphic Design courses |
| **Demo learners (16)** | `<first>.<last>@demo.creativeit.academy` (e.g. `aarav.patel@demo.creativeit.academy`) | `Student@123` | Enrolled across the catalogue at different stages, some certified |

The seed also builds **7 published courses** (Full-Stack & AI, Python Data Science, UI/UX, Digital Marketing,
Cloud DevOps, React Native, Cybersecurity, Graphic Design) with lessons, quizzes, assignments, mock tests,
capstones, final exams, reviews and certificates.

### Demo lesson videos

Lesson videos, poster frames and course covers are rendered from `apps/api/prisma/demo-content/catalog.json`
and shipped as static files in `apps/web/public/media`, so they always load and their durations match the
database exactly (needed for the 90% watch threshold). To change lesson content and re-render:

```bash
pip install pillow numpy          # plus ffmpeg with libx264 on PATH
python3 scripts/demo-media/render_media.py --only ui-ux-product-design   # or --force for everything
npm run db:seed
```

## 🚀 Deploying on Vercel (fast & reliable)

1. **Seed the production database once** from your machine:
   `DATABASE_URL=... DIRECT_URL=... npm run db:push && DATABASE_URL=... DIRECT_URL=... npm run db:seed`
2. **Use a pooled connection string** for `DATABASE_URL` on the `api` service (Neon "pooled", Supabase
   pooler on port 6543 with `?pgbouncer=true&connection_limit=5`) and the direct one for `DIRECT_URL`.
   Serverless functions open many short-lived connections; pooling avoids slow connection set-up.
3. **Put the functions in the same region as the database** (Vercel → Project → Settings → Functions →
   Region). A cross-region round trip adds 100–250 ms to *every* query and is the most common cause of a
   slow deployment.
4. Set `JWT_SECRET` (or `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`) on the `api` service.

The API is written to need few round trips: course progression loads in a single query, independent
lookups run in parallel, and the public catalogue is cached at the edge.

---

## 🧪 How to Test Layer 2 Student LMS Manually

1. **Tamper-Resistant Video Watch & Auto-Completion**:
   - Log in as `student4@creativeit.academy` (`Student@123`).
   - Open `/student/courses` → open the course.
   - Observe Lesson 1.1 is in progress (40%).
   - Play the video. Notice the floating anti-piracy watermark displaying Student ID.
   - Skip forward to 500s: notice the server **does NOT grant 500 seconds of watch credit**; only contiguous played intervals are merged.
   - Run `npx tsx scripts/simulate-watch.ts` to see simulated honest watching reach 90% and auto-unlock the module quiz.

2. **Sequential Lock & Module Gate**:
   - Try directly accessing Lesson 1.2 or Module 2 before completing Lesson 1.1.
   - Notice the friendly restricted screen with machine-readable reason code `PREVIOUS_LESSON_INCOMPLETE` or `MODULE_LOCKED`.

3. **Live Class Schedule & Attendance**:
   - Log in as `student2@creativeit.academy` or `student3@creativeit.academy`.
   - Open `/student/schedule` to view upcoming, live now, and past sessions.
   - Change timezones (IST, UTC, EST) and see live countdown updates.
   - Click **iCal** to download calendar invite (`.ics`).
   - Click **Join Live Class** within the 15-minute window to enter session and record attendance.

---

## 🎯 Layer 2 Assessment Engine & Layer 3 Question Bank (Prompt 5)

The assessment subsystem delivers secure MCQ assessments strictly after module lessons are completed:

### 1. Key Endpoints

#### Student Endpoints (`/api/v1/student/...`):
- `GET /student/modules/:moduleId/quiz` — Quiz overview, lock reason, attempt limits, cooldown remaining, and server state (`LOCKED` | `AVAILABLE` | `IN_PROGRESS` | `PASSED` | `ATTEMPTS_EXHAUSTED` | `COOLDOWN`).
- `POST /student/quizzes/:quizId/attempts` — Starts or resumes an attempt. Randomly draws `questionCount` questions from pool with shuffles; writes immutable `questionSnapshot`; sets `expiresAt`. Does NOT leak correct answers or explanations.
- `PUT /student/attempts/:attemptId/answers` — Realtime debounced autosave with idempotency and snapshot validation.
- `GET /student/attempts/:attemptId` — Resume ongoing attempt (server-computed `remainingSeconds`).
- `POST /student/attempts/:attemptId/submit` — Final grading strictly against `questionSnapshot`. Calculates pass/fail with `ProgressionService.calculateQuizResult` (e.g. 14/20 passes, 13/20 fails at 70%). Unlocks next module on pass in a single transaction.
- `GET /student/attempts/:attemptId/result` — Result summary and per-question review obeying `showAnswersAfterSubmit` (`NEVER`, `AFTER_PASS`, `AFTER_EACH_ATTEMPT`, `AFTER_MAX_ATTEMPTS`).
- `POST /student/attempts/:attemptId/events` — Anti-cheat telemetry logger (`TAB_HIDDEN`, `TAB_VISIBLE`, `COPY_ATTEMPT`, `FULLSCREEN_EXIT`).

#### Admin / Instructor Endpoints (`/api/v1/admin/...`):
- `GET /admin/quizzes/:quizId` & `PUT /admin/quizzes/:quizId` — Manage passing rules, scoring modes, review policies, timer, and retry cooldowns.
- `GET /admin/quizzes/:quizId/questions` — List question bank pool with difficulty, tags, and version history.
- `POST /admin/quizzes/:quizId/questions` & `PUT /admin/questions/:questionId` — Create or version questions with options and explanation.
- `POST /admin/quizzes/:quizId/questions/import-csv` — Bulk CSV import with dry-run validation report and atomic commit.
- `GET /admin/quizzes/:quizId/questions/export-csv` — Export question bank to CSV.
- `GET /admin/questions/template-csv` — Download standardized CSV template.
- `GET /admin/quizzes/:quizId/analytics` — Psychometric analytics: total attempts, pass rate %, average score, average duration, per-question correctness index, and most-missed questions.
- `GET /admin/quizzes/:quizId/attempts` — Filtered student attempt list.
- `POST /admin/quizzes/:quizId/overrides/reset-attempts` — Reset student attempts with `AuditLog` entry.
- `POST /admin/modules/:moduleId/overrides/manual-pass` — Administratively pass quiz (`completionSource=ADMIN`) with `AuditLog`.
- `POST /admin/attempts/:attemptId/invalidate` — Invalidate student attempt with `AuditLog`.

---

### 📄 CSV Question Bank Import Format

Questions can be imported in bulk using the following CSV columns:

```csv
question,type,option1,option2,option3,option4,option5,option6,correct,explanation,difficulty,tags
"Which HTTP verb is idempotent?","SINGLE_CHOICE","PUT","POST","PATCH","CONNECT","","","1","PUT is idempotent and replaces the resource.","EASY","http;rest"
"Select all valid SQL joins:","MULTIPLE_CHOICE","INNER JOIN","LEFT JOIN","RIGHT JOIN","FULL JOIN","CROSS JOIN","","1;2;3;4;5","All 5 are valid joins in PostgreSQL.","MEDIUM","sql;database"
```

- **type**: `SINGLE_CHOICE` or `MULTIPLE_CHOICE`.
- **correct**: 1-based option numbers (e.g. `1` for single choice, or `1;2;3` for multiple choice).
- **difficulty**: `EASY`, `MEDIUM`, or `HARD`.
- **tags**: Semicolon-separated tags (e.g. `http;rest;api`).

---

## 🧪 How to Test the Assessment Engine Manually

1. **Attempt Locked When Lessons Incomplete**:
   - Log in as `student4@creativeit.academy` (`Student@123`).
   - Go to `/student/courses` → Select Course 1 → Module 1 Assessment.
   - Observe state is **LOCKED** with clear reason (`LESSONS_INCOMPLETE`) and a shortcut to incomplete lessons.

2. **Failed Attempt Keeps Module Locked (13/20 Fail)**:
   - Log in as `student3@creativeit.academy` (`Student@123`).
   - Go to Course 1 → Module 1 Assessment.
   - View past attempt: Scored 13/20 (65%), which is **FAILED** against the 70% threshold.
   - Module 2 remains **LOCKED**.

3. **Passing Attempt Unlocks Next Module (14/20 Pass)**:
   - Log in as `student2@creativeit.academy` (`Student@123`) or retake quiz as `student3`.
   - Take the assessment, answer at least 14 of 20 questions correctly, and submit.
   - Observe instant pass card ("14 / 20 (70%)") and **"Next module unlocked 🎉"** banner.
   - Navigate to Curriculum: Module 2 is now **UNLOCKED and AVAILABLE**.

4. **Admin Question Bank Management & CSV Import**:
   - Log in as `admin@creativeit.academy` (`Admin@123`).
   - Open `/admin/assessments`.
   - View live pass rates, average scores, and most-missed questions.
   - Click **Template CSV** to download the official template, or **Import CSV** with dry-run validation.
   - Test Admin Overrides: Reset student attempts or manually mark as passed with an audit justification.

---

## 📦 Requirements Traceability Matrix Summary

See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for full matrix and open decisions (D1–D8):

- **R1 (Three Layers)**: L1 Marketing (`/`, `/courses`, `/contact`, `/verify`), L2 Student (`/student/*`), L3 Admin (`/admin/*`).
- **R2 (Delivery Modes)**: `RECORDED` (self-paced) & `LIVE` (scheduled batches with `LiveSession` links, join window, and attendance).
- **R3 (Registration & Notifications)**: Idempotent admissions with user account creation and notification logs.
- **R4 (Enrolled Student View)**: Student sees enrolled courses, multi-provider video player with moving watermark, telemetry watch tracking ($\ge 90\%$), practice tasks, notes, bookmarks, and signed resource links.
- **R5 (Module Quizzes)**: MCQ quizzes strictly after video lessons with configurable `questionCount`, pass mark ($70\%$), zero-leakage question snapshots, and realtime autosave.
- **R6 (Module Progression)**: $\ge 70\%$ unlocks next module (14/20 pass, 13/20 fail).
- **R7 (L3 Student Filter & AMS)**: Filter students by section, class, batch, schedule, payment status, psychometric quiz analytics, and question bank CRUD.
- **R8 (Learning Flow & Toggles)**: Video → Quiz → Assignment → Review → Next Module → Final Stages with `requiresAssignment`, `requiresQuiz`, and `requirePracticeDone` toggles.


