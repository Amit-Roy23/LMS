'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Users,
  BookOpen,
  Award,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  CreditCard,
  GraduationCap,
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { PerformanceLevel, PaymentStatus } from '@academy/shared';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [totalCount, setTotalCount] = useState(0);

  const loadStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (performanceFilter !== 'ALL') params.set('performanceLevel', performanceFilter);
      if (paymentFilter !== 'ALL') params.set('paymentStatus', paymentFilter);

      const res = await apiClient<any>(`/admin/students?${params.toString()}`);
      setStudents(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, performanceFilter, paymentFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  const getPerformanceBadge = (level: string) => {
    switch (level) {
      case PerformanceLevel.EXCELLENT:
        return <Badge variant="success" className="bg-emerald-950/80 text-emerald-300 border-emerald-800">EXCELLENT</Badge>;
      case PerformanceLevel.GOOD:
        return <Badge variant="blue" className="bg-blue-950/80 text-blue-300 border-blue-800">GOOD</Badge>;
      case PerformanceLevel.AVERAGE:
        return <Badge variant="warning" className="bg-amber-950/80 text-amber-300 border-amber-800">AVERAGE</Badge>;
      case PerformanceLevel.NEEDS_ATTENTION:
        return <Badge variant="danger" className="bg-rose-950/80 text-rose-300 border-rose-800">NEEDS ATTENTION</Badge>;
      default:
        return <Badge variant="slate">GOOD</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <Badge variant="success" className="text-[10px]">PAID</Badge>;
      case PaymentStatus.PENDING:
        return <Badge variant="warning" className="text-[10px]">PENDING</Badge>;
      case PaymentStatus.FAILED:
        return <Badge variant="danger" className="text-[10px]">FAILED</Badge>;
      default:
        return <Badge variant="slate" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-400" />
            L3 Student & Cohort Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Requirement R7: Filter students by section, class, batch, schedule, payment status, and performance level.
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
          Total Learners: <span className="font-bold text-ink">{totalCount}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-slate-800 bg-[#fffbf4]/90 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, email, or phone..."
              className="pl-9 bg-slate-950 border-slate-800 text-xs text-ink"
            />
          </div>

          <div>
            <select
              aria-label="Filter by Performance Level"
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Performance Levels</option>
              <option value={PerformanceLevel.EXCELLENT}>Excellent Performance</option>
              <option value={PerformanceLevel.GOOD}>Good Performance</option>
              <option value={PerformanceLevel.AVERAGE}>Average Performance</option>
              <option value={PerformanceLevel.NEEDS_ATTENTION}>Needs Attention</option>
            </select>
          </div>

          <div>
            <select
              aria-label="Filter by Payment Status"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value={PaymentStatus.PAID}>Paid</option>
              <option value={PaymentStatus.PENDING}>Pending Payment</option>
              <option value={PaymentStatus.FAILED}>Failed Payment</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Students Table / Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card className="border-slate-800 bg-[#fffbf4]/90 p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">No students match current filters</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting search keywords or status filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((st) => (
            <Card key={st.id} className="border-slate-800 bg-[#fdf7ec] hover:border-violet-900/50 transition-all">
              <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Student Identity */}
                <div className="flex items-start gap-3.5 min-w-[240px]">
                  <div className="w-11 h-11 rounded-full bg-violet-600/20 border border-violet-500/40 text-violet-300 font-bold flex items-center justify-center text-sm shrink-0">
                    {st.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-ink">{st.name}</h4>
                      {getPerformanceBadge(st.performanceLevel)}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{st.email}</p>
                    {st.phone && (
                      <p className="text-[11px] text-slate-500 mt-0.5">📞 {st.phone}</p>
                    )}
                  </div>
                </div>

                {/* Middle: Batch, Section, Schedule Details */}
                {st.enrollment ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-900/80 flex-1">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Course & Mode</span>
                      <span className="font-semibold text-slate-200 truncate block">{st.enrollment.courseTitle}</span>
                      <Badge variant="slate" className="mt-1 text-[9px] uppercase">{st.enrollment.mode}</Badge>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Batch & Section</span>
                      <span className="font-medium text-slate-300 block truncate">{st.enrollment.batchName}</span>
                      <span className="text-[11px] text-violet-400">Sec: {st.enrollment.section} | Class: {st.enrollment.className}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Schedule</span>
                      <span className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        {st.enrollment.scheduleText}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-950/40 p-3 rounded-lg flex-1">
                    No active batch enrollment assigned.
                  </div>
                )}

                {/* Right: Progression Stats & Payment Status */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 justify-between lg:justify-end">
                  <div className="text-right text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Payment:</span>
                      {getPaymentBadge(st.enrollment?.paymentStatus || 'PENDING')}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Modules: <b className="text-ink">{st.stats.modulesCompleted}</b></span>
                      <span>Quizzes: <b className="text-emerald-400">{st.stats.quizzesPassed}</b></span>
                    </div>
                  </div>

                  {st.stats.hasCertificate && (
                    <Badge variant="success" className="text-[10px] gap-1 bg-emerald-950 border-emerald-700 text-emerald-300">
                      <Award className="w-3 h-3" /> Certified
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
