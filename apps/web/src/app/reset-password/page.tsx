'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import { ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const token = searchParams ? searchParams.get('token') || '' : '';
  const isSetup = searchParams ? searchParams.get('setup') === 'true' : false;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toastError('Missing Token', 'Password reset token is missing from the link URL.');
      return;
    }

    if (password.length < 8) {
      toastError('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toastError('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setIsDone(true);
      success('Password Set!', 'Your new password has been saved. Please sign in.');
    } catch (err: any) {
      toastError('Reset Failed', err.message || 'Invalid or expired token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-[#efdfd4] bg-[#ffffff] p-6 space-y-6 shadow-xl">
      {isDone ? (
        <div className="space-y-4 text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {isSetup ? 'Account Password Configured!' : 'Password Reset Successfully!'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your credentials have been updated and are active. You can now log into your Student LMS dashboard.
          </p>
          <div className="pt-4 border-t border-slate-100">
            <Link href="/login">
              <Button variant="primary" size="lg" className="w-full gap-2">
                <span>Sign In to Student Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            {isSetup
              ? 'Welcome to Online Creative & IT Academy! Set your personal account password to complete admission setup.'
              : 'Choose a new permanent password for your academy student account.'}
          </p>

          <Input
            label="New Password (min 8 characters)"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2 gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSetup ? 'Set Password & Activate LMS' : 'Reset Password'}</span>
          </Button>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f3] text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 tech-dot-grid">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600 border border-blue-400/30 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Set Your Password</h1>
            <p className="text-xs font-mono text-slate-400">SECURE ONE-TIME CREDENTIAL ACTIVATION</p>
          </div>

          <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading token...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
