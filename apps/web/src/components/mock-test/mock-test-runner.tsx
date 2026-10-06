'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, CheckCircle2, XCircle, Award, AlertTriangle, ArrowRight } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import confetti from 'canvas-confetti';

export interface MockTestRunnerProps {
  mockTest: {
    id: string;
    title: string;
    description?: string | null;
    durationMinutes: number;
    passingScorePercent: number;
    questions: {
      id: string;
      text: string;
      type: string;
      points: number;
      options: { id: string; text: string }[];
    }[];
  };
  courseId: string;
  onCompleted?: () => void;
}

export function MockTestRunner({ mockTest, courseId, onCompleted }: MockTestRunnerProps) {
  const { success, error: toastError } = useToast();

  const [hasStarted, setHasStarted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(mockTest.durationMinutes * 60);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    scorePercent: number;
    isPassed: boolean;
    passingScorePercent: number;
    breakdown: {
      questionId: string;
      questionText: string;
      explanation?: string;
      selectedOptionIds: string[];
      correctOptionIds: string[];
      isCorrect: boolean;
      points: number;
    }[];
  } | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || result) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true); // Auto submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, result]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: [optionId],
    }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    try {
      setIsSubmitting(true);
      const timeSpent = mockTest.durationMinutes * 60 - secondsRemaining;

      const payload = {
        mockTestId: mockTest.id,
        answers: Object.entries(selectedAnswers).map(([questionId, selectedOptionIds]) => ({
          questionId,
          selectedOptionIds,
        })),
        timeSpentSeconds: timeSpent,
      };

      const res = await apiClient<{
        scorePercent: number;
        isPassed: boolean;
        passingScorePercent: number;
        breakdown: any[];
      }>(`/mock-tests/${mockTest.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);

      if (res.isPassed) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        success('🎉 Mock Test Passed!', `Score: ${res.scorePercent}% (Pass Mark: ${res.passingScorePercent}%)`);
      } else {
        toastError(
          autoSubmit ? 'Time Expired - Not Passed' : 'Mock Test Not Passed',
          `You scored ${res.scorePercent}%. Minimum ${res.passingScorePercent}% required.`
        );
      }

      onCompleted?.();
    } catch (err: any) {
      toastError('Submission Error', err.message || 'Failed to submit mock test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  if (!hasStarted) {
    return (
      <Card className="border-indigo-500/30 bg-slate-900/90 text-center p-8 max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400">
          <Clock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-ink">{mockTest.title}</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {mockTest.description || 'Simulate real exam conditions before your final certification.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400">Duration</p>
            <p className="font-bold text-ink text-sm mt-0.5">{mockTest.durationMinutes} Mins</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400">Questions</p>
            <p className="font-bold text-ink text-sm mt-0.5">{mockTest.questions.length} Items</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400">Passing Mark</p>
            <p className="font-bold text-indigo-400 text-sm mt-0.5">{mockTest.passingScorePercent}%</p>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="primary" size="lg" onClick={() => setHasStarted(true)} className="px-8">
            Start Mock Test Now
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Sticky Countdown Header */}
      <div className="sticky top-20 z-30 flex items-center justify-between p-4 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-xl">
        <div>
          <h3 className="font-bold text-ink text-sm">{mockTest.title}</h3>
          <span className="text-xs text-slate-400">Answer all questions before submitting</span>
        </div>

        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm ${
            secondsRemaining < 120
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
              : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{formatTimer(secondsRemaining)}</span>
        </div>
      </div>

      {/* Result Breakdown View */}
      {result && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-2xl border ${
              result.isPassed
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-4">
              {result.isPassed ? (
                <Award className="w-10 h-10 text-emerald-400" />
              ) : (
                <XCircle className="w-10 h-10 text-rose-400" />
              )}
              <div>
                <h4 className="text-lg font-bold text-ink">
                  {result.isPassed ? 'Mock Test Passed!' : 'Mock Test Result'}
                </h4>
                <p className="text-xs mt-1">
                  Final Score: <span className="font-bold text-base">{result.scorePercent}%</span> (Passing score: {result.passingScorePercent}%)
                </p>
              </div>
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider pt-2">
            Detailed Question Breakdown
          </h4>

          {result.breakdown.map((item, idx) => (
            <Card
              key={item.questionId}
              className={`border ${item.isCorrect ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-rose-500/30 bg-rose-950/10'}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Question {idx + 1}</span>
                  {item.isCorrect ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Correct (+{item.points} pts)
                    </Badge>
                  ) : (
                    <Badge variant="danger" className="gap-1">
                      <XCircle className="w-3 h-3" /> Incorrect (0 pts)
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-ink mt-1">{item.questionText}</p>
              </CardHeader>
              {item.explanation && (
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-indigo-300">Explanation: </span>
                    {item.explanation}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Questions List */}
      {!result && (
        <div className="space-y-4">
          {mockTest.questions.map((q, idx) => {
            const selected = selectedAnswers[q.id] || [];

            return (
              <Card key={q.id} className="border-slate-800 bg-slate-900/80">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400">Question {idx + 1}</span>
                    <span className="text-xs text-slate-400">{q.points} Points</span>
                  </div>
                  <h4 className="text-sm font-semibold text-ink mt-1">{q.text}</h4>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-2">
                  {q.options.map((opt) => {
                    const isChecked = selected.includes(opt.id);

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleOptionSelect(q.id, opt.id)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-indigo-600/20 border-indigo-500/60 text-ink'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isChecked ? 'border-indigo-500 bg-indigo-600' : 'border-slate-700'
                          }`}
                        >
                          {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs font-medium">{opt.text}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleSubmit(false)}
              isLoading={isSubmitting}
            >
              Submit Mock Exam
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
