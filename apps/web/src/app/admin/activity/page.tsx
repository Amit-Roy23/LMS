'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../../../lib/api';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { formatDateTime } from '../../../lib/utils';
import { History, RotateCcw } from 'lucide-react';

interface Entry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorRole?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  details?: Record<string, any> | null;
  createdAt: string;
  revertedAt?: string | null;
  revertible: boolean;
  user?: { name: string; email: string } | null;
  revertedBy?: { name: string } | null;
}

const FILTERS = [
  { label: 'All activity', value: '' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Instructors', value: 'INSTRUCTOR' },
  { label: 'Admins', value: 'ADMIN' },
];

const humanAction = (a: string) =>
  a
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
    .replace('lessonresource', 'Lesson material')
    .replace('practicetask', 'Practice task')
    .replace('livesession', 'Live class');

const show = (v: any) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default function ActivityLogPage() {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<Entry[]>([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiClient<Entry[]>(`/admin/activity${role ? `?actorRole=${role}` : ''}`)
      .then(setItems)
      .catch((e) => toastError('Could not load activity', e.message))
      .finally(() => setLoading(false));
  }, [role, toastError]);
  useEffect(load, [load]);

  const revert = async (entry: Entry, force = false) => {
    try {
      await apiClient(`/admin/activity/${entry.id}/revert`, { method: 'POST', body: JSON.stringify({ force }) });
      success('Change undone', humanAction(entry.action));
      load();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409 && !force && window.confirm(err.message)) return revert(entry, true);
      toastError('Could not undo', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" /> Activity log
          </h1>
          <p className="text-sm text-slate-400 mt-1">Every change made in the console. Undo staff mistakes: restore old values, deleted items, or remove items created by mistake.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setRole(f.value)}
              className={`h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors ${role === f.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-[#e2e8f0] text-slate-400 hover:border-indigo-500'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3, 4].map((n) => <div key={n} className="h-14 rounded-xl skeleton" />)}</div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-[#e2e8f0]">
            {items.map((e) => (
              <li key={e.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{humanAction(e.action)}</span>
                    {e.details?.title && <span className="text-sm text-slate-400 truncate">“{e.details.title}”</span>}
                    {e.details?.email && <span className="text-sm text-slate-400">{e.details.email}</span>}
                    {e.revertedAt && <Badge variant="slate">Undone by {e.revertedBy?.name || 'admin'}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">
                    {e.user?.name || 'System'} {e.actorRole && <Badge variant={e.actorRole === 'STAFF' ? 'warning' : e.actorRole === 'ADMIN' ? 'purple' : 'primary'} className="mx-1">{e.actorRole}</Badge>} · {formatDateTime(e.createdAt)}
                  </p>
                  {e.before && e.after && Object.keys(e.after).length > 0 && (
                    <div className="mt-2 rounded-lg bg-cream-100 p-3 text-xs space-y-1 overflow-x-auto">
                      {Object.keys(e.after).map((k) => (
                        <p key={k} className="font-code whitespace-nowrap">
                          <span className="text-slate-500">{k}:</span> <span className="text-rose-400 line-through">{show(e.before![k])}</span> → <span className="text-emerald-400">{show(e.after![k])}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {e.revertible && (
                  <Button variant="outline" size="sm" onClick={() => revert(e)} className="shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" /> Undo
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
