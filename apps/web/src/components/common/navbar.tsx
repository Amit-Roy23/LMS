'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../providers/toast-provider';
import { Role } from '@academy/shared';
import { Button } from '../ui/button';
import { DEMO_ACCOUNTS, DemoAccountKey } from '../../lib/demo-accounts';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Briefcase,
  Award,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Zap,
  Loader2,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/ai', label: 'AI & Labs', icon: Sparkles },
  { href: '/career', label: 'Career', icon: Briefcase },
  { href: '/verify/CERT-2026-AI-001', label: 'Verify Certificate', icon: Award },
];

export function Navbar() {
  const { user, logout, loginAsDemo } = useAuth();
  const { error: toastError } = useToast();
  const pathname = usePathname() || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoAccountKey | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the demo menu on outside click / Escape
  useEffect(() => {
    if (!demoMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) setDemoMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDemoMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [demoMenuOpen]);

  // Lock page scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isStaff = user && (user.role === Role.ADMIN || user.role === Role.INSTRUCTOR);
  const dashboardHref = isStaff ? '/admin/dashboard' : '/student/dashboard';

  const demoLogin = async (key: DemoAccountKey) => {
    try {
      setDemoLoading(key);
      await loginAsDemo(key);
      setDemoMenuOpen(false);
      setMobileMenuOpen(false);
    } catch (err: any) {
      toastError('Demo login failed', err.message || 'Please check that the API is running.');
    } finally {
      setDemoLoading(null);
    }
  };

  const DemoList = ({ compact = false }: { compact?: boolean }) => (
    <div className={compact ? 'grid grid-cols-1 gap-1' : 'grid grid-cols-1 gap-0.5'}>
      {DEMO_ACCOUNTS.map((a) => (
        <button
          key={a.key}
          type="button"
          disabled={!!demoLoading}
          onClick={() => demoLogin(a.key)}
          className="flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-60"
        >
          <span
            className={`w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br ${a.tone} text-white text-xs font-bold flex items-center justify-center`}
          >
            {demoLoading === a.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : a.label.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink truncate">{a.label}</span>
            <span className="block text-xs text-slate-500 truncate">{a.persona}</span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <nav
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled ? 'glass border-b border-[#e2e8f0] shadow-card' : 'bg-white/60 backdrop-blur border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <span className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-extrabold text-[15px] sm:text-base tracking-tight text-ink">Creative &amp; IT Academy</span>
              <span className="hidden sm:block text-[11px] text-slate-500 font-medium">Learn · Build · Get certified</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href.split('/').slice(0, 2).join('/')));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    active ? 'text-indigo-400' : 'text-slate-300 hover:text-ink hover:bg-cream-100'
                  }`}
                >
                  {label}
                  {active && <span className="absolute left-3.5 right-3.5 -bottom-[1px] h-0.5 rounded-full bg-brand-gradient" />}
                </Link>
              );
            })}
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative" ref={demoRef}>
              <button
                type="button"
                onClick={() => setDemoMenuOpen((o) => !o)}
                aria-expanded={demoMenuOpen}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-sm font-semibold text-indigo-300 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Demo logins
                <ChevronDown className={`w-4 h-4 transition-transform ${demoMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {demoMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#e2e8f0] bg-white p-2 shadow-lift z-50 animate-scale-in origin-top-right">
                  <p className="px-2.5 pt-1.5 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Explore as any role
                  </p>
                  <DemoList />
                </div>
              )}
            </div>

            {user ? (
              <>
                <Link href={dashboardHref}>
                  <Button variant="primary" size="md">
                    <LayoutDashboard className="w-4 h-4" />
                    {isStaff ? 'Admin panel' : 'My learning'}
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout} title="Log out" aria-label="Log out">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="md">
                    Sign in
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button variant="primary" size="md">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile trigger */}
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="lg:hidden p-2 -mr-2 rounded-lg text-slate-300 hover:bg-cream-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-white border-t border-[#e2e8f0] overflow-y-auto animate-fade-in">
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-[#e2e8f0] text-sm font-semibold text-ink active:bg-indigo-50"
                >
                  <Icon className="w-4 h-4 text-indigo-400" />
                  {label}
                </Link>
              ))}
            </div>

            {user ? (
              <div className="grid gap-2">
                <Link href={dashboardHref} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="lg" className="w-full">
                    <LayoutDashboard className="w-4 h-4" /> Open dashboard
                  </Button>
                </Link>
                <Button variant="secondary" size="lg" onClick={logout} className="w-full">
                  <LogOut className="w-4 h-4" /> Log out ({user.name})
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" size="lg" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/courses" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="lg" className="w-full">
                    Get started
                  </Button>
                </Link>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> One-click demo accounts
              </p>
              <DemoList compact />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
