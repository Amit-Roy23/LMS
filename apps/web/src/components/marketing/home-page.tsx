'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../common/navbar';
import { Footer } from '../common/footer';
import { Reveal } from '../motion/reveal';
import { CourseCard, CourseCardSkeleton } from '../course/course-card';
import { EnquiryForm } from './enquiry-form';
import { apiClient } from '../../lib/api';
import { useCatalog, categoriesOf } from '../../lib/catalog';
import { useSiteConfig, contactFrom, whatsappLink } from '../../lib/site-config';
import {
  HOME_IMAGES,
  PARTNER_LOGOS,
  BENEFITS,
  PATH_STEPS,
  FEATURES,
  TESTIMONIAL_VIDEOS,
  INSTRUCTOR_POINTS,
  PLANS,
  FAQS,
} from '../../lib/home-content';
import {
  ArrowRight,
  Play,
  Lightbulb,
  PlayCircle,
  ClipboardCheck,
  MessageSquareText,
  Award,
  Lock,
  Video,
  ListChecks,
  Users,
  BarChart3,
  QrCode,
  CheckCircle2,
  Palette,
  Monitor,
  Megaphone,
  Clapperboard,
  Code2,
  Brain,
  ShieldCheck,
  Cloud,
  Smartphone,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Youtube,
  Lock as LockIcon,
  CalendarDays,
  Clock3,
  MapPin,
  MessageCircle,
  Image as ImageIcon,
  Star,
  GraduationCap,
} from 'lucide-react';

const WRAP = 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8';

/** Section heading from the design: small eyebrow, two-colour title, short intro. */
function SectionHead({ eyebrow, blue, red, text, light = false, align = 'center' }: { eyebrow: string; blue: string; red?: string; text?: string; light?: boolean; align?: 'center' | 'left' }) {
  return (
    <div className={align === 'center' ? 'text-center max-w-2xl mx-auto' : 'max-w-xl'}>
      <p className={`text-xs font-semibold ${light ? 'text-white/80' : 'text-ink'}`}>{eyebrow}</p>
      <h2 className={`mt-1.5 text-[28px] sm:text-[40px] leading-[1.1] font-extrabold ${light ? 'text-white' : 'text-adblue'}`}>
        {blue} {red && <span className={light ? 'text-white' : 'text-adred'}>{red}</span>}
      </h2>
      {text && <p className={`mt-3 text-sm sm:text-base leading-relaxed ${light ? 'text-white/85' : 'text-slate-400'}`}>{text}</p>}
    </div>
  );
}

const CATEGORY_ICONS: [RegExp, React.ElementType][] = [
  [/graphic|brand|design/i, Palette],
  [/ui|ux|product/i, Monitor],
  [/market|seo|growth/i, Megaphone],
  [/video|motion|animation|film/i, Clapperboard],
  [/web|full.?stack|develop|code|programm/i, Code2],
  [/data|ai|machine|python/i, Brain],
  [/security|cyber/i, ShieldCheck],
  [/cloud|devops/i, Cloud],
  [/mobile|app|android|ios/i, Smartphone],
];
const iconFor = (name: string) => CATEGORY_ICONS.find(([re]) => re.test(name))?.[1] || LayoutGrid;

const FEATURE_ICONS = [Lock, Video, ListChecks, Users, BarChart3, QrCode];
const STEP_ICONS = [PlayCircle, ClipboardCheck, MessageSquareText, Award];

interface UpcomingSession {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  provider: string;
  batchName: string;
  course: { title: string; slug: string; thumbnail?: string | null; category: string; instructor?: { name: string } | null };
}

interface FeaturedReview {
  id: string;
  rating: number;
  comment: string;
  student: { name: string; avatar?: string | null };
  course: { title: string; slug: string };
}

interface PublicInstructor {
  slug: string;
  name: string;
  avatar?: string | null;
  headline: string;
}

