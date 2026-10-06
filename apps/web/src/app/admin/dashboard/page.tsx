'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Users,
  CreditCard,
  BookOpen,
  Award,
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../lib/utils';

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setIsLoading(true);
        const data = await apiClient('/admin/reports/analytics');
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load admin analytics', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const summary = analytics?.summary || {};

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-lg bg-[#fffbf4] border border-[#e7d5bd] shadow-xl">
        <div className="space-y-1.5">
          <Badge variant="purple">INSTITUTE CONTROL CENTER</Badge>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Administrative Overview
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Monitor real-time student admissions, review queues, revenue streams, and automated certification issuance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/reviews">
            <Button variant="primary" size="md" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              <span>Review Queue ({summary.pendingReviewsCount || 0})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Revenue</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {formatCurrency(summary.totalRevenue || 0)}
          </p>
          <span className="text-[11px] text-slate-500">Completed payments</span>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Students</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{summary.totalStudents || 0}</p>
          <span className="text-[11px] text-slate-500">{summary.totalEnrollments || 0} Enrollments</span>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending Reviews</span>
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{summary.pendingReviewsCount || 0}</p>
          <span className="text-[11px] text-slate-500">Requires instructor action</span>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Issued Certificates</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 mt-2">{summary.totalCertificates || 0}</p>
          <span className="text-[11px] text-slate-500">Verified graduates</span>
        </Card>
      </div>

      {/* Recent Admissions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Enrollments */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Recent Student Admissions
            </h3>
            <Link href="/admin/enrollments" className="text-xs text-indigo-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {(analytics?.recentEnrollments || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent admissions recorded.</p>
            ) : (
              analytics.recentEnrollments.map((enr: any) => (
                <div
                  key={enr.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold">
                      {enr.student?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-ink">{enr.student?.name}</p>
                      <p className="text-[11px] text-slate-400">{enr.course?.title}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant="success">Active</Badge>
                    <p className="text-[10px] text-slate-500 mt-1">{formatDate(enr.enrolledAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Management Shortcuts */}
        <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <h3 className="font-bold text-sm text-ink border-b border-slate-800 pb-3">
            Quick Administrative Actions
          </h3>

          <div className="space-y-2.5">
            <Link href="/admin/courses/new" className="block">
              <Button variant="secondary" size="sm" className="w-full justify-start text-xs gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Create New Course Track</span>
              </Button>
            </Link>

            <Link href="/admin/reviews" className="block">
              <Button variant="secondary" size="sm" className="w-full justify-start text-xs gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <span>Evaluate Practical Assignments</span>
              </Button>
            </Link>

            <Link href="/admin/students" className="block">
              <Button variant="secondary" size="sm" className="w-full justify-start text-xs gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Inspect Student Progression</span>
              </Button>
            </Link>

            <Link href="/admin/reports" className="block">
              <Button variant="secondary" size="sm" className="w-full justify-start text-xs gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Revenue & Analytics Reports</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
