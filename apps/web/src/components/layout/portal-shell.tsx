'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LogOut, Menu, X, ChevronRight } from 'lucide-react';

export interface PortalNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface PortalShellProps {
  portalLabel: string;
  navItems: PortalNavItem[];
  user: { name: string; email?: string | null; studentId?: string | null; role?: string };
  onLogout: () => void;
  /** Extra content shown under the brand (e.g. a student ID badge) */
  sidebarExtra?: React.ReactNode;
  /** Right side of the top bar */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared layout for the student and admin portals: sidebar on desktop, drawer on mobile. */
export function PortalShell({
  portalLabel,
  navItems,
  user,
  onLogout,
  sidebarExtra,
  headerActions,
  children,
}: PortalShellProps) {
  const pathname = usePathname() || '';
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer when navigating, and on Escape
  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const active = navItems
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const Sidebar = (
    <div className="flex h-full flex-col bg-night-950 text-night-300">
      <div className="flex items-center justify-between px-5 h-16 lg:h-[72px] shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-soft">
            <GraduationCap className="w-4 h-4 text-white" />
          </span>
          <span className="leading-tight">
            <span className="block font-extrabold text-white tracking-tight">Creative &amp; IT</span>
            <span className="block text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">{portalLabel}</span>
          </span>
        </Link>
        <button
          className="lg:hidden p-2 rounded-lg text-night-400 hover:text-white hover:bg-white/5"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {sidebarExtra && <div className="px-4 pb-2">{sidebarExtra}</div>}

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active?.href === item.href;
          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-night-600 cursor-not-allowed"
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-gradient" />}
              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-indigo-500' : 'text-night-500 group-hover:text-night-300'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 p-3 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user.name.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white truncate">{user.name}</span>
            <span className="block text-xs text-night-500 truncate">{user.email}</span>
          </span>
          <button
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="p-2 rounded-lg text-night-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream text-ink lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">{Sidebar}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-night-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-slide-in-left">{Sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-20 h-16 lg:h-[72px] glass border-b border-[#e2e8f0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-300 hover:bg-cream-100"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
            <span className="hidden sm:inline">{portalLabel}</span>
            <ChevronRight className="hidden sm:inline w-4 h-4 text-slate-600" />
            <span className="font-semibold text-ink truncate">{active?.label || 'Overview'}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
    </div>
  );
}

export function PortalLoading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-soft animate-pulse">
          <GraduationCap className="w-6 h-6 text-white" />
        </span>
        <span className="text-sm font-medium text-slate-500">Loading your workspace…</span>
      </div>
    </div>
  );
}
