'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import {
  BookOpen,
  PlayCircle,
  Radio,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Video,
} from 'lucide-react';
import { DeliveryMode } from '@academy/shared';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStudentCourses() {
      try {
        setIsLoading(true);
        const res = await apiClient<any[]>('/student/courses');
        setCourses(res || []);
      } catch (err) {
        console.error('Failed to load student courses', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudentCourses();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">My Registered Courses</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Access your registered curriculum, track real-time video watch progress, and join live batch sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" className="px-3 py-1 text-xs">
            {courses.length} Active {courses.length === 1 ? 'Course' : 'Courses'}
          </Badge>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/40">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">No active enrollments found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You are not currently enrolled in any courses. Browse our academic tracks to start learning.
          </p>
          <Link href="/courses">
            <Button variant="primary" size="sm" className="mt-5">
              Browse Course Catalog
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((item) => {
            const isLive = item.mode === DeliveryMode.LIVE;
            const progressPct = Math.round(item.progressPercent || 0);

            return (
              <Card
                key={item.id}
                className="border-slate-800 bg-slate-900/80 hover:border-indigo-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Mode & Status Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isLive ? 'purple' : 'primary'}
                        className="gap-1.5 font-bold uppercase tracking-wider text-[10px] px-2.5 py-1"
                      >
                        {isLive ? (
                          <>
                            <Radio className="w-3 h-3 animate-pulse text-purple-300" /> Live Cohort
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3 text-indigo-300" /> Self-Paced
                          </>
                        )}
                      </Badge>

                      {item.batch && (
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                          {item.batch.className || item.batch.name}
                        </span>
                      )}
                    </div>

                    {item.status === 'COMPLETED' ? (
                      <Badge variant="success" className="gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Certified
                      </Badge>
                    ) : (
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {progressPct}% Complete
                      </span>
                    )}
                  </div>

                  {/* Course Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-ink group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Curriculum Progression</span>
                      <span>{progressPct}%</span>
                    </div>
                    <Progress value={progressPct} className="h-2 bg-slate-800" />
                  </div>

                  {/* Next Up Lesson Card */}
                  {item.nextLesson && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                          <PlayCircle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            Up Next
                          </span>
                          <span className="text-xs font-medium text-slate-200 truncate block">
                            {item.nextLesson.title}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Batch Schedule Text (for Live mode) */}
                  {isLive && item.batch?.scheduleText && (
                    <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 font-mono">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.batch.scheduleText}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <Link
                    href={`/student/courses/${item.id}`}
                    className="text-xs font-semibold text-slate-400 hover:text-ink transition-colors"
                  >
                    View Curriculum
                  </Link>

                  <Link href={`/student/courses/${item.id}/learn`}>
                    <Button variant="primary" size="sm" className="gap-2 shadow-lg shadow-indigo-500/20">
                      <PlayCircle className="w-4 h-4" />
                      <span>{progressPct > 0 ? 'Resume Course' : 'Start Learning'}</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
