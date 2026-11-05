'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Role } from '@academy/shared';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { formatDateTime } from '../../../lib/utils';
import { BadgeCheck, Smartphone, Check, X } from 'lucide-react';

interface Request {
  id: string;
  oldValue: string | null;
  newValue: string;
  reason?: string | null;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user: { id: string; name: string; email: string; studentId?: string | null };
  reviewedBy?: { name: string } | null;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const canDecide = user?.role === Role.ADMIN;

  const load = useCallback(() => {
    apiClient<Request[]>('/admin/change-requests')
      .then(setItems)
      .catch((e) => toastError('Could not load approvals', e.message))
      .finally(() => setLoading(false));
  }, [toastError]);
  useEffect(load, [load]);

  const decide = async (r: Request, approve: boolean) => {
    const note = approve ? '' : window.prompt('Reason for declining (sent to the student):', '') ?? null;
    if (note === null) return;
    try {
      await apiClient(`/admin/change-requests/${r.id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: JSON.stringify({ note }) });
      success(approve ? 'Mobile number updated' : 'Request declined', `${r.user.name} has been notified.`);
      load();
    } catch (err: any) {
      toastError('Could not save decision', err.message);
    }
  };

  const pending = items.filter((i) => i.status === 'PENDING');
  const done = items.filter((i) => i.status !== 'PENDING');

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <BadgeCheck className="w-6 h-6 text-indigo-400" /> Approvals
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Students confirm a new mobile number with an OTP; it takes effect only after a main admin approves it.
          {!canDecide && ' You can view requests; a main admin decides.'}
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <h2 className="font-bold text-ink">Waiting for approval</h2>
          <Badge variant={pending.length ? 'warning' : 'success'}>{pending.length}</Badge>
        </div>
        {loading ? (
          <div className="p-6"><div className="h-16 rounded-xl skeleton" /></div>
        ) : pending.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Nothing to approve.</p>
        ) : (
          <ul className="divide-y divide-[#e2e8f0]">
            {pending.map((r) => (
              <li key={r.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">
                    {r.user.name} <span className="text-sm font-normal text-slate-500">{r.user.studentId || r.user.email}</span>
                  </p>
                  <p className="text-sm text-slate-400 font-code">
                    {r.oldValue || 'none'} → <span className="text-ink font-semibold">{r.newValue}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified by OTP · requested {formatDateTime(r.createdAt)}{r.reason ? ` · “${r.reason}”` : ''}
                  </p>
                </div>
                {canDecide && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="primary" size="sm" onClick={() => decide(r, true)}>
                      <Check className="w-4 h-4" /> Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => decide(r, false)}>
                      <X className="w-4 h-4" /> Decline
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card className="overflow-hidden">
          <h2 className="px-5 py-4 border-b border-[#e2e8f0] font-bold text-ink">History</h2>
          <ul className="divide-y divide-[#e2e8f0]">
            {done.map((r) => (
              <li key={r.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-ink">{r.user.name}</span>
                <span className="font-code text-slate-400">{r.oldValue || 'none'} → {r.newValue}</span>
                <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'slate'}>{r.status.toLowerCase()}</Badge>
                <span className="text-xs text-slate-500 ml-auto">
                  {r.reviewedBy?.name ? `${r.reviewedBy.name} · ` : ''}{formatDateTime(r.reviewedAt || r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
