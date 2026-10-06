'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../providers/toast-provider';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Role } from '@academy/shared';

export default function RegisterPage() {
  const { register } = useAuth();
  const { error: toastError, success } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toastError('Missing Fields', 'Please complete all required fields.');
      return;
    }

    try {
      setIsLoading(true);
      await register({ name, email, password, phone, role });
      success('Account Created!', 'Welcome to Online Creative & IT Academy.');
    } catch (err: any) {
      toastError('Registration Failed', err.message || 'Could not register user.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf3e6] text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 checker-pink">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-plum flex items-center justify-center mx-auto shadow-soft">
              <GraduationCap className="w-5 h-5 text-cream" />
            </div>
            <h1 className="font-display text-4xl font-extrabold text-plum leading-tight">Create Your Academy Account</h1>
            <p className="text-xs font-semibold tracking-wide text-plum/75">JOIN DETERMINISTIC MASTERY & CERTIFICATION TRACKS</p>
          </div>

          <Card className="border-transparent bg-cream-50 p-7 space-y-6 rounded-3xl shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password (min 6 characters)"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                label="Phone Number (optional)"
                placeholder="+1 800 555 0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole(Role.STUDENT)}
                    className={`p-2.5 rounded-md border text-xs font-semibold transition-all ${
                      role === Role.STUDENT
                        ? 'bg-blue-600/20 border-blue-500 text-ink'
                        : 'bg-[#fbf3e6] border-[#eadac4] text-slate-400'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(Role.INSTRUCTOR)}
                    className={`p-2.5 rounded-md border text-xs font-semibold transition-all ${
                      role === Role.INSTRUCTOR
                        ? 'bg-violet-600/20 border-violet-500 text-ink'
                        : 'bg-[#fbf3e6] border-[#eadac4] text-slate-400'
                    }`}
                  >
                    Instructor
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
