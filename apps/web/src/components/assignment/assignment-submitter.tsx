'use client';

import React, { useState } from 'react';
import { AssignmentDetail, SubmissionStatus } from '@academy/shared';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Input, Textarea } from '../ui/input';
import { SubmissionStatusBadge } from '../ui/state-indicator';
import {
  Upload,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  AlertTriangle,
  History,
  Send,
  MessageSquare,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import { formatDate } from '../../lib/utils';
import confetti from 'canvas-confetti';

export interface AssignmentSubmitterProps {
  assignment: AssignmentDetail;
  courseId: string;
  moduleId: string;
  onSubmitted?: () => void;
}

export function AssignmentSubmitter({
  assignment,
  courseId,
  moduleId,
  onSubmitted,
}: AssignmentSubmitterProps) {
  const { success, error: toastError } = useToast();

  const [textContent, setTextContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const latest = assignment.latestSubmission;
  const isApproved = latest?.status === SubmissionStatus.APPROVED;
  const isPending = latest?.status === SubmissionStatus.PENDING;
  const canResubmit = !latest || latest.status === SubmissionStatus.CHANGES_REQUESTED || latest.status === SubmissionStatus.REJECTED;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'assignments');

      const res = await apiClient<{ url: string; filename: string }>('/uploads', {
        method: 'POST',
        body: formData,
      });

      setUploadedFiles((prev) => [...prev, res.url]);
      success('File Uploaded', `${file.name} uploaded successfully.`);
    } catch (err: any) {
      toastError('Upload Failed', err.message || 'Could not upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!textContent.trim() && !linkUrl.trim() && uploadedFiles.length === 0) {
      toastError('Submission Empty', 'Please provide a project description, link, or upload files.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient(`/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          assignmentId: assignment.id,
          textContent,
          linkUrl: linkUrl || null,
          files: uploadedFiles,
        }),
      });

      success('Submission Sent!', 'Your assignment has been submitted to your instructor for review.');
      setTextContent('');
      setLinkUrl('');
      setUploadedFiles([]);
      onSubmitted?.();
    } catch (err: any) {
      toastError('Submission Error', err.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Assignment Description Card */}
      <Card className="border-indigo-500/20 bg-slate-900/80">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Practical Assignment
              </span>
              <CardTitle className="text-xl mt-1 text-ink">{assignment.title}</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Max Grade:</span>
              <span className="text-sm font-bold text-indigo-300">{assignment.maxScore} pts</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {assignment.description}
          </div>
        </CardContent>
      </Card>

      {/* Latest Submission Status & Instructor Feedback */}
      {latest && (
        <Card className="border-slate-800 bg-slate-900/90">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-bold text-ink">
                  Submission Version {latest.version}
                </h4>
              </div>
              <SubmissionStatusBadge status={latest.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {latest.grade !== null && latest.grade !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Awarded Grade:</span>
                <span className="font-bold text-emerald-400 text-base">
                  {latest.grade} / {assignment.maxScore}
                </span>
              </div>
            )}

            {latest.feedback && (
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <MessageSquare className="w-4 h-4" /> Instructor Feedback:
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{latest.feedback}</p>
                {latest.reviewedAt && (
                  <p className="text-[10px] text-slate-400 pt-1">
                    Reviewed on {formatDate(latest.reviewedAt)}
                  </p>
                )}
              </div>
            )}

            {latest.textContent && (
              <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-slate-400 block mb-1">Submitted Notes:</span>
                {latest.textContent}
              </div>
            )}

            {latest.linkUrl && (
              <div className="text-xs">
                <span className="text-slate-400">Attached Project Link: </span>
                <a
                  href={latest.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <LinkIcon className="w-3 h-3" /> {latest.linkUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission Form (Rendered if resubmission allowed) */}
      {canResubmit && (
        <Card className="border-indigo-500/30 bg-slate-900/90">
          <CardHeader>
            <CardTitle className="text-base text-ink flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              {latest ? 'Submit Updated Version' : 'Submit Practical Assignment'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                label="Submission Notes / Implementation Description"
                placeholder="Describe your solution, methodology, architecture decisions..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={4}
              />

              <Input
                label="Project Live URL or GitHub Repository"
                placeholder="https://github.com/username/project-repo"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Attachment Upload (ZIP / PDF / Docs)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-950 hover:border-indigo-500 hover:bg-slate-900 text-xs text-slate-300 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>{isUploading ? 'Uploading file...' : 'Choose File to Upload'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                  {uploadedFiles.length > 0 && (
                    <span className="text-xs text-emerald-400 font-medium">
                      ✓ {uploadedFiles.length} file(s) attached
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Submit for Instructor Review
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isPending && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            Your submission is currently queued for instructor review. Once reviewed, you will receive feedback and your progression will update automatically.
          </span>
        </div>
      )}

      {isApproved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            This assignment has been reviewed and approved! You have completed all requirements for this module.
          </span>
        </div>
      )}
    </div>
  );
}
