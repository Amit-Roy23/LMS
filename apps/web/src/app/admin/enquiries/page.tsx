'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { formatDateTime } from '../../../lib/utils';
import { Inbox, Phone, Mail, MessageCircle } from 'lucide-react';

interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
  notes?: string | null;
  createdAt: string;
  course?: { id: string; title: string } | null;
  assignedTo?: { id: string; name: string } | null;
}

const STATUSES: Enquiry['status'][] = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'];
const TONE: Record<Enquiry['status'], any> = { NEW: 'warning', CONTACTED: 'primary', CONVERTED: 'success', CLOSED: 'slate' };
const LABEL: Record<Enquiry['status'], string> = { NEW: 'New', CONTACTED: 'Contacted', CONVERTED: 'Enrolled', CLOSED: 'Closed' };

export default function EnquiriesPage() {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<Enquiry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiClient<Enquiry[]>(`/admin/inquiries${filter ? `?status=${filter}` : ''}`)
      .then((list) => {
        setItems(list);
        setNotes(Object.fromEntries(list.map((i) => [i.id, i.notes || ''])));
      })
      .catch((e) => toastError('Could not load enquiries', e.message))
      .finally(() => setLoading(false));
  }, [filter, toastError]);
  useEffect(load, [load]);

  const update = async (e: Enquiry, patch: Partial<Enquiry>) => {
    try {
      const updated = await apiClient<Enquiry>(`/admin/inquiries/${e.id}`, { method: 'PUT', body: JSON.stringify(patch) });
      setItems((list) => list.map((i) => (i.id === e.id ? updated : i)));
      success('Enquiry updated', e.name);
    } catch (err: any) {
      toastError('Could not update', err.message);
    }
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: items.filter((i) => i.status === s).length }), {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-400" /> Enquiries
          </h1>
          <p className="text-sm text-slate-400 mt-1">Leads from the website enquiry form. New enquiries also alert the admissions team by email and WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['', ...STATUSES].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              className={`h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors ${filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-[#e2e8f0] text-slate-400 hover:border-indigo-500'}`}
            >
              {s ? `${LABEL[s as Enquiry['status']]}${!filter ? ` (${counts[s] || 0})` : ''}` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-28 rounded-2xl skeleton" />)}</div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">No enquiries here yet.</Card>
      ) : (
        <div className="grid gap-4">
          {items.map((e) => (
            <Card key={e.id} className="p-5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ink">{e.name}</h3>
                    <Badge variant={TONE[e.status]}>{LABEL[e.status]}</Badge>
                    {e.course && <Badge variant="outline">{e.course.title}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDateTime(e.createdAt)} · {e.source.replace(/_/g, ' ').toLowerCase()}
                    {e.assignedTo ? ` · handled by ${e.assignedTo.name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#e2e8f0] text-sm font-semibold text-ink hover:border-indigo-500">
                    <Phone className="w-4 h-4 text-indigo-400" /> {e.phone}
                  </a>
                  <a href={`https://wa.me/${e.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#e2e8f0] text-sm font-semibold text-ink hover:border-emerald-500">
                    <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp
                  </a>
                  <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#e2e8f0] text-sm font-semibold text-ink hover:border-indigo-500">
                    <Mail className="w-4 h-4 text-indigo-400" /> Email
                  </a>
                </div>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line">{e.message}</p>
              <div className="flex flex-col md:flex-row gap-3 md:items-center pt-2 border-t border-[#e2e8f0]">
                <label className="sr-only" htmlFor={`status-${e.id}`}>Status</label>
                <select
                  id={`status-${e.id}`}
                  value={e.status}
                  onChange={(ev) => update(e, { status: ev.target.value as Enquiry['status'] })}
                  className="h-10 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                </select>
                <label className="sr-only" htmlFor={`notes-${e.id}`}>Follow-up notes</label>
                <input
                  id={`notes-${e.id}`}
                  value={notes[e.id] ?? ''}
                  onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))}
                  placeholder="Follow-up notes (e.g. called, sent fee details)"
                  className="flex-1 h-10 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink"
                />
                <Button variant="outline" size="sm" disabled={(notes[e.id] ?? '') === (e.notes || '')} onClick={() => update(e, { notes: notes[e.id] })}>
                  Save note
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
