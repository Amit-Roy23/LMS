'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { Role } from '@academy/shared';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Users,
  CreditCard,
  BarChart3,
  UserCheck,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== Role.ADMIN && user.role !== Role.INSTRUCTOR) {
        router.push('/student/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.INSTRUCTOR)) {
    return null;
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard & Analytics', icon: LayoutDashboard },
    { href: '/admin/courses', label: 'Courses & Curriculum', icon: BookOpen },
    { href: '/admin/reviews', label: 'Review Queue', icon: ClipboardCheck },
    { href: '/admin/students', label: 'Students & Progress', icon: Users },
    { href: '/admin/enrollments', label: 'Enrollments & Billing', icon: CreditCard },
    { href: '/admin/notifications', label: 'Notifications & Logs', icon: ShieldAlert },
    { href: '/admin/reports', label: 'Analytics Reports', icon: BarChart3 },
    ...(user.role === Role.ADMIN
      ? [{ href: '/admin/users', label: 'User Management', icon: UserCheck }]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-cream text-ink">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-plum text-cream flex flex-col justify-between hidden md:flex shrink-0">
        <div className="p-5 space-y-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-plum" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base text-cream tracking-tight">Academy Admin</span>
              <span className="text-[10px] font-semibold tracking-wide text-pink-500 uppercase">
                {user.role} TERMINAL
              </span>
            </div>
          </Link>

          {/* Nav List */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (pathname ? pathname.startsWith(`${item.href}/`) : false);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-pink-500 text-plum font-semibold'
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

        {/* User Card */}
        <div className="p-4 m-4 rounded-2xl bg-cream/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold text-plum shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="truncate text-xs">
                <p className="font-bold text-cream truncate">{user.name}</p>
                <p className="text-[10px] text-pink-500 font-semibold truncate">{user.role}</p>
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
        <header className="h-16 border-b border-[#eadac4] bg-cream/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-ink transition-colors">Academy</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-rust font-semibold">Admin Panel</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link href="/student/dashboard" className="text-slate-400 hover:text-indigo-400">
              Switch to Student View
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
