'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Reveal } from '../../components/motion/reveal';
import { CourseCard, CourseCardData, CourseCardSkeleton } from '../../components/course/course-card';
import { apiClient } from '../../lib/api';
import { Search, SearchX, X } from 'lucide-react';

const LEVELS = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseCardData[] | null>(null);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('ALL');
  const [category, setCategory] = useState('ALL');

  // Load the catalogue once; filtering happens instantly in the browser
  useEffect(() => {
    apiClient<{ items: CourseCardData[] }>('/courses?limit=50')
      .then((res) => setCourses(res.items || []))
      .catch(() => setCourses([]));
  }, []);

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set((courses || []).map((c) => c.category).filter(Boolean) as string[])).sort()],
    [courses]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (courses || []).filter(
      (c) =>
        (category === 'ALL' || c.category === category) &&
        (level === 'ALL' || (c.level || '').toUpperCase() === level) &&
        (!q || `${c.title} ${c.description || ''} ${c.category || ''}`.toLowerCase().includes(q))
    );
  }, [courses, search, level, category]);

  const hasFilters = search || level !== 'ALL' || category !== 'ALL';

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      <Navbar />

      <section className="relative overflow-hidden hero-mesh text-white">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center animate-fade-up">
          <p className="text-sm font-semibold text-indigo-500">Course catalogue</p>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Find the program that fits your goals
          </h1>
          <p className="mt-4 text-night-300 max-w-2xl mx-auto">
            Technology, design and marketing programs with video lessons, projects, mentor reviews and
            verifiable certificates.
          </p>
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="search"
              placeholder="Search by skill, topic or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search courses"
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-ink text-base placeholder:text-slate-500 shadow-lift focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
            />
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  category === c
                    ? 'bg-ink text-white border-transparent'
                    : 'bg-white text-slate-300 border-[#e2e8f0] hover:border-indigo-500 hover:text-indigo-400'
                }`}
              >
                {c === 'ALL' ? 'All categories' : c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-xl bg-white border border-[#e2e8f0] p-1">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    level === l ? 'bg-indigo-50 text-indigo-300' : 'text-slate-400 hover:text-ink'
                  }`}
                >
                  {l === 'ALL' ? 'All levels' : l.charAt(0) + l.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              {courses && (
                <span>
                  <b className="text-ink">{filtered.length}</b> {filtered.length === 1 ? 'course' : 'courses'}
                </span>
              )}
              {hasFilters && (
                <button
                  onClick={() => {
                    setSearch('');
                    setLevel('ALL');
                    setCategory('ALL');
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  <X className="w-4 h-4" /> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {courses === null ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-white border border-dashed border-[#cbd5e1] animate-fade-in">
            <SearchX className="w-10 h-10 mx-auto text-slate-600" />
            <h2 className="mt-4 text-lg font-bold text-ink">No courses match your filters</h2>
            <p className="mt-1 text-sm text-slate-400">Try a different keyword or clear the filters.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => (
              <Reveal key={c.id} delay={(i % 3) * 80} className="h-full">
                <CourseCard course={c} />
              </Reveal>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
