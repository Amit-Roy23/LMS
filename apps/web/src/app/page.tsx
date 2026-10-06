'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '../components/common/navbar';
import { Footer } from '../components/common/footer';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileCode2,
  Users,
  Terminal,
  Zap,
  Cpu,
  Layers,
  Check,
  Flame,
} from 'lucide-react';
import { Burst, Squiggle } from '../components/decor/burst';

const STAGES = [
  {
    n: '01',
    title: 'Video Lessons',
    desc: 'Sequential playback with automatic heartbeats until 90% threshold.',
    meta: 'LOCKED: Next Module',
    icon: PlayCircle,
    tone: 'bg-plum text-cream border-plum',
    chip: 'border-cream/40 text-cream',
    sub: 'text-cream/70',
  },
  {
    n: '02',
    title: 'Module Quizzes',
    desc: 'Knowledge assessments unlocked only after 100% lesson completion.',
    meta: 'BENCHMARK: 70% PASS',
    icon: Terminal,
    tone: 'bg-cream-50 text-plum border-[#e7d5bd]',
    chip: 'border-plum/25 text-plum',
    sub: 'text-slate-400',
  },
  {
    n: '03',
    title: 'Assignments',
    desc: 'Production code repository submission with live demo links.',
    meta: 'FORMAT: ZIP / GIT / URL',
    icon: FileCode2,
    tone: 'bg-peach-500 text-plum border-peach-500',
    chip: 'border-plum/30 text-plum',
    sub: 'text-plum/75',
  },
  {
    n: '04',
    title: 'Instructor Review',
    desc: 'Human code audit with line-by-line feedback and scoring.',
    meta: 'STATUS: QUEUED AUDIT',
    icon: Users,
    tone: 'bg-rust text-cream border-rust',
    chip: 'border-cream/40 text-cream',
    sub: 'text-cream/75',
  },
  {
    n: '05',
    title: 'Mock & Final Exam',
    desc: 'Strict countdown timed comprehensive proctoring simulation.',
    meta: 'BENCHMARK: 75% PASS',
    icon: Zap,
    tone: 'bg-cream-50 text-plum border-[#e7d5bd]',
    chip: 'border-plum/25 text-plum',
    sub: 'text-slate-400',
  },
  {
    n: '06',
    title: 'Credential Issuance',
    desc: 'Server-generated PDF certificate with verifiable live QR code.',
    meta: 'EXPORT: VECTOR PDF',
    icon: Award,
    tone: 'bg-pink-500 text-plum border-pink-500',
    chip: 'border-plum/30 text-plum',
    sub: 'text-plum/75',
  },
];

const TRACKS = [
  {
    tag: 'SOFTWARE TRACK',
    price: '$199.00',
    title: 'Full-Stack Web Development & Modern AI Engineering',
    desc: 'Build complete end-to-end applications with Next.js 15, Node.js, TypeScript, PostgreSQL, state machines, and PDF generation.',
    meta: '3 MODULES • 9 LESSONS',
    href: '/courses/fullstack-ai-engineering',
    cta: 'Inspect Syllabus',
  },
  {
    tag: 'AI ARCHITECTURE',
    price: '$249.00',
    title: 'Autonomous AI Agents & Multi-Model Systems',
    desc: 'Master tool orchestration, vector retrieval, embeddings, semantic cache, and agentic workflows with production reliability.',
    meta: '4 MODULES • 12 LESSONS',
    href: '/ai',
    cta: 'Explore AI Lab',
  },
  {
    tag: 'CLOUD INFRASTRUCTURE',
    price: '$149.00',
    title: 'Cloud DevOps, Kubernetes & CI/CD Pipelines',
    desc: 'Containerization with Docker, multi-stage builds, automated testing pipelines, reverse proxies, and production deployment.',
    meta: '3 MODULES • 8 LESSONS',
    href: '/courses',
    cta: 'View Catalog',
  },
];

