'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EnquiryForm } from '../../../components/marketing/enquiry-form';
import { track } from '../../../lib/analytics';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { formatPrice, formatDurationShort } from '../../../components/course/course-card';
import { apiClient } from '../../../lib/api';
import { useSiteConfig, contactFrom, whatsappLink } from '../../../lib/site-config';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  HelpCircle,
  MonitorSmartphone,
  PlayCircle,
  Star,
  Trophy,
  Users,
  X,
  Crown,
  Video,
  Layers,
  ClipboardList,
  QrCode,
  ClipboardCheck,
  BadgeCheck,
  Phone,
  Mail,
  MessageCircle,
  AtSign,
  Minus,
  Plus,
  Lock,
} from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');

function Stars({ value, size = 'w-3.5 h-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-grey3'}`} />
      ))}
    </span>
  );
}

/** Blue accordion bar from the design ("Requirements", "Who this course is for"). */
function InfoAccordion({ title, intro, points, defaultOpen = true }: { title: string; intro?: string; points?: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!intro && !points?.length) return null;
  return (
    <div className="rounded-md border border-grey3 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 bg-adblue px-4 py-3 text-left text-sm font-button font-bold text-white"
      >
        <span className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5" /> {title}
        </span>
        {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-5 py-5 sm:px-8 bg-white">
          {intro && <p className="text-xs sm:text-sm leading-relaxed text-slate-400 whitespace-pre-line">{intro}</p>}
          {points && points.length > 0 && (
            <ul className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 ${intro ? 'mt-5' : ''}`}>
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-adblue shrink-0" /> {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const contact = contactFrom(useSiteConfig().settings);

  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<{ title: string; videoUrl: string } | null>(null);
  const [wantsLive, setWantsLive] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    apiClient<any>(`/courses/${slug}`)
      .then((data) => {
        setCourse(data);
        if (data.modules?.length) setExpanded({ [data.modules[0].id]: true, ...(data.modules[1] ? { [data.modules[1].id]: true } : {}) });
        track('view_item', { item_id: data.id, item_name: data.title, value: data.price, currency: data.currency || 'INR' });
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
    const modules: any[] = course?.modules || [];
    const lessons = modules.flatMap((m: any) => m.lessons || []);
    return {
      lessons,
      videos: lessons.filter((l: any) => l.videoUrl).length,
      totalSeconds: lessons.reduce((n: number, l: any) => n + (l.durationSeconds || 0), 0),
      quizzes: modules.filter((m: any) => m.quiz).length,
      assignments: modules.filter((m: any) => m.assignment).length,
      previewLesson: lessons.find((l: any) => l.isPreview && l.videoUrl),
    };
  }, [course]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="bg-[#1d232c] h-80" />
        <div className="max-w-6xl mx-auto px-4 py-10 w-full space-y-4">
          <div className="h-8 w-1/2 rounded-lg skeleton" />
          <div className="h-4 w-1/3 rounded skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Course not found</h2>
            <p className="mt-2 text-slate-400">It may have been moved or unpublished.</p>
            <Link href="/courses" className="mt-6 inline-flex h-11 px-6 items-center rounded-md bg-adblue text-white font-button font-bold">
              Browse all courses
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const outcomes: string[] = course.outcomes?.length ? course.outcomes : stats.lessons.slice(0, 8).map((l: any) => l.title.replace(/^\d+(\.\d+)*\s+/, ''));
  const enrollHref = course.isEnrolled ? `/student/courses/${course.id}/learn` : `/checkout/${course.id}`;
  const livePrice = course.livePrice != null ? Number(course.livePrice) : null;
  const hasLive = !!course.hasLive && !!livePrice;
  const instructor = course.instructor;
  const profile = instructor?.instructorProfile;
  const instructorAvatar = profile?.avatar || instructor?.avatar;
  const updated = new Date(course.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const duration = formatDurationShort(stats.totalSeconds);
  const certificationItems = [
    course.mockTest && { icon: ClipboardCheck, label: 'Mock Exam' },
    course.finalProject && { icon: Trophy, label: 'Capstone Project' },
    course.finalAssessment && { icon: Award, label: 'Final Exam' },
  ].filter(Boolean) as { icon: any; label: string }[];
  const includes = [
    { icon: Video, label: `${stats.videos} video lesson${stats.videos === 1 ? '' : 's'}` },
    { icon: Layers, label: `${course.modules?.length || 0} module${course.modules?.length === 1 ? '' : 's'}` },
    stats.quizzes > 0 && { icon: HelpCircle, label: `${stats.quizzes} smart quiz${stats.quizzes === 1 ? '' : 'zes'}` },
    course.mockTest && { icon: ClipboardCheck, label: 'Mock exam' },
    stats.assignments > 0 && { icon: ClipboardList, label: 'Regular assignments' },
    { icon: FileText, label: 'Downloadable study materials' },
    { icon: QrCode, label: 'Verifiable certificate with QR code' },
    { icon: MonitorSmartphone, label: 'Access on your phone and computer' },
  ].filter(Boolean) as { icon: any; label: string }[];

  const headerStats = [
    { icon: Crown, value: course.price ? 'Premium' : 'Free', label: 'Course', featured: true },
    { icon: Star, value: course.averageRating != null ? Number(course.averageRating).toFixed(1) : 'New', label: course.reviewsCount ? `${course.reviewsCount} reviews` : 'Rating', stars: course.averageRating },
    { icon: Users, value: String(course.enrolledStudentsCount ?? 0), label: 'Learners' },
    { icon: BookOpen, value: String(stats.lessons.length), label: 'Lessons' },
    { icon: Clock3, value: duration || '—', label: 'Duration' },
  ];

  const PurchaseCard = (
    <div className="rounded-lg bg-white border border-grey3 shadow-lift overflow-hidden">
      <button
        type="button"
        disabled={!stats.previewLesson}
        onClick={() => stats.previewLesson && setPreview({ title: stats.previewLesson.title, videoUrl: stats.previewLesson.videoUrl })}
        className="group relative block w-full aspect-video bg-grey1 overflow-hidden disabled:cursor-default"
        aria-label={stats.previewLesson ? 'Watch the free preview' : undefined}
      >
        {course.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
        )}
        {stats.previewLesson && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 group-hover:bg-black/35 transition-colors">
            <span className="w-14 h-14 rounded-full border-2 border-white bg-white/20 backdrop-blur flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-white" />
            </span>
            <span className="text-xs font-semibold text-white drop-shadow">Preview this course</span>
          </span>
        )}
      </button>
      <div className="p-5 space-y-3">
        <div>
          <p className="text-[11px] text-slate-400">Get the individual course at</p>
          <p className="font-display font-extrabold text-3xl text-adred leading-tight">{course.price ? formatPrice(course.price, course.currency) : 'FREE'}</p>
          {course.price > 0 && <p className="text-[11px] text-slate-500">One-time payment · GST included</p>}
        </div>
        {hasLive && !course.isEnrolled && (
          <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
            <input type="checkbox" checked={wantsLive} onChange={(e) => setWantsLive(e.target.checked)} className="w-4 h-4 accent-[#0064ae]" />
            Live classes available at {formatPrice(livePrice, course.currency)}
          </label>
        )}
        <Link
          href={wantsLive ? `/contact?topic=${encodeURIComponent(`the live batch of ${course.title}`)}` : enrollHref}
          className="flex items-center justify-center h-11 rounded-md bg-adblue text-white text-sm font-button font-bold hover:brightness-110"
        >
          {course.isEnrolled ? 'Continue learning' : wantsLive ? 'Book a live batch seat' : 'Enrol Now'}
        </Link>
        <a href="#ask" className="flex items-center justify-center h-11 rounded-md border border-adblue text-adblue text-sm font-button font-bold hover:bg-adblue hover:text-white transition-colors">
          Ask an advisor
        </a>
        <div className="pt-2">
          <p className="text-sm font-bold text-adblue">Course includes</p>
          <ul className="mt-2 space-y-2">
            {includes.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-xs text-slate-400">
                <Icon className="w-4 h-4 text-ink shrink-0" strokeWidth={1.6} /> {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const AskCard = (
    <div id="ask" className="rounded-lg bg-white border border-grey3 shadow-lift p-5 scroll-mt-24">
      <p className="text-sm font-bold text-ink">Questions about this course?</p>
      <p className="text-[11px] text-slate-500 mb-3">Leave your number and an advisor will call you.</p>
      <EnquiryForm courseId={course.id} courseTitle={course.title} source="COURSE_PAGE" compact />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink">
      <Navbar />

      {/* Dark header */}
      <section className="relative bg-[#1d232c] text-white overflow-hidden">
        {course.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1d232c] via-[#1d232c]/90 to-[#1d232c]/40" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 lg:pb-14">
          <div className="lg:max-w-[calc(100%-360px)]">
            <nav className="text-xs text-white/75" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link> › <Link href="/courses" className="hover:text-white">Courses</Link> ›{' '}
              <Link href={`/courses?category=${encodeURIComponent(course.category)}`} className="font-semibold text-white hover:underline">{course.category}</Link>
            </nav>
            <h1 className="mt-5 text-[30px] sm:text-[40px] leading-[1.1] font-extrabold text-white">{course.title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-white/85 max-w-2xl">{course.description}</p>
            <dl className="mt-6 space-y-1 text-xs text-white/80">
              <div><dt className="inline">Created by: </dt><dd className="inline font-semibold text-white">{instructor?.name || 'Adsign Team'}</dd></div>
              <div><dt className="inline">Last updated on: </dt><dd className="inline font-semibold text-white">{updated}</dd></div>
              <div><dt className="inline">Language: </dt><dd className="inline font-semibold text-white">{course.language || 'English'}</dd></div>
            </dl>
            <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 rounded-md overflow-hidden bg-white text-ink shadow-lift">
              {headerStats.map(({ icon: Icon, value, label, featured, stars }) => (
                <div key={label} className={`flex flex-col items-center justify-center text-center px-2 py-3 border-r border-grey3 last:border-r-0 ${featured ? 'bg-adblue text-white' : ''}`}>
                  <Icon className={`w-5 h-5 ${featured ? 'text-white' : 'text-slate-500'}`} strokeWidth={1.6} />
                  <p className="mt-1 text-sm font-bold leading-none">{value}</p>
                  {stars != null && <Stars value={Number(stars)} size="w-3 h-3" />}
                  <p className={`text-[10px] ${featured ? 'text-white/85' : 'text-adblue'}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Right column: purchase card (overlaps the header on desktop) + enquiry */}
        <aside className="lg:order-2 lg:-mt-[300px] space-y-5 relative z-10 pt-6 lg:pt-0">
          <div className="lg:sticky lg:top-24 space-y-5">
            {PurchaseCard}
            <div className="hidden lg:block">{AskCard}</div>
          </div>
        </aside>

        <div className="lg:order-1 min-w-0 space-y-10 pt-2 lg:pt-10">
          {/* What you'll learn */}
          {outcomes.length > 0 && (
            <section>
              <h2 className="text-[26px] sm:text-[32px] font-extrabold text-adblue">
                What <span className="text-adred">you&apos;ll learn?</span>
              </h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-grey3 bg-grey2 p-5 sm:p-6">
                {outcomes.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-adblue shrink-0 mt-px" /> {p}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Curriculum */}
          <section>
            <h2 className="text-[26px] sm:text-[32px] font-extrabold text-adblue">
              Course <span className="text-adred">Curriculum</span>
            </h2>
            <p className="text-xs text-slate-400">Modules unlock one after another as you complete each checkpoint.</p>
            <div className="mt-4 space-y-3">
              {(course.modules || []).map((m: any, idx: number) => {
                const open = !!expanded[m.id];
                const lessons = m.lessons || [];
                const videos = lessons.filter((l: any) => l.videoUrl).length;
                const meta = [
                  `${videos} Video${videos === 1 ? '' : 's'}`,
                  `${lessons.length} Lesson${lessons.length === 1 ? '' : 's'}`,
                  'Study Materials',
                  m.quiz && 'Quiz',
                  m.assignment && 'Assignment',
                ].filter(Boolean);
                return (
                  <div key={m.id} className="rounded-md border border-grey3 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded({ ...expanded, [m.id]: !open })}
                      aria-expanded={open}
                      className="w-full flex items-center gap-3 bg-grey2 px-3 py-2.5 text-left hover:bg-adblue/5"
                    >
                      <span className="w-10 h-10 shrink-0 rounded border border-grey3 bg-white flex items-center justify-center font-display font-extrabold text-xl text-grey3">{pad(idx + 1)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-adblue">{m.title}</span>
                        <span className="block text-[11px] text-slate-500">{meta.join(' · ')}</span>
                      </span>
                      {open ? <ChevronUp className="w-5 h-5 text-adblue shrink-0" /> : <ChevronDown className="w-5 h-5 text-adblue shrink-0" />}
                    </button>
                    {open && (
                      <ul className="divide-y divide-grey3 bg-white">
                        {lessons.map((l: any) => (
                          <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                            <PlayCircle className="w-4 h-4 text-ink shrink-0" strokeWidth={1.6} />
                            <span className="flex-1 min-w-0 truncate text-ink">{l.title}</span>
                            {l.isPreview && l.videoUrl ? (
                              <button type="button" onClick={() => setPreview({ title: l.title, videoUrl: l.videoUrl })} className="font-semibold text-adred hover:underline shrink-0">
                                Preview
                              </button>
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-label="Unlocks after enrolment" />
                            )}
                            {l.durationSeconds > 0 && <span className="text-slate-500 shrink-0 w-14 text-right">{formatDurationShort(l.durationSeconds) || '1min'}</span>}
                          </li>
                        ))}
                        {m.assignment && (
                          <li className="flex items-center gap-3 px-4 py-2.5 text-xs">
                            <ClipboardList className="w-4 h-4 text-ink shrink-0" strokeWidth={1.6} />
                            <span className="text-ink">Assignment: {m.assignment.title}</span>
                          </li>
                        )}
                        {m.quiz && (
                          <li className="flex items-center gap-3 px-4 py-2.5 text-xs">
                            <HelpCircle className="w-4 h-4 text-adred shrink-0" strokeWidth={1.6} />
                            <span><span className="font-bold text-adred">Quiz</span> : {m.quiz.title}</span>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}

              {certificationItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 rounded-md border border-grey3 bg-grey2 px-4 py-3">
                  <Trophy className="w-9 h-9 text-adblue shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-bold text-adblue">Certifications</p>
                    <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                      {certificationItems.map(({ icon: Icon, label }) => (
                        <span key={label} className="inline-flex items-center gap-1">
                          <Icon className="w-3.5 h-3.5 text-adblue" /> {label}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Full-width accordions */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-14 space-y-4">
        <InfoAccordion title="Requirements" intro="What you need before you start. Everything else is taught in the course." points={course.requirements} />
        <InfoAccordion title="Who this course is for" intro="This course is a good fit if you are one of these learners." points={course.audience} />
        <InfoAccordion title="About this course" intro={course.description} defaultOpen={false} />
        <div className="lg:hidden">{AskCard}</div>
      </section>

      {/* Instructor + reviews */}
      <section className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-adblue text-white px-6 sm:px-12 py-12 lg:pl-[max(3rem,calc((100vw-72rem)/2+2rem))]">
          <div className="flex items-center gap-5">
            {instructorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={instructorAvatar} alt={instructor?.name || ''} className="w-24 h-24 rounded object-cover ring-4 ring-white/20" />
            ) : (
              <span className="w-24 h-24 rounded bg-white/15 flex items-center justify-center font-display font-extrabold text-4xl">
                {(instructor?.name || 'A').replace(/^(Prof\.|Dr\.)\s*/, '').charAt(0)}
              </span>
            )}
            <div>
              <p className="font-display font-extrabold text-2xl sm:text-3xl leading-tight">{instructor?.name || 'Adsign Team'}</p>
              {profile?.headline && <p className="mt-1 text-xs text-white/85">{profile.headline}</p>}
            </div>
          </div>
          {profile?.bio && <p className="mt-5 text-sm leading-relaxed text-white/90 line-clamp-4 max-w-md">{profile.bio}</p>}
          {profile?.isPublic && profile.slug && (
            <Link href={`/instructors/${profile.slug}`} className="mt-6 inline-flex items-center h-10 px-6 rounded-md bg-white text-adblue text-sm font-button font-bold hover:bg-grey1">
              Visit Profile
            </Link>
          )}
        </div>
        <div className="bg-grey1 px-6 sm:px-12 py-12">
          <p className="text-xs font-semibold">Testimonial</p>
          <h2 className="text-[28px] sm:text-[32px] font-extrabold text-adblue">
            Student <span className="text-adred">Reviews</span>
          </h2>
          {course.feedbacks?.length > 0 ? (
            <div className="mt-5 space-y-4 max-w-md">
              {course.feedbacks.slice(0, 2).map((f: any) => (
                <figure key={f.id} className="rounded-md bg-white p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-adblue/10 text-adblue font-bold flex items-center justify-center">{f.student?.name?.charAt(0)}</span>
                    <div>
                      <figcaption className="text-sm font-bold text-ink">{f.student?.name}</figcaption>
                      <Stars value={f.rating} />
                    </div>
                  </div>
                  {f.comment && <blockquote className="mt-3 text-xs leading-relaxed text-slate-400">{f.comment}</blockquote>}
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No reviews yet. Reviews appear here once students complete the course.</p>
          )}
        </div>
      </section>

      {/* Connect band */}
      <section className="relative bg-[#15191f] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(40%_80%_at_75%_50%,rgba(220,41,12,0.35)_0%,transparent_70%)]" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="text-sm text-white/80">For further queries</p>
            <p className="font-display font-extrabold text-3xl sm:text-4xl">Please connect us</p>
            <a
              href={contact.whatsapp ? whatsappLink(contact.whatsapp, `Hi, I have a question about ${course.title}.`) : '#ask'}
              target={contact.whatsapp ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 h-10 px-6 rounded-md bg-adblue text-white text-sm font-button font-bold hover:brightness-110"
            >
              <MessageCircle className="w-4 h-4" /> Message us
            </a>
          </div>
          <div className="flex gap-4">
            {[
              contact.phone && { icon: Phone, href: `tel:${contact.phone.replace(/\s/g, '')}`, label: 'Call us' },
              contact.email && { icon: Mail, href: `mailto:${contact.email}`, label: 'Email us' },
              contact.whatsapp && { icon: MessageCircle, href: whatsappLink(contact.whatsapp), label: 'WhatsApp' },
              { icon: AtSign, href: '/contact', label: 'Contact page' },
            ]
              .filter(Boolean)
              .map((c: any) => (
                <a key={c.label} href={c.href} aria-label={c.label} className="w-14 h-14 rounded-xl border-2 border-white/80 flex items-center justify-center hover:bg-white hover:text-ink transition-colors">
                  <c.icon className="w-6 h-6" />
                </a>
              ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={preview.title}>
          <button className="absolute inset-0 bg-night-950/80 backdrop-blur-sm animate-fade-in" onClick={() => setPreview(null)} aria-label="Close preview" />
          <div className="relative w-full max-w-3xl rounded-xl overflow-hidden bg-night-950 shadow-lift animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <p className="font-semibold truncate pr-4">Preview · {preview.title}</p>
              <button onClick={() => setPreview(null)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close preview">
                <X className="w-5 h-5" />
              </button>
            </div>
            <video src={preview.videoUrl} poster={preview.videoUrl.replace(/\.mp4$/, '.jpg')} controls autoPlay playsInline controlsList="nodownload" className="w-full aspect-video bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
