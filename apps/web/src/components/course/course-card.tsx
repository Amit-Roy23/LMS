import React from 'react';
import Link from 'next/link';
import { BookOpen, Star, Users, PlayCircle } from 'lucide-react';

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  level?: string | null;
  price?: number | null;
  currency?: string | null;
  modulesCount?: number;
  lessonsCount?: number;
  enrolledStudentsCount?: number;
  averageRating?: number | null;
  reviewsCount?: number;
  instructor?: { name?: string | null } | null;
}

const LEVEL_STYLES: Record<string, string> = {
  BEGINNER: 'bg-emerald-50 text-emerald-300',
  INTERMEDIATE: 'bg-amber-50 text-amber-300',
  ADVANCED: 'bg-rose-50 text-rose-300',
};

export function formatPrice(amount?: number | null, currency?: string | null) {
  if (amount == null) return '';
  if (amount === 0) return 'Free';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || ''} ${amount}`;
  }
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const level = (course.level || '').toUpperCase();
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col h-full rounded-2xl bg-white border border-[#e2e8f0] overflow-hidden card-hover"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-night-900">
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-brand-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night-950/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
          <PlayCircle className="w-3.5 h-3.5 text-indigo-400" /> View course
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {course.category && (
            <span className="text-xs font-semibold text-indigo-400">{course.category}</span>
          )}
          {level && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_STYLES[level] || 'bg-cream-100 text-slate-300'}`}>
              {level.charAt(0) + level.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        <h3 className="text-[17px] font-bold leading-snug text-ink group-hover:text-indigo-300 transition-colors line-clamp-2">
          {course.title}
        </h3>
        {course.description && <p className="text-sm text-slate-400 line-clamp-2">{course.description}</p>}

        <div className="flex items-center gap-4 text-xs text-slate-500 mt-auto pt-1">
          {course.averageRating != null && (
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {course.averageRating.toFixed(1)}
              <span className="font-normal text-slate-500">({course.reviewsCount})</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {course.lessonsCount ?? 0} lessons
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {course.enrolledStudentsCount ?? 0}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#e2e8f0]">
          <span className="text-xs text-slate-500 truncate">
            {course.instructor?.name ? `by ${course.instructor.name}` : ''}
          </span>
          <span className="text-base font-extrabold text-ink">{formatPrice(course.price, course.currency)}</span>
        </div>
      </div>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-[#e2e8f0] overflow-hidden">
      <div className="aspect-[16/9] skeleton" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-24 rounded skeleton" />
        <div className="h-5 w-full rounded skeleton" />
        <div className="h-4 w-2/3 rounded skeleton" />
        <div className="h-8 w-full rounded skeleton mt-4" />
      </div>
    </div>
  );
}
