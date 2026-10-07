'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/common/navbar';
import { Footer } from '../components/common/footer';
import { Button } from '../components/ui/button';
import { Reveal } from '../components/motion/reveal';
import { CourseCard, CourseCardData, CourseCardSkeleton } from '../components/course/course-card';
import { apiClient } from '../lib/api';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Lock,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  Zap,
} from 'lucide-react';

const SKILLS = [
  'Python', 'Machine Learning', 'Figma', 'UX Research', 'React Native', 'Docker', 'Kubernetes', 'SEO',
  'Growth Analytics', 'Cybersecurity', 'Brand Identity', 'TypeScript', 'Next.js', 'PostgreSQL', 'CI/CD',
];

const STEPS = [
  { icon: PlayCircle, title: 'Watch & learn', text: 'Short, focused video lessons. Watch time is tracked securely, so progress is real.' },
  { icon: ClipboardCheck, title: 'Practise & test', text: 'Module quizzes and hands-on practice tasks unlock as you complete each lesson.' },
  { icon: Users, title: 'Get reviewed', text: 'Submit assignments and a capstone project; mentors review and give feedback.' },
  { icon: Award, title: 'Get certified', text: 'Pass the final exam to earn a certificate anyone can verify with a QR code.' },
];

const FEATURES = [
  { icon: Lock, title: 'Server-enforced progression', text: 'Modules, quizzes and exams unlock in order. Rules live on the server, so nothing can be skipped.' },
  { icon: Video, title: 'Tamper-proof video tracking', text: 'Only genuinely watched segments count, with watermarking and playback-speed limits.' },
  { icon: ClipboardCheck, title: 'Question banks & quizzes', text: 'Randomised questions, attempt limits, cooldowns, CSV import and detailed analytics.' },
  { icon: Users, title: 'Live classes & batches', text: 'Schedule live sessions, track attendance and mix live cohorts with self-paced learning.' },
  { icon: BarChart3, title: 'Admin analytics', text: 'Revenue, enrolments, completion rates and review queues in one dashboard.' },
  { icon: QrCode, title: 'Verifiable certificates', text: 'PDF certificates with QR codes and a public verification page for employers.' },
];

