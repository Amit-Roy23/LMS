'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, apiText } from '../../../../../../lib/api';
import { Button } from '../../../../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../../components/ui/card';
import { Badge } from '../../../../../../components/ui/badge';
import { Input, Textarea } from '../../../../../../components/ui/input';
import {
  Settings2,
  HelpCircle,
  Plus,
  Trash2,
  Copy,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Check,
  Loader2,
  FileSpreadsheet,
  Save,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../../../../../../providers/toast-provider';
import Link from 'next/link';

export default function AdminQuizEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const courseId = (params?.courseId as string) || '';
  const quizId = (params?.quizId as string) || '';

  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('questions');
  const [quizConfig, setQuizConfig] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<{
    title: string;
    description: string;
    questionCount: number;
    passPercentage: number;
    maxAttempts: number | null;
    cooldownMinutes: number;
    timeLimitMinutes: number | null;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showAnswersAfterSubmit: string;
    scoringMode: string;
    negativeMarking: boolean;
    negativeMarkValue: number;
    status: string;
  }>({
    title: '',
    description: '',
    questionCount: 20,
    passPercentage: 70,
    maxAttempts: 3,
    cooldownMinutes: 5,
    timeLimitMinutes: 20,
    shuffleQuestions: true,
    shuffleOptions: true,
    showAnswersAfterSubmit: 'AFTER_PASS',
    scoringMode: 'ALL_OR_NOTHING',
    negativeMarking: false,
    negativeMarkValue: 0.25,
    status: 'PUBLISHED',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Question editing modal / state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    text: string;
    explanation: string;
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    tags: string[];
    marks: number;
    options: Array<{ id?: string; text: string; isCorrect: boolean }>;
  }>({
    text: '',
    explanation: '',
    type: 'SINGLE_CHOICE',
    difficulty: 'MEDIUM',
    tags: [],
    marks: 1.0,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });
  const [tagInput, setTagInput] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // CSV Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFileContent, setCsvFileContent] = useState<string>('');
  const [csvDryRunResult, setCsvDryRunResult] = useState<any>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // Load Quiz Data
  const loadQuizData = useCallback(async () => {
    if (!quizId) return;
    try {
      setIsLoading(true);
      const [configRes, questionsRes] = await Promise.all([
        apiClient<any>(`/admin/quizzes/${quizId}`),
        apiClient<any>(`/admin/quizzes/${quizId}/questions`),
      ]);

      setQuizConfig(configRes);
      setSettingsForm({
        title: configRes.title || '',
        description: configRes.description || '',
        questionCount: configRes.questionCount || 20,
        passPercentage: configRes.passPercentage || 70,
        maxAttempts: configRes.maxAttempts || 3,
        cooldownMinutes: configRes.cooldownMinutes || 0,
        timeLimitMinutes: configRes.timeLimitMinutes || 20,
        shuffleQuestions: !!configRes.shuffleQuestions,
        shuffleOptions: !!configRes.shuffleOptions,
        showAnswersAfterSubmit: configRes.showAnswersAfterSubmit || 'AFTER_PASS',
        scoringMode: configRes.scoringMode || 'ALL_OR_NOTHING',
        negativeMarking: !!configRes.negativeMarking,
        negativeMarkValue: configRes.negativeMarkValue || 0.25,
        status: configRes.status || 'PUBLISHED',
      });

      setQuestions(questionsRes?.questions || []);
      setTags(questionsRes?.tags || []);
    } catch (err: any) {
      console.error('Failed to load quiz details', err);
      toastError('Error', err.message || 'Could not load quiz details.');
    } finally {
      setIsLoading(false);
    }
  }, [quizId, toastError]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await apiClient(`/admin/quizzes/${quizId}`, {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      success('Settings Saved', 'Quiz settings updated successfully.');
      loadQuizData();
    } catch (err: any) {
      toastError('Save Error', err.message || 'Failed to update quiz settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Create Question Modal
  const handleOpenCreateQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm({
      text: '',
      explanation: '',
      type: 'SINGLE_CHOICE',
      difficulty: 'MEDIUM',
      tags: [],
      marks: 1.0,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    });
    setTagInput('');
    setIsQuestionModalOpen(true);
  };

  // Open Edit Question Modal
  const handleOpenEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setQuestionForm({
      text: q.text,
      explanation: q.explanation || '',
      type: q.type,
      difficulty: q.difficulty || 'MEDIUM',
      tags: q.tags || [],
      marks: q.marks || 1.0,
      options: q.options?.map((o: any) => ({
        id: o.id,
        text: o.text,
        isCorrect: !!o.isCorrect,
      })) || [],
    });
    setTagInput('');
    setIsQuestionModalOpen(true);
  };

  // Duplicate Question
  const handleDuplicateQuestion = async (qId: string) => {
    try {
      await apiClient(`/admin/questions/${qId}/duplicate`, { method: 'POST' });
      success('Duplicated', 'Question cloned successfully.');
      loadQuizData();
    } catch (err: any) {
      toastError('Duplicate Error', err.message || 'Failed to duplicate question.');
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete or archive this question?')) return;
    try {
      await apiClient(`/admin/questions/${qId}`, { method: 'DELETE' });
      success('Deleted', 'Question removed from active pool.');
      loadQuizData();
    } catch (err: any) {
      toastError('Delete Error', err.message || 'Failed to delete question.');
    }
  };

  // Save Question (Create or Update)
  const handleSaveQuestion = async () => {
    if (!questionForm.text.trim()) {
      toastError('Question Required', 'Please enter question text.');
      return;
    }

    const validOptions = questionForm.options.filter((o) => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      toastError('Options Required', 'Please provide at least 2 non-empty options.');
      return;
    }

    const correctCount = validOptions.filter((o) => o.isCorrect).length;
    if (correctCount === 0) {
      toastError('Correct Answer Required', 'Please mark at least one option as correct.');
      return;
    }

    if (questionForm.type === 'SINGLE_CHOICE' && correctCount > 1) {
      toastError('Single Choice', 'Single choice questions must have exactly one correct option.');
      return;
    }

    try {
      setIsSavingQuestion(true);
      const payload = {
        ...questionForm,
        options: validOptions,
      };

      if (editingQuestionId) {
        await apiClient(`/admin/questions/${editingQuestionId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        success('Question Updated', 'New version created in question bank.');
      } else {
        await apiClient(`/admin/quizzes/${quizId}/questions`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        success('Question Added', 'Question added to active bank.');
      }

      setIsQuestionModalOpen(false);
      loadQuizData();
    } catch (err: any) {
      toastError('Save Error', err.message || 'Failed to save question.');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // CSV Dry-Run
  const handleCsvDryRun = async () => {
    if (!csvFileContent) return;
    try {
      setIsProcessingCsv(true);
      const res = await apiClient<any>(`/admin/quizzes/${quizId}/questions/import`, {
        method: 'POST',
        body: JSON.stringify({
          csvContent: csvFileContent,
          dryRun: true,
        }),
      });
      setCsvDryRunResult(res);
      if (res.valid) {
        success('Validation Passed', `${res.totalRows} questions ready for import.`);
      } else {
        toastError('Validation Errors', `Found ${res.errors?.length} validation issues in CSV.`);
      }
    } catch (err: any) {
      toastError('Dry Run Error', err.message || 'Failed to validate CSV.');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  // CSV Commit Import
  const handleCsvCommit = async () => {
    if (!csvFileContent) return;
    try {
      setIsProcessingCsv(true);
      const res = await apiClient<any>(`/admin/quizzes/${quizId}/questions/import`, {
        method: 'POST',
        body: JSON.stringify({
          csvContent: csvFileContent,
          dryRun: false,
        }),
      });
      success('Import Succeeded', `Successfully imported ${res.importedCount} questions.`);
      setIsCsvModalOpen(false);
      setCsvFileContent('');
      setCsvDryRunResult(null);
      loadQuizData();
    } catch (err: any) {
      toastError('Import Error', err.message || 'Failed to commit CSV import.');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = async () => {
    try {
      const csvTemplate = await apiText('/admin/quizzes/template/csv');
      const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'quiz-questions-template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Template Downloaded', 'CSV template is ready for editing.');
    } catch (err: any) {
      toastError('Template Error', 'Failed to download template');
    }
  };

  // Live pass calculation
  const calculatedPassingScore = Math.ceil(
    (Number(settingsForm.questionCount || 20) * Number(settingsForm.passPercentage || 70)) / 100
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin/assessments" className="hover:text-plum flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-plum">
            {quizConfig?.title || 'Quiz Configuration'}
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Module: <span className="font-semibold text-plum">{quizConfig?.module?.title}</span> •{' '}
            {questions.length} questions in bank pool
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="border-sand hover:bg-cream text-plum"
          >
            <Download className="w-4 h-4 mr-1.5 text-pink-600" /> Template CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCsvModalOpen(true)}
            className="border-sand hover:bg-cream text-plum"
          >
            <Upload className="w-4 h-4 mr-1.5 text-pink-600" /> Import CSV
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateQuestion}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Question
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sand space-x-8">
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'questions'
              ? 'border-b-2 border-pink-500 text-pink-600'
              : 'text-slate-500 hover:text-plum'
          }`}
        >
          <Layers className="w-4 h-4" /> Question Bank Pool ({questions.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-b-2 border-pink-500 text-pink-600'
              : 'text-slate-500 hover:text-plum'
          }`}
        >
          <Settings2 className="w-4 h-4" /> Quiz Settings & Progression Rules
        </button>
      </div>

      {/* TAB 1: QUESTION BANK POOL */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Questions Pool Status Banner */}
          <div className="p-4 rounded-2xl bg-white border border-sand shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                {questions.length}
              </div>
              <div>
                <div className="font-bold text-plum">Active Question Bank Pool</div>
                <div className="text-xs text-slate-500">
                  Assessment randomly selects {settingsForm.questionCount} questions per student attempt.
                </div>
              </div>
            </div>

            {questions.length < settingsForm.questionCount && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                ⚠️ Bank has fewer questions ({questions.length}) than attempt count ({settingsForm.questionCount})
              </Badge>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {questions.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-sand">
                <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="font-bold text-plum text-lg">No Questions in Pool</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Create your first question or bulk import from CSV to populate this module assessment.
                </p>
                <Button onClick={handleOpenCreateQuestion} className="bg-pink-600 hover:bg-pink-700 text-white font-bold">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Question
                </Button>
              </div>
            )}

            {questions.map((q, index) => (
              <Card key={q.id} className="bg-white border-sand shadow-sm hover:border-pink-200 transition-all">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {q.type}
                      </Badge>
                      <Badge
                        className={`text-[10px] ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : q.difficulty === 'HARD'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {q.difficulty}
                      </Badge>
                      {q.tags?.map((t: string) => (
                        <span key={t} className="text-[11px] text-slate-500 bg-cream px-2 py-0.5 rounded-md">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="text-base font-semibold text-plum leading-snug">{q.text}</div>

                    {/* Options Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options?.map((opt: any) => (
                        <div
                          key={opt.id}
                          className={`text-xs p-2 rounded-lg border flex items-center justify-between ${
                            opt.isCorrect
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 font-medium'
                              : 'bg-cream/40 border-sand text-slate-600'
                          }`}
                        >
                          <span className="truncate mr-2">{opt.text}</span>
                          {opt.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="text-xs text-slate-500 bg-cream/30 p-2.5 rounded-lg border border-sand/60">
                        <span className="font-semibold text-plum">Explanation:</span> {q.explanation}
                      </div>
                    )}
                  </div>

                  {/* Question Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditQuestion(q)}
                      className="text-xs text-slate-600 hover:text-plum hover:bg-cream"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateQuestion(q.id)}
                      className="text-xs text-slate-600 hover:text-plum hover:bg-cream"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SETTINGS & PROGRESSION RULES */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <Card className="bg-white border-sand shadow-sm">
            <CardHeader className="pb-4 border-b border-sand/50">
              <CardTitle className="text-lg font-bold text-plum">Quiz Delivery & Assessment Rules</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">Assessment Title *</label>
                  <Input
                    value={settingsForm.title}
                    onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">Publish Status</label>
                  <select
                    value={settingsForm.status}
                    onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                    className="w-full bg-cream/40 border border-sand rounded-xl px-4 py-2.5 text-sm text-plum"
                  >
                    <option value="PUBLISHED">PUBLISHED (Live for Students)</option>
                    <option value="DRAFT">DRAFT (Hidden from Students)</option>
                  </select>
                </div>
              </div>

              {/* Numerical Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Questions Per Attempt
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={settingsForm.questionCount}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, questionCount: parseInt(e.target.value) || 20 })
                    }
                  />
                  <p className="text-[11px] text-slate-500">Number randomly drawn from pool</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Pass Percentage (%) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={settingsForm.passPercentage}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, passPercentage: parseFloat(e.target.value) || 70 })
                    }
                  />
                  <p className="text-[11px] text-slate-500">Default: 70% threshold</p>
                </div>

                {/* Live Preview Box */}
                <div className="p-3.5 rounded-xl bg-pink-50/60 border border-pink-200/80 flex flex-col justify-center">
                  <div className="text-xs text-pink-700 font-bold uppercase">Pass Requirement Preview</div>
                  <div className="text-base font-extrabold text-plum mt-0.5">
                    Pass = At least {calculatedPassingScore} of {settingsForm.questionCount} Correct
                  </div>
                  <div className="text-[11px] text-pink-600 mt-0.5">({settingsForm.passPercentage}% threshold)</div>
                </div>
              </div>

              {/* Time Limit & Attempts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Time Limit (Minutes)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="180"
                    value={settingsForm.timeLimitMinutes || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        timeLimitMinutes: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Leave empty for untimed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Max Allowed Attempts
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={settingsForm.maxAttempts || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        maxAttempts: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Cooldown Between Retries (Min)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1440"
                    value={settingsForm.cooldownMinutes}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, cooldownMinutes: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Review & Scoring Modes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-sand/50">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Answer Review Policy (Security)
                  </label>
                  <select
                    value={settingsForm.showAnswersAfterSubmit}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, showAnswersAfterSubmit: e.target.value })
                    }
                    className="w-full bg-cream/40 border border-sand rounded-xl px-4 py-2.5 text-sm text-plum"
                  >
                    <option value="AFTER_PASS">AFTER_PASS (Show correct answers only after student passes)</option>
                    <option value="AFTER_EACH_ATTEMPT">AFTER_EACH_ATTEMPT (Show answers on every submit)</option>
                    <option value="AFTER_MAX_ATTEMPTS">AFTER_MAX_ATTEMPTS (Show only after exhausting retries)</option>
                    <option value="NEVER">NEVER (Never reveal correct answer choices)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Multiple-Choice Scoring Mode
                  </label>
                  <select
                    value={settingsForm.scoringMode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, scoringMode: e.target.value })}
                    className="w-full bg-cream/40 border border-sand rounded-xl px-4 py-2.5 text-sm text-plum"
                  >
                    <option value="ALL_OR_NOTHING">ALL_OR_NOTHING (Full points only if all correct picked & none wrong)</option>
                    <option value="PARTIAL">PARTIAL (Partial credit proportional to correct choices)</option>
                  </select>
                </div>
              </div>

              {/* Shuffling Options */}
              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-plum">
                  <input
                    type="checkbox"
                    checked={settingsForm.shuffleQuestions}
                    onChange={(e) => setSettingsForm({ ...settingsForm, shuffleQuestions: e.target.checked })}
                    className="rounded border-sand text-pink-600 focus:ring-pink-500 w-4 h-4"
                  />
                  Shuffle Question Order
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-plum">
                  <input
                    type="checkbox"
                    checked={settingsForm.shuffleOptions}
                    onChange={(e) => setSettingsForm({ ...settingsForm, shuffleOptions: e.target.checked })}
                    className="rounded border-sand text-pink-600 focus:ring-pink-500 w-4 h-4"
                  />
                  Shuffle Answer Options Order
                </label>
              </div>

              {/* Save Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingSettings}
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-6"
                >
                  {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Assessment Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* QUESTION CREATE/EDIT MODAL */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-sand max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="text-lg font-bold text-plum">
                {editingQuestionId ? 'Edit Question (Creates New Version)' : 'Add Question to Bank'}
              </h3>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-slate-400 hover:text-plum text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-500">Question Text *</label>
                <Textarea
                  rows={3}
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="Enter clear, concise question prompt..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">Question Type</label>
                  <select
                    value={questionForm.type}
                    onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value as any })}
                    className="w-full bg-cream/40 border border-sand rounded-xl px-3 py-2 text-sm text-plum"
                  >
                    <option value="SINGLE_CHOICE">Single Choice (Radio - 1 Correct)</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice (Checkbox - Multiple Correct)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-500">Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                    className="w-full bg-cream/40 border border-sand rounded-xl px-3 py-2 text-sm text-plum"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              {/* Options Builder */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Answer Choices (Check the box next to correct options) *
                </label>
                {questionForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type={questionForm.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        const updated = questionForm.options.map((o, idx) => {
                          if (questionForm.type === 'SINGLE_CHOICE') {
                            return { ...o, isCorrect: idx === i };
                          } else {
                            return idx === i ? { ...o, isCorrect: e.target.checked } : o;
                          }
                        });
                        setQuestionForm({ ...questionForm, options: updated });
                      }}
                      className="w-4 h-4 text-pink-600 focus:ring-pink-500 rounded"
                    />
                    <Input
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...questionForm.options];
                        updated[i].text = e.target.value;
                        setQuestionForm({ ...questionForm, options: updated });
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1"
                    />
                    {questionForm.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.options.filter((_, idx) => idx !== i);
                          setQuestionForm({ ...questionForm, options: updated });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {questionForm.options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuestionForm({
                        ...questionForm,
                        options: [...questionForm.options, { text: '', isCorrect: false }],
                      });
                    }}
                    className="border-sand text-xs text-plum"
                  >
                    + Add Option
                  </Button>
                )}
              </div>

              {/* Explanation */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Explanation (Shown to students after submission per review policy)
                </label>
                <Textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Explain why the correct answers are right and address common misconceptions..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
              <Button
                variant="outline"
                onClick={() => setIsQuestionModalOpen(false)}
                className="border-sand"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveQuestion}
                disabled={isSavingQuestion}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold"
              >
                {isSavingQuestion ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Save Question
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSV BULK IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-sand">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-pink-600" />
                <h3 className="text-lg font-bold text-plum">Bulk Import Questions from CSV</h3>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-plum">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Upload or paste your CSV formatted questions. Columns required: <br />
                <code className="bg-cream px-1.5 py-0.5 rounded text-[11px] text-plum">
                  question, type, option1, option2, option3, option4, option5, option6, correct, explanation, difficulty, tags
                </code>
              </p>

              <Textarea
                rows={6}
                value={csvFileContent}
                onChange={(e) => {
                  setCsvFileContent(e.target.value);
                  setCsvDryRunResult(null);
                }}
                placeholder="Paste raw CSV content here..."
                className="font-mono text-xs"
              />

              {/* Validation Report */}
              {csvDryRunResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    csvDryRunResult.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {csvDryRunResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {csvDryRunResult.valid
                      ? `Dry-run passed! ${csvDryRunResult.totalRows} questions validated.`
                      : `Validation failed with ${csvDryRunResult.errors?.length} issues.`}
                  </div>

                  {csvDryRunResult.errors?.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto">
                      {csvDryRunResult.errors.map((err: any, i: number) => (
                        <li key={i}>
                          Row {err.row}: {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="border-sand text-xs text-plum"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download CSV Template
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleCsvDryRun}
                  disabled={!csvFileContent.trim() || isProcessingCsv}
                  className="border-sand"
                >
                  Validate (Dry Run)
                </Button>

                <Button
                  onClick={handleCsvCommit}
                  disabled={!csvDryRunResult?.valid || isProcessingCsv}
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold"
                >
                  {isProcessingCsv ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Commit Import
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
