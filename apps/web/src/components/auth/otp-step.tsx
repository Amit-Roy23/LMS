'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import type { OtpChallenge } from '../../providers/auth-provider';
import { KeyRound, MessageSquareText, Mail, RotateCcw, ShieldCheck } from 'lucide-react';

interface OtpStepProps {
  challenge: OtpChallenge;
  title?: string;
  description?: string;
  submitLabel?: string;
  /** Called with the 6-digit code; throw to show an error. */
  onVerify: (code: string) => Promise<void>;
  /** Requests a fresh code; return the new challenge. */
  onResend?: () => Promise<OtpChallenge>;
  onCancel?: () => void;
  /** Extra fields rendered above the code (e.g. a new password). */
  children?: React.ReactNode;
}

const RESEND_SECONDS = 30;

/** Shared "enter the 6-digit code" step used for sign-in, registration, password reset and admin confirmation. */
export function OtpStep({ challenge: initial, title, description, submitLabel = 'Verify', onVerify, onResend, onCancel, children }: OtpStepProps) {
  const [challenge, setChallenge] = useState(initial);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => setChallenge(initial), [initial]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const ChannelIcon = challenge.channel === 'EMAIL' ? Mail : MessageSquareText;
  const via = challenge.channel === 'EMAIL' ? 'email' : challenge.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onVerify(code);
    } catch (err: any) {
      setError(err?.message || 'Could not verify the code');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!onResend) return;
    setError(null);
    try {
      const next = await onResend();
      setChallenge(next);
      setCode('');
      setWait(RESEND_SECONDS);
    } catch (err: any) {
      setError(err?.message || 'Could not send a new code');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 animate-fade-up">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 text-indigo-400 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-ink">{title || 'Enter verification code'}</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {description || 'We sent a 6-digit code'} by {via} to{' '}
            <span className="font-semibold text-ink inline-flex items-center gap-1">
              <ChannelIcon className="w-3.5 h-3.5" /> {challenge.maskedTarget}
            </span>
          </p>
        </div>
      </div>

      {challenge.devCode && (
        <div className="rounded-xl border border-amber-800 bg-amber-50 px-4 py-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Demo mode:</strong> no SMS gateway is connected yet, so your code is{' '}
            <span className="font-code font-bold tracking-widest">{challenge.devCode}</span>
          </span>
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setCode(challenge.devCode!)}>
            Fill in
          </button>
        </div>
      )}

      {children}

      <div className="space-y-1.5">
        <label htmlFor="otp-code" className="block text-sm font-medium text-ink">
          6-digit code
        </label>
        <div className="relative">
          <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            className="h-12 w-full rounded-xl border border-[#cbd5e1] bg-white pl-10 pr-3 text-lg font-code tracking-[0.5em] text-ink focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500"
            autoFocus
          />
        </div>
        {error && <p className="text-sm font-medium text-rose-400" role="alert">{error}</p>}
      </div>

      <Button type="submit" variant="primary" size="lg" isLoading={busy} className="w-full">
        {submitLabel}
      </Button>

      <div className="flex items-center justify-between text-sm">
        {onResend ? (
          <button
            type="button"
            disabled={wait > 0}
            onClick={resend}
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-400 disabled:text-slate-500"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
          </button>
        ) : (
          <span />
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="font-semibold text-slate-400 hover:text-ink">
            Back
          </button>
        )}
      </div>
    </form>
  );
}
