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
  Inbox,
  History,
  ShieldCheck,
  BadgeCheck,
  PlayCircle,
  Receipt,
  UserRound,
  FileText,
  Search,
  LifeBuoy,
} from 'lucide-react';
import { StepUpProvider } from '../../components/admin/step-up-provider';

const CONSOLE_ROLES: string[] = [Role.ADMIN, Role.STAFF, Role.INSTRUCTOR];
const PORTAL_LABELS: Record<string, string> = {
  ADMIN: 'Admin Console',
  STAFF: 'Staff Console',
  INSTRUCTOR: 'Instructor Console',
};
import { PortalShell, PortalLoading, PortalNavItem } from '../../components/layout/portal-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (!CONSOLE_ROLES.includes(user.role)) {
        router.push('/student/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) return <PortalLoading />;

  if (!user || !CONSOLE_ROLES.includes(user.role)) {
    return null;
  }

  const role = user.role;
  const is = (...roles: string[]) => roles.includes(role);
  // Each role sees only the sections it can use
  const navItems: PortalNavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/courses', label: is(Role.INSTRUCTOR) ? 'My Courses' : 'Courses', icon: BookOpen },
    ...(is(Role.ADMIN, Role.INSTRUCTOR)
      ? [
          { href: '/admin/assessments', label: 'Assessments', icon: ClipboardCheck },
          { href: '/admin/reviews', label: 'Review Queue', icon: MessageSquareText },
        ]
      : []),
    { href: '/admin/students', label: is(Role.INSTRUCTOR) ? 'My Students' : 'Students', icon: Users },
    { href: '/admin/enrollments', label: 'Enrollments', icon: CreditCard },
    ...(is(Role.ADMIN, Role.STAFF)
      ? [
          { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
          { href: '/admin/approvals', label: 'Approvals', icon: BadgeCheck },
          { href: '/admin/invoices', label: 'Payments & Invoices', icon: Receipt },
          { href: '/admin/notifications', label: 'Notifications', icon: ShieldAlert },
        ]
      : []),
    ...(is(Role.ADMIN, Role.STAFF, Role.INSTRUCTOR) ? [{ href: '/admin/video-activity', label: 'Video Activity', icon: PlayCircle }] : []),
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ...(is(Role.ADMIN)
      ? [
          { href: '/admin/activity', label: 'Activity Log', icon: History },
          { href: '/admin/users', label: 'Users & Roles', icon: UserCheck },
        ]
      : []),
    ...(is(Role.ADMIN, Role.STAFF)
      ? [
          { href: '/admin/website', label: 'Website & Pages', icon: FileText },
          { href: '/admin/seo', label: 'SEO & Analytics', icon: Search },
        ]
      : []),
    ...(is(Role.ADMIN, Role.INSTRUCTOR) ? [{ href: '/admin/profile', label: 'Public Profile', icon: UserRound }] : []),
    { href: '/admin/security', label: 'My Security', icon: ShieldCheck },
    { href: '/admin/help', label: 'Help', icon: LifeBuoy },
  ];

  return (
    <PortalShell
      portalLabel={PORTAL_LABELS[role] || 'Console'}
      navItems={navItems}
      user={user}
      onLogout={logout}
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/help"
            aria-label="Help: console guide"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-semibold text-slate-300 bg-white border border-[#e2e8f0] hover:border-indigo-500 hover:text-indigo-400 transition-colors"
          >
            <LifeBuoy className="w-4 h-4" /> <span className="hidden sm:inline">Help</span>
          </Link>
          <Link
            href="/student/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold text-slate-300 bg-white border border-[#e2e8f0] hover:border-indigo-500 hover:text-indigo-400 transition-colors"
          >
            <Eye className="w-4 h-4" /> Student view
          </Link>
        </div>
      }
    >
      <StepUpProvider>{children}</StepUpProvider>
    </PortalShell>
  );
}
