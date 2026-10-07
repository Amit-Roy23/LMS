'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../../../../lib/api';
import { Button } from '../../../../../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../../../components/ui/card';
import { Badge } from '../../../../../../../components/ui/badge';
import { Progress } from '../../../../../../../components/ui/progress';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Flag,
  Sparkles,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Check,
  AlertCircle,
  History,
  Timer,
  Award,
  Save,
  Loader2,
} from 'lucide-react';
import { useToast } from '../../../../../../../providers/toast-provider';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface QuizInfo {
  quizId: string;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description?: string | null;
  questionCount: number;
  passPercentage: number;
  timeLimitMinutes?: number | null;
  maxAttempts?: number | null;
  attemptsUsed: number;
  attemptsRemaining: number | null;
  state: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'PASSED' | 'ATTEMPTS_EXHAUSTED' | 'COOLDOWN';
  lockReason?: string | null;
  cooldownRemainingSeconds?: number | null;
  bestScore?: {
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    attemptNumber: number;
    submittedAt: string;
  } | null;
  lastResult?: {
    attemptId: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    attemptNumber: number;
    submittedAt: string;
  } | null;
  activeAttemptId?: string | null;
}

interface AttemptQuestion {
  id: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  marks: number;
  imageUrl?: string | null;
  tags?: string[];
  difficulty?: string;
  options: { id: string; text: string; imageUrl?: string | null }[];
}

interface ActiveAttempt {
  attemptId: string;
  quizId: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  expiresAt?: string | null;
  remainingSeconds?: number | null;
  totalQuestions: number;
  timeLimitMinutes?: number | null;
  passPercentage: number;
  questions: AttemptQuestion[];
  savedAnswers: {
    questionId: string;
    selectedOptionIds: string[];
    flagged?: boolean;
  }[];
}

interface AttemptResult {
  attemptId: string;
  quizId: string;
  moduleId: string;
  courseId?: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passPercentage: number;
  attemptNumber: number;
  timeTakenSeconds?: number | null;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  reviewPolicy: string;
  canRetake: boolean;
  attemptsRemaining?: number | null;
  cooldownSeconds?: number | null;
  nextModuleUnlocked?: boolean;
  nextModuleId?: string | null;
  requiresAssignment?: boolean;
  answersReview?: Array<{
    questionId: string;
    text: string;
    type: string;
    marks: number;
    awardedMarks: number;
    isCorrect: boolean;
    selectedOptionIds: string[];
    correctOptionIds?: string[];
    explanation?: string | null;
    options: Array<{ id: string; text: string; isCorrect?: boolean }>;
  }>;
}

