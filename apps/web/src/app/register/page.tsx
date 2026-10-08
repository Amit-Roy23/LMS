'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../providers/toast-provider';
import { GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toastError('Missing Fields', 'Please complete all required fields.');
      return;
    }

    try {
      setIsLoading(true);
      await register({ name, email, password, phone });
      success('Account Created!', 'Welcome to Online Creative & IT Academy.');
    } catch (err: any) {
      toastError('Registration Failed', err.message || 'Could not create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] bg-cream">
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
          <div className="lg:hidden flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-soft">
              <GraduationCap className="w-5 h-5 text-white" />
            </span>
            <span className="font-bold text-lg tracking-tight text-ink">Creative &amp; IT Academy</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-ink">Create your account</h2>
            <p className="text-slate-400">It takes less than a minute.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" autoComplete="name" placeholder="e.g. Riya Sharma" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Input label="Phone (optional)" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
              Create account <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

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
