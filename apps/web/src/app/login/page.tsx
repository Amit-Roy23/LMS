'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../providers/toast-provider';
import { GraduationCap, Zap, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, loginAsDemo } = useAuth();
  const { error: toastError, success } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleDemoLogin = async (role: 'admin' | 'instructor' | 'student1' | 'student2') => {
    try {
      setIsLoading(true);
      await loginAsDemo(role);
      success('Logged In!', `Signed in as ${role}`);
    } catch (err: any) {
      toastError('Login Failed', err.message || 'Could not authenticate. Please verify backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf3e6] text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 checker-pink">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-plum flex items-center justify-center mx-auto shadow-soft">
              <GraduationCap className="w-5 h-5 text-cream" />
            </div>
            <h1 className="font-display text-4xl font-extrabold text-plum leading-tight">Sign In to Your Academy</h1>
            <p className="text-xs font-semibold tracking-wide text-plum/75">AUTHENTICATED LEARNING & CERTIFICATION PORTAL</p>
          </div>

          {/* Login Form Card */}
          <Card className="border-transparent bg-cream-50 p-7 space-y-6 rounded-3xl shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Student ID / Email / Phone"
                type="text"
                placeholder="e.g. OCA-2026-000123 or student@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              Don't have an account?{' '}
              <Link href="/courses" className="text-blue-600 font-semibold hover:underline">
                Explore Courses & Enroll
              </Link>
            </div>
          </Card>

          {/* Fast 1-Click Demo Logins */}
          <div className="p-5 rounded-3xl bg-plum text-cream space-y-3 shadow-soft">
            <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-cream">
              <Zap className="w-3.5 h-3.5 text-peach-500" />
              <span>INSTANT 1-CLICK DEMO ACCESS</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('student1')}
                className="p-3.5 rounded-2xl bg-cream-50 text-plum text-left transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <p className="font-display text-base font-extrabold">
                  Student 1 (Enrolled)
                </p>
                <p className="text-[11px] opacity-75">Active Course Progress</p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('student2')}
                className="p-3.5 rounded-2xl bg-pink-500 text-plum text-left transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <p className="font-display text-base font-extrabold">
                  Student 2 (Fresh)
                </p>
                <p className="text-[11px] opacity-75">New Admission</p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('instructor')}
                className="p-3.5 rounded-2xl bg-peach-500 text-plum text-left transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <p className="font-display text-base font-extrabold">
                  Instructor
                </p>
                <p className="text-[11px] opacity-75">Submissions Review</p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('admin')}
                className="p-3.5 rounded-2xl bg-rust text-cream text-left transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <p className="font-display text-base font-extrabold">
                  Administrator
                </p>
                <p className="text-[11px] opacity-75">Full System Control</p>
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
