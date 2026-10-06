'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../providers/auth-provider';
import { Role } from '@academy/shared';
import { Button } from '../ui/button';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Briefcase,
  Award,
  LogOut,
  User,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, loginAsDemo } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[#f0e2d8] bg-cream/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shadow-soft group-hover:bg-brand-dark transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-brand flex items-center gap-1.5">
                Creative & IT Academy
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold bg-coral-500 text-white">
                  EST. 2026
                </span>
              </span>
              <span className="text-[10px] tracking-wider text-slate-400 uppercase">
                ENGINEERING & DESIGN LMS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/courses"
              className="px-3 py-2 rounded-lg text-sm font-medium text-ink hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Courses
            </Link>
            <Link
              href="/ai"
              className="px-3 py-2 rounded-lg text-sm font-medium text-ink hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI & Labs
            </Link>
            <Link
              href="/career"
              className="px-3 py-2 rounded-lg text-sm font-medium text-ink hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Career
            </Link>
            <Link
              href="/verify/CERT-2026-DEMO01"
              className="px-3 py-2 rounded-lg text-sm font-medium text-ink hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" /> Verification
            </Link>
          </div>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Demo Switcher */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="text-xs bg-white border-[#efdfd4] hover:border-coral-500/60 rounded-full"
              >
                <span>⚡ Demo Logins</span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
              </Button>

              {demoMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-[#efdfd4] bg-[#ffffff] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setDemoMenuOpen(false)}
                >
                  <p className="px-2 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Instant 1-Click Login
                  </p>
                  <button
                    onClick={() => {
                      loginAsDemo('student1');
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 transition-colors flex flex-col"
                  >
                    <span className="font-semibold">Student 1 (Enrolled)</span>
                    <span className="text-[10px] text-slate-400">student1@creativeit.academy</span>
                  </button>
                  <button
                    onClick={() => {
                      loginAsDemo('instructor');
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg text-slate-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors flex flex-col"
                  >
                    <span className="font-semibold">Instructor (Alex Morgan)</span>
                    <span className="text-[10px] text-slate-400">instructor@creativeit.academy</span>
                  </button>
                  <button
                    onClick={() => {
                      loginAsDemo('admin');
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg text-slate-200 hover:bg-emerald-600/20 hover:text-emerald-300 transition-colors flex flex-col"
                  >
                    <span className="font-semibold">Admin (Full Access)</span>
                    <span className="text-[10px] text-slate-400">admin@creativeit.academy</span>
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={
                    user.role === Role.ADMIN || user.role === Role.INSTRUCTOR
                      ? '/admin/dashboard'
                      : '/student/dashboard'
                  }
                >
                  <Button variant="primary" size="sm" className="gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {user.role === Role.ADMIN || user.role === Role.INSTRUCTOR
                      ? 'Admin Panel'
                      : 'My Learning'}
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Log out"
                  className="text-slate-400 hover:text-rose-400"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="md">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="white" size="md">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#f0e2d8] bg-cream p-4 space-y-3">
          <Link
            href="/courses"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300 hover:text-ink"
          >
            Courses
          </Link>
          <Link
            href="/ai"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300 hover:text-ink"
          >
            AI & Labs
          </Link>
          <Link
            href="/career"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300 hover:text-ink"
          >
            Career
          </Link>
          <Link
            href="/verify/CERT-2026-DEMO01"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300 hover:text-ink"
          >
            Verify Certificate
          </Link>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href={
                    user.role === Role.ADMIN || user.role === Role.INSTRUCTOR
                      ? '/admin/dashboard'
                      : '/student/dashboard'
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="primary" size="md" className="w-full">
                    Open Dashboard ({user.name})
                  </Button>
                </Link>
                <Button variant="secondary" size="md" onClick={logout} className="w-full">
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" size="md" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
