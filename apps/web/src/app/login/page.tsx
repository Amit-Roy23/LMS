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
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 tech-dot-grid">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600 border border-blue-400/30 flex items-center justify-center mx-auto shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to Your Academy</h1>
            <p className="text-xs font-mono text-slate-400">AUTHENTICATED LEARNING & CERTIFICATION PORTAL</p>
          </div>

          {/* Login Form Card */}
          <Card className="border-[#232d42] bg-[#0e121c] p-6 space-y-6 shadow-xl">
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
          <div className="p-4 rounded-lg bg-[#0e121c] border border-[#1e2638] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>INSTANT 1-CLICK DEMO ACCESS</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('student1')}
                className="p-2.5 rounded-md border border-[#232d42] bg-[#07090e] hover:border-blue-500/50 text-left transition-all disabled:opacity-50"
              >
                <p className="text-xs font-bold text-blue-400">
                  Student 1 (Enrolled)
                </p>
                <p className="text-[10px] font-mono text-slate-400">Active Course Progress</p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('student2')}
                className="p-2.5 rounded-md border border-[#232d42] bg-[#07090e] hover:border-cyan-500/50 text-left transition-all disabled:opacity-50"
              >
                <p className="text-xs font-bold text-cyan-400">
                  Student 2 (Fresh)
                </p>
                <p className="text-[10px] font-mono text-slate-400">New Admission</p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('instructor')}
                className="p-2.5 rounded-md border border-[#232d42] bg-[#07090e] hover:border-violet-500/50 text-left transition-all disabled:opacity-50"
              >
                <p className="text-xs font-bold text-violet-400">
                  Instructor
                </p>
                <p className="text-[10px] font-mono text-slate-400">Submissions Review</p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin('admin')}
                className="p-2.5 rounded-md border border-[#232d42] bg-[#07090e] hover:border-emerald-500/50 text-left transition-all disabled:opacity-50"
              >
                <p className="text-xs font-bold text-emerald-400">
                  Administrator
                </p>
                <p className="text-[10px] font-mono text-slate-400">Full System Control</p>
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
