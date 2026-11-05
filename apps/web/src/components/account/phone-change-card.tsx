'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import type { OtpChallenge } from '../../providers/auth-provider';
import { Card, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { OtpStep } from '../auth/otp-step';
import { formatDate } from '../../lib/utils';
import { Smartphone, Clock3 } from 'lucide-react';

interface ChangeRequest {
  id: string;
  oldValue: string | null;
  newValue: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

const STATUS_BADGE: Record<ChangeRequest['status'], { label: string; variant: any }> = {
  PENDING: { label: 'Waiting for approval', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Declined', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'slate' },
};

/** Registered mobile number with the OTP-confirmed, admin-approved change flow. */
export function PhoneChangeCard({ currentPhone, onChanged }: { currentPhone?: string | null; onChanged?: () => void }) {
  const { success, error: toastError } = useToast();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [reason, setReason] = useState('');
  const [otp, setOtp] = useState<OtpChallenge | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiClient<ChangeRequest[]>('/student/phone-change').then(setRequests).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const pending = requests.find((r) => r.status === 'PENDING');
  const last = requests[0];
  useEffect(() => {
    if (last?.status === 'APPROVED') onChanged?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.id, last?.status]);

  const sendCode = () =>
    apiClient<OtpChallenge>('/student/phone-change/otp', { method: 'POST', body: JSON.stringify({ newPhone }) });

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setOtp(await sendCode());
    } catch (err: any) {
      toastError('Could not send code', err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (code: string) => {
    await apiClient('/student/phone-change', {
      method: 'POST',
      body: JSON.stringify({ challengeId: otp!.challengeId, code, reason }),
    });
    success('Request sent', 'The academy will review your new mobile number shortly.');
    setOtp(null);
    setOpen(false);
    setNewPhone('');
    setReason('');
    load();
  };

  const cancel = async (id: string) => {
    try {
      await apiClient(`/student/phone-change/${id}`, { method: 'DELETE' });
      load();
    } catch (err: any) {
      toastError('Could not cancel', err.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0] bg-white p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base text-ink flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-400" /> Registered mobile number
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">Used to sign in and receive verification codes. Changes need academy approval.</p>
        </div>
        <span className="font-code text-sm font-semibold text-ink whitespace-nowrap">{currentPhone || 'Not set'}</span>
      </div>

      {pending ? (
        <div className="rounded-xl border border-amber-800 bg-amber-50 p-4 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Clock3 className="w-4 h-4" /> Change to <strong className="font-code">{pending.newValue}</strong> is waiting for approval
            (requested {formatDate(pending.createdAt)}).
          </span>
          <button className="font-semibold underline underline-offset-2" onClick={() => cancel(pending.id)}>
            Cancel request
          </button>
        </div>
      ) : last && last.status !== 'CANCELLED' ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span>Last request to {last.newValue}:</span>
          <Badge variant={STATUS_BADGE[last.status].variant}>{STATUS_BADGE[last.status].label}</Badge>
          {last.reviewNote && <span className="text-slate-500">“{last.reviewNote}”</span>}
        </div>
      ) : null}

      {!pending &&
        (otp ? (
          <OtpStep
            challenge={otp}
            title="Confirm your new number"
            description="We sent a 6-digit code"
            submitLabel="Send for approval"
            onVerify={confirm}
            onResend={sendCode}
            onCancel={() => setOtp(null)}
          />
        ) : open ? (
          <form onSubmit={start} className="space-y-3">
            <Input label="New mobile number" type="tel" inputMode="tel" placeholder="98765 43210" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
            <Input label="Reason (optional)" placeholder="e.g. lost my old SIM" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" isLoading={busy}>Send code</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Request a change
          </Button>
        ))}
    </Card>
  );
}
