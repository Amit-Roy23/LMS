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

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#f0e2d8]">
        {/* Teal panel on the right (desktop) */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[38%] bg-brand" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-12 items-center py-16 lg:py-24">
          {/* Left: headline */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-ink mb-6">
              <Sparkles className="w-4 h-4 text-coral-500" />
              <span>Deterministic Progression Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-brand tracking-tight leading-[1.15]">
              Online Creative &amp; <span className="highlight-pill">IT</span> Academy
            </h1>
            <p className="text-lg sm:text-xl font-semibold text-ink mt-4">
              Server-Enforced Mastery &amp; Verifiable Technical Certification
            </p>

            <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              The next-generation technical academy where skipping is impossible. Master full-stack software and AI through deterministic checkpoints: Video Tracking → Module Quizzes → Code Assignments → Instructor Approvals → Capstone Defense → Cryptographic PDF Diplomas.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
              <Link href="/courses">
                <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Explore Technical Catalog</span>
                </Button>
              </Link>

              <Link href="/login" className="group inline-flex items-center gap-3 px-2 py-2 text-sm font-semibold text-ink">
                <span className="w-11 h-11 rounded-full bg-coral-500 group-hover:bg-coral-600 flex items-center justify-center shadow-soft transition-colors">
                  <Zap className="w-4 h-4 text-white" />
                </span>
                <span>Instant 1-Click Demo</span>
              </Link>

              <Link href="/verify/CERT-2026-DEMO01">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Credentials</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: spec counters on a striped coral card over the teal panel */}
          <div className="relative">
            <div className="hero-stripes rounded-3xl p-5 sm:p-7 shadow-soft">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-5 rounded-2xl bg-white shadow-card">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Progression Protocol</div>
                  <p className="text-2xl font-bold text-brand mt-1">100% STRICT</p>
                  <p className="text-xs text-slate-400 mt-1">Zero bypassable gates</p>
                </div>
                <div className="p-5 rounded-2xl bg-white shadow-card">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Watch Threshold</div>
                  <p className="text-2xl font-bold text-coral-500 mt-1">≥ 90.0%</p>
                  <p className="text-xs text-slate-400 mt-1">Realtime telemetry tracking</p>
                </div>
                <div className="p-5 rounded-2xl bg-white shadow-card">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Authentication</div>
                  <p className="text-2xl font-bold text-brand mt-1">QR + UUID</p>
                  <p className="text-xs text-slate-400 mt-1">Blockchain-grade PDF export</p>
                </div>
                <div className="p-5 rounded-2xl bg-white shadow-card">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Role Access</div>
                  <p className="text-2xl font-bold text-coral-500 mt-1">TRI-TIER</p>
                  <p className="text-xs text-slate-400 mt-1">Student / Instructor / Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progression Pipeline Architecture */}
      <section className="py-20 bg-[#fff6ef] border-b border-[#f0e2d8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge variant="blue" className="mb-2">ENGINEERING BLUEPRINT</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink tracking-tight">
              Deterministic 6-Stage Mastery Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Unlike generic platforms with loose progress checkboxes, our state machine enforces sequential mastery validation on the backend database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Step 1 */}
            <div className="p-4 rounded-lg bg-[#ffffff] border border-[#efdfd4] flex flex-col justify-between space-y-3 hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">STAGE 01</span>
                <PlayCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm">Video Lessons</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Sequential playback with automatic heartbeats until 90% threshold.
                </p>
              </div>
              <div className="pt-2 border-t border-[#f0e2d8] text-[10px] font-mono text-slate-400">
                LOCKED: Next Module
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-lg bg-[#ffffff] border border-[#efdfd4] flex flex-col justify-between space-y-3 hover:border-violet-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">STAGE 02</span>
                <Terminal className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm">Module Quizzes</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Knowledge assessments unlocked only after 100% lesson completion.
                </p>
              </div>
              <div className="pt-2 border-t border-[#f0e2d8] text-[10px] font-mono text-violet-400">
                BENCHMARK: 70% PASS
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-lg bg-[#ffffff] border border-[#efdfd4] flex flex-col justify-between space-y-3 hover:border-amber-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">STAGE 03</span>
                <FileCode2 className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm">Assignments</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Production code repository submission with live demo links.
                </p>
              </div>
              <div className="pt-2 border-t border-[#f0e2d8] text-[10px] font-mono text-amber-400">
                FORMAT: ZIP / GIT / URL
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-lg bg-[#ffffff] border border-[#efdfd4] flex flex-col justify-between space-y-3 hover:border-cyan-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">STAGE 04</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm">Instructor Review</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Human code audit with line-by-line feedback and scoring.
                </p>
              </div>
              <div className="pt-2 border-t border-[#f0e2d8] text-[10px] font-mono text-cyan-400">
                STATUS: QUEUED AUDIT
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-4 rounded-lg bg-[#ffffff] border border-[#efdfd4] flex flex-col justify-between space-y-3 hover:border-rose-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">STAGE 05</span>
                <Zap className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm">Mock & Final Exam</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Strict countdown timed comprehensive proctoring simulation.
                </p>
              </div>
              <div className="pt-2 border-t border-[#f0e2d8] text-[10px] font-mono text-rose-400">
                BENCHMARK: 75% PASS
              </div>
            </div>

            {/* Step 6 */}
            <div className="p-4 rounded-lg bg-[#ffffff] border border-emerald-500/40 flex flex-col justify-between space-y-3 hover:border-emerald-400 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">STAGE 06</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm">Credential Issuance</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Server-generated PDF certificate with verifiable live QR code.
                </p>
              </div>
              <div className="pt-2 border-t border-[#f0e2d8] text-[10px] font-mono text-emerald-400">
                EXPORT: VECTOR PDF
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Curriculums Section */}
      <section className="py-20 bg-[#fff8f3] border-b border-[#f0e2d8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <Badge variant="blue" className="mb-2">CURATED SYLLABUS</Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Flagship Technical Tracks
              </h2>
            </div>
            <Link href="/courses">
              <Button variant="outline" size="sm" className="gap-1.5">
                <span>View All Curriculums</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="rounded-lg border border-[#efdfd4] bg-[#ffffff] p-6 flex flex-col justify-between hover:border-blue-500/50 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge variant="blue">SOFTWARE TRACK</Badge>
                  <span className="text-sm font-mono font-bold text-ink">$199.00</span>
                </div>
                <h3 className="text-base font-bold text-ink hover:text-blue-400 transition-colors">
                  Full-Stack Web Development & Modern AI Engineering
                </h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Build complete end-to-end applications with Next.js 15, Node.js, TypeScript, PostgreSQL, state machines, and PDF generation.
                </p>
              </div>

              <div className="pt-5 mt-6 border-t border-[#f0e2d8] flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">3 MODULES • 9 LESSONS</span>
                <Link href="/courses/fullstack-ai-engineering">
                  <Button variant="primary" size="sm">
                    Inspect Syllabus
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-lg border border-[#efdfd4] bg-[#ffffff] p-6 flex flex-col justify-between hover:border-violet-500/50 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge variant="purple">AI ARCHITECTURE</Badge>
                  <span className="text-sm font-mono font-bold text-ink">$249.00</span>
                </div>
                <h3 className="text-base font-bold text-ink hover:text-violet-400 transition-colors">
                  Autonomous AI Agents & Multi-Model Systems
                </h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Master tool orchestration, vector retrieval, embeddings, semantic cache, and agentic workflows with production reliability.
                </p>
              </div>

              <div className="pt-5 mt-6 border-t border-[#f0e2d8] flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">4 MODULES • 12 LESSONS</span>
                <Link href="/ai">
                  <Button variant="secondary" size="sm">
                    Explore AI Lab
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-lg border border-[#efdfd4] bg-[#ffffff] p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge variant="cyan">CLOUD INFRASTRUCTURE</Badge>
                  <span className="text-sm font-mono font-bold text-ink">$149.00</span>
                </div>
                <h3 className="text-base font-bold text-ink hover:text-cyan-400 transition-colors">
                  Cloud DevOps, Kubernetes & CI/CD Pipelines
                </h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Containerization with Docker, multi-stage builds, automated testing pipelines, reverse proxies, and production deployment.
                </p>
              </div>

              <div className="pt-5 mt-6 border-t border-[#f0e2d8] flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">3 MODULES • 8 LESSONS</span>
                <Link href="/courses">
                  <Button variant="secondary" size="sm">
                    View Catalog
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cryptographic Verification Callout */}
      <section className="py-14 bg-[#fff6ef] border-b border-[#f0e2d8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> CRYPTOGRAPHIC VERIFICATION
              </Badge>
              <span className="text-xs font-mono text-slate-400">PUBLIC REGISTRY</span>
            </div>
            <h3 className="text-xl font-bold text-ink">
              Instant Public Diploma Verification
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Employers, recruiters, and academic institutions can verify any diploma issued by our academy in real time using the certificate serial number or QR code.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/verify/CERT-2026-DEMO01">
              <Button variant="primary" size="md" className="gap-2">
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
