import React from 'react';
import Link from 'next/link';
import { BookOpen, Star, Users, Clock3, Eye } from 'lucide-react';

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
  totalDurationSeconds?: number;
  enrolledStudentsCount?: number;
  averageRating?: number | null;
  reviewsCount?: number;
  instructor?: { name?: string | null } | null;
}

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

/** 27000 -> "7hrs 30mins", 3000 -> "50mins". */
export function formatDurationShort(seconds?: number | null) {
  const total = Math.round((seconds || 0) / 60);
  if (!total) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h ? `${h}hr${h === 1 ? '' : 's'}` : '', m ? `${m}min${m === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ');
}

const titleCase = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

/** Course card from the client design: ribbon, category pill, level, rating, lessons, duration, red "View Course". */
export function CourseCard({ course }: { course: CourseCardData }) {
  const level = (course.level || '').toUpperCase();
  const free = !course.price;
  const duration = formatDurationShort(course.totalDurationSeconds);
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col h-full rounded-xl bg-white border border-grey3 overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_rgba(0,100,174,0.16)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-grey1">
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-brand-gradient" />
        )}
        <span className={`absolute top-3 left-0 px-3 py-1 text-[11px] font-button font-bold text-white rounded-r-md ${free ? 'bg-adred' : 'bg-adblue'}`}>
          {free ? 'Free' : 'Paid'}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2.5">
        <div className="flex items-center gap-2 text-[11px]">
          {course.category && <span className="rounded-full bg-adblue px-2.5 py-0.5 font-semibold text-white truncate max-w-[60%]">{course.category}</span>}
          {level && <span className="font-medium text-slate-500">{titleCase(level)}</span>}
          <span className="ml-auto flex items-center gap-2 text-slate-500 shrink-0">
            {course.averageRating != null && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {course.averageRating.toFixed(1)}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5" title="Learners">
              <Users className="w-3.5 h-3.5" /> {course.enrolledStudentsCount ?? 0}
            </span>
          </span>
        </div>

        <h3 className="text-[17px] font-bold leading-snug text-adblue line-clamp-2">{course.title}</h3>
        {course.description && <p className="text-xs leading-relaxed text-slate-400 line-clamp-3">{course.description}</p>}

        <div className="flex items-center gap-4 text-xs text-slate-500 mt-auto pt-1">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> {course.lessonsCount ?? 0} Lessons
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5" /> {duration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-grey3">
          <span className="text-[11px] text-slate-500 truncate flex-1">{course.instructor?.name ? `by ${course.instructor.name}` : 'by Adsign Team'}</span>
          <span className="inline-flex items-center gap-1 rounded bg-adred px-2.5 py-1 text-[11px] font-button font-bold text-white group-hover:brightness-110">
            <Eye className="w-3.5 h-3.5" /> View Course
          </span>
          <span className="text-sm font-extrabold text-adblue">{formatPrice(course.price, course.currency)}</span>
        </div>
      </div>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="rounded-xl bg-white border border-grey3 overflow-hidden">
      <div className="aspect-[16/10] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-24 rounded skeleton" />
        <div className="h-5 w-full rounded skeleton" />
        <div className="h-4 w-2/3 rounded skeleton" />
        <div className="h-8 w-full rounded skeleton mt-4" />
      </div>
    </div>
  );
}
