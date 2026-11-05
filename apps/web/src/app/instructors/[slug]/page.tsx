import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { CourseCard } from '../../../components/course/course-card';
import { fetchPublic } from '../../../lib/api';
import { SITE_URL } from '../../../lib/site';
import { Star, Users, BookOpen, Briefcase, Linkedin, Github, Globe, Youtube, Instagram } from 'lucide-react';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const SOCIAL_ICONS: Record<string, any> = { linkedin: Linkedin, github: Github, website: Globe, youtube: Youtube, instagram: Instagram, behance: Globe, dribbble: Globe };

async function getInstructor(slug: string) {
  return fetchPublic<any>(`/instructors/${slug}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getInstructor(slug);
  if (!p) return { title: 'Instructor' };
  return {
    title: `${p.name}, ${p.headline}`,
    description: String(p.bio).slice(0, 160),
    alternates: { canonical: `/instructors/${slug}` },
    openGraph: { type: 'profile', title: p.name, description: p.headline, url: `/instructors/${slug}` },
  };
}

export default async function InstructorProfilePage({ params }: Props) {
  const { slug } = await params;
  const p = await getInstructor(slug);
  if (!p) notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    jobTitle: p.headline,
    description: p.bio,
    url: `${SITE_URL}/instructors/${slug}`,
    worksFor: { '@type': 'Organization', name: 'ADSIGN Skill Academy' },
    knowsAbout: p.skills,
    sameAs: Object.values(p.socials || {}),
  };
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <section className="relative overflow-hidden hero-mesh text-white">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 flex flex-col md:flex-row md:items-center gap-8 animate-fade-up">
          {p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt="" className="w-28 h-28 rounded-3xl object-cover ring-4 ring-white/10" />
          ) : (
            <span className="w-28 h-28 rounded-3xl bg-brand-gradient text-white text-5xl font-extrabold flex items-center justify-center ring-4 ring-white/10">{p.name.charAt(0)}</span>
          )}
          <div className="min-w-0">
            <Link href="/instructors" className="text-sm font-semibold text-sky-800 hover:text-white">← All instructors</Link>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">{p.name}</h1>
            <p className="mt-1 text-lg text-night-300">{p.headline}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-night-300">
              {p.averageRating ? (
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {p.averageRating} ({p.reviewsCount} reviews)</span>
              ) : null}
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {p.learners} learners</span>
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {p.courses.length} courses</span>
              {p.experienceYears ? <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {p.experienceYears}+ years in industry</span> : null}
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="text-xl font-bold text-ink">About</h2>
            <p className="mt-3 text-slate-300 leading-relaxed whitespace-pre-line">{p.bio}</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-ink">Courses by {p.name.split(' ')[0]}</h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {p.courses.map((c: any) => (
                <CourseCard key={c.id} course={{ ...c, instructor: { name: p.name } }} />
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 shadow-card">
            <h2 className="font-bold text-ink">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.skills.map((s: string) => (
                <span key={s} className="rounded-full bg-indigo-50 text-indigo-300 text-xs font-semibold px-2.5 py-1">{s}</span>
              ))}
            </div>
          </div>
          {Object.keys(p.socials || {}).length > 0 && (
            <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 shadow-card">
              <h2 className="font-bold text-ink">Find {p.name.split(' ')[0]} online</h2>
              <ul className="mt-3 space-y-2">
                {Object.entries<string>(p.socials).map(([k, url]) => {
                  const Icon = SOCIAL_ICONS[k] || Globe;
                  return (
                    <li key={k}>
                      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 capitalize">
                        <Icon className="w-4 h-4" /> {k}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </main>
      <Footer />
    </div>
  );
}
