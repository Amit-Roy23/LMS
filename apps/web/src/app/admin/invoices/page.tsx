'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Role } from '@academy/shared';
import { apiClient, openAuthenticatedFile } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDateTime } from '../../../lib/utils';
import { Receipt, FileDown, Undo2, Search } from 'lucide-react';

const STATUS_TONE: Record<string, any> = { COMPLETED: 'success', PENDING: 'warning', FAILED: 'danger', REFUNDED: 'slate' };

export default function PaymentsInvoicesPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<{ payments: any[]; totals: { collected: number; refunded: number }; provider: string } | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const isAdmin = user?.role === Role.ADMIN;

  const load = useCallback(() => {
    const qs = new URLSearchParams({ ...(status ? { status } : {}), ...(query ? { search: query } : {}) }).toString();
    apiClient<any>(`/admin/payments${qs ? `?${qs}` : ''}`)
      .then(setData)
      .catch((e) => toastError('Could not load payments', e.message));
  }, [status, query, toastError]);
  useEffect(load, [load]);

  const refund = async (p: any) => {
    const reason = window.prompt(`Refund ${formatCurrency(p.amount)} to ${p.student.name}? Course access will be suspended.\n\nReason:`, '');
    if (reason === null) return;
    try {
      await apiClient(`/admin/payments/${p.id}/refund`, { method: 'POST', body: JSON.stringify({ reason }) });
      success('Payment refunded', `${p.student.name} · ${p.course.title}`);
      load();
    } catch (err: any) {
      toastError('Refund failed', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-400" /> Payments & invoices
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Every transaction with its GST tax invoice. Gateway: <strong className="text-ink">{data?.provider === 'RAZORPAY' ? 'Razorpay (live)' : 'Demo (simulated)'}</strong>
            {isAdmin ? ' · Refunds need your PIN + OTP.' : ''}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="px-4 py-3">
            <p className="text-xs text-slate-500">Collected</p>
            <p className="text-lg font-extrabold text-ink tabular-nums">{formatCurrency(data?.totals.collected || 0)}</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-xs text-slate-500">Refunded</p>
            <p className="text-lg font-extrabold text-ink tabular-nums">{formatCurrency(data?.totals.refunded || 0)}</p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <label htmlFor="pay-search" className="sr-only">Search payments</label>
          <input id="pay-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, email, invoice no. or order id" className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white pl-10 pr-3 text-sm text-ink" />
        </form>
        <div className="flex flex-wrap gap-2">
          {['', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'].map((s) => (
            <button key={s || 'all'} onClick={() => setStatus(s)} className={`h-10 px-3.5 rounded-xl text-sm font-semibold border transition-colors ${status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-[#e2e8f0] text-slate-400 hover:border-indigo-500'}`}>
              {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {!data ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-14 rounded-xl skeleton" />)}</div>
        ) : data.payments.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No payments found.</p>
        ) : (
          <ul className="divide-y divide-[#e2e8f0]">
            {data.payments.map((p) => (
              <li key={p.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{p.student.name} <span className="font-normal text-sm text-slate-500">{p.student.studentId || p.student.email}</span></p>
                  <p className="text-sm text-slate-400 truncate">{p.course.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateTime(p.createdAt)} · {p.provider === 'RAZORPAY' ? 'Razorpay' : p.provider.toLowerCase()} {p.providerRef ? `· ${p.providerRef}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0">
                  <span className="font-bold text-ink tabular-nums">{formatCurrency(p.amount, p.currency)}</span>
                  <Badge variant={STATUS_TONE[p.status] || 'slate'}>{p.status.toLowerCase()}</Badge>
                  {p.invoice ? (
                    <Button variant="outline" size="sm" onClick={() => openAuthenticatedFile(`/admin/invoices/${p.invoice.id}/pdf`).catch((e) => toastError('Download failed', e.message))}>
                      <FileDown className="w-3.5 h-3.5" /> {p.invoice.invoiceNumber}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">No invoice</span>
                  )}
                  {isAdmin && p.status === 'COMPLETED' && (
                    <Button variant="ghost" size="sm" onClick={() => refund(p)} className="text-rose-400">
                      <Undo2 className="w-3.5 h-3.5" /> Refund
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