export function HomePage() {
  const catalog = useCatalog();
  const contact = contactFrom(useSiteConfig().settings);
  const categories = useMemo(() => categoriesOf(catalog || []), [catalog]);
  const [sessions, setSessions] = useState<UpcomingSession[] | null>(null);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [instructors, setInstructors] = useState<PublicInstructor[]>([]);

  useEffect(() => {
    apiClient<UpcomingSession[]>('/live-sessions/upcoming').then(setSessions).catch(() => setSessions([]));
    apiClient<FeaturedReview[]>('/reviews/featured').then(setReviews).catch(() => setReviews([]));
    apiClient<PublicInstructor[]>('/instructors').then(setInstructors).catch(() => setInstructors([]));
  }, []);

  const totalLessons = (catalog || []).reduce((n, c) => n + (c.lessonsCount || 0), 0);
  const stats = [
    { value: `${categories.length || 0}+`, label: 'Creative & IT Categories' },
    { value: `${catalog?.length || 0}+`, label: 'Courses & Programs' },
    { value: `${totalLessons}+`, label: 'Recorded Video Lessons' },
    { value: `${(catalog || []).reduce((n, c) => n + (c.modulesCount || 0), 0)}+`, label: 'Practical Assignments' },
    { value: `${(catalog || []).reduce((n, c) => n + (c.modulesCount || 0), 0)}+`, label: 'Module Quizzes' },
    { value: '1:1', label: 'Personalised Guidance' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink">
      <Navbar />

      {/* ───────── Hero ───────── */}
      <section className="relative bg-grey1 overflow-hidden">
        <div className={`${WRAP} grid grid-cols-1 lg:grid-cols-2 gap-10 items-center pt-10 pb-16 lg:pt-14 lg:pb-24`}>
          <div className="relative z-10 animate-fade-up">
            <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-ink">
              <span className="w-2 h-2 rounded-full bg-adred" /> New programs in design, marketing &amp; cloud
            </p>
            <h1 className="mt-4 text-[38px] sm:text-[52px] lg:text-[60px] leading-[1.02] font-extrabold">
              <span className="text-adblue">Build job-ready skills.</span>
              <br />
              <span className="text-adred">Prove them with a certificate.</span>
            </h1>
            <p className="mt-4 text-2xl sm:text-[32px] leading-tight font-display font-medium text-slate-400">Entrance Test and Scholarship</p>
            <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-slate-400">
              Structured courses in technology, design and marketing, with video lessons, quizzes, mentor-reviewed projects and
              certificates employers can verify instantly.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/courses" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-adblue text-white font-button font-bold hover:brightness-110">
                Explore Courses <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-white text-adblue border border-adblue font-button font-bold hover:bg-adblue hover:text-white transition-colors">
                Try Live Demo
              </Link>
            </div>
          </div>

          <div className="relative">
            <p aria-hidden className="absolute -top-6 right-0 font-display font-extrabold text-[88px] sm:text-[140px] leading-none text-ink/[0.06] select-none">learn</p>
            <div className="relative flex items-end justify-between gap-4 pt-10 sm:pt-16">
              <Link
                href="/courses"
                aria-label="Watch how it works"
                className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-adred bg-white flex items-center justify-center text-adred hover:scale-105 transition-transform shadow-soft"
              >
                <Play className="w-9 h-9 ml-1" />
              </Link>
              <div className="text-right">
                <p className="font-display font-extrabold text-2xl sm:text-4xl text-ink/[0.14] leading-none">from anywhere</p>
                <p className="font-display font-extrabold text-3xl sm:text-[44px] text-adred leading-tight">anytime</p>
                <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-adred">
                  <span className="w-4 h-4 rounded-full border border-adred text-adred inline-flex items-center justify-center"><ArrowRight className="w-2.5 h-2.5" /></span> Know More
                </Link>
              </div>
            </div>
            <div className="mt-5 ml-auto w-full sm:w-[88%] aspect-[4/3] rounded-2xl overflow-hidden shadow-lift">
              {HOME_IMAGES.hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={HOME_IMAGES.hero} alt="Students learning online" className="w-full h-full object-cover" />
              ) : (
                <HeroGraphic courses={catalog} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Stats band ───────── */}
      <section className="bg-adred text-white">
        <div className={`${WRAP} grid grid-cols-3 lg:grid-cols-6 divide-x divide-white/25 py-8 lg:py-10`}>
          {stats.map((s) => (
            <div key={s.label} className="px-2 py-2 text-center">
              <p className="font-display font-extrabold text-3xl sm:text-[44px] leading-none">{catalog ? s.value : '—'}</p>
              <p className="mt-2 text-[11px] sm:text-xs leading-snug text-white/90 max-w-[8rem] mx-auto">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Popular programs (white card over red/blue band) ───────── */}
      <section id="programs" className="relative">
        <div className="absolute inset-x-0 top-0 h-16 bg-adred" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-adblue" aria-hidden />
        <div className={`${WRAP} relative`}>
          <div className="rounded-xl bg-white shadow-lift px-4 sm:px-10 py-10 sm:py-12">
            <SectionHead
              eyebrow="Popular programs"
              blue="Learn What"
              red="Employers Hire For"
              text="Structured courses in technology, design and marketing, with video lessons, quizzes, mentor-reviewed projects and certificates employers can verify instantly."
            />
            <PopularCarousel courses={catalog} />
            <div className="mt-8 text-center">
              <Link href="/courses" className="inline-flex items-center gap-2 h-11 px-7 rounded-md bg-adblue text-white font-button font-bold hover:brightness-110">
                <Plus className="w-4 h-4" /> Explore all courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Categories (blue) ───────── */}
      <section id="categories" className="relative bg-adblue text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(60%_60%_at_50%_0%,#38a3e8_0%,transparent_70%)]" aria-hidden />
        <div className={`${WRAP} relative pt-10`}>
          <div className="relative mx-auto h-56 sm:h-72 max-w-md flex items-end justify-center">
            {HOME_IMAGES.categoriesPerson ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={HOME_IMAGES.categoriesPerson} alt="" className="h-full w-auto object-contain object-bottom" />
            ) : (
              <WowGraphic />
            )}
          </div>
          <div className="relative -mt-2 rounded-t-xl bg-[#0a5a9c] px-4 sm:px-10 pt-10 pb-12 shadow-lift">
            <SectionHead
              light
              eyebrow="Course categories"
              blue={`${Math.max(categories.length, 1)}+ Skills. One Platform. One Subscription.`}
              text="Pick a category to see its courses. One subscription covers learning across categories."
            />
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {(categories.length ? categories : Array.from({ length: 4 }, () => null)).slice(0, 8).map((c, i) =>
                c ? (
                  <Link
                    key={c.name}
                    href={`/courses?category=${encodeURIComponent(c.name)}`}
                    className="group rounded-lg bg-white text-ink overflow-hidden flex flex-col shadow-soft hover:-translate-y-0.5 transition-transform"
                  >
                    <div className="flex items-start justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-[15px] leading-tight">{c.name}</h3>
                        <p className="mt-2 text-xs text-slate-500">{c.count} Course{c.count === 1 ? '' : 's'}</p>
                      </div>
                      {React.createElement(iconFor(c.name), { className: 'w-8 h-8 text-adblue shrink-0', strokeWidth: 1.5 })}
                    </div>
                    <span className="mt-auto flex items-center gap-1.5 bg-grey1 px-4 py-2 text-xs font-semibold text-slate-400 group-hover:bg-adred group-hover:text-white transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" /> Start learning
                    </span>
                  </Link>
                ) : (
                  <div key={i} className="h-28 rounded-lg bg-white/20 animate-pulse" />
                )
              )}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#plans" className="inline-flex items-center h-11 px-7 rounded-md bg-white text-adblue font-button font-bold hover:bg-grey1">Subscribe Skills</a>
              <Link href="/courses" className="inline-flex items-center gap-1.5 h-11 px-7 rounded-md border border-white text-white font-button font-bold hover:bg-white/10">
                <Plus className="w-4 h-4" /> All Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── One subscription, more ways to grow ───────── */}
      <section className="bg-grey1 py-16 lg:py-20">
        <div className={WRAP}>
          <SectionHead
            eyebrow="Learning made easy"
            blue="One Subscription."
            red="More Ways to Grow."
            text="Everything you need to learn a skill, practise it and prove it, in one place."
          />
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 100} className="rounded-lg bg-white p-6 sm:p-7">
                <Lightbulb className="w-12 h-12 text-ink" strokeWidth={1.2} />
                <p className="mt-3 font-display font-extrabold text-6xl text-grey3 leading-none">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 text-lg font-bold leading-snug">{b.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{b.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── A clear path ───────── */}
      <section className="py-16 lg:py-20">
        <div className={WRAP}>
          <SectionHead
            eyebrow="How it works"
            blue="A clear path from"
            red="first lesson to certificate"
            text="Every course follows the same simple steps, and the platform makes sure each one is really done."
          />
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PATH_STEPS.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <Reveal key={s.title} delay={i * 80} className="relative rounded-lg bg-grey2 border border-grey3/60 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                  <span className="absolute top-3 right-4 font-display font-extrabold text-5xl text-grey3 leading-none">{String(i + 1).padStart(2, '0')}</span>
                  <Icon className="w-8 h-8 text-adblue" strokeWidth={1.5} />
                  <h3 className="mt-5 text-lg font-bold text-adblue">{s.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{s.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Partner institutes (shown once logos are added) ───────── */}
      {PARTNER_LOGOS.length > 0 && (
        <section className="bg-grey2 py-14 border-y border-grey3/60">
          <div className={WRAP}>
            <SectionHead eyebrow="Our partners" blue="Trusted by more than" red={`${PARTNER_LOGOS.length}+ institutes`} />
          </div>
          <div className="mt-8 overflow-hidden">
            <div className="flex gap-4 w-max animate-[marquee_40s_linear_infinite]">
              {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((p, i) => (
                <div key={i} className="h-16 w-40 rounded-md bg-white flex items-center justify-center px-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logo} alt={p.name} className="max-h-10 w-auto object-contain" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Everything you need (photo + blue feature list) ───────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-white">
          <div className="aspect-[16/10] bg-grey1 overflow-hidden">
            {HOME_IMAGES.features ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={HOME_IMAGES.features} alt="Students learning together" className="w-full h-full object-cover" />
            ) : (
              <FeaturesGraphic />
            )}
          </div>
          <div className="px-6 sm:px-12 lg:pl-[max(3rem,calc((100vw-72rem)/2+2rem))] py-10 lg:py-12">
            <p className="text-xs font-semibold">Built for learners</p>
            <h2 className="mt-1.5 text-[28px] sm:text-[40px] leading-[1.1] font-extrabold text-adblue">
              Everything You Need to Succeed in <span className="text-adred">Online Learning</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-md">
              Students get a focused learning experience. Admins and instructors get the tools to run courses, review work and grow
              enrolments.
            </p>
          </div>
        </div>
        <div className="bg-adblue px-6 sm:px-12 py-10 lg:py-14 flex items-center">
          <ol className="w-full max-w-md mx-auto lg:mx-0 space-y-3">
            {FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              const featured = i === 2;
              return (
                <li key={f.title} className={`relative rounded-md p-4 pr-14 ${featured ? 'bg-adblue border border-white/40 text-white' : 'bg-white text-ink'}`}>
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-display font-extrabold text-3xl ${featured ? 'text-white/40' : 'text-grey3'}`}>{String(i + 1).padStart(2, '0')}</span>
                  <p className={`flex items-center gap-2 text-sm font-bold ${featured ? 'text-white' : 'text-adblue'}`}>
                    <Icon className="w-4 h-4 shrink-0" /> {f.title}
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed ${featured ? 'text-white/85' : 'text-slate-400'}`}>{f.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <OfferBanner />

      {/* ───────── Learners experience (real student reviews) ───────── */}
      {reviews.length > 0 && (
        <section id="testimonials" className="bg-grey2 py-16 lg:py-20 scroll-mt-20">
          <div className={WRAP}>
            <SectionHead eyebrow="Testimonial" blue="Learners" red="Experience" text="What students say after finishing their courses." />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {reviews.map((r, i) => {
                const [first, ...rest] = r.student.name.split(' ');
                const video = TESTIMONIAL_VIDEOS[r.student.name];
                return (
                  <Reveal key={r.id} delay={i * 100} className={`relative min-h-[380px] rounded-xl overflow-hidden p-5 flex flex-col text-white shadow-lift ${i === 1 ? 'bg-adblue' : 'bg-[#3a3a3a]'}`}>
                    <p className="flex gap-0.5 text-amber-300" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: r.rating }, (_, n) => <Star key={n} className="w-3.5 h-3.5 fill-current" />)}
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-white/90">“{r.comment}”</p>
                    <p className="mt-5 font-display font-extrabold text-3xl leading-none">{first}</p>
                    <p className="font-display font-bold text-lg leading-tight text-white/80">{rest.join(' ')}</p>
                    <Link href={`/courses/${r.course.slug}`} className="mt-3 text-xs font-semibold leading-snug hover:underline">{r.course.title}</Link>
                    <span className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-white/10 flex items-center justify-center font-display font-extrabold text-4xl text-white/60" aria-hidden>
                      {first.charAt(0)}{rest[0]?.charAt(0)}
                    </span>
                    {video && (
                      <a href={video} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${r.student.name}'s story`} className="mt-auto inline-flex w-12 h-9 rounded-lg bg-[#ff0000] items-center justify-center">
                        <Youtube className="w-6 h-6" />
                      </a>
                    )}
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Expert instructors ───────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] border-y border-grey3/60">
        <div className="relative min-h-[340px] bg-adred overflow-hidden">
          {HOME_IMAGES.instructors ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HOME_IMAGES.instructors} alt="An instructor teaching" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-adred/70 to-transparent" aria-hidden />
            </>
          ) : (
            <InstructorsGraphic instructors={instructors} />
          )}
          <Link href="/instructors" aria-label="Meet our instructors" className="absolute left-8 bottom-8 w-20 h-20 rounded-full bg-white flex items-center justify-center text-adred shadow-lift hover:scale-105 transition-transform">
            <Play className="w-8 h-8 ml-1 fill-current" />
          </Link>
        </div>
        <div className="bg-grey2 px-6 sm:px-12 py-12 lg:py-14">
          <p className="text-xs font-semibold">Mentors &amp; faculty</p>
          <h2 className="mt-1.5 text-[28px] sm:text-[40px] leading-[1.1] font-extrabold text-adblue">
            Learn From Our <br />
            <span className="text-adred">Expert Instructors</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-lg">
            Learn from industry-experienced mentors through practical lessons, interactive live sessions, real-world projects and
            personalised guidance. Develop in-demand skills, build your portfolio and earn certificates that move your career forward.
          </p>
          <p className="mt-6 text-sm font-bold text-adblue">Key features &amp; support we offer</p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {INSTRUCTOR_POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-adblue shrink-0 mt-px" /> {p}
              </li>
            ))}
          </ul>
          <Link href="/instructors" className="mt-7 inline-flex items-center h-11 px-7 rounded-md bg-adblue text-white font-button font-bold hover:brightness-110">
            View all Instructors
          </Link>
        </div>
      </section>

      {/* ───────── Student project showcase (shown once project images are added) ───────── */}
      {HOME_IMAGES.showcase.length > 0 && (
      <section id="showcase" className="py-16 lg:py-20 scroll-mt-20">
        <div className={WRAP}>
          <SectionHead eyebrow="Portfolio" blue="Student" red="Project Showcase" text="A look at the kind of work students build during their courses." />
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {HOME_IMAGES.showcase.map((src, i) => (
              <div key={src + i} className={`relative overflow-hidden rounded-md bg-grey1 group ${i === 3 ? 'sm:col-span-2 aspect-[2/1]' : 'aspect-square'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Student project" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute right-3 bottom-3 w-8 h-8 rounded-full bg-white/85 flex items-center justify-center text-ink">
                  {i % 2 ? <Play className="w-4 h-4 ml-0.5" /> : <ImageIcon className="w-4 h-4" />}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/courses" className="inline-flex items-center h-11 px-7 rounded-md bg-adblue text-white font-button font-bold hover:brightness-110">
              View All Projects
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* ───────── Learning plans ───────── */}
      <Plans />

      {/* ───────── Upcoming live classes ───────── */}
      <section id="live-classes" className="py-16 lg:py-20 scroll-mt-20 border-t border-grey3/60">
        <div className={WRAP}>
          <SectionHead eyebrow="Programme schedule" blue="Upcoming" red="Live Classes & Events" text="Live classes run every week for batch students. Book your seat to join the next one." />
          <div className="mt-10 space-y-5 max-w-4xl mx-auto">
            {sessions === null ? (
              [1, 2].map((n) => <div key={n} className="h-40 rounded-lg skeleton" />)
            ) : sessions.length === 0 ? (
              <p className="text-center text-sm text-slate-500">New live classes will be announced soon.</p>
            ) : (
              sessions.slice(0, 2).map((s) => <LiveEventCard key={s.id} s={s} />)
            )}
          </div>
          <div className="mt-8 text-center">
            <Link href="/courses" className="inline-flex items-center h-11 px-7 rounded-md bg-adblue text-white font-button font-bold hover:brightness-110">
              View All Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── FAQ + advisor ───────── */}
      <section id="faq" className="bg-[#2a8fbd] py-14 scroll-mt-20">
        <div className={WRAP}>
          <div className="rounded-lg bg-white px-5 sm:px-10 py-10 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10">
            <div>
              <p className="text-xs font-semibold">FAQ</p>
              <h2 className="mt-1.5 text-[28px] sm:text-[36px] leading-[1.1] font-extrabold text-adblue">
                Got Questions? <br />
                <span className="text-adred">We Have Answers.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Still not sure? Leave your number and an admissions advisor will call or WhatsApp you, usually within one working day.
              </p>
              <div className="mt-6 rounded-lg border border-grey3 p-4">
                <p className="mb-3 text-sm font-bold text-ink">Have a question? Talk to an advisor</p>
                <EnquiryForm source="HOME_PAGE" compact />
              </div>
              {contact.whatsapp && (
                <a href={whatsappLink(contact.whatsapp, 'Hi, I have a question about a course.')} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-adblue">
                  <MessageCircle className="w-4 h-4 text-emerald-500" /> Chat on WhatsApp: {contact.whatsapp}
                </a>
              )}
            </div>
            <Faq />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/** Three-up carousel of popular courses with page dots, as in the design. */
function PopularCarousel({ courses }: { courses: ReturnType<typeof useCatalog> }) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);
  useEffect(() => {
    const update = () => setPerPage(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  if (!courses) {
    return (
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((n) => <CourseCardSkeleton key={n} />)}
      </div>
    );
  }
  const list = courses.slice(0, 9);
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(page, pages - 1);
  const visible = list.slice(current * perPage, current * perPage + perPage);
  return (
    <div className="mt-8">
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
        {pages > 1 && (
          <>
            <button aria-label="Previous courses" onClick={() => setPage((current - 1 + pages) % pages)} className="hidden sm:flex absolute -left-5 top-1/3 w-10 h-10 rounded-full bg-white shadow-lift items-center justify-center text-adblue hover:bg-adblue hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button aria-label="Next courses" onClick={() => setPage((current + 1) % pages)} className="hidden sm:flex absolute -right-5 top-1/3 w-10 h-10 rounded-full bg-white shadow-lift items-center justify-center text-adblue hover:bg-adblue hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      {pages > 1 && (
        <div className="mt-6 flex justify-center gap-1.5">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} aria-label={`Show courses page ${i + 1}`} aria-current={i === current} onClick={() => setPage(i)} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-8 bg-adred' : 'w-4 bg-grey3'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function Plans() {
  const [term, setTerm] = useState<Record<string, 'annual' | 'twoYear'>>({});
  return (
    <section id="plans" className="relative py-16 lg:py-20 scroll-mt-20 overflow-hidden border-t border-grey3/60">
      {/* low-poly blue backdrop from the design */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-40 bottom-24 bg-[linear-gradient(135deg,#dbeefa_0%,#7cc0ea_25%,#1f7fc4_50%,#9bd0f0_75%,#e6f4fc_100%)] opacity-80 [clip-path:polygon(0_8%,20%_0,45%_10%,70%_2%,100%_9%,100%_92%,75%_100%,50%_93%,25%_100%,0_91%)]"
      />
      <div className={`${WRAP} relative`}>
        <SectionHead eyebrow="Membership" blue="Choose Your" red="Learning Plan" text="The right learning experience for every stage of your journey." />
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLANS.map((p) => {
            const t = term[p.name] || 'annual';
            const price = t === 'annual' ? p.annual : p.twoYear;
            const other = t === 'annual' ? p.twoYear : p.annual;
            return (
              <div key={p.name} className={`rounded-xl bg-white overflow-hidden shadow-lift flex flex-col ${p.highlight ? 'ring-2 ring-adblue md:-translate-y-2' : ''}`}>
                <div className={`px-5 pt-4 text-center ${p.highlight ? 'bg-adblue text-white' : 'bg-grey3/70 text-ink'}`}>
                  <h3 className="text-2xl font-bold">{p.name}</h3>
                  <p className={`text-[11px] ${p.highlight ? 'text-white/85' : 'text-slate-400'}`}>{p.tagline}</p>
                  <div className="mt-3 grid grid-cols-2 text-xs font-semibold" role="tablist" aria-label={`${p.name} plan length`}>
                    {(['annual', 'twoYear'] as const).map((k) => (
                      <button
                        key={k}
                        role="tab"
                        aria-selected={t === k}
                        onClick={() => setTerm({ ...term, [p.name]: k })}
                        className={`py-2 rounded-t-md transition-colors ${t === k ? (p.highlight ? 'bg-white text-adblue' : 'bg-white text-ink') : p.highlight ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-ink'}`}
                      >
                        {k === 'annual' ? 'Annual' : '24 Months'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-5 pt-5 pb-6 flex-1 flex flex-col">
                  <p className="flex items-baseline gap-3">
                    <span className={`font-display font-extrabold text-4xl ${p.highlight ? 'text-adblue' : 'text-ink'}`}>{inr(price)}</span>
                    <span className="font-display font-bold text-2xl text-grey3">{inr(other)}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{t === 'annual' ? 'per year' : 'for 24 months'}</p>
                  <p className="mt-4 text-sm font-bold text-adblue">{p.heading}</p>
                  <ul className="mt-2 divide-y divide-grey3/70 text-xs text-slate-400 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-adblue shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/contact?plan=${encodeURIComponent(`${p.name} (${t === 'annual' ? 'Annual' : '24 Months'})`)}`}
                    className={`mt-5 inline-flex items-center justify-center gap-1.5 h-11 rounded-md font-button font-bold transition-colors ${p.highlight ? 'bg-adblue text-white hover:brightness-110' : 'border border-adblue text-adblue hover:bg-adblue hover:text-white'}`}
                  >
                    {p.name === 'Master' && <LockIcon className="w-4 h-4" />} {p.name === 'Master' ? 'Unlock' : 'Choose'} {p.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 max-w-5xl mx-auto text-right text-[11px]">
          <Link href="/refund-policy" className="text-adred hover:underline">*Subscription Policy</Link>
        </p>
      </div>
    </section>
  );
}

function LiveEventCard({ s }: { s: UpcomingSession }) {
  const d = new Date(s.startsAt);
  const end = new Date(d.getTime() + s.durationMinutes * 60000);
  const time = (x: Date) => x.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_150px] gap-4 rounded-lg bg-grey2 border border-grey3/70 p-3 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
      <div className="aspect-[16/10] sm:aspect-auto rounded-md overflow-hidden bg-adblue">
        {s.course.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.course.thumbnail} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 py-1 flex flex-col">
        <p className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full bg-adblue px-2.5 py-0.5 font-semibold text-white">{s.course.category}</span>
          <span className="font-bold text-adred">Live</span>
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug text-ink line-clamp-2">{s.title}</h3>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2">
          {s.course.title}
          {s.course.instructor?.name ? ` · with ${s.course.instructor.name}` : ''}
        </p>
        <p className="mt-auto pt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Online</span>
          <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.batchName}</span>
        </p>
        <span className="mt-3 block h-1 rounded-full bg-adblue" aria-hidden />
      </div>
      <div className="grid grid-cols-[auto_1fr] sm:flex sm:flex-col items-center gap-3 sm:gap-2 sm:justify-center">
        <div className="rounded-md bg-adblue text-white text-center px-4 py-2 sm:w-full">
          <p className="font-display font-extrabold text-4xl leading-none">{d.toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' })}</p>
          <p className="text-sm font-semibold">{d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' })}</p>
        </div>
        <div className="text-[11px] text-slate-500 sm:text-center">
          <p className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> {time(d)} – {time(end)}</p>
          <p className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })}</p>
        </div>
        <Link href={`/courses/${s.course.slug}`} className="col-span-2 w-full inline-flex items-center justify-center h-10 px-4 rounded-md bg-adblue text-white text-sm font-button font-bold hover:brightness-110">
          Book Your Seat
        </Link>
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <ul className="divide-y divide-grey3">
      {FAQS.map((f, i) => (
        <li key={f.q}>
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-bold text-adblue"
          >
            {f.q}
            {open === i ? <Minus className="w-4 h-4 shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
          </button>
          {open === i && <p className="pb-4 -mt-1 text-sm leading-relaxed text-slate-400 animate-fade-in">{f.a}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Shown above the categories until the client's "WOW!!" photo is added. */
function WowGraphic() {
  return (
    <div className="relative w-full h-full flex items-end justify-center" aria-hidden>
      <div className="absolute left-2 sm:left-6 top-6 sm:top-10 -rotate-6 rounded-[50%] bg-white px-7 py-5 shadow-lift">
        <p className="font-display font-extrabold italic text-3xl sm:text-4xl text-adblue">WOW!!!</p>
      </div>
      <p className="absolute right-4 sm:right-10 top-16 sm:top-24 rotate-6 font-display font-extrabold text-3xl sm:text-4xl text-white">এত কিছু!</p>
      <div className="w-48 sm:w-60 h-40 sm:h-52 rounded-t-full bg-gradient-to-b from-amber-300 to-amber-500 flex items-start justify-center pt-8">
        <LayoutGrid className="w-14 h-14 text-white/90" />
      </div>
    </div>
  );
}

/** Brand graphic for the hero until the client's photo is added: a live preview of the catalogue. */
function HeroGraphic({ courses }: { courses: ReturnType<typeof useCatalog> }) {
  const picks = (courses || []).slice(0, 3);
  return (
    <div className="relative w-full h-full bg-[linear-gradient(140deg,#0064ae_0%,#0a7fd0_55%,#38a3e8_100%)] p-5 sm:p-7 overflow-hidden" aria-hidden>
      <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-white/10" />
      <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-adred/30" />
      <div className="relative grid grid-cols-2 gap-3 h-full">
        {picks.map((c, i) => (
          <div key={c.id} className={`rounded-xl bg-white overflow-hidden shadow-lift ${i === 0 ? 'row-span-2' : ''} flex flex-col`}>
            {c.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnail} alt="" className={`w-full object-cover ${i === 0 ? 'h-2/3' : 'h-1/2'}`} />
            )}
            <div className="p-3 min-w-0">
              <p className="text-[10px] font-semibold text-adblue truncate">{c.category}</p>
              <p className="text-xs font-bold text-ink line-clamp-2">{c.title}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-lift">
        <Award className="w-4 h-4 text-adred" />
        <span className="text-[11px] font-bold text-ink">Certificate with QR verification</span>
      </div>
    </div>
  );
}

/** Graphic beside "Everything you need" until the client's photo is added. */
function FeaturesGraphic() {
  const tiles = [PlayCircle, ClipboardCheck, MessageSquareText, Award, Video, BarChart3];
  return (
    <div className="w-full h-full bg-grey1 flex items-center justify-center p-8" aria-hidden>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {tiles.map((Icon, i) => (
          <span key={i} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-soft ${i === 1 ? 'bg-adred text-white' : i === 4 ? 'bg-adblue text-white' : 'bg-white text-adblue'}`}>
            <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.6} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Red instructor panel built from the real public instructor profiles until a photo is added. */
function InstructorsGraphic({ instructors }: { instructors: PublicInstructor[] }) {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#dc290c_0%,#b8220a_100%)] p-8 flex items-center justify-center" aria-hidden>
      <div className="absolute right-6 top-6 w-40 h-40 rotate-12 rounded-3xl border-[18px] border-white/10" />
      <div className="relative grid grid-cols-2 gap-3 w-full max-w-sm">
        {(instructors.length ? instructors.slice(0, 4) : Array.from({ length: 4 }, () => null)).map((ins, i) => (
          <div key={i} className="rounded-xl bg-white/95 p-3 flex items-center gap-3 shadow-lift">
            {ins?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ins.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <span className="w-11 h-11 rounded-full bg-adblue text-white font-bold flex items-center justify-center shrink-0">
                {ins ? ins.name.replace(/^(Prof\.|Dr\.)\s*/, '').charAt(0) : <GraduationCap className="w-5 h-5" />}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-xs font-bold text-ink truncate">{ins?.name || 'Instructor'}</span>
              <span className="block text-[10px] text-slate-500 truncate">{ins?.headline || ''}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Offer of the month" admissions banner (home and courses pages). */
export function OfferBanner() {
  return (
  <section className="relative">
    <div className="absolute inset-x-0 top-0 h-1/2 bg-grey1" aria-hidden />
    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-adblue" aria-hidden />
    <div className={`${WRAP} relative py-10`}>
      <p className="text-sm text-slate-400 mb-3">Offer of the month</p>
      <div className="relative overflow-hidden rounded-lg bg-white shadow-lift grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] min-h-[220px]">
        <div className="p-6 sm:p-8 flex flex-col justify-center">
          <h3 className="text-2xl sm:text-[32px] leading-[1.1] font-extrabold text-adblue">Transform Future Through Online Skill Building.</h3>
          <p className="mt-3 text-sm text-slate-400">Admissions are open for the next batches, with scholarships through the entrance test.</p>
        </div>
        <div className="relative min-h-[200px] md:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)] bg-adblue">
          {HOME_IMAGES.offerBanner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={HOME_IMAGES.offerBanner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity" />
          )}
          <div className="relative h-full p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-5 text-white">
            <div className="w-28 h-28 shrink-0 rounded-full border-2 border-amber-300 flex flex-col items-center justify-center text-center leading-tight">
              <span className="text-[10px] font-semibold">year online subscription</span>
              <span className="font-display font-extrabold text-2xl text-amber-300">1 Free</span>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider">Admissions</p>
              <p className="font-display font-extrabold text-4xl leading-none">OPEN 2027</p>
              <Link href="/contact?topic=Admissions%202027" className="mt-3 inline-flex items-center h-10 px-6 rounded-full bg-white text-adred font-button font-bold hover:bg-grey1">
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}
