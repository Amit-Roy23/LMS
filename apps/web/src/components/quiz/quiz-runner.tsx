'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QuestionType } from '@academy/shared';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw, Award, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import confetti from 'canvas-confetti';

export interface QuizRunnerProps {
  quiz: {
    id: string;
    title: string;
    description?: string | null;
    passingScorePercent?: number;
    passPercentage?: number;
    maxAttempts?: number | null;
    attemptsCount?: number;
    questions?: {
      id: string;
      text: string;
      type: QuestionType | string;
      points: number;
      options: { id: string; text: string }[];
    }[];
  };
  courseId: string;
  moduleId: string;
  attemptsCount?: number;
  maxAttempts?: number | null;
  isPassed?: boolean;
  onQuizCompleted?: () => void;
}

export function QuizRunner({
  quiz,
  courseId,
  moduleId,
  attemptsCount = 0,
  maxAttempts = 3,
  isPassed = false,
  onQuizCompleted,
}: QuizRunnerProps) {
  const { success, error: toastError } = useToast();

  const [fullQuiz, setFullQuiz] = useState<any>(quiz);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(!quiz.questions || quiz.questions.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    scorePercent: number;
    isPassed: boolean;
    passingScorePercent: number;
    remainingAttempts: number;
  } | null>(null);

  // Fetch full quiz questions from API if not already present in props
  const fetchFullQuiz = useCallback(async () => {
    if (!quiz?.id) return;
    try {
      setIsLoadingQuiz(true);
      setLoadError(null);
      const res = await apiClient<{
        quiz: any;
        attemptsCount: number;
        maxAttempts: number;
        isPassed: boolean;
      }>(`/quizzes/${quiz.id}`);

      if (res?.quiz) {
        setFullQuiz(res.quiz);
      }
    } catch (err: any) {
      console.error('Failed to load quiz details', err);
      setLoadError(err.message || 'Could not load quiz questions. Complete video lessons first if locked.');
    } finally {
      setIsLoadingQuiz(false);
    }
  }, [quiz?.id]);

  useEffect(() => {
    if (!quiz.questions || quiz.questions.length === 0) {
      fetchFullQuiz();
    } else {
      setFullQuiz(quiz);
      setIsLoadingQuiz(false);
    }
  }, [quiz, fetchFullQuiz]);

  const questions = fullQuiz?.questions || [];
  const passingScore = fullQuiz?.passingScorePercent || fullQuiz?.passPercentage || quiz.passingScorePercent || 70;
  const attemptsLimit = fullQuiz?.maxAttempts ?? maxAttempts ?? 3;

  const handleOptionSelect = (questionId: string, optionId: string, isMultiple = false) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMultiple) {
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleSubmit = async () => {
    // Validate that all questions are answered
    const unanswered = questions.filter((q: any) => !selectedAnswers[q.id] || selectedAnswers[q.id].length === 0);
    if (unanswered.length > 0) {
      toastError('Incomplete Quiz', `Please answer all questions before submitting (${unanswered.length} remaining).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        quizId: quiz.id,
        answers: Object.entries(selectedAnswers).map(([questionId, selectedOptionIds]) => ({
          questionId,
          selectedOptionIds,
        })),
      };

      const res = await apiClient<{
        scorePercent: number;
        isPassed: boolean;
        passingScorePercent: number;
        remainingAttempts: number;
      }>(`/quizzes/${quiz.id}/attempt`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);

      if (res.isPassed) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        success('🎉 Quiz Passed!', `You scored ${res.scorePercent}% (Passing mark: ${res.passingScorePercent}%)`);
      } else {
        toastError('Quiz Not Passed', `You scored ${res.scorePercent}%. Minimum ${res.passingScorePercent}% required.`);
      }

      onQuizCompleted?.();
    } catch (err: any) {
      toastError('Submission Failed', err.message || 'Could not submit quiz attempt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setResult(null);
  };

  if (isLoadingQuiz) {
    return (
      <Card className="border-slate-800 bg-[#0e121c] p-12 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white">Loading Assessment Questions...</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving questions and options for {quiz.title}.</p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="border-rose-900/50 bg-rose-950/20 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-white">Assessment Access Blocked</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">{loadError}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchFullQuiz} className="text-xs gap-1.5 mx-auto">
          <RotateCcw className="w-3.5 h-3.5" /> Retry Assessment Access
        </Button>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Quiz Header Card */}
      <Card className="border-[#232d42] bg-[#0e121c]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="purple">MODULE MCQ ASSESSMENT</Badge>
                {isPassed && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passed
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-2 text-white font-bold">{fullQuiz.title || quiz.title}</CardTitle>
              {(fullQuiz.description || quiz.description) && (
                <p className="text-xs text-slate-400 mt-1">{fullQuiz.description || quiz.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs bg-[#07090e] p-3 rounded-lg border border-[#1e2638]">
              <div>
                <p className="text-slate-400">Pass Mark</p>
                <p className="font-bold text-blue-400 text-sm">{passingScore}%</p>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <p className="text-slate-400">Questions</p>
                <p className="font-bold text-slate-200 text-sm">{questions.length}</p>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <p className="text-slate-400">Attempts</p>
                <p className="font-bold text-slate-200 text-sm">
                  {attemptsCount} / {attemptsLimit}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Result Display Banner */}
      {result && (
        <div
          className={`p-6 rounded-2xl border ${
            result.isPassed
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {result.isPassed ? (
                <Award className="w-10 h-10 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-10 h-10 text-rose-400 shrink-0" />
              )}
              <div>
                <h4 className="text-lg font-bold text-white">
                  {result.isPassed ? 'Congratulations! You Passed!' : 'Assessment Incomplete'}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Your Score: <span className="font-bold text-base">{result.scorePercent}%</span> (Passing score: {result.passingScorePercent}%)
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remaining attempts: {result.remainingAttempts}
                </p>
              </div>
            </div>

            {!result.isPassed && result.remainingAttempts > 0 && (
              <Button variant="secondary" size="sm" onClick={resetQuiz} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Question List */}
      <div className="space-y-4">
        {questions.map((question: any, qIdx: number) => {
          const selected = selectedAnswers[question.id] || [];
          const isMulti = question.type === QuestionType.MULTIPLE_CHOICE || question.type === 'MULTIPLE_CHOICE';

          return (
            <Card key={question.id} className="border-slate-800 bg-[#0c101a]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400">
                    Question {qIdx + 1} of {questions.length}
                  </span>
                  <span className="text-xs text-slate-400">
                    {question.points || 1} {question.points === 1 ? 'Point' : 'Points'}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-white mt-1 leading-relaxed">
                  {question.text}
                </h4>
              </CardHeader>

              <CardContent className="space-y-2.5 pt-2">
                {(question.options || []).map((option: any) => {
                  const isChecked = selected.includes(option.id);

                  return (
                    <div
                      key={option.id}
                      onClick={() => !result && handleOptionSelect(question.id, option.id, isMulti)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-md shadow-blue-600/10'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-slate-700 bg-slate-800'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 fill-current text-white" />}
                      </div>
                      <span className="text-sm font-medium">{option.text}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Button Bar */}
      {!result && (
        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="w-full sm:w-auto"
          >
            <span>Submit Assessment</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
