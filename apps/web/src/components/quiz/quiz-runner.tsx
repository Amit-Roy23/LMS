'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  AlertCircle,
  Loader2,
  Clock,
  Flag,
  Sparkles,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export interface QuizRunnerProps {
  quiz?: any;
  courseId: string;
  moduleId: string;
  attemptsCount?: number;
  maxAttempts?: number | null;
  isPassed?: boolean;
  onQuizCompleted?: () => void;
}

export function QuizRunner({
  quiz: initialQuiz,
  courseId,
  moduleId,
  attemptsCount = 0,
  maxAttempts = 3,
  isPassed = false,
  onQuizCompleted,
}: QuizRunnerProps) {
  const { success, error: toastError } = useToast();

  const [mode, setMode] = useState<'overview' | 'active' | 'result'>('overview');
  const [quizInfo, setQuizInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active attempt state
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Load Quiz Info
  const loadQuizInfo = useCallback(async () => {
    if (!moduleId) return;
    try {
      setIsLoading(true);
      const res = await apiClient<any>(`/student/modules/${moduleId}/quiz`);
      setQuizInfo(res);
      if (res.state === 'PASSED') {
        // If passed and not starting a new one, show overview with passed status
      }
    } catch (err: any) {
      console.error('Failed to load quiz info', err);
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadQuizInfo();
  }, [loadQuizInfo]);

  // Start / Resume Attempt
  const handleStartAttempt = async () => {
    if (!quizInfo?.quizId) return;
    try {
      setIsLoading(true);
      const res = await apiClient<any>(`/student/quizzes/${quizInfo.quizId}/attempts`, {
        method: 'POST',
      });

      setActiveAttempt(res);
      const answersMap: Record<string, string[]> = {};
      const flagMap: Record<string, boolean> = {};
      res.savedAnswers?.forEach((a: any) => {
        answersMap[a.questionId] = a.selectedOptionIds;
        if (a.flagged) flagMap[a.questionId] = true;
      });
      setSelectedAnswers(answersMap);
      setFlaggedQuestions(flagMap);
      if (res.remainingSeconds !== null && res.remainingSeconds !== undefined) {
        setRemainingTime(res.remainingSeconds);
      }
      setCurrentIdx(0);
      setMode('active');
    } catch (err: any) {
      toastError('Cannot Start Attempt', err.message || 'Failed to start quiz attempt.');
    } finally {
      setIsLoading(false);
    }
  };

  // Timer Countdown
  useEffect(() => {
    if (mode !== 'active' || remainingTime === null || remainingTime === undefined) return;
    if (remainingTime <= 0) {
      handleSubmitAttempt();
      return;
    }
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmitAttempt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, remainingTime]);

  // Autosave
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerAutosave = useCallback(
    (updatedAnswers: Record<string, string[]>, updatedFlags: Record<string, boolean>) => {
      if (!activeAttempt?.attemptId) return;
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const payload = Object.entries(updatedAnswers).map(([questionId, selectedOptionIds]) => ({
            questionId,
            selectedOptionIds,
            flagged: !!updatedFlags[questionId],
          }));
          await apiClient(`/student/attempts/${activeAttempt.attemptId}/answers`, {
            method: 'PUT',
            body: JSON.stringify({ answers: payload }),
          });
          setSaveStatus('saved');
        } catch (err) {
          setSaveStatus('error');
        }
      }, 400);
    },
    [activeAttempt?.attemptId]
  );

  const handleOptionToggle = (questionId: string, optionId: string, isMultiple: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      let next: string[];
      if (isMultiple) {
        next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      } else {
        next = [optionId];
      }
      const updated = { ...prev, [questionId]: next };
      triggerAutosave(updated, flaggedQuestions);
      return updated;
    });
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const updated = { ...prev, [questionId]: !prev[questionId] };
      triggerAutosave(selectedAnswers, updated);
      return updated;
    });
  };

  const handleSubmitAttempt = async () => {
    if (!activeAttempt?.attemptId) return;
    try {
      setIsSubmitting(true);
      const answersPayload = Object.entries(selectedAnswers).map(([questionId, selectedOptionIds]) => ({
        questionId,
        selectedOptionIds,
        flagged: !!flaggedQuestions[questionId],
      }));

      const res = await apiClient<any>(`/student/attempts/${activeAttempt.attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answersPayload }),
      });

      setResult(res);
      setMode('result');

      if (res.passed) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        success('🎉 Assessment Passed!', `You scored ${res.score} / ${res.maxScore} (${res.percentage}%).`);
        if (onQuizCompleted) onQuizCompleted();
      } else {
        toastError('Assessment Not Passed', `You scored ${res.percentage}%. Minimum pass mark is ${res.passPercentage}%.`);
      }
    } catch (err: any) {
      toastError('Submission Error', err.message || 'Failed to submit quiz attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Overview
  if (mode === 'overview') {
    return (
      <Card className="bg-slate-900/90 border-slate-800 shadow-xl text-slate-100">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mb-2">Module Assessment</Badge>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">
                {quizInfo?.title || initialQuiz?.title || 'Knowledge Assessment'}
              </CardTitle>
            </div>
            {quizInfo?.state === 'PASSED' && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-3 py-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> PASSED
              </Badge>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {quizInfo?.description || 'Test your comprehension of this module to unlock further course content.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400">Questions</div>
              <div className="text-lg font-bold text-white">{quizInfo?.questionCount || 20} MCQs</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Pass Mark</div>
              <div className="text-lg font-bold text-emerald-400">{quizInfo?.passPercentage || 70}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Time Limit</div>
              <div className="text-lg font-bold text-white">
                {quizInfo?.timeLimitMinutes ? `${quizInfo.timeLimitMinutes} Mins` : 'Untimed'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Attempts Left</div>
              <div className="text-lg font-bold text-white">
                {quizInfo?.attemptsRemaining !== null && quizInfo?.attemptsRemaining !== undefined
                  ? quizInfo.attemptsRemaining
                  : 'Unlimited'}
              </div>
            </div>
          </div>

          {quizInfo?.state === 'LOCKED' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="text-sm">
                <div className="font-semibold text-white">Assessment Locked</div>
                <div>{quizInfo.lockReason || 'Complete all video lessons in this module to unlock this assessment.'}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {quizInfo?.state === 'AVAILABLE' && (
              <Button
                onClick={handleStartAttempt}
                disabled={isLoading}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Start Assessment
              </Button>
            )}

            {quizInfo?.state === 'IN_PROGRESS' && (
              <Button
                onClick={handleStartAttempt}
                disabled={isLoading}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Resume Attempt
              </Button>
            )}

            {quizInfo?.state === 'PASSED' && (
              <div className="text-sm text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> You have successfully passed this assessment!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render Active Attempt
  if (mode === 'active' && activeAttempt) {
    const questions = activeAttempt.questions || [];
    const currentQ = questions[currentIdx];
    const totalQ = questions.length;
    const isMultiple = currentQ?.type === 'MULTIPLE_CHOICE';
    const currentSelected = selectedAnswers[currentQ?.id] || [];
    const isFlagged = !!flaggedQuestions[currentQ?.id];
    const answeredCount = Object.keys(selectedAnswers).filter((k) => selectedAnswers[k]?.length > 0).length;

    return (
      <Card className="bg-slate-900/90 border-slate-800 shadow-2xl text-slate-100">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-400">
                Question {currentIdx + 1} of {totalQ}
              </span>
              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                {isMultiple ? 'Checkbox' : 'Radio'}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                {saveStatus === 'saved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
              </div>

              {remainingTime !== null && (
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 font-mono text-xs">
                  <Clock className="w-3 h-3 mr-1" /> {formatTimer(remainingTime)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <div className="text-base md:text-lg font-medium text-slate-100">{currentQ?.text}</div>

          {isMultiple && (
            <div className="text-xs text-amber-300 font-medium">* Select all correct options that apply.</div>
          )}

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ?.options?.map((opt: any) => {
              const isChecked = currentSelected.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => currentQ && handleOptionToggle(currentQ.id, opt.id, isMultiple)}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="pt-0.5">
                    {isMultiple ? (
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isChecked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-600'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isChecked ? 'border-amber-400 bg-amber-400/20' : 'border-slate-600'
                        }`}
                      >
                        {isChecked && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                      </div>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed">{opt.text}</div>
                </div>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
              disabled={currentIdx === 0}
              className="border-slate-800 text-slate-300"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentQ && handleToggleFlag(currentQ.id)}
              className={isFlagged ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400'}
            >
              <Flag className="w-3.5 h-3.5 mr-1" /> {isFlagged ? 'Flagged' : 'Flag'}
            </Button>

            {currentIdx < totalQ - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentIdx((p) => Math.min(totalQ - 1, p + 1))}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmitAttempt}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Submit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render Result
  if (mode === 'result' && result) {
    return (
      <Card
        className={`border shadow-2xl ${
          result.passed ? 'bg-slate-900/90 border-emerald-500/40' : 'bg-slate-900/90 border-rose-500/40'
        }`}
      >
        <CardContent className="pt-6 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            {result.passed ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Award className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="w-8 h-8" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white">{result.passed ? 'Assessment Passed! 🎉' : 'Assessment Failed'}</h3>
            <p className="text-slate-400 text-sm mt-1">
              Score: <span className="font-bold text-white">{result.score} / {result.maxScore}</span> ({result.percentage}%)
              | Pass mark: {result.passPercentage}%
            </p>
          </div>

          {result.passed && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Next module unlocked!
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            {!result.passed && result.canRetake && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMode('overview');
                  loadQuizInfo();
                }}
                className="border-slate-700 text-slate-200"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Retake
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
