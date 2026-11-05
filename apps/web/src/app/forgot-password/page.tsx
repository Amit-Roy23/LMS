'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { OtpStep } from '../../components/auth/otp-step';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import type { OtpChallenge } from '../../providers/auth-provider';
import { cn } from '../../lib/utils';
import { KeyRound, ArrowRight, CheckCircle2, ArrowLeft, MessageSquareText, Mail } from 'lucide-react';

type Method = 'otp' | 'link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { error: toastError, success } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState<Method>('otp');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [otp, setOtp] = useState<OtpChallenge | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const requestOtp = () =>
    apiClient<OtpChallenge>('/auth/forgot-password/otp', {
      method: 'POST',
      body: JSON.stringify({ identifier: identifier.trim() }),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toastError('Required Field', 'Please provide your Email, Student ID, or Phone number.');
      return;
    }

    setIsLoading(true);
    try {
      if (method === 'otp') {
        setOtp(await requestOtp());
      } else {
        await apiClient('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ identifier: identifier.trim() }),
        });
        setLinkSent(true);
      }
    } catch (err: any) {
      if (method === 'link') setLinkSent(true); // enumeration-safe
      else toastError('Could not send code', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetWithCode = async (code: string) => {
    if (password.length < 8) throw new Error('New password must be at least 8 characters');
    if (password !== confirm) throw new Error('The two passwords do not match');
    await apiClient('/auth/reset-password/otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId: otp!.challengeId, code, password }),
    });
    success('Password updated', 'Sign in with your new password.');
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 tech-dot-grid">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-11 h-11 rounded-xl bg-brand-gradient flex items-center justify-center mx-auto shadow-soft">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Forgot your password?</h1>
            <p className="text-sm text-slate-400">Reset it with a code sent to your mobile, or a link sent by email.</p>
          </div>

          <Card className="border-[#e2e8f0] bg-white p-6 space-y-6 shadow-card">
            {otp ? (
              <OtpStep
                challenge={otp}
                title="Set a new password"
                description="We sent a 6-digit code"
                submitLabel="Reset password"
                onVerify={resetWithCode}
                onResend={requestOtp}
                onCancel={() => setOtp(null)}
              >
                <Input label="New password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </OtpStep>
            ) : linkSent ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink">Check your email</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  If an account matches <strong>{identifier}</strong>, a single-use reset link has been sent. It expires in 1 hour.
                </p>
                <div className="pt-4 border-t border-[#e2e8f0]">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Sign In</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How to reset">
                  {([
                    ['otp', MessageSquareText, 'Code to mobile'],
                    ['link', Mail, 'Link by email'],
                  ] as const).map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={method === value}
                      onClick={() => setMethod(value)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                        method === value ? 'border-indigo-500 bg-indigo-50 text-indigo-300' : 'border-[#e2e8f0] text-slate-400 hover:border-indigo-800'
                      )}
                    >
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  ))}
                </div>

                <Input
                  label="Student ID, email or mobile number"
                  placeholder="e.g. ADS-2026-000123 or student@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />

                <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2">
                  <span>{method === 'otp' ? 'Send code' : 'Send reset link'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <div className="text-center text-sm text-slate-400 pt-2 border-t border-[#e2e8f0]">
                  Remembered your password?{' '}
                  <Link href="/login" className="text-indigo-400 font-semibold hover:underline">
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
