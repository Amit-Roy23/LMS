'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { CourseCard, CourseCardSkeleton } from '../../components/course/course-card';
import { OfferBanner, Plans } from '../../components/marketing/home-page';
import { useCatalog, categoriesOf } from '../../lib/catalog';
import { Search, SearchX, X, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal } from 'lucide-react';

const LEVELS = [
  ['', 'All levels'],
  ['BEGINNER', 'Beginner'],
  ['INTERMEDIATE', 'Intermediate'],
  ['ADVANCED', 'Advanced'],
] as const;
const PER_PAGE = 9;

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <Catalogue />
    </Suspense>
  );
}

/**
 * Course catalogue from the client design. Filters live in the address (?q=&category=&level=&page=),
 * so a filtered list can be shared or linked from an ad or a menu.
 */
function Catalogue() {
  const router = useRouter();
  const pathname = usePathname() || '/courses';
  const params = useSearchParams() ?? new URLSearchParams();
  const courses = useCatalog();
  const categories = useMemo(() => categoriesOf(courses || []), [courses]);

  const q = params.get('q') || '';
  const level = (params.get('level') || '').toUpperCase();
  const selected = useMemo(() => (params.get('category') || '').split(',').map((c) => c.trim()).filter(Boolean), [params]);
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const [query, setQuery] = useState(q);
  const [showCats, setShowCats] = useState(false);
  useEffect(() => setQuery(q), [q]);

  const update = (next: Record<string, string | null>, resetPage = true) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    if (resetPage && !('page' in next)) sp.delete('page');
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleCategory = (name: string) => {
    const next = selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name];
    update({ category: next.join(',') || null });
  };

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (courses || []).filter((c) => {
      if (selected.length && !selected.includes(c.category || '')) return false;
      if (level && (c.level || '').toUpperCase() !== level) return false;
      if (words.length) {
        const text = `${c.title} ${c.description || ''} ${c.category || ''} ${c.instructor?.name || ''}`.toLowerCase();
        if (!words.every((w) => text.includes(w))) return false;
      }
      return true;
    });
  }, [courses, q, level, selected]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const hasFilters = !!(q || level || selected.length);

  const goPage = (n: number) => {
    update({ page: n > 1 ? String(n) : null }, false);
    document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink">
      <Navbar />

      {/* Hero with search */}
      <section className="relative overflow-hidden bg-[#1d232c] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,rgba(0,100,174,0.55)_0%,transparent_60%),radial-gradient(50%_70%_at_10%_90%,rgba(220,41,12,0.25)_0%,transparent_60%)]" aria-hidden />
        <div className="absolute inset-0 grid-lines opacity-60 pointer-events-none" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-36 lg:pt-20 lg:pb-44 text-center animate-fade-up">
          <p className="text-sm font-semibold text-white/85">Popular programs</p>
          <h1 className="mt-2 text-[32px] sm:text-[48px] lg:text-[56px] leading-[1.05] font-extrabold text-white">Find the program that fits your goals</h1>
          <p className="mt-4 text-white/80 max-w-xl mx-auto text-sm sm:text-base">
            Technology, design and marketing programs with video lessons, projects, mentor reviews and verifiable certificates.
          </p>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: query.trim() || null });
            }}
            className="mt-8 max-w-2xl mx-auto flex items-center gap-2 rounded-lg bg-white p-2 shadow-lift"
          >
            <Search className="w-6 h-6 text-slate-500 ml-2 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Course / Skills / Categories / Softwares / Application"
              aria-label="Search courses"
              className="flex-1 min-w-0 h-11 bg-transparent text-sm text-ink placeholder:text-slate-500 focus:outline-none"
            />
            <button type="submit" className="h-11 px-5 sm:px-8 rounded-md bg-adblue text-white font-button font-bold hover:brightness-110">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Catalogue panel overlapping the hero */}
      <section id="catalogue" className="relative scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 lg:-mt-32 relative z-10">
          <div className="rounded-xl bg-white shadow-lift border-b-[6px] border-adblue p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-6">
              {/* Categories */}
              <aside>
                <button
                  type="button"
                  onClick={() => setShowCats((v) => !v)}
                  aria-expanded={showCats}
                  className="w-full flex items-center justify-between gap-2 rounded-md bg-adblue px-3 py-2.5 text-sm font-button font-bold text-white lg:cursor-default"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 lg:hidden" /> All Categories
                    {selected.length > 0 && <span className="rounded-full bg-white/25 px-1.5 text-[11px]">{selected.length}</span>}
                  </span>
                  <ChevronDown className={`w-4 h-4 lg:hidden transition-transform ${showCats ? 'rotate-180' : ''}`} />
                </button>
                <ul className={`mt-2 space-y-1.5 ${showCats ? 'block' : 'hidden'} lg:block`}>
                  {(categories.length ? categories : Array.from({ length: 6 }, () => null)).map((c, i) =>
                    c ? (
                      <li key={c.name}>
                        <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${selected.includes(c.name) ? 'border-adblue bg-adblue/5 text-adblue' : 'border-grey3 text-ink hover:border-adblue'}`}>
                          <input type="checkbox" checked={selected.includes(c.name)} onChange={() => toggleCategory(c.name)} className="w-4 h-4 accent-[#0064ae]" />
                          <span className="flex-1">{c.name}</span>
                          <span className="text-[10px] font-medium text-slate-500">{c.count}</span>
                        </label>
                      </li>
                    ) : (
                      <li key={i} className="h-9 rounded-md skeleton" />
                    )
                  )}
                </ul>
              </aside>

              {/* Results */}
              <div className="min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-slate-400" aria-live="polite">
                    {courses ? (
                      <>
                        <b className="text-ink">{filtered.length}</b> {filtered.length === 1 ? 'course' : 'courses'}
                        {q && <> for “<b className="text-ink">{q}</b>”</>}
                      </>
                    ) : (
                      'Loading courses…'
                    )}
                    {hasFilters && (
                      <button
                        onClick={() => {
                          setQuery('');
                          router.replace(pathname, { scroll: false });
                        }}
                        className="ml-3 inline-flex items-center gap-1 text-xs font-semibold text-adred hover:underline"
                      >
                        <X className="w-3.5 h-3.5" /> Clear filters
                      </button>
                    )}
                  </p>
                  <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Level">
                    {LEVELS.map(([value, label]) => (
                      <button
                        key={label}
                        role="tab"
                        aria-selected={level === value}
                        onClick={() => update({ level: value || null })}
                        className={`shrink-0 h-8 px-3 rounded-md text-xs font-button font-semibold transition-colors ${level === value ? 'bg-adblue/10 text-adblue' : 'text-slate-400 hover:text-ink'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  {!courses ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((n) => <CourseCardSkeleton key={n} />)}
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-grey3 py-16 text-center">
                      <SearchX className="w-10 h-10 text-slate-500 mx-auto" />
                      <h2 className="mt-4 text-lg font-bold">No courses match your filters</h2>
                      <p className="mt-1 text-sm text-slate-400">Try a different keyword or clear the filters.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {visible.map((c) => <CourseCard key={c.id} course={c} />)}
                    </div>
                  )}
                </div>

                {pages > 1 && (
                  <nav className="mt-8 flex justify-end items-center gap-1.5" aria-label="Pages">
                    <button aria-label="Previous page" disabled={current === 1} onClick={() => goPage(current - 1)} className="w-8 h-8 rounded-md border border-grey3 flex items-center justify-center disabled:opacity-40 hover:border-adblue">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        aria-current={n === current ? 'page' : undefined}
                        onClick={() => goPage(n)}
                        className={`w-8 h-8 rounded-md text-sm font-button font-semibold ${n === current ? 'bg-adred text-white' : 'border border-grey3 hover:border-adblue'}`}
                      >
                        {n}
                      </button>
                    ))}
                    <button aria-label="Next page" disabled={current === pages} onClick={() => goPage(current + 1)} className="w-8 h-8 rounded-md border border-grey3 flex items-center justify-center disabled:opacity-40 hover:border-adblue">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </nav>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="h-10 bg-grey1 -mt-1" aria-hidden />
      </section>

      <OfferBanner />
      <Plans />
      <Footer />
    </div>
  );
}
