'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient, setStepUpHandler, storeStepUpToken } from '../../lib/api';
import type { OtpChallenge } from '../../providers/auth-provider';
import { OtpStep } from '../auth/otp-step';
import { Button } from '../ui/button';
import { LockKeyhole, X } from 'lucide-react';

type Pending = { code: 'STEP_UP_REQUIRED' | 'PIN_NOT_SET'; message: string; resolve: (token: string | null) => void };

/**
 * Sensitive admin actions (prices, refunds, roles, deletions, settings) answer
 * STEP_UP_REQUIRED; this dialog collects the admin PIN and an OTP, then the action retries.
 */
export function StepUpProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [pin, setPin] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<Pending | null>(null);

  const close = useCallback((token: string | null) => {
    pendingRef.current?.resolve(token);
    pendingRef.current = null;
    setPending(null);
    setPin('');
    setChallenge(null);
    setError(null);
  }, []);

  useEffect(() => {
    setStepUpHandler(
      (code, message) =>
        new Promise((resolve) => {
          const p = { code, message, resolve };
          pendingRef.current = p;
          setPending(p);
        })
    );
    return () => setStepUpHandler(null);
  }, []);

  const start = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setChallenge(await apiClient<OtpChallenge>('/admin/security/step-up', { method: 'POST', body: JSON.stringify({ pin }) }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    const res = await apiClient<{ stepUpToken: string; expiresAt: string }>('/admin/security/step-up/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge!.challengeId, code }),
    });
    storeStepUpToken(res.stepUpToken, res.expiresAt);
    close(res.stepUpToken);
  };

  return (
    <>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night-950/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="stepup-title">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-lift p-6 animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-violet-50 text-violet-400 flex items-center justify-center">
                  <LockKeyhole className="w-5 h-5" />
                </span>
                <div>
                  <h2 id="stepup-title" className="font-bold text-ink">Confirm it's you</h2>
                  <p className="text-xs text-slate-500">Protected action · {pending.message}</p>
                </div>
              </div>
              <button aria-label="Cancel" className="p-1.5 rounded-lg text-slate-500 hover:bg-cream-100" onClick={() => close(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5">
              {pending.code === 'PIN_NOT_SET' ? (
                <div className="space-y-4 text-sm text-slate-400">
                  <p>Protected actions need your personal security PIN and an OTP. You haven't set a PIN yet.</p>
                  <Link href="/admin/security" onClick={() => close(null)}>
                    <Button variant="primary" className="w-full">Set my security PIN</Button>
                  </Link>
                </div>
              ) : challenge ? (
                <OtpStep
                  challenge={challenge}
                  title="Enter the OTP"
                  description="We sent a 6-digit code"
                  submitLabel="Confirm action"
                  onVerify={verify}
                  onResend={() => apiClient<OtpChallenge>('/admin/security/step-up', { method: 'POST', body: JSON.stringify({ pin }) })}
                  onCancel={() => setChallenge(null)}
                />
              ) : (
                <form onSubmit={start} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="stepup-pin" className="block text-sm font-medium text-ink">Security PIN</label>
                    <input
                      id="stepup-pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="h-12 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-lg font-code tracking-[0.5em] text-ink focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500"
                      autoFocus
                    />
                    {error && <p className="text-sm font-medium text-rose-400" role="alert">{error}</p>}
                  </div>
                  <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={busy} disabled={pin.length < 4}>
                    Continue
                  </Button>
                  <p className="text-xs text-slate-500">After confirming, protected actions work without asking again for 10 minutes.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
