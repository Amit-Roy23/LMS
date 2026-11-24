'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../providers/toast-provider';
import { Role } from '@academy/shared';
import { Button } from '../ui/button';
import { DEMO_ACCOUNTS, DemoAccountKey } from '../../lib/demo-accounts';
import { useRouter } from 'next/navigation';
import { useCatalog, categoriesOf } from '../../lib/catalog';
import {
  Home,
  Radio,
  Search,
  LayoutGrid,
  LogIn,
  UserPlus,
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
import { BrandLogo } from './brand-logo';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/#live-classes', label: 'Live Session', icon: Radio },
  { href: '/career', label: 'Career', icon: Briefcase },
];

const NAV_ITEM = 'relative inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-[13px] font-medium uppercase tracking-wide transition-colors';

export function Navbar() {
  const { user, logout, loginAsDemo } = useAuth();
  const { error: toastError } = useToast();
  const pathname = usePathname() || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoAccountKey | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const catalog = useCatalog();
  const categories = categoriesOf(catalog || []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(q ? `/courses?q=${encodeURIComponent(q)}` : '/courses');
  };

  // Search overlay: focus the box, close on Escape
  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSearchOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // Categories menu: close on outside click / Escape
  useEffect(() => {
    if (!catOpen) return;
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCatOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [catOpen]);

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

  const isStaff = user && (user.role === Role.ADMIN || user.role === Role.INSTRUCTOR || user.role === Role.STAFF);
  const dashboardHref = isStaff ? '/admin/dashboard' : '/student/dashboard';

  const demoLogin = async (key: DemoAccountKey) => {
    try {
      setDemoLoading(key);
      const outcome = await loginAsDemo(key);
      // Demo students confirm a new browser with an OTP, like real students: finish on the sign-in page
      if (outcome.otpRequired) window.location.href = `/login?demo=${key}`;
      setDemoMenuOpen(false);
      setMobileMenuOpen(false);
    } catch (err: any) {
      toastError('Demo login failed', err.message || 'Please check that the API is running.');
    } finally {
      setDemoLoading(null);
    }
  };

  const navLink = ({ href, label, icon: Icon }: (typeof NAV_LINKS)[number]) => {
    const active = href === '/' ? pathname === '/' : !href.includes('#') && pathname.startsWith(href);
    return (
      <Link key={href} href={href} className={`${NAV_ITEM} ${active ? 'text-adblue' : 'text-ink hover:text-adblue'}`}>
        <Icon className="w-4 h-4" /> {label}
        {active && <span className="absolute left-3 right-3 -bottom-[17px] h-[3px] rounded-t bg-adblue" />}
      </Link>
    );
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
      className={`sticky top-0 z-40 w-full bg-white transition-shadow duration-300 border-b border-grey3/70 ${scrolled ? 'shadow-card' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[76px] gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <BrandLogo caption="Skill & Art Academy" className="group-hover:opacity-90 transition-opacity" />
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-0.5 font-button">
            {NAV_LINKS.slice(0, 2).map((l) => navLink(l))}
            <div className="relative" ref={catRef}>
              <button
                type="button"
                onClick={() => setCatOpen((o) => !o)}
                aria-expanded={catOpen}
                className={`${NAV_ITEM} ${catOpen ? 'text-adblue' : 'text-ink hover:text-adblue'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Categories <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
              </button>
              {catOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl border border-grey3 bg-white p-2 shadow-lift z-50 animate-scale-in origin-top-left">
                  {categories.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-500">Loading…</p>
                  ) : (
                    categories.map((c) => (
                      <Link
                        key={c.name}
                        href={`/courses?category=${encodeURIComponent(c.name)}`}
                        onClick={() => setCatOpen(false)}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-grey2 hover:text-adblue"
                      >
                        {c.name}
                        <span className="text-xs text-slate-500">{c.count}</span>
                      </Link>
                    ))
                  )}
                  <Link href="/courses" onClick={() => setCatOpen(false)} className="mt-1 block rounded-lg px-3 py-2 text-sm font-bold text-adblue hover:bg-grey2">
                    All courses →
                  </Link>
                </div>
              )}
            </div>
            {NAV_LINKS.slice(2).map((l) => navLink(l))}
            <button type="button" onClick={() => setSearchOpen((o) => !o)} aria-expanded={searchOpen} className={`${NAV_ITEM} ${searchOpen ? 'text-adblue' : 'text-ink hover:text-adblue'}`}>
              <Search className="w-4 h-4" /> Search
            </button>
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-1 font-button">
            <div className="relative" ref={demoRef}>
              <button
                type="button"
                onClick={() => setDemoMenuOpen((o) => !o)}
                aria-expanded={demoMenuOpen}
                title="One-click demo accounts"
                className={`${NAV_ITEM} text-amber-600 hover:text-amber-700`}
              >
                <Zap className="w-4 h-4" /> Demo
              </button>
              {demoMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-grey3 bg-white p-2 shadow-lift z-50 animate-scale-in origin-top-right">
                  <p className="px-2.5 pt-1.5 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Explore as any role</p>
                  <DemoList />
                </div>
              )}
            </div>
            {user ? (
              <>
                <Link href={dashboardHref} className={`${NAV_ITEM} text-adblue`}>
                  <LayoutDashboard className="w-4 h-4" /> {isStaff ? 'Admin panel' : 'My learning'}
                </Link>
                <button type="button" onClick={logout} className={`${NAV_ITEM} text-ink hover:text-adred`} aria-label="Log out">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={`${NAV_ITEM} text-ink hover:text-adblue`}>
                  <LogIn className="w-4 h-4" /> Login
                </Link>
                <Link href="/register" className={`${NAV_ITEM} text-adblue hover:text-adred`}>
                  <UserPlus className="w-4 h-4" /> Join now
                </Link>
              </>
            )}
          </div>

          {/* Mobile triggers */}
          <div className="lg:hidden flex items-center gap-1">
            <button onClick={() => setSearchOpen((o) => !o)} aria-label="Search courses" className="p-2 rounded-lg text-ink hover:bg-grey2">
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="p-2 -mr-2 rounded-lg text-ink hover:bg-grey2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search overlay: a large search box over the page, as in the design */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-full h-[calc(100vh-4rem)] lg:h-[calc(100vh-76px)] z-40">
          <button aria-label="Close search" className="absolute inset-0 w-full h-full bg-white/75 backdrop-blur-[2px] animate-fade-in" onClick={() => setSearchOpen(false)} />
          <form onSubmit={submitSearch} role="search" className="relative mx-auto mt-[14vh] w-[calc(100%-2rem)] max-w-3xl flex items-center gap-2 rounded-lg bg-white p-2 shadow-lift border border-grey3 animate-scale-in">
            <Search className="w-6 h-6 text-slate-500 ml-2 shrink-0" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Course / Skills / Categories / Softwares / Application"
              aria-label="Search courses"
              className="flex-1 min-w-0 h-11 bg-transparent text-sm sm:text-base text-ink placeholder:text-slate-500 focus:outline-none"
            />
            <button type="submit" className="h-11 px-5 sm:px-7 rounded-md bg-adblue text-white font-button font-bold hover:brightness-110">
              Search
            </button>
          </form>
        </div>
      )}

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

            {categories.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5" /> Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <Link
                      key={c.name}
                      href={`/courses?category=${encodeURIComponent(c.name)}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-full border border-grey3 px-3 py-1.5 text-xs font-semibold text-ink active:bg-indigo-50"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
                    <LogIn className="w-4 h-4" /> Login
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="lg" className="w-full">
                    <UserPlus className="w-4 h-4" /> Join now
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
