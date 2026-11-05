'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth, OtpChallenge } from '../../providers/auth-provider';
import { OtpStep } from '../../components/auth/otp-step';
import { apiClient } from '../../lib/api';
import { track } from '../../lib/analytics';
import { useToast } from '../../providers/toast-provider';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '../../components/common/brand-logo';
import { BRAND } from '../../lib/brand';

const PERKS = [
  'Free preview lessons in every course',
  'Track your progress across devices',
  'Earn certificates employers can verify',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const { error: toastError, success } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState<OtpChallenge | null>(null);

  const requestOtp = () =>
    apiClient<OtpChallenge>('/auth/register/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, phone }),
    });

  // Step 1: check the details and text a code to the mobile number
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      toastError('Missing Fields', 'Please complete all required fields.');
      return;
    }
    if (password.length < 8) {
      toastError('Weak password', 'Use at least 8 characters.');
      return;
    }

    try {
      setIsLoading(true);
      setOtp(await requestOtp());
    } catch (err: any) {
      toastError('Could not continue', err.message || 'Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: create the account once the mobile number is verified
  const verifyAndCreate = async (code: string) => {
    await register({ name, email, password, phone, challengeId: otp!.challengeId, otpCode: code });
    track('sign_up', { method: 'mobile_otp' });
    success('Account Created!', `Welcome to ${BRAND.name}.`);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] bg-cream">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden hero-mesh text-white p-12">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <Link href="/" className="relative self-start">
          <BrandLogo tone="dark" size="lg" caption="Skill Academy · Creative | Digital | Studio" />
        </Link>
        <div className="relative space-y-8 animate-fade-up">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] text-white">
            Start learning
            <br />
            <span className="text-gradient">in minutes.</span>
          </h1>
          <ul className="space-y-4">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-night-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-night-400">Join learners building careers in tech, design and marketing.</p>
      </aside>

      <main className="min-w-0 flex flex-col justify-center px-4 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md mx-auto space-y-8 animate-fade-up">
          <Link href="/" className="lg:hidden inline-flex">
            <BrandLogo />
          </Link>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-ink">Create your account</h2>
            <p className="text-slate-400">It takes less than a minute.</p>
          </div>

          {otp ? (
            <OtpStep
              challenge={otp}
              title="Verify your mobile number"
              description="One account per student: we sent a 6-digit code"
              submitLabel="Verify & create account"
              onVerify={verifyAndCreate}
              onResend={requestOtp}
              onCancel={() => setOtp(null)}
            />
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" autoComplete="name" placeholder="e.g. Riya Sharma" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <Input label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="text-xs text-slate-500">We'll text a code to verify your mobile number. Your mobile number is your login and can only be changed with academy approval.</p>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
          )}

          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
