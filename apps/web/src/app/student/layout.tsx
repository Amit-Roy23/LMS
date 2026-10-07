'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Award,
  User,
  LogOut,
  ChevronRight,
  KeyRound,
  FileText,
} from 'lucide-react';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    // Force password change guard
    if (!isLoading && user?.mustChangePassword && pathname !== '/student/change-password') {
      router.push('/student/change-password');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isForcedChangePassword = Boolean(user.mustChangePassword);

  const navItems = [
    { href: '/student/dashboard', label: 'Dashboard & Progress', icon: LayoutDashboard },
    { href: '/student/courses', label: 'My Enrolled Courses', icon: BookOpen },
    { href: '/student/schedule', label: 'Live Schedule', icon: Calendar },
    { href: '/student/certificates', label: 'My Certificates', icon: Award },
    { href: '/student/profile', label: 'Account Profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-cream text-ink">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-plum text-cream flex flex-col justify-between hidden md:flex shrink-0">
        <div className="p-5 space-y-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-peach-500 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-plum" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base text-cream tracking-tight">Creative & IT</span>
              <span className="text-[10px] font-semibold tracking-wide text-peach-500 uppercase">STUDENT PORTAL</span>
            </div>
          </Link>

          {/* Student ID Badge */}
          {user.studentId && (
            <div className="px-3 py-2 rounded-lg bg-cream/10 border border-cream/20">
              <p className="text-[10px] font-mono text-peach-500 font-bold uppercase">STUDENT ID</p>
              <p className="text-xs font-mono font-extrabold text-cream">{user.studentId}</p>
            </div>
          )}

          {/* Nav List */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (pathname ? pathname.startsWith(`${item.href}/`) : false);
              const isDisabled = isForcedChangePassword && item.href !== '/student/change-password';

              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold text-slate-400 opacity-40 cursor-not-allowed"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-peach-500 text-plum font-semibold'
                      : 'text-cream/75 hover:text-cream hover:bg-cream/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 m-4 rounded-2xl bg-cream/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-peach-500 flex items-center justify-center text-xs font-bold text-plum shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="truncate text-xs">
                <p className="font-bold text-cream truncate">{user.name}</p>
                <p className="text-[10px] text-cream/60 truncate">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 rounded-full text-cream/70 hover:text-plum hover:bg-cream transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Mobile / Subnav */}
        <header className="h-16 border-b border-[#eadac4] bg-cream/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-ink transition-colors">Academy</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-plum font-semibold">Student Portal</span>
            {user.studentId && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-rust font-bold">{user.studentId}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/courses" className="text-xs text-rust font-semibold hover:underline">
              Browse More Courses
            </Link>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
