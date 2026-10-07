'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient, apiText } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  ClipboardCheck,
  Search,
  Filter,
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Upload,
  Download,
  Settings2,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '../../../providers/toast-provider';
import Link from 'next/link';

export default function AdminAssessmentsPage() {
  const { success, error: toastError } = useToast();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Analytics & Attempts
  const [analytics, setAnalytics] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [attemptsPagination, setAttemptsPagination] = useState<any>(null);
  const [filterPassed, setFilterPassed] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Admin Override Modal
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    type: 'RESET_ATTEMPTS' | 'MANUAL_PASS' | 'INVALIDATE_ATTEMPT';
    targetId: string;
    studentName?: string;
  }>({
    isOpen: false,
    type: 'RESET_ATTEMPTS',
    targetId: '',
  });
  const [overrideReason, setOverrideReason] = useState('');
  const [isProcessingOverride, setIsProcessingOverride] = useState(false);

  // Load courses & quizzes
  const loadCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<{ courses: any[] }>('/courses');
      const courseList = res?.courses || [];
      setCourses(courseList);

      if (courseList.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courseList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load courses', err);
      toastError('Error', 'Could not load courses');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCourseId, toastError]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Find active course and quizzes
  const activeCourse = courses.find((c) => c.id === selectedCourseId);
  const quizzes: any[] = [];
  activeCourse?.modules?.forEach((m: any) => {
    if (m.quiz) {
      quizzes.push({
        ...m.quiz,
        moduleTitle: m.title,
        moduleId: m.id,
      });
    }
  });

  // Set default selected quiz
  useEffect(() => {
    if (quizzes.length > 0 && (!selectedQuizId || !quizzes.some((q) => q.id === selectedQuizId))) {
      setSelectedQuizId(quizzes[0].id);
    }
  }, [quizzes, selectedQuizId]);

  // Load Analytics & Attempts for selected quiz
  const loadQuizData = useCallback(async () => {
    if (!selectedQuizId) return;
    try {
      const [analyticsRes, attemptsRes] = await Promise.all([
        apiClient<any>(`/admin/quizzes/${selectedQuizId}/analytics`).catch(() => null),
        apiClient<any>(
          `/admin/quizzes/${selectedQuizId}/attempts?passed=${filterPassed}&search=${encodeURIComponent(searchTerm)}`
        ).catch(() => ({ attempts: [] })),
      ]);

      setAnalytics(analyticsRes);
      setAttempts(attemptsRes?.attempts || []);
      setAttemptsPagination(attemptsRes?.pagination || null);
    } catch (err: any) {
      console.error('Failed to load quiz analytics', err);
    }
  }, [selectedQuizId, filterPassed, searchTerm]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // Handle Admin Override Submissions
  const handleExecuteOverride = async () => {
    if (!overrideReason.trim()) {
      toastError('Reason Required', 'Please provide a clear justification for this administrative override.');
      return;
    }

    try {
      setIsProcessingOverride(true);
      if (overrideModal.type === 'RESET_ATTEMPTS') {
        await apiClient(`/admin/quizzes/${selectedQuizId}/override/reset-attempts`, {
          method: 'POST',
          body: JSON.stringify({
            studentId: overrideModal.targetId,
            reason: overrideReason,
          }),
        });
        success('Attempts Reset', 'Student attempts have been cleared with audit trail.');
      } else if (overrideModal.type === 'MANUAL_PASS') {
        const activeQ = quizzes.find((q) => q.id === selectedQuizId);
        await apiClient(`/admin/modules/${activeQ?.moduleId}/quiz/override/pass`, {
          method: 'POST',
          body: JSON.stringify({
            studentId: overrideModal.targetId,
            reason: overrideReason,
          }),
        });
        success('Quiz Passed', 'Module quiz has been administratively marked as PASSED.');
      } else if (overrideModal.type === 'INVALIDATE_ATTEMPT') {
        await apiClient(`/admin/attempts/${overrideModal.targetId}/override/invalidate`, {
          method: 'POST',
          body: JSON.stringify({
            reason: overrideReason,
          }),
        });
        success('Attempt Invalidated', 'The attempt has been marked as abandoned/invalidated.');
      }

      setOverrideModal({ isOpen: false, type: 'RESET_ATTEMPTS', targetId: '' });
      setOverrideReason('');
      loadQuizData();
    } catch (err: any) {
      toastError('Override Error', err.message || 'Failed to execute administrative override.');
    } finally {
      setIsProcessingOverride(false);
    }
  };

  // Export CSV
  const handleExportQuestionsCsv = async () => {
    if (!selectedQuizId) return;
    try {
      const csvContent = await apiText(`/admin/quizzes/${selectedQuizId}/questions/export`);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'quiz-questions.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Export Complete', 'Question bank exported to CSV successfully.');
    } catch (err: any) {
      toastError('Export Error', err.message || 'Failed to export questions.');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 border border-pink-200">
              LAYER 2 & 3
            </span>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-plum">
              Assessments & Question Banks
            </h1>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            Configure passing rules, manage question bank pools, view live student attempts, and monitor psychometric analytics.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportQuestionsCsv}
            disabled={!selectedQuizId}
            className="border-sand hover:bg-cream text-plum"
          >
            <Download className="w-4 h-4 mr-1.5 text-pink-600" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Course & Quiz Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-sand shadow-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Select Course
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full bg-cream/40 border border-sand rounded-xl px-4 py-2.5 text-sm font-medium text-plum focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Select Assessment / Module Quiz
          </label>
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="w-full bg-cream/40 border border-sand rounded-xl px-4 py-2.5 text-sm font-medium text-plum focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {quizzes.length === 0 && <option value="">No quizzes in this course</option>}
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.moduleTitle} — {q.title} ({q.questionCount || 20} Qs, {q.passPercentage}% Pass)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-sand shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase text-slate-500">Total Attempts</div>
                  <div className="text-2xl font-extrabold text-plum">{analytics.totalAttempts}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {analytics.passedAttempts} passed • {analytics.failedAttempts} failed
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-sand shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase text-slate-500">Pass Rate</div>
                  <div className="text-2xl font-extrabold text-emerald-600">{analytics.passRatePercent}%</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">Target passing threshold: {analytics.passPercentage}%</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-sand shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase text-slate-500">Average Score</div>
                  <div className="text-2xl font-extrabold text-sky-600">{analytics.averagePercentage}%</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">Average score across all attempts</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-sand shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase text-slate-500">Average Duration</div>
                  <div className="text-2xl font-extrabold text-indigo-600">
                    {Math.round((analytics.averageTimeTakenSeconds || 0) / 60)} Mins
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Time limit: {analytics.timeLimitMinutes ? `${analytics.timeLimitMinutes} min` : 'Untimed'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Question Performance & Most Missed Questions */}
      {analytics?.mostMissedQuestions?.length > 0 && (
        <Card className="bg-white border-sand shadow-sm">
          <CardHeader className="pb-3 border-b border-sand/50">
            <CardTitle className="text-base font-bold text-plum flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Most Challenging Questions (High Miss Rate)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {analytics.mostMissedQuestions.map((q: any, i: number) => (
                <div key={q.id} className="p-3.5 rounded-xl bg-cream/40 border border-sand flex items-center justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-plum line-clamp-1">
                      {i + 1}. {q.text}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
                      <span>Answered {q.timesAnswered} times</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-rose-600">{q.correctPercentage}% Correct</div>
                    <div className="text-[11px] text-slate-500">Psychometric Index</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Attempts Table */}
      <Card className="bg-white border-sand shadow-sm">
        <CardHeader className="pb-4 border-b border-sand/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-plum flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-600" /> Student Assessment Attempts
            </CardTitle>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-cream/60 p-1 border border-sand text-xs">
                <button
                  onClick={() => setFilterPassed('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    filterPassed === 'all' ? 'bg-white text-plum shadow-sm' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterPassed('true')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    filterPassed === 'true' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Passed
                </button>
                <button
                  onClick={() => setFilterPassed('false')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    filterPassed === 'false' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Attempt #</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Percentage</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Submitted At</th>
                  <th className="pb-3 text-right">Admin Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50">
                {attempts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No student attempts found for this assessment.
                    </td>
                  </tr>
                )}
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-cream/20 transition-colors">
                    <td className="py-3.5">
                      <div className="font-semibold text-plum">{att.student?.name}</div>
                      <div className="text-xs text-slate-500">{att.student?.email}</div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-700">Attempt {att.attemptNumber}</td>
                    <td className="py-3.5 font-semibold text-plum">
                      {att.score} / {att.maxScore}
                    </td>
                    <td className="py-3.5 font-bold text-plum">{att.percentage}%</td>
                    <td className="py-3.5">
                      {att.passed ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">PASSED</Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200">FAILED</Badge>
                      )}
                    </td>
                    <td className="py-3.5 text-xs text-slate-600">
                      {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'In Progress'}
                    </td>
                    <td className="py-3.5 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setOverrideModal({
                            isOpen: true,
                            type: 'RESET_ATTEMPTS',
                            targetId: att.studentId,
                            studentName: att.student?.name,
                          })
                        }
                        className="text-xs text-slate-600 hover:text-plum hover:bg-cream"
                      >
                        Reset Attempts
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setOverrideModal({
                            isOpen: true,
                            type: 'MANUAL_PASS',
                            targetId: att.studentId,
                            studentName: att.student?.name,
                          })
                        }
                        className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                      >
                        Pass
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setOverrideModal({
                            isOpen: true,
                            type: 'INVALIDATE_ATTEMPT',
                            targetId: att.id,
                            studentName: att.student?.name,
                          })
                        }
                        className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                      >
                        Invalidate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Override Modal */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-sand">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-pink-600" />
              <div>
                <h3 className="text-lg font-bold text-plum">
                  {overrideModal.type === 'RESET_ATTEMPTS' && 'Administrative Attempt Reset'}
                  {overrideModal.type === 'MANUAL_PASS' && 'Administrative Pass Override'}
                  {overrideModal.type === 'INVALIDATE_ATTEMPT' && 'Invalidate Attempt'}
                </h3>
                <p className="text-xs text-slate-500">Student: {overrideModal.studentName}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Audit Reason / Justification *
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Student experienced network disconnection during exam. Resetting allowed attempts."
                className="w-full bg-cream/40 border border-sand rounded-xl p-3 text-sm text-plum focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <p className="text-[11px] text-slate-500">
                This action will be logged in the immutable system AuditLog table with your admin credentials.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setOverrideModal({ isOpen: false, type: 'RESET_ATTEMPTS', targetId: '' })}
                disabled={isProcessingOverride}
                className="border-sand"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteOverride}
                disabled={isProcessingOverride}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold"
              >
                {isProcessingOverride ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Confirm Action
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
