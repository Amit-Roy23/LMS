'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { Button } from '../../../components/ui/button';
import { Reveal } from '../../../components/motion/reveal';
import { formatPrice } from '../../../components/course/course-card';
import { apiClient } from '../../../lib/api';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Infinity as InfinityIcon,
  Lock,
  PlayCircle,
  Star,
  Trophy,
  Users,
  X,
} from 'lucide-react';

function minutes(seconds: number) {
  const m = Math.max(1, Math.round(seconds / 60));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.round(value) ? 'fill-amber-500 text-amber-500' : 'text-night-600'}`} />
      ))}
    </span>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<{ title: string; videoUrl: string } | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    apiClient<any>(`/courses/${slug}`)
      .then((data) => {
        setCourse(data);
        if (data.modules?.length) setExpanded({ [data.modules[0].id]: true });
      })
      .catch(() => setCourse(null))
      .finally(() => setIsLoading(false));
  }, [slug]);

  // Close the preview with Escape
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreview(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preview]);

  const stats = useMemo(() => {
    const lessons = (course?.modules || []).flatMap((m: any) => m.lessons || []);
    return {
      lessons,
      totalSeconds: lessons.reduce((n: number, l: any) => n + (l.durationSeconds || 0), 0),
      quizzes: (course?.modules || []).filter((m: any) => m.quiz).length,
      assignments: (course?.modules || []).filter((m: any) => m.assignment).length,
      previewLesson: lessons.find((l: any) => l.isPreview && l.videoUrl),
    };
  }, [course]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Navbar />
        <div className="hero-mesh h-80" />
        <div className="max-w-7xl mx-auto px-4 py-10 w-full space-y-4">
          <div className="h-8 w-1/2 rounded-lg skeleton" />
          <div className="h-4 w-1/3 rounded skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Course not found</h2>
            <p className="mt-2 text-slate-400">It may have been moved or unpublished.</p>
            <Link href="/courses">
              <Button variant="primary" className="mt-6">Browse all courses</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const learnPoints: string[] = stats.lessons.slice(0, 8).map((l: any) => l.title.replace(/^\d+\.\d+\s+/, ''));
  const enrollHref = course.isEnrolled ? `/student/courses/${course.id}/learn` : `/checkout/${course.id}`;
  const level = (course.level || '').charAt(0) + (course.level || '').slice(1).toLowerCase();

  const EnrollCard = (
    <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-lift overflow-hidden">
      <button
        type="button"
        disabled={!stats.previewLesson}
        onClick={() => stats.previewLesson && setPreview({ title: stats.previewLesson.title, videoUrl: stats.previewLesson.videoUrl })}
        className="group relative block w-full aspect-video bg-night-900 overflow-hidden disabled:cursor-default"
      >
        {course.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        {stats.previewLesson && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-night-950/60 group-hover:bg-night-950/70 transition-colors">
            <span className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <PlayCircle className="w-8 h-8 text-indigo-400" />
            </span>
            <span className="text-sm font-semibold text-white drop-shadow">Preview this course</span>
          </span>
        )}
      </button>
      <div className="p-6 space-y-5">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-extrabold text-ink">{formatPrice(course.price, course.currency)}</span>
          {course.livePrice > course.price && (
            <span className="text-sm text-slate-500 mb-1">Live cohort {formatPrice(course.livePrice, course.currency)}</span>
          )}
        </div>
        <Link href={enrollHref} className="block">
          <Button variant="primary" size="lg" className="w-full">
            {course.isEnrolled ? 'Continue learning' : 'Enrol now'} <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
        <ul className="space-y-2.5 text-sm text-slate-300">
          {[
            [PlayCircle, `${stats.lessons.length} video lessons · ${minutes(stats.totalSeconds)}`],
            [HelpCircle, `${stats.quizzes} module quizzes + mock exam`],
            [FileText, `${stats.assignments} graded assignment${stats.assignments === 1 ? '' : 's'} + capstone`],
            [Award, 'Verifiable certificate with QR code'],
            [InfinityIcon, 'Lifetime access on any device'],
          ].map(([Icon, text]: any) => (
            <li key={text} className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      <Navbar />

      {/* Hero */}
      <section className="relative hero-mesh text-white overflow-hidden">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          <div className="space-y-5 animate-fade-up">
            <nav className="flex items-center gap-1.5 text-sm text-night-400">
              <Link href="/courses" className="hover:text-white">Courses</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-night-200">{course.category}</span>
            </nav>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-white">{course.title}</h1>
            <p className="text-lg text-night-300 max-w-3xl leading-relaxed">{course.description}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-night-300">
              {course.averageRating != null && (
                <span className="inline-flex items-center gap-2">
                  <b className="text-amber-500 text-base">{course.averageRating.toFixed(1)}</b>
                  <Stars value={course.averageRating} />
                  <span>({course.reviewsCount} {course.reviewsCount === 1 ? 'review' : 'reviews'})</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {course.enrolledStudentsCount} learners
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {stats.lessons.length} lessons
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full glass-dark px-3 py-1 text-xs font-semibold text-white">
                {level}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <span className="w-11 h-11 rounded-full bg-brand-gradient flex items-center justify-center font-bold text-white">
                {course.instructor?.name?.charAt(0)}
              </span>
              <span className="text-sm">
                <span className="block text-night-400">Created by</span>
                <span className="block font-semibold text-white">{course.instructor?.name}</span>
              </span>
            </div>
          </div>
          {/* Mobile: enrol card under the hero text */}
          <div className="lg:hidden">{EnrollCard}</div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        <div className="space-y-12 min-w-0">
          {learnPoints.length > 0 && (
            <Reveal className="rounded-3xl bg-white border border-[#e2e8f0] p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold text-ink">What you&apos;ll learn</h2>
              <ul className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {learnPoints.map((p) => (
                  <li key={p} className="flex gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-2xl font-extrabold text-ink">Course curriculum</h2>
              <p className="text-sm text-slate-500">
                {course.modules.length} modules · {stats.lessons.length} lessons · {minutes(stats.totalSeconds)}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-400">Modules unlock one after another as you complete each checkpoint.</p>

            <div className="mt-5 space-y-3">
              {course.modules.map((mod: any, mi: number) => {
                const open = !!expanded[mod.id];
                return (
                  <div key={mod.id} className="rounded-2xl bg-white border border-[#e2e8f0] overflow-hidden">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [mod.id]: !open }))}
                      aria-expanded={open}
                      className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-cream transition-colors"
                    >
                      <span className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-300 font-bold flex items-center justify-center">
                        {String(mi + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-ink">{mod.title}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {mod.lessons.length} lessons{mod.quiz ? ' · quiz' : ''}{mod.assignment ? ' · assignment' : ''}
                        </span>
                      </span>
                      <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <ul className="border-t border-[#e2e8f0] divide-y divide-[#e2e8f0] animate-fade-in">
                        {mod.lessons.map((l: any) => (
                          <li key={l.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 text-sm">
                            <PlayCircle className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="flex-1 min-w-0 truncate text-slate-200">{l.title}</span>
                            {l.isPreview && l.videoUrl ? (
                              <button
                                onClick={() => setPreview({ title: l.title, videoUrl: l.videoUrl })}
                                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                              >
                                Preview
                              </button>
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-600" />
                            )}
                            <span className="w-14 text-right text-xs text-slate-500">{minutes(l.durationSeconds)}</span>
                          </li>
                        ))}
                        {mod.quiz && (
                          <li className="flex items-center gap-3 px-4 sm:px-5 py-3 text-sm">
                            <HelpCircle className="w-4 h-4 text-violet-400 shrink-0" />
                            <span className="flex-1 text-slate-200">{mod.quiz.title}</span>
                            <span className="text-xs text-slate-500">Pass {Math.round(mod.quiz.passingScorePercent)}%</span>
                          </li>
                        )}
                        {mod.assignment && (
                          <li className="flex items-center gap-3 px-4 sm:px-5 py-3 text-sm">
                            <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="flex-1 text-slate-200">{mod.assignment.title}</span>
                            <span className="text-xs text-slate-500">Mentor reviewed</span>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}

              {(course.mockTest || course.finalProject || course.finalAssessment) && (
                <div className="rounded-2xl border border-dashed border-indigo-800 bg-indigo-50/60 p-4 sm:p-5">
                  <p className="font-bold text-ink flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" /> Certification
                  </p>
                  <ul className="mt-3 grid sm:grid-cols-3 gap-2 text-sm text-slate-300">
                    {course.mockTest && <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Mock exam</li>}
                    {course.finalProject && <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Capstone project</li>}
                    {course.finalAssessment && <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Final exam</li>}
                  </ul>
                </div>
              )}
            </div>
          </Reveal>

          {course.feedbacks?.length > 0 && (
            <Reveal>
              <h2 className="text-2xl font-extrabold text-ink">Student reviews</h2>
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                {course.feedbacks.map((f: any) => (
                  <figure key={f.id} className="rounded-2xl bg-white border border-[#e2e8f0] p-5">
                    <Stars value={f.rating} />
                    <blockquote className="mt-3 text-sm text-slate-300 leading-relaxed">{f.comment}</blockquote>
                    <figcaption className="mt-4 flex items-center gap-2.5 text-sm">
                      <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-300 font-bold flex items-center justify-center">
                        {f.student?.name?.charAt(0)}
                      </span>
                      <span className="font-semibold text-ink">{f.student?.name}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        {/* Desktop sticky enrol card */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 z-10 -mt-64">{EnrollCard}</div>
        </aside>
      </main>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={preview.title}>
          <button className="absolute inset-0 bg-night-950/80 backdrop-blur-sm animate-fade-in" onClick={() => setPreview(null)} aria-label="Close preview" />
          <div className="relative w-full max-w-4xl animate-scale-in">
            <div className="flex items-center justify-between mb-3 text-white">
              <p className="font-semibold truncate pr-4">Preview · {preview.title}</p>
              <button onClick={() => setPreview(null)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close preview">
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              src={preview.videoUrl}
              poster={preview.videoUrl.replace(/\.mp4$/, '.jpg')}
              controls
              autoPlay
              playsInline
              className="w-full aspect-video rounded-2xl bg-black shadow-2xl"
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
