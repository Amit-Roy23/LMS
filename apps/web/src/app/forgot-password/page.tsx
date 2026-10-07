'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import { KeyRound, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { error: toastError } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toastError('Required Field', 'Please provide your Email, Student ID, or Phone number.');
      return;
    }

    try {
      setIsLoading(true);
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setIsSubmitted(true);
    } catch (err: any) {
      // For enumeration safety, we still show submitted state or generic error
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 tech-dot-grid">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600 border border-blue-400/30 flex items-center justify-center mx-auto shadow-sm">
              <KeyRound className="w-5 h-5 text-ink" />
            </div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Forgot Your Password?</h1>
            <p className="text-xs font-mono text-slate-400">STUDENT & STAFF CREDENTIAL RECOVERY</p>
          </div>

          <Card className="border-[#e2e8f0] bg-[#ffffff] p-6 space-y-6 shadow-xl">
            {isSubmitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Check Your Notifications</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  If an account matches <strong>{identifier}</strong>, we have dispatched a single-use password reset link via Email and WhatsApp.
                </p>
                <div className="pt-4 border-t border-slate-100">
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
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered Student ID (e.g. <code>OCA-2026-000123</code>), Email Address, or Phone Number to receive password reset instructions.
                </p>

                <Input
                  label="Student ID / Email / Phone"
                  placeholder="e.g. OCA-2026-000123 or student@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full mt-2"
                >
                  <span>Send Reset Instructions</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Remembered your password?{' '}
                  <Link href="/login" className="text-blue-600 font-semibold hover:underline">
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
