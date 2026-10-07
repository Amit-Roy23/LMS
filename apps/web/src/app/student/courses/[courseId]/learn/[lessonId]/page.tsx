'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../../../lib/api';
import { VideoPlayer } from '../../../../../../components/video/video-player';
import { Button } from '../../../../../../components/ui/button';
import { Badge } from '../../../../../../components/ui/badge';
import { Card, CardContent } from '../../../../../../components/ui/card';
import { Progress } from '../../../../../../components/ui/progress';
import { Textarea, Input } from '../../../../../../components/ui/input';
import { useToast } from '../../../../../../providers/toast-provider';
import {
  PlayCircle,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  FileText,
  Bookmark,
  BookmarkCheck,
  Clock,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  Radio,
  Calendar,
  ExternalLink,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { formatDuration } from '../../../../../../lib/utils';
import { PracticeStatus } from '@academy/shared';

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || '';
  const lessonId = (params?.lessonId as string) || '';
  const { success, error: toastError, info } = useToast();

  const [lessonData, setLessonData] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [accessError, setAccessError] = useState<{ reasonCode: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs: overview | resources | practice | notes | qa
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'practice' | 'notes' | 'qa'>('overview');

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Practice state
  const [practiceTasks, setPracticeTasks] = useState<any[]>([]);

  // Load lesson & curriculum
  const loadLessonAndCurriculum = useCallback(async () => {
    try {
      setIsLoading(true);
      setAccessError(null);

      const [curriculumRes, lessonRes] = await Promise.all([
        apiClient<any>(`/student/courses/${courseId}/curriculum`),
        apiClient<any>(`/student/lessons/${lessonId}`).catch((err) => {
          if (err?.code || err?.details?.reasonCode) {
            setAccessError({
              reasonCode: err?.details?.reasonCode || err?.code || 'FORBIDDEN',
              message: err.message || 'Access Denied',
            });
            return null;
          }
          throw err;
        }),
      ]);

      setCurriculum(curriculumRes);

      if (lessonRes) {
        setLessonData(lessonRes);
        setIsBookmarked(!!lessonRes.isBookmarked);
        setPracticeTasks(lessonRes.practiceTasks || []);

        // Fetch notes
        apiClient<any[]>(`/student/lessons/${lessonId}/notes`)
          .then((notesData) => setNotes(notesData || []))
          .catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to load lesson', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    if (courseId && lessonId) {
      loadLessonAndCurriculum();
    }
  }, [courseId, lessonId, loadLessonAndCurriculum]);

  // Handle Mark as Complete manual button
  const handleMarkComplete = async () => {
    try {
      await apiClient(`/student/lessons/${lessonId}/complete`, { method: 'POST' });
      success('Lesson Completed', 'Great job! Your progression has been updated.');
      loadLessonAndCurriculum();
    } catch (err: any) {
      toastError('Cannot Complete', err.message || 'Complete the required watch threshold first.');
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = async () => {
    try {
      const res = await apiClient<{ isBookmarked: boolean }>(`/student/lessons/${lessonId}/bookmark`, {
        method: 'POST',
      });
      setIsBookmarked(res.isBookmarked);
      success(res.isBookmarked ? 'Bookmarked' : 'Bookmark removed');
    } catch (err) {
      toastError('Error', 'Failed to update bookmark');
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      const created = await apiClient<any>(`/student/lessons/${lessonId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          text: newNoteText,
          timestampSeconds: lessonData?.progress?.lastPositionSeconds || 0,
        }),
      });
      setNotes((prev) => [created, ...prev]);
      setNewNoteText('');
      success('Note saved');
    } catch (err) {
      toastError('Error', 'Failed to save note');
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await apiClient(`/student/lessons/${lessonId}/notes/${noteId}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      info('Note deleted');
    } catch (err) {
      toastError('Error', 'Failed to delete note');
    }
  };

  // Update Practice Progress
  const handleUpdatePracticeStatus = async (taskId: string, newStatus: PracticeStatus, notes?: string) => {
    try {
      await apiClient(`/student/practice/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, notes }),
      });

      setPracticeTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, progress: { ...(t.progress || {}), status: newStatus, notes: notes ?? t.progress?.notes } }
            : t
        )
      );
      success('Practice updated');
    } catch (err) {
      toastError('Error', 'Failed to update practice progress');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-8 animate-pulse">
        <div className="w-full aspect-video bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOCKED / FORBIDDEN REASON CODE SCREENS
  // -------------------------------------------------------------
  if (accessError) {
    const { reasonCode, message } = accessError;

    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 border-slate-800 bg-slate-900/90 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="purple" className="font-mono text-xs uppercase tracking-wider">
              {reasonCode}
            </Badge>
            <h2 className="text-xl font-bold text-ink">Lesson Access Restricted</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">{message}</p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
            {reasonCode === 'PAYMENT_PENDING' && (
              <Link href={`/courses`}>
                <Button variant="primary" size="sm">
                  Complete Payment
                </Button>
              </Link>
            )}

            {reasonCode === 'PREVIOUS_LESSON_INCOMPLETE' && (
              <Link href={`/student/courses/${courseId}`}>
                <Button variant="primary" size="sm">
                  Watch Prior Lesson
                </Button>
              </Link>
            )}

            {reasonCode === 'LIVE_SESSION_NOT_STARTED' && (
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-xs text-indigo-300 font-mono">
                Live class scheduled soon. The join button unlocks 15 mins prior.
              </div>
            )}

            <Link href={`/student/courses/${courseId}`}>
              <Button variant="secondary" size="sm">
                Back to Curriculum
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Flattened ordered lessons for next/prev navigation
  const allLessons: any[] = [];
  curriculum?.modules?.forEach((m: any) => {
    m.lessons?.forEach((l: any) => allLessons.push({ ...l, moduleId: m.id, moduleTitle: m.title }));
  });

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Check if all lessons in current module are complete
  const currentModule = curriculum?.modules?.find((m: any) => m.id === lessonData?.moduleId);
  const allModuleLessonsDone = currentModule?.lessons?.every((l: any) => l.isCompleted || l.id === lessonId && lessonData?.progress?.percent >= 90);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/student/courses/${courseId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-400 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
              <span>Curriculum</span>
            </Button>
          </Link>

          <span className="text-slate-600">•</span>

          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block truncate">
              {lessonData?.module?.title}
            </span>
            <h1 className="text-base font-bold text-ink truncate">{lessonData?.title}</h1>
          </div>
        </div>

        {/* Prev / Next Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl border transition-colors ${
              isBookmarked
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Bookmark lesson"
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>

          {prevLesson && (
            <Link href={`/student/courses/${courseId}/learn/${prevLesson.id}`}>
              <Button variant="secondary" size="sm" className="h-9 gap-1 text-xs">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>
            </Link>
          )}

          {nextLesson && (
            <Link
              href={nextLesson.isLocked ? '#' : `/student/courses/${courseId}/learn/${nextLesson.id}`}
              className={nextLesson.isLocked ? 'cursor-not-allowed opacity-60' : ''}
            >
              <Button
                variant="primary"
                size="sm"
                disabled={nextLesson.isLocked}
                className="h-9 gap-1 text-xs shadow-lg shadow-indigo-500/20"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Module Completion Banner (Quiz Unlock Notice) */}
      {allModuleLessonsDone && currentModule?.requiresQuiz !== false && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/40 border border-purple-500/30 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">All module video tutorials completed!</h4>
              <p className="text-[11px] text-purple-200/80">
                Your Module Assessment Quiz is now unlocked and available.
              </p>
            </div>
          </div>

          <Link href={`/student/courses/${courseId}`}>
            <Button variant="primary" size="sm" className="gap-1 text-xs shrink-0">
              <HelpCircle className="w-3.5 h-3.5" /> Take Quiz
            </Button>
          </Link>
        </div>
      )}

      {/* Main Grid: Video Player + Sidebar Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Player & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player Wrapper */}
          <VideoPlayer
            lessonId={lessonId}
            videoUrl={lessonData?.playableUrl || lessonData?.videoUrl}
            videoProvider={lessonData?.videoProvider}
            title={lessonData?.title}
            studentId="STU-2026-AI"
            studentName="Student"
            initialPercent={lessonData?.progress?.percent || 0}
            initialWatchedSeconds={lessonData?.progress?.lastPositionSeconds || 0}
            isCompleted={!!lessonData?.progress?.completedAt}
            onProgressUpdate={(pct, isComp) => {
              if (isComp) loadLessonAndCurriculum();
            }}
          />

          {/* Player Tab Navigation */}
          <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: 'overview', label: 'Overview', icon: FileText },
              { key: 'resources', label: `Resources (${lessonData?.resources?.length || 0})`, icon: Download },
              { key: 'practice', label: `Practice (${practiceTasks.length})`, icon: CheckSquare },
              { key: 'notes', label: `My Notes (${notes.length})`, icon: Bookmark },
              { key: 'qa', label: 'Q&A Discussion', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink">{lessonData?.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                    <span>Duration: {formatDuration(lessonData?.durationSeconds || 600)}</span>
                    <span>•</span>
                    <span>Watched: {Math.round(lessonData?.progress?.percent || 0)}%</span>
                  </div>
                </div>

                <Button
                  variant={lessonData?.progress?.completedAt ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleMarkComplete}
                  disabled={!!lessonData?.progress?.completedAt}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lessonData?.progress?.completedAt ? 'Completed' : 'Mark as Complete'}</span>
                </Button>
              </div>

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
                {lessonData?.description || 'No description provided for this lesson.'}
              </div>
            </Card>
          )}

          {/* Tab 2: Resources */}
          {activeTab === 'resources' && (
            <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-3">
              <h3 className="text-sm font-bold text-ink">Downloadable Materials & Starter Code</h3>
              {(!lessonData?.resources || lessonData.resources.length === 0) ? (
                <p className="text-xs text-slate-500 py-4">No downloadable attachments for this lesson.</p>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {lessonData.resources.map((res: any) => (
                    <div key={res.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-200 block truncate">{res.title}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{res.type}</span>
                        </div>
                      </div>

                      <a
                        href={`/api/v1/student/resources/${res.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tab 3: Practice Tasks */}
          {activeTab === 'practice' && (
            <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Personal Practice & Exercises</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete these tasks alongside the video tutorial for practical mastery.
                </p>
              </div>

              {practiceTasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No practice tasks assigned for this lesson.</p>
              ) : (
                <div className="space-y-4">
                  {practiceTasks.map((task: any) => {
                    const status = task.progress?.status || PracticeStatus.NOT_STARTED;
                    const isDone = status === PracticeStatus.DONE;

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isDone
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() =>
                                handleUpdatePracticeStatus(
                                  task.id,
                                  isDone ? PracticeStatus.NOT_STARTED : PracticeStatus.DONE
                                )
                              }
                              className="mt-0.5 text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-600" />
                              )}
                            </button>

                            <div>
                              <h4 className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                {task.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{task.instructions}</p>
                              {task.expectedOutcome && (
                                <div className="mt-2 text-[10px] font-mono text-indigo-300/90 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                                  Expected: {task.expectedOutcome}
                                </div>
                              )}
                            </div>
                          </div>

                          <Badge variant={isDone ? 'success' : 'purple'} className="text-[10px] shrink-0">
                            {status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Tab 4: My Notes */}
          {activeTab === 'notes' && (
            <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-4">
              <form onSubmit={handleAddNote} className="space-y-3">
                <Textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Write a private note with timestamp..."
                  className="text-xs bg-slate-950/80 border-slate-800"
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" type="submit" className="gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Save Note
                  </Button>
                </div>
              </form>

              <div className="divide-y divide-slate-800/80 pt-2">
                {notes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No notes saved for this lesson yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        {n.timestampSeconds !== null && (
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {formatDuration(n.timestampSeconds)}
                          </span>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed pt-1">{n.text}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Tab 5: Q&A Community */}
          {activeTab === 'qa' && (
            <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-3">
              <h3 className="text-sm font-bold text-ink">Lesson Q&A & Peer Discussions</h3>
              <p className="text-xs text-slate-400">
                Ask questions and interact with instructors and cohort peers.
              </p>
              {/* TODO(client-requirement): Q&A community forum integration with thread moderation */}
              <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-bold text-slate-300">Cohort Discussion Forum</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Interactive threaded discussions with markdown support will be active in the next release.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Curriculum Sidebar Tree */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Course Content</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {Math.round(curriculum?.progressPercent || 0)}%
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {curriculum?.modules?.map((mod: any, mIdx: number) => {
              const isModLocked = !!mod.isLocked;

              return (
                <div
                  key={mod.id}
                  className={`rounded-xl border overflow-hidden ${
                    isModLocked
                      ? 'border-slate-800/40 bg-slate-900/20 opacity-60'
                      : 'border-slate-800 bg-slate-900/80'
                  }`}
                >
                  <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 truncate">
                      Module {mIdx + 1}: {mod.title}
                    </span>
                    {isModLocked && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                  </div>

                  <div className="divide-y divide-slate-800/40">
                    {mod.lessons?.map((l: any) => {
                      const isActive = l.id === lessonId;
                      const isDone = l.isCompleted;
                      const isLocked = l.isLocked;

                      return (
                        <Link
                          key={l.id}
                          href={isLocked ? '#' : `/student/courses/${courseId}/learn/${l.id}`}
                          className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                            isActive
                              ? 'bg-indigo-600/20 border-l-2 border-indigo-500 font-bold text-white'
                              : isLocked
                              ? 'cursor-not-allowed text-slate-500'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : isLocked ? (
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                            )}
                            <span className="truncate">{l.title}</span>
                          </div>

                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {formatDuration(l.durationSeconds || 600)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
