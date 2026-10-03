'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Modal } from '../../../components/ui/modal';
import { Textarea, Input } from '../../../components/ui/input';
import { SubmissionStatus } from '@academy/shared';
import { useToast } from '../../../providers/toast-provider';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Clock,
  User,
  FileCode2,
  MessageSquare,
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import confetti from 'canvas-confetti';

export default function AdminReviewsPage() {
  const { success, error: toastError } = useToast();

  const [reviewsData, setReviewsData] = useState<{
    assignmentSubmissions: any[];
    projectSubmissions: any[];
    totalPending: number;
  }>({ assignmentSubmissions: [], projectSubmissions: [], totalPending: 0 });

  const [isLoading, setIsLoading] = useState(true);

  // Review Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [reviewType, setReviewType] = useState<'assignment' | 'project'>('assignment');
  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>(SubmissionStatus.APPROVED);
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState<number>(95);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadPendingReviews() {
    try {
      setIsLoading(true);
      const data = await apiClient<any>('/reviews/pending');
      setReviewsData(data);
    } catch (err) {
      console.error('Failed to load pending reviews', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const openReviewModal = (submission: any, type: 'assignment' | 'project') => {
    setSelectedSubmission(submission);
    setReviewType(type);
    setReviewStatus(SubmissionStatus.APPROVED);
    setFeedback('Excellent work! Your implementation satisfies all required specifications and adheres to clean architecture principles.');
    setGrade(95);
  };

  const handleSaveReview = async () => {
    if (!feedback.trim()) {
      toastError('Feedback Required', 'Please provide constructive review feedback.');
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint =
        reviewType === 'assignment'
          ? `/reviews/assignments/${selectedSubmission.id}`
          : `/reviews/projects/${selectedSubmission.id}`;

      await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          status: reviewStatus,
          feedback,
          grade: Number(grade) || null,
        }),
      });

      if (reviewStatus === SubmissionStatus.APPROVED) {
        confetti({ particleCount: 70, spread: 60 });
        success('Submission Approved!', 'Progress state machine has unlocked subsequent stages for the student.');
      } else {
        success('Review Submitted', `Status set to ${reviewStatus}.`);
      }

      setSelectedSubmission(null);
      loadPendingReviews();
    } catch (err: any) {
      toastError('Review Failed', err.message || 'Could not save review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Instructor Review Queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate pending practical assignments and capstone projects. Approving a submission advances the student's progression.
          </p>
        </div>

        <Badge variant={reviewsData.totalPending > 0 ? 'warning' : 'success'} className="text-xs font-bold px-3 py-1">
          {reviewsData.totalPending} Pending Evaluations
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : reviewsData.totalPending === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/40 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Review Queue is Clear!</h3>
          <p className="text-xs text-slate-400">All student submissions have been evaluated.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Assignment Submissions */}
          {reviewsData.assignmentSubmissions.map((sub) => (
            <Card key={sub.id} className="border-slate-800 bg-slate-900/90 p-5 space-y-3 hover:border-indigo-500/40 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                    {sub.student?.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{sub.student?.name}</h4>
                    <p className="text-[11px] text-slate-400">{sub.assignment?.module?.course?.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="warning">Pending Review (v{sub.version})</Badge>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openReviewModal(sub, 'assignment')}
                    className="text-xs"
                  >
                    Evaluate Submission
                  </Button>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-indigo-300">
                  Task: {sub.assignment?.title}
                </p>
                {sub.textContent && (
                  <p className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-slate-300 line-clamp-3">
                    {sub.textContent}
                  </p>
                )}
                {sub.linkUrl && (
                  <a
                    href={sub.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> {sub.linkUrl}
                  </a>
                )}
              </div>
            </Card>
          ))}

          {/* Final Project Submissions */}
          {reviewsData.projectSubmissions.map((sub) => (
            <Card key={sub.id} className="border-purple-500/40 bg-slate-900/90 p-5 space-y-3 hover:border-purple-500/60 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-xs">
                    {sub.student?.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{sub.student?.name}</h4>
                    <p className="text-[11px] text-purple-300">Capstone Final Project</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="purple">Capstone Pending</Badge>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openReviewModal(sub, 'project')}
                    className="text-xs"
                  >
                    Evaluate Capstone
                  </Button>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-slate-300">
                  {sub.description}
                </p>
                {sub.linkUrl && (
                  <a
                    href={sub.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> {sub.linkUrl}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          title={`Evaluate ${reviewType === 'assignment' ? 'Practical Assignment' : 'Capstone Project'}`}
          description={`Student: ${selectedSubmission.student?.name} (${selectedSubmission.student?.email})`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Status Selection Buttons */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Evaluation Verdict
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewStatus(SubmissionStatus.APPROVED)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    reviewStatus === SubmissionStatus.APPROVED
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => setReviewStatus(SubmissionStatus.CHANGES_REQUESTED)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    reviewStatus === SubmissionStatus.CHANGES_REQUESTED
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Request Changes
                </button>

                <button
                  type="button"
                  onClick={() => setReviewStatus(SubmissionStatus.REJECTED)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    reviewStatus === SubmissionStatus.REJECTED
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  Reject
                </button>
              </div>
            </div>

            <Input
              label="Awarded Grade / Score (0 to 100)"
              type="number"
              min="0"
              max="100"
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value) || 0)}
            />

            <Textarea
              label="Instructor Feedback & Critique"
              placeholder="Provide constructive feedback for the student..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              required
            />

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setSelectedSubmission(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveReview}
                isLoading={isSubmitting}
              >
                Submit Evaluation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
