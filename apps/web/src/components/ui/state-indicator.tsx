import React from 'react';
import {
  Lock,
  Unlock,
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { ModuleStatus, SubmissionStatus } from '@academy/shared';
import { cn } from '../../lib/utils';

export function ModuleStatusBadge({ status }: { status: ModuleStatus }) {
  switch (status) {
    case ModuleStatus.LOCKED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <Lock className="w-3.5 h-3.5" /> Locked
        </span>
      );
    case ModuleStatus.AVAILABLE:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
          <Unlock className="w-3.5 h-3.5" /> Available
        </span>
      );
    case ModuleStatus.IN_PROGRESS:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
          <PlayCircle className="w-3.5 h-3.5" /> In Progress
        </span>
      );
    case ModuleStatus.AWAITING_REVIEW:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <Clock className="w-3.5 h-3.5" /> Awaiting Review
        </span>
      );
    case ModuleStatus.COMPLETED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed
        </span>
      );
    default:
      return null;
  }
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case SubmissionStatus.PENDING:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5" /> Pending Review
        </span>
      );
    case SubmissionStatus.CHANGES_REQUESTED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/40">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Changes Requested
        </span>
      );
    case SubmissionStatus.APPROVED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Approved
        </span>
      );
    case SubmissionStatus.REJECTED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <XCircle className="w-3.5 h-3.5 text-rose-400" /> Rejected
        </span>
      );
    default:
      return null;
  }
}
