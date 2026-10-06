'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { apiClient } from '../../lib/api';
import { CourseSummary, CourseLevel, PaginatedResponse } from '@academy/shared';
import { Search, BookOpen, Clock, Users, ArrowRight, Filter, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    async function loadCourses() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (selectedLevel !== 'ALL') params.set('level', selectedLevel);
        if (selectedCategory !== 'ALL') params.set('category', selectedCategory);

        const res = await apiClient<PaginatedResponse<CourseSummary>>(`/courses?${params.toString()}`);
        setCourses(res.items || []);
      } catch (err) {
        console.error('Failed to load courses', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourses();
  }, [search, selectedLevel, selectedCategory]);

  const categories = ['ALL', 'Software Engineering', 'Artificial Intelligence', 'DevOps & Cloud'];
  const levels = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf3e6] text-slate-100">
      <Navbar />

      {/* Header Banner */}
      <section className="py-14 bg-[#f8eedd] border-b border-[#eadac4] tech-dot-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="blue" className="mb-2">
            ACADEMIC CATALOG
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Professional Engineering Curriculums
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Rigorous hands-on programs built with server-enforced progression, live code assignments, and verifiable certifications.
          </p>

          {/* Search bar */}
          <div className="mt-6 max-w-xl mx-auto relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses by topic, skill, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#e7d5bd] bg-[#fffbf4] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Main Catalog Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#eadac4] mb-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 border ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-cream border-blue-500'
                    : 'bg-[#fffbf4] text-slate-400 hover:text-ink border-[#e7d5bd]'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">LEVEL:</span>
            <div className="flex items-center gap-1">
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all border ${
                    selectedLevel === lvl
                      ? 'bg-violet-600/20 text-violet-300 border-violet-500/50'
                      : 'bg-[#fffbf4] text-slate-400 border-[#e7d5bd]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 rounded-lg bg-[#fffbf4] border border-[#eadac4] animate-pulse"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#e7d5bd] rounded-lg bg-[#fffbf4] p-8">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-ink">No courses match your filter</h3>
            <p className="text-xs text-slate-400 mt-1">Try resetting your search filters.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedLevel('ALL');
                setSelectedCategory('ALL');
              }}
              className="mt-4 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group rounded-lg border border-[#e7d5bd] bg-[#fffbf4] p-5 flex flex-col justify-between hover:border-blue-500/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge
                      variant={
                        course.level === CourseLevel.BEGINNER
                          ? 'success'
                          : course.level === CourseLevel.INTERMEDIATE
                          ? 'purple'
                          : 'blue'
                      }
                    >
                      {course.level}
                    </Badge>
                    <span className="text-sm font-mono font-bold text-ink">
                      {formatCurrency(course.price, course.currency)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-ink group-hover:text-blue-400 transition-colors line-clamp-2">
                    {course.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="pt-4 mt-5 border-t border-[#eadac4] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      {course.modulesCount || 3} MODULES
                    </span>
                  </div>

                  <Link href={`/courses/${course.slug}`}>
                    <Button variant="primary" size="sm" className="gap-1">
                      <span>Enroll</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
