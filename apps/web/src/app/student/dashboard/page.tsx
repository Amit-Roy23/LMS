'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../providers/auth-provider';
import { apiClient } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Reveal } from '../../../components/motion/reveal';
import { formatCurrency } from '../../../lib/utils';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  FileCheck,
  PlayCircle,
  Printer,
  Radio,
  Receipt,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';

interface MyCourse {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  category?: string | null;
  mode?: string;
  batch?: { name: string; scheduleText?: string | null } | null;
  instructor?: { name?: string | null } | null;
  coursePercent: number;
  completedModules: number;
  totalModules: number;
  nextUpLesson?: { id: string; title: string } | null;
  isCompleted?: boolean;
}

function courseHref(c: MyCourse) {
  return c.nextUpLesson ? `/student/courses/${c.courseId}/learn/${c.nextUpLesson.id}` : `/student/courses/${c.courseId}`;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [receiptsData, setReceiptsData] = useState<{ payments: any[]; registrations: any[] }>({ payments: [], registrations: [] });
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<MyCourse[]>('/student/courses').catch(() => []),
      apiClient<any[]>('/certificates/my').catch(() => []),
      apiClient<{ payments: any[]; registrations: any[] }>('/student/receipts').catch(() => ({ payments: [], registrations: [] })),
      apiClient<any[]>('/student/live-sessions').catch(() => []),
    ])
      .then(([c, certs, receipts, live]) => {
        setCourses(c || []);
        setCertificates(certs || []);
        setReceiptsData(receipts || { payments: [], registrations: [] });
        setLiveSessions(live || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const resume = courses.find((c) => !c.isCompleted && c.nextUpLesson) || courses[0];
  const upcomingLive = liveSessions.find((s) => new Date(s.startsAt).getTime() + (s.durationMinutes || 60) * 60000 >= Date.now());
  const avgProgress = courses.length ? Math.round(courses.reduce((n, c) => n + (c.coursePercent || 0), 0) / courses.length) : 0;
  const modulesDone = courses.reduce((n, c) => n + (c.completedModules || 0), 0);
  const receipts = [
    ...receiptsData.registrations.map((r) => ({ ...r, ref: `RCP-${r.id.substring(0, 8).toUpperCase()}`, title: r.course?.title, status: 'CONFIRMED' })),
    ...receiptsData.payments.map((p) => ({ ...p, ref: `PAY-${p.id.substring(0, 8).toUpperCase()}`, title: p.course?.title || 'Course enrolment', applicantName: user?.name })),
  ];
  const firstName = (user?.name || '').split(' ')[0];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="h-44 rounded-3xl skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-72 rounded-2xl skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl hero-mesh text-white p-6 sm:p-8 animate-fade-up">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {user?.studentId && <span className="rounded-full glass-dark px-3 py-1 font-semibold">{user.studentId}</span>}
              <span className="rounded-full bg-emerald-500/15 text-emerald-500 px-3 py-1 font-semibold">Active learner</span>
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white">Welcome back, {firstName} 👋</h1>
            <p className="mt-2 text-night-300 max-w-xl">
              {courses.length
                ? `You're enrolled in ${courses.length} course${courses.length === 1 ? '' : 's'}. Keep your streak going: every lesson counts.`
                : 'Pick your first course to start learning.'}
            </p>
          </div>

          {resume ? (
            <Link href={courseHref(resume)} className="group block rounded-2xl glass-dark p-4 w-full lg:w-80 hover:bg-white/10 transition-colors">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Continue learning</p>
              <p className="mt-1.5 font-bold text-white truncate">{resume.title}</p>
              {resume.nextUpLesson && <p className="text-sm text-night-400 truncate">Next: {resume.nextUpLesson.title}</p>}
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${resume.coursePercent}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-night-400">{resume.coursePercent}% complete</span>
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  <PlayCircle className="w-4 h-4" /> Resume
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/courses">
              <Button variant="secondary" size="lg" className="bg-white text-ink">
                <Compass className="w-4 h-4" /> Explore courses
              </Button>
            </Link>
          )}
        </div>
      </section>

      {upcomingLive && (
        <Reveal className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-violet-50 border border-violet-800">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-violet-500 text-white flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <p className="text-xs font-semibold text-violet-300">
                Upcoming live class · {new Date(upcomingLive.startsAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="font-bold text-ink">{upcomingLive.title}</p>
            </div>
          </div>
          <Link href="/student/schedule">
            <Button variant="primary" size="sm">View schedule</Button>
          </Link>
        </Reveal>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Enrolled courses', value: courses.length, tone: 'bg-indigo-50 text-indigo-400' },
          { icon: TrendingUp, label: 'Average progress', value: `${avgProgress}%`, tone: 'bg-sky-50 text-sky-400' },
          { icon: CheckCircle2, label: 'Modules completed', value: modulesDone, tone: 'bg-emerald-50 text-emerald-400' },
          { icon: Award, label: 'Certificates', value: certificates.length, tone: 'bg-amber-50 text-amber-400' },
        ].map(({ icon: Icon, label, value, tone }, i) => (
          <Reveal key={label} delay={i * 70} className="rounded-2xl bg-white border border-[#e2e8f0] p-5 shadow-card">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
              <Icon className="w-5 h-5" />
            </span>
            <p className="mt-4 text-2xl font-extrabold text-ink">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </Reveal>
        ))}
      </div>

      {/* Courses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">My courses</h2>
          <Link href="/student/courses" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">View all</Link>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white p-10 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
            <p className="mt-3 font-bold text-ink">No courses yet</p>
            <p className="text-sm text-slate-500 mt-1">Browse the catalogue to start your first program.</p>
            <Link href="/courses">
              <Button variant="primary" className="mt-5">Explore courses <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {courses.map((c, i) => (
              <Reveal key={c.enrollmentId} delay={(i % 2) * 80}>
                <Link href={courseHref(c)} className="group flex flex-col sm:flex-row gap-4 rounded-2xl bg-white border border-[#e2e8f0] p-4 card-hover h-full">
                  <div className="relative sm:w-40 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-night-900 shrink-0">
                    {c.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    {c.isCompleted && (
                      <span className="absolute top-2 left-2 rounded-full bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5">Completed</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-indigo-400 truncate">{c.category}</span>
                      <Badge variant={c.mode === 'LIVE' ? 'purple' : 'slate'}>{c.mode === 'LIVE' ? 'Live batch' : 'Self-paced'}</Badge>
                    </div>
                    <h3 className="mt-1.5 font-bold text-ink leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">{c.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {c.nextUpLesson ? `Next: ${c.nextUpLesson.title}` : c.isCompleted ? 'All modules completed' : `by ${c.instructor?.name || 'your instructor'}`}
                    </p>
                    <div className="mt-auto pt-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500">{c.completedModules}/{c.totalModules} modules</span>
                        <span className="font-semibold text-ink">{c.coursePercent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-cream-100 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-gradient transition-all duration-700" style={{ width: `${c.coursePercent}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Certificates */}
      {certificates.length > 0 && (
        <Reveal as="section" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-ink">My certificates</h2>
            <Link href="/student/certificates" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">Manage</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="relative overflow-hidden rounded-2xl border border-amber-800 bg-gradient-to-br from-amber-50 to-white p-5">
                <Award className="absolute -right-3 -top-3 w-20 h-20 text-amber-800" />
                <p className="relative text-xs font-semibold text-amber-300">{cert.certificateId}</p>
                <p className="relative mt-1 font-bold text-ink line-clamp-2">{cert.course?.title || cert.metadata?.courseTitle}</p>
                <Link href={`/verify/${cert.certificateId}`} className="relative mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300">
                  <ShieldCheck className="w-4 h-4" /> Verify publicly
                </Link>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Receipts */}
      <Reveal as="section" className="space-y-4">
        <h2 className="text-xl font-extrabold text-ink flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-400" /> Payments &amp; receipts
        </h2>
        {receipts.length === 0 ? (
          <p className="rounded-2xl bg-white border border-[#e2e8f0] p-6 text-sm text-slate-500 text-center">No payment receipts on record.</p>
        ) : (
          <div className="rounded-2xl bg-white border border-[#e2e8f0] overflow-hidden">
            <ul className="divide-y divide-[#e2e8f0]">
              {receipts.map((r) => (
                <li key={r.ref} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <span className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5 text-indigo-400" />
                  </span>
                  <span className="flex-1 min-w-[12rem]">
                    <span className="block font-semibold text-ink truncate">{r.title}</span>
                    <span className="block text-xs text-slate-500">{r.ref} · {new Date(r.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span className="font-bold text-ink">{formatCurrency(r.amount, r.currency || 'INR')}</span>
                  <Badge variant="success">{r.status}</Badge>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedReceipt(r)}>View</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Reveal>

      {/* Receipt modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-night-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedReceipt(null)} aria-label="Close" />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-ink">Payment receipt</h3>
                <p className="text-sm text-slate-500">Online Creative &amp; IT Academy</p>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="p-2 -m-2 rounded-lg hover:bg-cream-100" aria-label="Close">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <dl className="text-sm rounded-2xl bg-cream border border-[#e2e8f0] divide-y divide-[#e2e8f0]">
              {[
                ['Receipt no.', selectedReceipt.ref],
                ['Student ID', user?.studentId || '—'],
                ['Learner', selectedReceipt.applicantName || user?.name],
                ['Course', selectedReceipt.title],
                ['Delivery', selectedReceipt.mode || 'Recorded'],
                ['Date', new Date(selectedReceipt.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold text-ink text-right">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3">
                <dt className="font-semibold text-ink">Total paid</dt>
                <dd className="text-lg font-extrabold text-indigo-400">{formatCurrency(selectedReceipt.amount, selectedReceipt.currency || 'INR')}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedReceipt(null)}>Close</Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print / save PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
