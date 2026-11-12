import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { fetchPublic } from '../../lib/api';
import { withSeo } from '../../lib/site-server';
import { Users, BookOpen, ArrowRight } from 'lucide-react';

export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return withSeo('page:/instructors', {
    title: 'Instructors',
    description: 'Meet the ADSIGN Skill Academy instructors: practising designers, engineers and marketers who teach through real projects.',
    alternates: { canonical: '/instructors' },
  });
}

interface Instructor {
  slug: string;
  name: string;
  avatar?: string | null;
  headline: string;
  skills: string[];
  experienceYears?: number | null;
  courses: number;
  learners: number;
}

export default async function InstructorsPage() {
  const instructors = (await fetchPublic<Instructor[]>('/instructors')) || [];
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <section className="relative overflow-hidden hero-mesh text-white">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 animate-fade-up">
          <p className="text-sm font-semibold text-sky-800">Learn from practitioners</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white">Our instructors</h1>
          <p className="mt-4 max-w-2xl text-night-300 text-lg">
            Every course is taught by people who do this work every day, and who review your projects personally.
          </p>
        </div>
      </section>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {instructors.length === 0 ? (
          <p className="text-center text-slate-500 py-16">Instructor profiles are coming soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((i, idx) => (
              <Link
                key={i.slug}
                href={`/instructors/${i.slug}`}
                className="group rounded-2xl bg-white border border-[#e2e8f0] p-6 shadow-card card-hover animate-fade-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex items-center gap-4">
                  {i.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    <span className="w-16 h-16 rounded-2xl bg-brand-gradient text-white text-2xl font-extrabold flex items-center justify-center">{i.name.charAt(0)}</span>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-ink group-hover:text-indigo-400 transition-colors">{i.name}</h2>
                    <p className="text-sm text-slate-400 line-clamp-2">{i.headline}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {i.skills.slice(0, 5).map((s) => (
                    <span key={s} className="rounded-full bg-indigo-50 text-indigo-300 text-xs font-semibold px-2.5 py-1">{s}</span>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-[#e2e8f0] flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {i.courses} course{i.courses === 1 ? '' : 's'}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {i.learners} learners</span>
                  {i.experienceYears ? <span>{i.experienceYears}+ yrs</span> : null}
                  <ArrowRight className="w-4 h-4 ml-auto text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