export default function StudentModuleQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const courseId = (params?.courseId as string) || '';
  const moduleId = (params?.moduleId as string) || '';

  // Page States: 'landing' | 'attempt' | 'result'
  const [viewState, setViewState] = useState<'landing' | 'attempt' | 'result'>('landing');
  const [isLoading, setIsLoading] = useState(true);

  // Quiz Info
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Active Attempt State
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Result State
  const [result, setResult] = useState<AttemptResult | null>(null);

  // Cooldown timer on landing
  const [cooldownTime, setCooldownTime] = useState<number>(0);

  // Load Quiz Overview
  const loadQuizOverview = useCallback(async () => {
    if (!moduleId) return;
    try {
      setIsLoading(true);
      const [infoRes, histRes] = await Promise.all([
        apiClient<QuizInfo>(`/student/modules/${moduleId}/quiz`),
        apiClient<{ history: any[] }>(`/student/modules/${moduleId}/quiz/history`).catch(() => ({ history: [] })),
      ]);

      setQuizInfo(infoRes);
      setHistory(histRes?.history || []);
      if (infoRes?.cooldownRemainingSeconds) {
        setCooldownTime(infoRes.cooldownRemainingSeconds);
      }
    } catch (err: any) {
      console.error('Failed to load quiz metadata', err);
      toastError('Error', err.message || 'Could not load quiz details.');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, toastError]);

  useEffect(() => {
    loadQuizOverview();
  }, [loadQuizOverview]);

  // Cooldown interval on landing
  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          loadQuizOverview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTime, loadQuizOverview]);

  // Start or Resume Attempt
  const handleStartAttempt = async () => {
    if (!quizInfo?.quizId) return;
    try {
      setIsLoading(true);
      const res = await apiClient<ActiveAttempt>(`/student/quizzes/${quizInfo.quizId}/attempts`, {
        method: 'POST',
      });

      setActiveAttempt(res);
      // Pre-populate saved answers
      const answersMap: Record<string, string[]> = {};
      const flagMap: Record<string, boolean> = {};
      res.savedAnswers?.forEach((a) => {
        answersMap[a.questionId] = a.selectedOptionIds;
        if (a.flagged) flagMap[a.questionId] = true;
      });
      setSelectedAnswers(answersMap);
      setFlaggedQuestions(flagMap);
      if (res.remainingSeconds !== null && res.remainingSeconds !== undefined) {
        setRemainingTime(res.remainingSeconds);
      }
      setCurrentQuestionIndex(0);
      setViewState('attempt');
    } catch (err: any) {
      toastError('Cannot Start Attempt', err.message || 'Failed to initialize quiz attempt.');
    } finally {
      setIsLoading(false);
    }
  };

  // Timer countdown in active attempt
  useEffect(() => {
    if (viewState !== 'attempt' || remainingTime === null || remainingTime === undefined) return;
    if (remainingTime <= 0) {
      // Auto-submit on timer expiry
      handleFinalSubmit();
      return;
    }
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [viewState, remainingTime]);

  // Tab visibility and anti-cheat event logger
  useEffect(() => {
    if (viewState !== 'attempt' || !activeAttempt?.attemptId) return;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      apiClient(`/student/attempts/${activeAttempt.attemptId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          type: isHidden ? 'TAB_HIDDEN' : 'TAB_VISIBLE',
        }),
      }).catch(() => {});
    };

    const handleCopy = () => {
      apiClient(`/student/attempts/${activeAttempt.attemptId}/events`, {
        method: 'POST',
        body: JSON.stringify({ type: 'COPY_ATTEMPT' }),
      }).catch(() => {});
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active assessment in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [viewState, activeAttempt?.attemptId]);

  // Debounced Autosave on Option Change
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = useCallback(
    (updatedAnswers: Record<string, string[]>, updatedFlags: Record<string, boolean>) => {
      if (!activeAttempt?.attemptId) return;
      setSaveStatus('saving');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const answersPayload = Object.entries(updatedAnswers).map(([questionId, selectedOptionIds]) => ({
            questionId,
            selectedOptionIds,
            flagged: !!updatedFlags[questionId],
          }));

          await apiClient(`/student/attempts/${activeAttempt.attemptId}/answers`, {
            method: 'PUT',
            body: JSON.stringify({ answers: answersPayload }),
          });

          setSaveStatus('saved');
        } catch (err) {
          console.error('Autosave error', err);
          setSaveStatus('error');
        }
      }, 400);
    },
    [activeAttempt?.attemptId]
  );

  // Handle Option Toggle
  const handleOptionToggle = (questionId: string, optionId: string, isMultiple: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      let nextOptions: string[];
      if (isMultiple) {
        if (current.includes(optionId)) {
          nextOptions = current.filter((id) => id !== optionId);
        } else {
          nextOptions = [...current, optionId];
        }
      } else {
        nextOptions = [optionId];
      }
      const updated = { ...prev, [questionId]: nextOptions };
      triggerAutosave(updated, flaggedQuestions);
      return updated;
    });
  };

  // Handle Flag for Review Toggle
  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const updated = { ...prev, [questionId]: !prev[questionId] };
      triggerAutosave(selectedAnswers, updated);
      return updated;
    });
  };

  // Submit Final Attempt
  const handleFinalSubmit = async () => {
    if (!activeAttempt?.attemptId) return;
    try {
      setIsSubmitting(true);
      setShowSubmitModal(false);

      const finalAnswersPayload = Object.entries(selectedAnswers).map(([questionId, selectedOptionIds]) => ({
        questionId,
        selectedOptionIds,
        flagged: !!flaggedQuestions[questionId],
      }));

      const res = await apiClient<AttemptResult>(`/student/attempts/${activeAttempt.attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: finalAnswersPayload }),
      });

      setResult(res);
      setViewState('result');

      if (res.passed) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        success('🎉 Assessment Passed!', `You scored ${res.score} / ${res.maxScore} (${res.percentage}%).`);
      } else {
        toastError('Assessment Not Passed', `You scored ${res.percentage}%. Minimum pass mark is ${res.passPercentage}%.`);
      }
    } catch (err: any) {
      toastError('Submission Error', err.message || 'Failed to submit quiz attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Past Attempt Result
  const handleViewPastResult = async (attemptId: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient<AttemptResult>(`/student/attempts/${attemptId}/result`);
      setResult(res);
      setViewState('result');
    } catch (err: any) {
      toastError('Error', err.message || 'Could not load attempt result details.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // -------------------------------------------------------------
  // VIEW 1: QUIZ LANDING PAGE
  // -------------------------------------------------------------
  if (viewState === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href={`/student/courses/${courseId}/learn`} className="hover:text-amber-400 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Curriculum
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-slate-200">{quizInfo?.moduleTitle || 'Module Assessment'}</span>
          </div>

          {/* Header Card */}
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mb-2">Layer 2 Assessment Engine</Badge>
                  <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                    {quizInfo?.title || 'Module Mastery Assessment'}
                  </CardTitle>
                </div>
                {quizInfo?.state === 'PASSED' && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> PASSED
                  </Badge>
                )}
              </div>
              <p className="text-slate-400 mt-2">
                {quizInfo?.description ||
                  'Demonstrate your theoretical knowledge and practical comprehension to unlock subsequent course modules.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rules Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Questions
                  </div>
                  <div className="text-xl font-bold text-white">{quizInfo?.questionCount || 20} MCQs</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Award className="w-3.5 h-3.5 text-emerald-400" /> Pass Mark
                  </div>
                  <div className="text-xl font-bold text-emerald-400">{quizInfo?.passPercentage || 70}%</div>
                  <div className="text-[11px] text-slate-500">
                    {Math.ceil(((quizInfo?.questionCount || 20) * (quizInfo?.passPercentage || 70)) / 100)} correct to pass
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-sky-400" /> Time Limit
                  </div>
                  <div className="text-xl font-bold text-white">
                    {quizInfo?.timeLimitMinutes ? `${quizInfo.timeLimitMinutes} Mins` : 'Untimed'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" /> Attempts Left
                  </div>
                  <div className="text-xl font-bold text-white">
                    {quizInfo?.attemptsRemaining !== null && quizInfo?.attemptsRemaining !== undefined
                      ? quizInfo.attemptsRemaining
                      : 'Unlimited'}
                  </div>
                  <div className="text-[11px] text-slate-500">{quizInfo?.attemptsUsed || 0} used</div>
                </div>
              </div>

              {/* State Banners & Action Buttons */}
              {quizInfo?.state === 'LOCKED' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
                  <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-2">
                    <div className="font-semibold text-white">Assessment is Currently Locked</div>
                    <div className="text-sm text-slate-300">
                      {quizInfo?.lockReason || 'You must complete and watch all video lessons in this module before taking the assessment.'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/student/courses/${courseId}/learn`)}
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 mt-1"
                    >
                      <BookOpen className="w-4 h-4 mr-2" /> Go to Incomplete Lessons
                    </Button>
                  </div>
                </div>
              )}

              {quizInfo?.state === 'COOLDOWN' && (
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 flex items-start gap-3">
                  <Timer className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" />
                  <div>
                    <div className="font-semibold text-white">Retake Cooldown in Progress</div>
                    <div className="text-sm text-slate-300">
                      Please review your notes. You can attempt this assessment again in{' '}
                      <span className="font-bold text-sky-400">{formatTimer(cooldownTime)}</span>.
                    </div>
                  </div>
                </div>
              )}

              {quizInfo?.state === 'ATTEMPTS_EXHAUSTED' && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <div className="font-semibold text-white">Maximum Attempts Exhausted</div>
                    <div className="text-sm text-slate-300">
                      You have used all allowed attempts ({quizInfo.maxAttempts}). Please contact your course instructor or support to request an attempt reset.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button Row */}
              <div className="pt-2 flex flex-wrap gap-4 items-center">
                {quizInfo?.state === 'AVAILABLE' && (
                  <Button
                    size="lg"
                    onClick={handleStartAttempt}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-8 shadow-lg shadow-amber-500/20"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                    Start Assessment Now
                  </Button>
                )}

                {quizInfo?.state === 'IN_PROGRESS' && (
                  <Button
                    size="lg"
                    onClick={handleStartAttempt}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold px-8 shadow-lg shadow-sky-500/20"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RotateCcw className="w-5 h-5 mr-2" />}
                    Resume Ongoing Attempt
                  </Button>
                )}

                {quizInfo?.state === 'PASSED' && (
                  <Button
                    size="lg"
                    onClick={() => router.push(`/student/courses/${courseId}/learn`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="w-5 h-5 mr-2" /> Continue Course
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Past Attempts History */}
          {history.length > 0 && (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                  <History className="w-5 h-5 text-amber-400" /> Assessment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3 font-medium">Attempt #</th>
                        <th className="pb-3 font-medium">Score</th>
                        <th className="pb-3 font-medium">Percentage</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Submitted At</th>
                        <th className="pb-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {history.map((att: any) => (
                        <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 font-medium text-slate-200">Attempt {att.attemptNumber}</td>
                          <td className="py-3 text-slate-300">
                            {att.score} / {att.maxScore}
                          </td>
                          <td className="py-3 font-semibold text-slate-200">{att.percentage}%</td>
                          <td className="py-3">
                            {att.passed ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">PASSED</Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">FAILED</Badge>
                            )}
                          </td>
                          <td className="py-3 text-slate-400 text-xs">
                            {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'In Progress'}
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPastResult(att.id)}
                              className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                            >
                              Review Result
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: ACTIVE ATTEMPT RUNNER
  // -------------------------------------------------------------
  if (viewState === 'attempt' && activeAttempt) {
    const questions = activeAttempt.questions || [];
    const currentQ = questions[currentQuestionIndex];
    const totalQ = questions.length;
    const isMultiple = currentQ?.type === 'MULTIPLE_CHOICE';
    const currentSelected = selectedAnswers[currentQ?.id] || [];
    const isFlagged = !!flaggedQuestions[currentQ?.id];

    const answeredCount = Object.keys(selectedAnswers).filter((k) => selectedAnswers[k]?.length > 0).length;
    const unansweredCount = totalQ - answeredCount;

    // Timer color classes
    const timerColor =
      remainingTime !== null && remainingTime <= 60
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse'
        : remainingTime !== null && remainingTime <= 300
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        : 'text-sky-400 bg-sky-500/10 border-sky-500/30';

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-sm">
                {quizInfo?.title || 'Assessment'}
              </div>
              <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs hidden sm:inline-flex">
                Attempt {activeAttempt.attemptNumber}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {/* Autosave Indicator */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span className="text-amber-400 hidden sm:inline">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400/80 hidden sm:inline">Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400 hidden sm:inline">Retry save</span>
                  </>
                )}
              </div>

              {/* Server Synced Timer */}
              {remainingTime !== null && (
                <div className={`px-3 py-1 rounded-full border text-sm font-mono font-bold flex items-center gap-1.5 ${timerColor}`}>
                  <Clock className="w-4 h-4" /> {formatTimer(remainingTime)}
                </div>
              )}

              {/* Submit Button */}
              <Button
                size="sm"
                onClick={() => setShowSubmitModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Submit Assessment
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Layout */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question View (3 Cols) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="bg-slate-900/80 border-slate-800 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-amber-400">
                      Question {currentQuestionIndex + 1} of {totalQ}
                    </span>
                    <Badge variant="outline" className="text-[11px] text-slate-400 border-slate-700">
                      {isMultiple ? 'Multiple Choice (Checkboxes)' : 'Single Choice (Radio)'}
                    </Badge>
                  </div>

                  {/* Flag for Review */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => currentQ && handleToggleFlag(currentQ.id)}
                    className={
                      isFlagged
                        ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                    }
                  >
                    <Flag className="w-4 h-4 mr-1.5" />
                    {isFlagged ? 'Flagged' : 'Flag for Review'}
                  </Button>
                </div>

                <div className="text-lg md:text-xl font-medium text-slate-100 mt-2 leading-relaxed">
                  {currentQ?.text}
                </div>

                {isMultiple && (
                  <div className="text-xs text-amber-300/80 font-medium mt-1">
                    * Select all correct options that apply.
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Optional Image */}
                {currentQ?.imageUrl && (
                  <div className="my-4 rounded-lg overflow-hidden border border-slate-800 max-h-72">
                    <img src={currentQ.imageUrl} alt="Question Diagram" className="w-full object-contain max-h-72 bg-slate-950" />
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-3 pt-2">
                  {currentQ?.options?.map((option) => {
                    const isChecked = currentSelected.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        onClick={() => currentQ && handleOptionToggle(currentQ.id, option.id, isMultiple)}
                        className={`group flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-md shadow-amber-500/5'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Radio or Checkbox icon */}
                        <div className="pt-0.5">
                          {isMultiple ? (
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                isChecked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-600 group-hover:border-slate-500'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                isChecked ? 'border-amber-400 bg-amber-400/20' : 'border-slate-600 group-hover:border-slate-500'
                              }`}
                            >
                              {isChecked && <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                            </div>
                          )}
                        </div>

                        <div className="text-sm md:text-base leading-relaxed">{option.text}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Navigation */}
                <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Previous
                  </Button>

                  <div className="text-xs text-slate-400">
                    {answeredCount} of {totalQ} Answered
                  </div>

                  {currentQuestionIndex < totalQ - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                    >
                      Next <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowSubmitModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Finish & Submit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Palette Sidebar (1 Col) */}
          <div className="space-y-4">
            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Question Palette</span>
                  <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                    {answeredCount}/{totalQ} Done
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Palette Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id]?.length > 0;
                    const isFlag = !!flaggedQuestions[q.id];
                    const isCurrent = idx === currentQuestionIndex;

                    let btnClass = 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700';
                    if (isAnswered) {
                      btnClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold';
                    }
                    if (isFlag) {
                      btnClass = 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold';
                    }
                    if (isCurrent) {
                      btnClass += ' ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`h-10 rounded-lg border text-sm flex items-center justify-center relative transition-all ${btnClass}`}
                      >
                        {idx + 1}
                        {isFlag && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800" />
                    <span>Unanswered ({unansweredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
                    <span>Flagged for Review ({Object.values(flaggedQuestions).filter(Boolean).length})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-bold text-white">Submit Assessment?</h3>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <p>Are you sure you want to finalize and grade your assessment attempt?</p>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Questions:</span>
                    <span className="font-semibold text-white">{totalQ}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Answered:</span>
                    <span className="font-semibold text-emerald-400">{answeredCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unanswered:</span>
                    <span className={`font-semibold ${unansweredCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {unansweredCount}
                    </span>
                  </div>
                  {Object.values(flaggedQuestions).filter(Boolean).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Flagged for Review:</span>
                      <span className="font-semibold text-amber-400">
                        {Object.values(flaggedQuestions).filter(Boolean).length}
                      </span>
                    </div>
                  )}
                </div>
                {unansweredCount > 0 && (
                  <div className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    You have {unansweredCount} unanswered questions. Unanswered questions receive 0 marks.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Return to Questions
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirm & Grade
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: RESULT SUMMARY & REVIEW
  // -------------------------------------------------------------
  if (viewState === 'result' && result) {
    const isPass = result.passed;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Result Card */}
          <Card
            className={`border shadow-2xl backdrop-blur-xl ${
              isPass ? 'bg-slate-900/90 border-emerald-500/40' : 'bg-slate-900/90 border-rose-500/40'
            }`}
          >
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              {/* Pass/Fail Icon */}
              <div className="flex justify-center">
                {isPass ? (
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                    <Award className="w-10 h-10 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
                    <XCircle className="w-10 h-10 stroke-[2.5]" />
                  </div>
                )}
              </div>

              {/* Title & Score */}
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                  {isPass ? 'Assessment Passed! 🎉' : 'Assessment Not Passed'}
                </h2>
                <p className="text-slate-400 max-w-md mx-auto text-sm md:text-base">
                  {isPass
                    ? 'Congratulations! You demonstrated required mastery of the module concepts.'
                    : `You scored below the required passing mark of ${result.passPercentage}%. Review the course materials and try again.`}
                </p>
              </div>

              {/* Score Highlight Box */}
              <div className="inline-flex flex-wrap items-center justify-center gap-6 p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium">Your Score</div>
                  <div className={`text-3xl font-extrabold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.score} / {result.maxScore}
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-800 hidden sm:block" />

                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium">Percentage</div>
                  <div className={`text-3xl font-extrabold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.percentage}%
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-800 hidden sm:block" />

                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium">Required Pass Mark</div>
                  <div className="text-3xl font-extrabold text-slate-200">{result.passPercentage}%</div>
                </div>
              </div>

              {/* Unlocked Message or Next Step */}
              {isPass && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 max-w-lg mx-auto flex items-center gap-3 text-left">
                  <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white">Next Module Unlocked</div>
                    <div className="text-xs text-slate-300">
                      {result.requiresAssignment
                        ? 'Your practical assignment step is now ready for submission.'
                        : 'You can now proceed to the next module in your learning journey.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Button
                  size="lg"
                  onClick={() => router.push(`/student/courses/${courseId}/learn`)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-8 shadow-lg"
                >
                  <BookOpen className="w-5 h-5 mr-2" /> Back to Course Player
                </Button>

                {!isPass && result.canRetake && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      setViewState('landing');
                      loadQuizOverview();
                    }}
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" /> Retake Assessment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Answer Review Section (Respecting showAnswersAfterSubmit policy) */}
          {result.answersReview && result.answersReview.length > 0 && (
            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" /> Answer Review
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Detailed review of your answers in accordance with course assessment policy.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {result.answersReview.map((item, index) => {
                  return (
                    <div
                      key={item.questionId}
                      className={`p-5 rounded-xl border space-y-3 ${
                        item.isCorrect
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-slate-200">
                          <span className="text-xs font-bold text-slate-500 mr-2">Q{index + 1}</span>
                          {item.text}
                        </div>
                        <Badge
                          className={
                            item.isCorrect
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shrink-0'
                          }
                        >
                          {item.isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                        </Badge>
                      </div>

                      {/* Options breakdown */}
                      <div className="space-y-2 pt-1">
                        {item.options?.map((opt) => {
                          const wasSelected = item.selectedOptionIds?.includes(opt.id);
                          const isCorrectOpt = item.correctOptionIds?.includes(opt.id);

                          let optClass = 'bg-slate-950/40 border-slate-800 text-slate-400';
                          if (wasSelected && item.isCorrect) {
                            optClass = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium';
                          } else if (wasSelected && !item.isCorrect) {
                            optClass = 'bg-rose-500/10 border-rose-500/40 text-rose-300';
                          } else if (isCorrectOpt) {
                            optClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-lg border text-sm flex items-center justify-between ${optClass}`}
                            >
                              <span>{opt.text}</span>
                              <div className="flex items-center gap-2 text-xs">
                                {wasSelected && <span className="opacity-80">(Your Choice)</span>}
                                {isCorrectOpt && <span className="text-emerald-400 font-bold">✓ Correct</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {item.explanation && (
                        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
                          <span className="font-bold text-amber-400">Explanation:</span>
                          <p>{item.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
    </div>
  );
}