export default function HomePage() {
  const [courses, setCourses] = useState<CourseCardData[] | null>(null);

  useEffect(() => {
    apiClient<{ items: CourseCardData[] }>('/courses?limit=12')
      .then((res) => setCourses(res.items || []))
      .catch(() => setCourses([]));
  }, []);

  const featured = (courses || []).slice(0, 6);
  const totalLessons = (courses || []).reduce((n, c) => n + (c.lessonsCount || 0), 0);
  const heroCourse = (courses || []).find((c) => c.slug === 'ui-ux-product-design') || (courses || [])[0];

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden hero-mesh text-white">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full glass-dark px-3.5 py-1.5 text-xs sm:text-sm font-medium text-night-200">
              <Sparkles className="w-4 h-4 text-amber-500" />
              New programs in Design, Marketing &amp; Cloud
            </span>
            <h1 className="mt-6 text-[2.5rem] leading-[1.08] sm:text-6xl lg:text-[4.2rem] font-extrabold tracking-tight text-white">
              Build job-ready skills.
              <br />
              <span className="text-gradient">Prove them</span> with a certificate.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-night-300 max-w-xl leading-relaxed">
              Structured courses in technology, design and marketing, with video lessons, quizzes,
              mentor-reviewed projects and certificates employers can verify instantly.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link href="/courses">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Explore courses <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur"
                >
                  <Zap className="w-4 h-4 text-amber-500" /> Try a live demo
                </Button>
              </Link>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: courses ? String(courses.length) : '—', v: 'Programs' },
                { k: courses ? String(totalLessons) : '—', v: 'Video lessons' },
                { k: '100%', v: 'Verifiable' },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="text-2xl sm:text-3xl font-extrabold text-white">{s.k}</dt>
                  <dd className="text-xs sm:text-sm text-night-400 mt-1">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Product preview */}
          <div className="relative hidden md:block animate-fade-up" style={{ animationDelay: '150ms' }}>
            <div className="absolute -inset-6 bg-brand-gradient opacity-25 blur-3xl rounded-full" aria-hidden />
            <div className="relative rounded-3xl glass-dark p-3 shadow-2xl">
              <div className="rounded-2xl overflow-hidden bg-night-900">
                <div className="relative aspect-video">
                  {heroCourse?.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroCourse.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-gradient" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                      <PlayCircle className="w-8 h-8 text-indigo-400" />
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-white truncate">{heroCourse?.title || 'Your next course'}</p>
                  <div className="h-2 rounded-full bg-night-800 overflow-hidden">
                    <div className="h-full w-2/3 bg-brand-gradient rounded-full" />
                  </div>
                  <div className="flex justify-between text-xs text-night-400">
                    <span>4 of 6 lessons</span>
                    <span>67% complete</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -left-8 top-10 rounded-2xl bg-white text-ink shadow-lift p-3.5 flex items-center gap-3 animate-float">
              <span className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </span>
              <span>
                <span className="block text-sm font-bold">Quiz passed</span>
                <span className="block text-xs text-slate-500">Score 92%</span>
              </span>
            </div>
            <div
              className="absolute -right-6 -bottom-6 rounded-2xl bg-white text-ink shadow-lift p-3.5 flex items-center gap-3 animate-float"
              style={{ animationDelay: '1.5s' }}
            >
              <span className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-500" />
              </span>
              <span>
                <span className="block text-sm font-bold">Certificate issued</span>
                <span className="block text-xs text-slate-500">Verified by QR</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Skills marquee */}
      <div className="border-b border-[#e2e8f0] bg-white overflow-hidden">
        <div className="flex w-max animate-marquee py-4">
          {[...SKILLS, ...SKILLS].map((s, i) => (
            <span key={i} className="mx-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Courses */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-sm font-semibold text-indigo-400">Popular programs</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink">Learn what employers hire for</h2>
              <p className="mt-3 text-slate-400 max-w-xl">
                Every program combines video lessons, quizzes, assignments and a capstone project.
              </p>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300">
              View all courses <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses === null
              ? Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)
              : featured.map((c, i) => (
                  <Reveal key={c.id} delay={(i % 3) * 90} className="h-full">
                    <CourseCard course={c} />
                  </Reveal>
                ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-24 bg-white border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-indigo-400">How it works</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink">A clear path from first lesson to certificate</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 100} className="relative rounded-2xl border border-[#e2e8f0] bg-cream p-6">
                <span className="absolute top-5 right-5 text-5xl font-extrabold text-indigo-900 select-none">0{i + 1}</span>
                <span className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center shadow-soft">
                  <Icon className="w-6 h-6 text-white" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
          <Reveal className="lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-indigo-400">Built for academies</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink">
              Everything you need to run online programs
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Students get a focused learning experience. Admins and instructors get the tools to run
              courses, review work and grow enrolments.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button variant="primary" size="lg">
                  Open the demo <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 2) * 100} className="rounded-2xl bg-white border border-[#e2e8f0] p-6 card-hover">
                <span className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </span>
                <h3 className="mt-4 font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Verification band */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 lg:pb-24">
        <Reveal className="relative max-w-7xl mx-auto overflow-hidden rounded-3xl hero-mesh text-white px-6 py-12 sm:px-12 lg:py-16">
          <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
          <div className="relative grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-500">
                <ShieldCheck className="w-4 h-4" /> Public verification registry
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
                Certificates employers can trust
              </h2>
              <p className="mt-4 text-night-300 max-w-xl leading-relaxed">
                Every certificate carries a unique ID and QR code. Recruiters can confirm it is genuine in
                seconds, with no login needed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
              <Link href="/verify/CERT-2026-AI-001">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto bg-white text-ink hover:bg-cream-100">
                  <QrCode className="w-4 h-4" /> Verify a sample certificate
                </Button>
              </Link>
              <Link href="/courses">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border-white/15">
                  <GraduationCap className="w-4 h-4" /> Start learning
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="pb-20 lg:pb-24">
        <Reveal className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-1 text-amber-500 mb-4" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">Ready to start your next chapter?</h2>
          <p className="mt-4 text-slate-400">
            Browse the catalogue, or sign in with a demo account to see the full student and admin
            experience.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/courses">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                <BookOpen className="w-4 h-4" /> Browse courses
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <Zap className="w-4 h-4 text-amber-500" /> Try a demo account
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
