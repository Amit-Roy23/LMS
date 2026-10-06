'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { BarChart3, TrendingUp, Award, Users, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

export default function AdminReportsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setIsLoading(true);
        const data = await apiClient('/admin/reports/analytics');
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  const summary = analytics?.summary || {};

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Academy Analytics & Performance Reports</h1>
        <p className="text-xs text-slate-400 mt-1">
          Detailed metrics covering course revenue, retention, student progression, and certification volume.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <DollarSign className="w-8 h-8 text-emerald-400" />
          <h3 className="text-base font-bold text-ink">Revenue Performance</h3>
          <p className="text-3xl font-extrabold text-emerald-400">
            {formatCurrency(summary.totalRevenue || 0)}
          </p>
          <p className="text-xs text-slate-400">Total gross earnings across published tracks.</p>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <Award className="w-8 h-8 text-purple-400" />
          <h3 className="text-base font-bold text-ink">Certification Rate</h3>
          <p className="text-3xl font-extrabold text-purple-400">
            {summary.totalCertificates || 0} Diplomas
          </p>
          <p className="text-xs text-slate-400">Graduates meeting 100% rigorous criteria.</p>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <Users className="w-8 h-8 text-indigo-400" />
          <h3 className="text-base font-bold text-ink">Admissions Volume</h3>
          <p className="text-3xl font-extrabold text-indigo-400">
            {summary.totalEnrollments || 0} Enrollments
          </p>
          <p className="text-xs text-slate-400">Enrolled students actively learning.</p>
        </Card>
      </div>
    </div>
  );
}
