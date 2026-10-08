'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Progress } from '../../../../components/ui/progress';
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Radio,
  Clock,
  Calendar,
  FileText,
  HelpCircle,
  FileCode2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { DeliveryMode, ModuleStatus } from '@academy/shared';
import { formatDuration } from '../../../../lib/utils';

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || '';

  const [curriculum, setCurriculum] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [currRes, courseRes] = await Promise.all([
          apiClient<any>(`/student/courses/${courseId}/curriculum`),
          apiClient<any>(`/courses/id/${courseId}`),
        ]);

        setCurriculum(currRes);
        setCourse(courseRes);

        // Auto-expand first unlocked module
        if (currRes?.modules?.length > 0) {
          const firstUnlocked = currRes.modules.find((m: any) => !m.isLocked) || currRes.modules[0];
          setExpandedModules({ [firstUnlocked.id]: true });
        }
      } catch (err) {
        console.error('Failed to load course curriculum', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (courseId) loadData();
  }, [courseId]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6 animate-pulse">
        <div className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-xl bg-slate-900/40 border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const isLive = curriculum?.mode === DeliveryMode.LIVE;
  const progressPercent = Math.round(curriculum?.progressPercent || 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Course Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <Badge
                variant={isLive ? 'purple' : 'primary'}
                className="gap-1.5 font-bold uppercase tracking-wider text-[10px] px-3 py-1"
              >
                {isLive ? (
                  <>
                    <Radio className="w-3.5 h-3.5 animate-pulse text-purple-300" /> Live Cohort
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 text-indigo-300" /> Self-Paced Recorded
                  </>
                )}
              </Badge>

              {curriculum?.batch && (
                <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700/50">
                  {curriculum.batch.className || curriculum.batch.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {course?.title || 'Academic Course Curriculum'}
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
              {course?.description}
            </p>

            {isLive && curriculum?.batch?.scheduleText && (
              <div className="flex items-center gap-2 text-xs text-amber-400/90 font-mono pt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule: {curriculum.batch.scheduleText}</span>
              </div>
            )}
          </div>

          {/* Right Action: Resume / Start Button */}
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800/80">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Overall Completion
                </span>
                <span className="text-sm font-mono font-bold text-indigo-400">
                  {progressPercent}% Complete
                </span>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-ink">
                {progressPercent}%
              </div>
            </div>

            <Link href={`/student/courses/${courseId}/learn`}>
              <Button variant="primary" size="lg" className="gap-2 shadow-xl shadow-indigo-600/25">
                <PlayCircle className="w-5 h-5" />
                <span>Continue where you left off</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Curriculum Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Course Modules & Progression</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {curriculum?.modules?.length || 0} Modules
          </span>
        </div>

        <div className="space-y-4">
          {curriculum?.modules?.map((mod: any, idx: number) => {
            const isExpanded = !!expandedModules[mod.id];
            const isLocked = !!mod.isLocked;
            const isCompleted = mod.status === ModuleStatus.COMPLETED;

            return (
              <div
                key={mod.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isLocked
                    ? 'border-slate-800/50 bg-slate-900/20 opacity-70'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-slate-900/80'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                {/* Module Header */}
                <div
                  onClick={() => !isLocked && toggleModule(mod.id)}
                  className={`p-5 flex items-center justify-between gap-4 cursor-pointer select-none ${
                    isLocked ? 'cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isLocked
                          ? 'bg-slate-800 text-slate-500 border-slate-700'
                          : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          Module {idx + 1}
                        </span>
                        {isLocked && (
                          <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Prerequisites Required
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-ink truncate mt-0.5">{mod.title}</h3>
                    </div>
                  </div>

                  {/* 3 Step Chips: Lessons -> Quiz -> Assignment */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {/* Step 1: Lessons */}
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>{mod.lessons?.length || 0} Lessons</span>
                    </span>

                    {/* Step 2: Quiz */}
                    {mod.requiresQuiz !== false && (
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${
                          mod.quizDetail?.isLocked
                            ? 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                        }`}
                      >
                        {mod.quizDetail?.isLocked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <HelpCircle className="w-3 h-3" />
                        )}
                        <span>Quiz</span>
                      </span>
                    )}

                    {/* Step 3: Assignment */}
                    {mod.requiresAssignment !== false && (
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${
                          mod.assignmentDetail?.isLocked
                            ? 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {mod.assignmentDetail?.isLocked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <FileCode2 className="w-3 h-3" />
                        )}
                        <span>Assignment</span>
                      </span>
                    )}

                    {!isLocked && (
                      <div className="ml-2 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Module Lessons List */}
                {isExpanded && !isLocked && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 divide-y divide-slate-800/40">
                    {mod.lessons?.map((lesson: any, lIdx: number) => {
                      const lessonCompleted = lesson.isCompleted;
                      const lessonLocked = lesson.isLocked;

                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                            lessonLocked ? 'opacity-60' : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                                lessonCompleted
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : lessonLocked
                                  ? 'bg-slate-800 text-slate-500'
                                  : 'bg-indigo-600/10 text-indigo-400'
                              }`}
                            >
                              {lessonCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : lessonLocked ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <PlayCircle className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-ink truncate">
                                  {lesson.title}
                                </span>
                                {lesson.isPreview && (
                                  <Badge variant="primary" className="text-[9px] py-0 px-1.5">
                                    Free Preview
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
                                <span>{formatDuration(lesson.durationSeconds || 600)}</span>
                                {lesson.percent > 0 && (
                                  <span>• {Math.round(lesson.percent)}% watched</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            {lessonLocked ? (
                              <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : (
                              <Link
                                href={`/student/courses/${courseId}/learn/${lesson.id}`}
                              >
                                <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5">
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>{lessonCompleted ? 'Rewatch' : 'Watch'}</span>
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Step Placeholders: Quiz & Assignment */}
                    {mod.requiresQuiz !== false && (
                      <div className="p-4 bg-slate-950/70 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-300 block">
                              Module Assessment Quiz
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {mod.quizDetail?.isLocked
                                ? 'Unlocks automatically once all module video tutorials are watched'
                                : 'Available to take'}
                            </span>
                          </div>
                        </div>

                        <div>
                          {mod.quizDetail?.isLocked ? (
                            <Badge variant="purple" className="text-[10px] opacity-60">
                              Locked Placeholder
                            </Badge>
                          ) : (
                            <Link href={`/student/courses/${courseId}/learn`}>
                              <Button variant="primary" size="sm" className="h-8 text-xs">
                                Open Quiz
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
