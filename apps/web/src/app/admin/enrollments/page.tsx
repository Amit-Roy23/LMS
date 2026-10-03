'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { CreditCard, CheckCircle2, User, BookOpen } from 'lucide-react';
import { formatDate, formatCurrency } from '../../../lib/utils';

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEnrollments() {
      try {
        setIsLoading(true);
        const res = await apiClient<any>('/admin/enrollments');
        setEnrollments(res.items || []);
      } catch (err) {
        console.error('Failed to load enrollments', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadEnrollments();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Enrollment & Billing History</h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete log of student course admissions and processed payment transactions.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <Card className="border-slate-800 bg-slate-900/90 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {enrollments.map((enr) => (
              <div
                key={enr.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center">
                    {enr.student?.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{enr.student?.name}</h4>
                    <p className="text-slate-400">{enr.course?.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-white text-sm">
                    {formatCurrency(enr.course?.price || 0)}
                  </span>
                  <Badge variant={enr.status === 'COMPLETED' ? 'success' : 'primary'}>
                    {enr.status}
                  </Badge>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {formatDate(enr.enrolledAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
