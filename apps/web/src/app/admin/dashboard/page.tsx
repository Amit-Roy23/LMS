'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Reveal } from '../../../components/motion/reveal';
import { ColumnChart, BarList } from '../../../components/charts/bar-charts';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Plus,
  TrendingUp,
  Users,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient('/admin/reports/analytics')
      .then(setAnalytics)
      .catch((err) => console.error('Failed to load admin analytics', err))
      .finally(() => setIsLoading(false));
  }, []);

  const summary = analytics?.summary || {};
  const weekly: any[] = analytics?.weekly || [];
  const byCourse: any[] = analytics?.byCourse || [];
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const compactInr = (v: number) =>
    v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="h-32 rounded-3xl skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl skeleton" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl skeleton" />
          <div className="h-72 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  const kpis = [
    { icon: CreditCard, label: 'Total revenue', value: formatCurrency(summary.totalRevenue || 0), sub: 'Completed payments', tone: 'bg-emerald-50 text-emerald-400' },
    { icon: Users, label: 'Students', value: summary.totalStudents || 0, sub: `${summary.totalEnrollments || 0} enrolments`, tone: 'bg-indigo-50 text-indigo-400' },
    { icon: ClipboardCheck, label: 'Pending reviews', value: summary.pendingReviewsCount || 0, sub: 'Awaiting an instructor', tone: 'bg-amber-50 text-amber-400' },
    { icon: Award, label: 'Certificates', value: summary.totalCertificates || 0, sub: `${summary.certificationRate || 0}% of enrolments`, tone: 'bg-violet-50 text-violet-400' },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl hero-mesh text-white p-6 sm:p-8 animate-fade-up">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-indigo-500">Academy overview</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {user?.name || 'Admin'}
            </h1>
            <p className="mt-2 text-night-300 max-w-xl">
              Enrolments, revenue and review work across all {summary.totalCourses || 0} programs, updated live.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/reviews">
              <Button variant="primary">
                <ClipboardCheck className="w-4 h-4" /> Review queue ({summary.pendingReviewsCount || 0})
              </Button>
            </Link>
            <Link href="/admin/courses/new">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/15 text-white border-white/15">
                <Plus className="w-4 h-4" /> New course
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, sub, tone }, i) => (
          <Reveal key={label} delay={i * 70} className="rounded-2xl bg-white border border-[#e2e8f0] p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">{label}</span>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon className="w-[18px] h-[18px]" />
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          </Reveal>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <Reveal className="min-w-0 rounded-2xl bg-white border border-[#e2e8f0] p-5 sm:p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> New enrolments per week
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 8 weeks</p>
            </div>
            <span className="text-sm font-semibold text-ink tabular-nums">
              {weekly.reduce((n, w) => n + w.enrollments, 0)} total
            </span>
          </div>
          <div className="mt-6">
            <ColumnChart
              caption="New enrolments per week, last 8 weeks"
              data={weekly.map((w) => ({
                label: shortDate(w.weekStart),
                value: w.enrollments,
                detail: `Week of ${shortDate(w.weekStart)} · ${formatCurrency(w.revenue)} revenue`,
              }))}
              format={(v) => `${v} enrolment${v === 1 ? '' : 's'}`}
            />
          </div>
        </Reveal>

        <Reveal delay={80} className="min-w-0 rounded-2xl bg-white border border-[#e2e8f0] p-5 sm:p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" /> Revenue by program
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">All time · completed payments</p>
            </div>
            <Link href="/admin/reports" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
              Reports
            </Link>
          </div>
          <div className="mt-5">
            <BarList
              caption="Revenue by program"
              data={byCourse.slice(0, 6).map((c) => ({
                label: c.title,
                value: c.revenue,
                sub: `${c.enrollments} learner${c.enrollments === 1 ? '' : 's'}`,
              }))}
              format={compactInr}
            />
          </div>
        </Reveal>
      </div>

      {/* Recent admissions & quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        <Reveal className="min-w-0 rounded-2xl bg-white border border-[#e2e8f0] shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Recent admissions
            </h2>
            <Link href="/admin/enrollments" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          {(analytics?.recentEnrollments || []).length === 0 ? (
            <p className="text-sm text-slate-500 p-8 text-center">No admissions yet.</p>
          ) : (
            <ul className="divide-y divide-[#e2e8f0]">
              {analytics.recentEnrollments.map((enr: any) => (
                <li key={enr.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-300 font-bold flex items-center justify-center shrink-0">
                    {enr.student?.name?.charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink truncate">{enr.student?.name}</span>
                    <span className="block text-xs text-slate-500 truncate">{enr.course?.title}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <Badge variant="success">Active</Badge>
                    <span className="block text-[11px] text-slate-500 mt-1">{formatDate(enr.enrolledAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <Reveal delay={80} className="rounded-2xl bg-white border border-[#e2e8f0] shadow-card p-5">
          <h2 className="font-bold text-ink">Quick actions</h2>
          <div className="mt-4 grid gap-2">
            {[
              { href: '/admin/courses/new', icon: BookOpen, label: 'Create a new course', tone: 'text-indigo-400' },
              { href: '/admin/reviews', icon: ClipboardCheck, label: 'Grade submissions', tone: 'text-amber-400' },
              { href: '/admin/students', icon: Users, label: 'Track student progress', tone: 'text-sky-400' },
              { href: '/admin/assessments', icon: BarChart3, label: 'Quiz analytics', tone: 'text-violet-400' },
            ].map(({ href, icon: Icon, label, tone }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-semibold text-ink hover:border-indigo-500 hover:bg-indigo-50/40 transition-colors"
              >
                <Icon className={`w-4 h-4 ${tone}`} />
                <span className="flex-1">{label}</span>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
