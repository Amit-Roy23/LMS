'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../providers/toast-provider';
import { DEMO_ACCOUNTS, DemoAccountKey } from '../../lib/demo-accounts';
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  PlayCircle,
  Award,
  Loader2,
  ChevronRight,
} from 'lucide-react';

const HIGHLIGHTS = [
  { icon: PlayCircle, text: 'Video lessons with tamper-proof watch tracking' },
  { icon: Sparkles, text: 'Quizzes, assignments & mentor reviews' },
  { icon: Award, text: 'Verifiable certificates with QR codes' },
];

export default function LoginPage() {
  const { login, loginAsDemo } = useAuth();
  const { error: toastError, success } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoAccountKey | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toastError('Missing Fields', 'Please provide your Student ID/Email/Phone and password.');
      return;
    }

    try {
      setIsLoading(true);
      await login({ identifier, password });
      success('Welcome Back!', 'Logged in successfully.');
    } catch (err: any) {
      toastError('Login Failed', err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (key: DemoAccountKey, label: string) => {
    try {
      setDemoLoading(key);
      await loginAsDemo(key);
      success('Signed in', `Exploring as ${label}`);
    } catch (err: any) {
      toastError('Login Failed', err.message || 'Could not authenticate. Please verify the backend is running.');
    } finally {
      setDemoLoading(null);
    }
  };

  const groups = ['Staff', 'Students'] as const;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr] bg-cream">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden hero-mesh text-white p-12">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-soft">
            <GraduationCap className="w-5 h-5 text-white" />
          </span>
          <span className="font-bold text-lg tracking-tight">Creative &amp; IT Academy</span>
        </Link>

        <div className="relative space-y-8 animate-fade-up">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] text-white">
            Learn by doing.
            <br />
            <span className="text-gradient">Get certified.</span>
          </h1>
          <p className="text-night-300 text-lg max-w-md leading-relaxed">
            A complete learning platform: structured courses, real projects, mentor feedback and
            certificates employers can verify.
          </p>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex items-center gap-3 text-night-200 animate-fade-up"
                style={{ animationDelay: `${150 + i * 120}ms` }}
              >
                <span className="w-9 h-9 rounded-lg glass-dark flex items-center justify-center">
                  <Icon className="w-4 h-4 text-indigo-500" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-sm text-night-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Secured with server-enforced progression and audit logs
        </div>
      </aside>

      {/* Form + demo accounts */}
      <main className="flex flex-col justify-center px-4 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-lg mx-auto space-y-8 animate-fade-up">
          <div className="lg:hidden flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-soft">
              <GraduationCap className="w-5 h-5 text-white" />
            </span>
            <span className="font-bold text-lg tracking-tight text-ink">Creative &amp; IT Academy</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-ink">Welcome back</h2>
            <p className="text-slate-400">Sign in to continue learning, or try a demo account below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Student ID, email or phone"
              type="text"
              autoComplete="username"
              placeholder="e.g. OCA-2026-000123 or you@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-ink">Password</label>
                <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Demo accounts */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> One-click demo accounts
              </span>
              <span className="h-px flex-1 bg-[#e2e8f0]" />
            </div>

            {groups.map((group) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">{group}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.filter((a) => a.group === group).map((account) => (
                    <button
                      key={account.key}
                      type="button"
                      disabled={!!demoLoading}
                      onClick={() => handleDemoLogin(account.key, account.label)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-[#e2e8f0] text-left card-hover disabled:opacity-60 disabled:hover:transform-none"
                    >
                      <span
                        className={`w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br ${account.tone} flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {demoLoading === account.key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          account.label.charAt(0)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink truncate">{account.label}</span>
                        <span className="block text-xs text-slate-500 truncate">{account.persona}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <p className="text-center text-sm text-slate-400">
            New here?{' '}
            <Link href="/courses" className="text-indigo-400 font-semibold hover:text-indigo-300">
              Explore courses &amp; enrol
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
