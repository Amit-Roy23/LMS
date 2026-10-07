'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { Role } from '@academy/shared';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Users,
  CreditCard,
  BarChart3,
  UserCheck,
  ShieldAlert,
  MessageSquareText,
  Eye,
} from 'lucide-react';
import { PortalShell, PortalLoading, PortalNavItem } from '../../components/layout/portal-shell';

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

  if (isLoading) return <PortalLoading />;

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.INSTRUCTOR)) {
    return null;
  }

  const navItems: PortalNavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
    { href: '/admin/assessments', label: 'Assessments', icon: ClipboardCheck },
    { href: '/admin/reviews', label: 'Review Queue', icon: MessageSquareText },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/enrollments', label: 'Enrollments', icon: CreditCard },
    { href: '/admin/notifications', label: 'Notifications', icon: ShieldAlert },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ...(user.role === Role.ADMIN
      ? [{ href: '/admin/users', label: 'Users', icon: UserCheck }]
      : []),
  ];

  return (
    <PortalShell
      portalLabel={user.role === Role.ADMIN ? 'Admin Console' : 'Instructor Console'}
      navItems={navItems}
      user={user}
      onLogout={logout}
      headerActions={
        <Link
          href="/student/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold text-slate-300 bg-white border border-[#e2e8f0] hover:border-indigo-500 hover:text-indigo-400 transition-colors"
        >
          <Eye className="w-4 h-4" /> Student view
        </Link>
      }
    >
      {children}
    </PortalShell>
  );
}