const HERO_STATS = [
  { value: '100% STRICT', label: 'Zero bypassable gates' },
  { value: '≥ 90.0%', label: 'Realtime telemetry tracking' },
  { value: 'QR + UUID', label: 'Blockchain-grade PDF export' },
  { value: 'TRI-TIER', label: 'Student / Instructor / Admin' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-rust text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.25fr_1fr] gap-12 items-center py-16 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cream/40 px-4 py-1.5 text-sm font-medium text-cream/90 mb-7">
              <Sparkles className="w-4 h-4 text-peach-500" />
              <span>Deterministic Progression Architecture</span>
            </div>

            <h1 className="font-display text-[2.6rem] sm:text-6xl lg:text-7xl font-extrabold leading-[0.98]">
              <span className="block text-cream">Online Creative &amp;</span>
              <span className="block text-plum">IT Academy.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-cream/90 max-w-xl leading-snug">
              Server-Enforced Mastery &amp; Verifiable Technical Certification
            </p>
            <p className="mt-4 text-sm sm:text-base text-cream/75 max-w-xl leading-relaxed">
              The next-generation technical academy where skipping is impossible. Master full-stack software and AI through deterministic checkpoints: Video Tracking → Module Quizzes → Code Assignments → Instructor Approvals → Capstone Defense → Cryptographic PDF Diplomas.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/courses">
                <Button variant="primary" size="lg" className="gap-2">
                  <span>Explore Technical Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 border-cream text-cream hover:bg-cream hover:text-plum"
                >
                  <Zap className="w-4 h-4" />
                  <span>Instant 1-Click Demo</span>
                </Button>
              </Link>
              <Link
                href="/verify/CERT-2026-DEMO01"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-cream/90 hover:text-cream underline-offset-4 hover:underline"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify Credentials
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-6">
              {HERO_STATS.map((s, i) => (
                <div key={s.value} className={i > 0 ? 'sm:border-l sm:border-cream/25 sm:pl-5' : ''}>
                  <p className="font-display text-2xl font-extrabold text-cream">{s.value}</p>
                  <p className="text-xs text-cream/75 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Collage of stage cards over a checker panel */}
          <div className="relative hidden lg:block h-[460px]">
            <div className="absolute inset-6 rounded-[2rem] checker-pink rotate-3" aria-hidden />
            <Burst className="absolute -top-2 left-4 w-14 h-14 text-cream" />
            <div className="absolute top-10 left-2 w-64 rotate-[-6deg] rounded-3xl bg-cream-50 text-plum p-6 shadow-soft">
              <PlayCircle className="w-9 h-9 text-rust" />
              <p className="font-display text-2xl font-extrabold mt-4 leading-tight">Video Lessons</p>
              <p className="text-xs text-slate-400 mt-2">Sequential playback with automatic heartbeats until 90% threshold.</p>
            </div>
            <div className="absolute top-44 right-0 w-60 rotate-[5deg] rounded-3xl bg-plum text-cream p-6 shadow-soft">
              <Terminal className="w-9 h-9 text-peach-500" />
              <p className="font-display text-2xl font-extrabold mt-4 leading-tight">Module Quizzes</p>
              <p className="text-xs text-cream/70 mt-2">Knowledge assessments unlocked only after 100% lesson completion.</p>
            </div>
            <div className="absolute bottom-0 left-12 w-56 rotate-[-3deg] rounded-3xl bg-peach-500 text-plum p-6 shadow-soft">
              <Award className="w-9 h-9" />
              <p className="font-display text-2xl font-extrabold mt-4 leading-tight">Credential Issuance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Progression Pipeline */}
      <section className="py-20 lg:py-28 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-14 relative">
            <h2 className="font-display text-4xl sm:text-6xl font-extrabold text-plum leading-[1.02]">
              Deterministic 6-Stage Mastery Pipeline.
            </h2>
            <Burst className="hidden md:block absolute -top-6 -right-4 w-14 h-14" />
            <p className="text-base sm:text-lg text-slate-300 mt-5">
              Unlike generic platforms with loose progress checkboxes, our state machine enforces sequential mastery validation on the backend database.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STAGES.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.n}
                  className={`rounded-3xl border p-7 flex flex-col justify-between min-h-[260px] transition-transform hover:-translate-y-1 ${st.tone}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${st.chip}`}>
                      Stage {st.n}
                    </span>
                    <Icon className="w-9 h-9" />
                  </div>
                  <div className="mt-8">
                    <h3 className="font-display text-3xl font-extrabold leading-tight">{st.title}</h3>
                    <p className={`text-sm mt-2 leading-relaxed ${st.sub}`}>{st.desc}</p>
                  </div>
                  <p className={`mt-5 text-[11px] font-semibold tracking-wide ${st.sub}`}>{st.meta}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Tracks */}
      <section className="py-20 lg:py-28 bg-plum text-cream relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-peach-500 font-semibold text-sm tracking-wide">CURATED SYLLABUS</p>
              <h2 className="font-display text-4xl sm:text-6xl font-extrabold text-cream mt-2 leading-[1.02]">
                Flagship Technical Tracks.
              </h2>
              <Squiggle className="mt-3" />
            </div>
            <Link href="/courses">
              <Button variant="white" size="md" className="gap-1.5">
                <span>View All Curriculums</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRACKS.map((t, i) => (
              <div
                key={t.title}
                className="rounded-3xl bg-cream-50 text-plum p-7 flex flex-col justify-between hover:-translate-y-1 transition-transform"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-5xl font-extrabold text-peach-600">0{i + 1}</span>
                    <span className="rounded-full bg-plum text-cream px-3 py-1 text-sm font-bold">{t.price}</span>
                  </div>
                  <p className="mt-5 text-[11px] font-semibold tracking-wide text-rust">{t.tag}</p>
                  <h3 className="font-display text-2xl font-extrabold leading-tight mt-1">{t.title}</h3>
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">{t.desc}</p>
                </div>
                <div className="pt-5 mt-6 border-t border-[#e7d5bd] flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-slate-400">{t.meta}</span>
                  <Link href={t.href}>
                    <Button variant="primary" size="sm" className="gap-1.5">
                      {t.cta}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Callout */}
      <section className="py-20 bg-peach-500 text-plum relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-3xl relative">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" /> CRYPTOGRAPHIC VERIFICATION · PUBLIC REGISTRY
            </div>
            <h2 className="font-display text-4xl sm:text-6xl font-extrabold leading-[1.02] mt-3">
              Instant Public Diploma Verification.
            </h2>
            <p className="text-base text-plum/80 mt-4 leading-relaxed">
              Employers, recruiters, and academic institutions can verify any diploma issued by our academy in real time using the certificate serial number or QR code.
            </p>
          </div>
          <div className="shrink-0 relative">
            <Burst className="absolute -top-10 -right-2 w-12 h-12 text-plum" />
            <Link href="/verify/CERT-2026-DEMO01">
              <Button variant="primary" size="lg" className="gap-2">
                <Award className="w-4 h-4" />
                <span>Test Live Verification Engine</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
