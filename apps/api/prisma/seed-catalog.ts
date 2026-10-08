/**
 * Demo catalogue seed: extra instructors, six more fully-built courses (plus content for the
 * Python course), rendered lesson videos, and a cohort of demo learners with realistic
 * enrolments, progress, reviews and certificates.
 *
 * Content lives in prisma/demo-content/catalog.json. Videos, posters and covers are rendered
 * by scripts/demo-media/render_media.py, which writes prisma/demo-content/media-manifest.json.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import {
  Role,
  CourseLevel,
  CourseStatus,
  LessonType,
  VideoProvider,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  QuizStatus,
  AnswerReviewPolicy,
  ScoringMode,
  PaymentProvider,
  PaymentStatus,
  DeliveryMode,
  SubmissionStatus,
  CertificateStatus,
  CompletionSource,
  QuizAttemptStatus,
} from '@academy/shared';

interface CatalogQuestion {
  q: string;
  a: string;
  wrong: string[];
}
interface CatalogLesson {
  title: string;
  summary: string;
}
interface CatalogModule {
  title: string;
  description: string;
  lessons: CatalogLesson[];
  quiz: CatalogQuestion[];
  assignment: { title: string; description: string } | null;
}
interface CatalogCourse {
  slug: string;
  existing?: boolean;
  title?: string;
  description?: string;
  category?: string;
  level?: keyof typeof CourseLevel;
  price?: number;
  livePrice?: number;
  instructor?: string;
  modules: CatalogModule[];
  mock: CatalogQuestion[];
  project: { title: string; description: string };
  final: CatalogQuestion[];
}
interface Manifest {
  lessons: Record<string, { videoUrl: string; posterUrl: string; durationSeconds: number }>;
  covers: Record<string, string>;
}

const CONTENT_DIR = path.join(__dirname, 'demo-content');

const LEARNERS = [
  ['Aarav Patel', 'Mumbai'],
  ['Sneha Iyer', 'Bengaluru'],
  ['Rohan Gupta', 'Delhi'],
  ['Meera Krishnan', 'Chennai'],
  ['Kabir Malhotra', 'Pune'],
  ['Isha Banerjee', 'Kolkata'],
  ['Arjun Reddy', 'Hyderabad'],
  ['Zara Sheikh', 'Lucknow'],
  ['Neel Desai', 'Ahmedabad'],
  ['Tanvi Joshi', 'Jaipur'],
  ['Vihaan Kapoor', 'Chandigarh'],
  ['Ananya Das', 'Guwahati'],
  ['Dev Mehra', 'Indore'],
  ['Riya Thomas', 'Kochi'],
  ['Kunal Bose', 'Bhopal'],
  ['Pooja Nair', 'Mysuru'],
];

const REVIEWS: Array<[number, string]> = [
  [5, 'Clear lessons and the mentor feedback on my assignment was genuinely useful.'],
  [5, 'Loved the project-based approach. I finally have portfolio pieces I am proud of.'],
  [4, 'Great structure. The quizzes made sure I actually understood each module.'],
  [5, 'Short videos that respect my time, and the certificate was verified by my employer.'],
  [4, 'Well-paced course with practical examples. Would like even more case studies.'],
  [5, 'The progression system kept me consistent. Best online course I have taken.'],
];

function load<T>(file: string): T | null {
  const p = path.join(CONTENT_DIR, file);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf-8')) as T) : null;
}

const FALLBACK_VIDEO = { videoUrl: '', posterUrl: '', durationSeconds: 60 };

/** Deterministic pseudo-random numbers so every seed run produces the same demo data. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function seedDemoCatalog(
  prisma: PrismaClient,
  ctx: { defaultInstructorId: string; adminId: string }
) {
  const catalog = load<{ instructors: any[]; courses: CatalogCourse[]; fullstackLessons: Record<string, unknown> }>(
    'catalog.json'
  );
  const manifest = load<Manifest>('media-manifest.json') || { lessons: {}, covers: {} };
  if (!catalog) {
    console.log('ℹ️  No demo catalogue found, skipping');
    return;
  }

  const media = (slug: string, title: string) => manifest.lessons[`${slug}::${title}`] || FALLBACK_VIDEO;

  // 1. Instructors
  const instructorPassword = await bcrypt.hash('Instructor@123', 10);
  const instructorIds: Record<string, string> = { instructor: ctx.defaultInstructorId };
  for (const ins of catalog.instructors) {
    const user = await prisma.user.create({
      data: { name: ins.name, email: ins.email, passwordHash: instructorPassword, role: Role.INSTRUCTOR },
    });
    instructorIds[ins.key] = user.id;
  }

  // 2. Flagship course: rendered videos for its video lessons + a cover image
  const flagship = await prisma.course.findUnique({
    where: { slug: 'fullstack-ai-engineering' },
    include: { modules: { include: { lessons: true } } },
  });
  if (flagship) {
    await prisma.course.update({
      where: { id: flagship.id },
      data: { thumbnail: manifest.covers['fullstack-ai-engineering'] || flagship.thumbnail },
    });
    for (const lesson of flagship.modules.flatMap((m) => m.lessons)) {
      const m = manifest.lessons[`fullstack-ai-engineering::${lesson.title}`];
      if (m && lesson.type === LessonType.VIDEO) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { videoProvider: VideoProvider.MP4, videoUrl: m.videoUrl, durationSeconds: m.durationSeconds },
        });
        // Rescale the personas' existing watch progress to the real video length (same percentage)
        const progresses = await prisma.lessonProgress.findMany({ where: { lessonId: lesson.id } });
        for (const lp of progresses) {
          const watched = Math.round((Math.min(100, lp.percent) / 100) * m.durationSeconds);
          await prisma.lessonProgress.update({
            where: { id: lp.id },
            data: {
              watchedSeconds: watched,
              lastPositionSeconds: watched,
              watchedSegments: watched > 0 ? [[0, watched]] : [],
            },
          });
        }
      }
    }
  }

  // Live classes: replace dead recording links and give every live batch a weekly schedule
  const recording = manifest.lessons[`fullstack-ai-engineering::${Object.keys(catalog.fullstackLessons)[0]}`]?.videoUrl;
  if (recording) {
    await prisma.liveSession.updateMany({
      where: { recordingUrl: { contains: 'gtv-videos-bucket' } },
      data: { recordingUrl: recording },
    });
  }
  const liveBatches = await prisma.batch.findMany({ where: { mode: DeliveryMode.LIVE } });
  const topics = Object.keys(catalog.fullstackLessons).map((t) => t.replace(/^\d+\.\d+\s+/, ''));
  for (const batch of liveBatches) {
    const sessions = [];
    // Two recorded past classes, then ten upcoming weekly classes (keeps the demo schedule populated)
    for (let w = -2; w < 10; w++) {
      if (w === 0) continue;
      const startsAt = new Date();
      startsAt.setUTCDate(startsAt.getUTCDate() + w * 7 + 1);
      startsAt.setUTCHours(13, 0, 0, 0); // 6:30 pm IST
      sessions.push({
        batchId: batch.id,
        title: `Live Class: ${topics[(w + 2) % topics.length]}`,
        startsAt,
        durationMinutes: 75,
        provider: 'MEET',
        joinUrl: 'https://meet.google.com/academy-live-class',
        recordingUrl: w < 0 ? recording || null : null,
        status: w < 0 ? 'COMPLETED' : 'SCHEDULED',
      });
    }
    await prisma.liveSession.createMany({ data: sessions as any });
  }

  // 3. Catalogue courses
  const courseIds: string[] = [];
  for (const [ci, c] of catalog.courses.entries()) {
    const settings = {
      passingQuizScorePercent: 70,
      maxQuizAttempts: 3,
      sequentialLessonsLock: true,
      lessonCompletionThresholdPercent: 90,
      mockTestPassingPercent: 75,
      finalAssessmentPassingPercent: 75,
      timeGatedByLiveSession: false,
    };

    let course = c.existing ? await prisma.course.findUnique({ where: { slug: c.slug } }) : null;
    if (course) {
      course = await prisma.course.update({
        where: { id: course.id },
        data: { thumbnail: manifest.covers[c.slug] || course.thumbnail, settings },
      });
    } else {
      course = await prisma.course.create({
        data: {
          title: c.title!,
          slug: c.slug,
          description: c.description!,
          thumbnail: manifest.covers[c.slug] || null,
          price: c.price!,
          recordedPrice: c.price!,
          livePrice: c.livePrice!,
          currency: 'INR',
          hasRecorded: true,
          hasLive: true,
          level: CourseLevel[c.level || 'BEGINNER'],
          category: c.category!,
          status: CourseStatus.PUBLISHED,
          instructorId: instructorIds[c.instructor || 'instructor'] || ctx.defaultInstructorId,
          settings,
          // Stagger creation so the catalogue has a natural "newest first" order
          createdAt: new Date(Date.now() - (catalog.courses.length - ci) * 86400000),
        },
      });
    }
    courseIds.push(course.id);

    for (const [mi, mod] of c.modules.entries()) {
      const module = await prisma.module.create({
        data: {
          courseId: course.id,
          title: mod.title,
          description: mod.description,
          order: mi + 1,
          requiresQuiz: true,
          requiresAssignment: !!mod.assignment,
        },
      });

      for (const [li, lesson] of mod.lessons.entries()) {
        const m = media(c.slug, lesson.title);
        await prisma.lesson.create({
          data: {
            moduleId: module.id,
            title: lesson.title,
            description: lesson.summary,
            type: LessonType.VIDEO,
            videoProvider: VideoProvider.MP4,
            videoUrl: m.videoUrl,
            durationSeconds: m.durationSeconds,
            order: li + 1,
            isPreview: mi === 0 && li === 0,
          },
        });
      }

      const quiz = await prisma.quiz.create({
        data: {
          moduleId: module.id,
          title: `${mod.title.replace(/^Module \d+:\s*/, '')} Quiz`,
          description: `Answer at least ${Math.ceil(mod.quiz.length * 0.7)} of ${mod.quiz.length} correctly to pass.`,
          questionCount: mod.quiz.length,
          passPercentage: 70,
          passingScorePercent: 70,
          maxAttempts: 3,
          timeLimitMinutes: 10,
          showAnswersAfterSubmit: AnswerReviewPolicy.AFTER_PASS,
          scoringMode: ScoringMode.ALL_OR_NOTHING,
          status: QuizStatus.PUBLISHED,
        },
      });
      for (const [qi, q] of mod.quiz.entries()) {
        await prisma.question.create({
          data: {
            quizId: quiz.id,
            text: q.q,
            type: QuestionType.SINGLE_CHOICE,
            order: qi + 1,
            points: 1,
            marks: 1,
            difficulty: QuestionDifficulty.MEDIUM,
            tags: [c.slug],
            status: QuestionStatus.ACTIVE,
            version: 1,
            options: {
              create: [{ text: q.a, isCorrect: true }, ...q.wrong.map((w) => ({ text: w, isCorrect: false }))],
            },
          },
        });
      }

      if (mod.assignment) {
        await prisma.assignment.create({
          data: { moduleId: module.id, title: mod.assignment.title, description: mod.assignment.description, maxScore: 100 },
        });
      }
    }

    const mock = await prisma.mockTest.create({
      data: {
        courseId: course.id,
        title: 'Practice Mock Exam',
        description: 'A timed practice exam covering every module. Score 75% or more to unlock the capstone.',
        durationMinutes: 15,
        passingScorePercent: 75,
        maxAttempts: 3,
      },
    });
    for (const [qi, q] of c.mock.entries()) {
      await prisma.mockTestQuestion.create({
        data: {
          mockTestId: mock.id,
          text: q.q,
          type: QuestionType.SINGLE_CHOICE,
          order: qi + 1,
          points: 1,
          options: { create: [{ text: q.a, isCorrect: true }, ...q.wrong.map((w) => ({ text: w, isCorrect: false }))] },
        },
      });
    }

    await prisma.finalProject.create({
      data: { courseId: course.id, title: c.project.title, description: c.project.description },
    });

    const final = await prisma.finalAssessment.create({
      data: {
        courseId: course.id,
        title: 'Final Certification Exam',
        description: 'The final exam for your certificate. Score 75% or more to graduate.',
        durationMinutes: 20,
        passingScorePercent: 75,
        maxAttempts: 3,
      },
    });
    for (const [qi, q] of c.final.entries()) {
      await prisma.finalAssessmentQuestion.create({
        data: {
          finalAssessmentId: final.id,
          text: q.q,
          type: QuestionType.SINGLE_CHOICE,
          order: qi + 1,
          points: 1,
          options: { create: [{ text: q.a, isCorrect: true }, ...q.wrong.map((w) => ({ text: w, isCorrect: false }))] },
        },
      });
    }
  }

  // 4. Demo learners with enrolments, progress, reviews and certificates
  const studentPassword = await bcrypt.hash('Student@123', 10);
  const allCourses = await prisma.course.findMany({
    where: { status: CourseStatus.PUBLISHED },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } }, quiz: true, assignment: true },
      },
      mockTest: true,
      finalProject: true,
      finalAssessment: true,
    },
  });
  const rand = rng(42);
  const year = new Date().getFullYear();
  let certCounter = 100;

  for (const [i, [name, city]] of LEARNERS.entries()) {
    const [first, last] = name.toLowerCase().split(' ');
    const studentCode = `OCA-${year}-${String(101 + i).padStart(6, '0')}`;
    const user = await prisma.user.create({
      data: {
        studentId: studentCode,
        name,
        email: `${first}.${last}@demo.creativeit.academy`,
        passwordHash: studentPassword,
        role: Role.STUDENT,
        createdAt: new Date(Date.now() - (60 - i * 3) * 86400000),
        studentProfile: { create: { city, education: i % 3 === 0 ? 'B.Tech' : i % 3 === 1 ? 'B.Des' : 'BBA' } },
      },
    });

    // Each learner takes 1-3 courses
    const picks = [...allCourses].sort(() => rand() - 0.5).slice(0, 1 + Math.floor(rand() * 3));
    for (const course of picks) {
      const enrolledAt = new Date(Date.now() - Math.floor(5 + rand() * 50) * 86400000);
      const payment = await prisma.payment.create({
        data: {
          studentId: user.id,
          courseId: course.id,
          provider: PaymentProvider.RAZORPAY,
          amount: course.price,
          currency: course.currency,
          status: PaymentStatus.COMPLETED,
          providerRef: `pay_demo_${i}_${course.slug.slice(0, 8)}`,
          createdAt: enrolledAt,
        },
      });

      // Progress stage: 0 = just started, 1 = halfway, 2 = all modules done, 3 = graduated
      const stage = Math.floor(rand() * 4);
      const lessons = course.modules.flatMap((m) => m.lessons);
      const doneLessons =
        stage === 0 ? Math.min(1, lessons.length) : stage === 1 ? Math.ceil(lessons.length / 2) : lessons.length;

      await prisma.enrollment.create({
        data: {
          studentId: user.id,
          courseId: course.id,
          mode: DeliveryMode.RECORDED,
          paymentId: payment.id,
          enrolledAt,
          completedAt: stage === 3 ? new Date(enrolledAt.getTime() + 21 * 86400000) : null,
        },
      });

      for (const [li, lesson] of lessons.entries()) {
        if (li >= doneLessons) break;
        await prisma.lessonProgress.create({
          data: {
            studentId: user.id,
            lessonId: lesson.id,
            watchedSeconds: lesson.durationSeconds,
            lastPositionSeconds: lesson.durationSeconds,
            watchedSegments: [[0, lesson.durationSeconds]],
            percent: 100,
            completionSource: CompletionSource.AUTO,
            completedAt: new Date(enrolledAt.getTime() + (li + 1) * 86400000),
          },
        });
      }

      // Quizzes and assignments for every module whose lessons are all watched
      let watched = 0;
      for (const mod of course.modules) {
        watched += mod.lessons.length;
        if (watched > doneLessons) break;
        if (mod.quiz) {
          const pct = 75 + Math.floor(rand() * 26);
          await prisma.quizAttempt.create({
            data: {
              quizId: mod.quiz.id,
              studentId: user.id,
              attemptNumber: 1,
              status: QuizAttemptStatus.SUBMITTED,
              score: Math.round((pct / 100) * 4),
              maxScore: 4,
              percentage: pct,
              passed: true,
              scorePercent: pct,
              totalPoints: 4,
              earnedPoints: Math.round((pct / 100) * 4),
              isPassed: true,
              submittedAt: new Date(enrolledAt.getTime() + 7 * 86400000),
            },
          });
        }
        if (mod.assignment) {
          await prisma.assignmentSubmission.create({
            data: {
              assignmentId: mod.assignment.id,
              studentId: user.id,
              version: 1,
              textContent: 'Submission for review: see the linked project.',
              linkUrl: 'https://github.com/academy-demo/student-project',
              files: [],
              // Halfway learners are waiting for their instructor's review (fills the review queue)
              ...(stage === 1
                ? { status: SubmissionStatus.PENDING }
                : {
                    status: SubmissionStatus.APPROVED,
                    grade: 80 + Math.floor(rand() * 20),
                    feedback: 'Well done: clear structure and good attention to detail.',
                    reviewedById: course.instructorId,
                    reviewedAt: new Date(enrolledAt.getTime() + 10 * 86400000),
                  }),
            },
          });
        }
      }

      if (stage === 3) {
        if (course.mockTest) {
          await prisma.mockTestAttempt.create({
            data: { mockTestId: course.mockTest.id, studentId: user.id, attemptNumber: 1, scorePercent: 85, isPassed: true, timeSpentSeconds: 640 },
          });
        }
        if (course.finalProject) {
          await prisma.projectSubmission.create({
            data: {
              finalProjectId: course.finalProject.id,
              studentId: user.id,
              description: 'Capstone submission with source code and a short walkthrough.',
              linkUrl: 'https://github.com/academy-demo/capstone',
              files: [],
              status: SubmissionStatus.APPROVED,
              grade: 90,
              feedback: 'Excellent capstone, ready for your portfolio.',
              reviewedById: course.instructorId,
              reviewedAt: new Date(enrolledAt.getTime() + 18 * 86400000),
            },
          });
        }
        if (course.finalAssessment) {
          await prisma.examAttempt.create({
            data: { finalAssessmentId: course.finalAssessment.id, studentId: user.id, attemptNumber: 1, scorePercent: 90, isPassed: true, timeSpentSeconds: 900 },
          });
        }
        const certificateId = `CERT-${year}-${String(++certCounter).padStart(4, '0')}`;
        await prisma.certificate.create({
          data: {
            certificateId,
            studentId: user.id,
            courseId: course.id,
            status: CertificateStatus.VALID,
            issuedAt: new Date(enrolledAt.getTime() + 21 * 86400000),
            pdfUrl: `/uploads/certificates/${certificateId}.pdf`,
            metadata: { recipientName: name, courseTitle: course.title, gradeEarned: 'Merit (90%)', issuer: 'Online Creative & IT Academy Academic Council' },
          },
        });
      }

      if (stage >= 1) {
        const [rating, comment] = REVIEWS[(i + course.title.length) % REVIEWS.length];
        await prisma.feedback.create({ data: { studentId: user.id, courseId: course.id, rating, comment } });
      }
    }
  }

  // Keep generated student IDs clear of the demo learners' IDs
  await prisma.sequenceCounter.upsert({
    where: { name: `student_id_${year}` },
    create: { name: `student_id_${year}`, value: 100 + LEARNERS.length },
    update: { value: 100 + LEARNERS.length },
  });

  console.log(`✅ Seeded demo catalogue: ${catalog.courses.length} courses, ${catalog.instructors.length} instructors, ${LEARNERS.length} learners`);
  return { courseIds, adminId: ctx.adminId };
}
