'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../providers/toast-provider';
import { GraduationCap, Zap, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login, loginAsDemo } = useAuth();
  const { error: toastError, success } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toastError('Missing Fields', 'Please provide both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await login({ email, password });
      success('Welcome Back!', 'Logged in successfully.');
    } catch (err: any) {
      toastError('Login Failed', err.message || 'Invalid email or password.');
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
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

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

            <div className="text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-400 font-semibold hover:underline">
                Create an account
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
