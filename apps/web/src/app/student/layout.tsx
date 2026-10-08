'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { LayoutDashboard, BookOpen, Calendar, Award, User, Compass } from 'lucide-react';
import { PortalShell, PortalLoading, PortalNavItem } from '../../components/layout/portal-shell';

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

  if (isLoading) return <PortalLoading />;

  if (!user) return null;

  const isForcedChangePassword = Boolean(user.mustChangePassword);

  const navItems: PortalNavItem[] = [
    { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/courses', label: 'My Courses', icon: BookOpen },
    { href: '/student/schedule', label: 'Live Schedule', icon: Calendar },
    { href: '/student/certificates', label: 'Certificates', icon: Award },
    { href: '/student/profile', label: 'Profile', icon: User },
  ].map((item) => ({ ...item, disabled: isForcedChangePassword && item.href !== '/student/change-password' }));

  return (
    <PortalShell
      portalLabel="Student Portal"
      navItems={navItems}
      user={user}
      onLogout={logout}
      sidebarExtra={
        user.studentId ? (
          <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-night-500">Student ID</p>
            <p className="text-sm font-bold text-white tracking-wide">{user.studentId}</p>
          </div>
        ) : null
      }
      headerActions={
        <Link
          href="/courses"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold text-indigo-300 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          <Compass className="w-4 h-4" /> Browse courses
        </Link>
      }
    >
      {children}
    </PortalShell>
  );
}
