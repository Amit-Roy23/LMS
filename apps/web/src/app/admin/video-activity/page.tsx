'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatDateTime } from '../../../lib/utils';
import { PlayCircle, ShieldAlert, Laptop } from 'lucide-react';

interface View {
  id: string;
  user: { id: string; name: string; email: string; studentId?: string | null };
  course: { id: string; title: string };
  lessonTitle: string;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  startedAt: string;
  lastSeenAt: string;
  watchedSeconds: number;
  suspicious: boolean;
}

const mins = (s: number) => (s < 60 ? `${s}s` : `${Math.round(s / 60)} min`);

export default function VideoActivityPage() {
  const { error: toastError } = useToast();
  const [rows, setRows] = useState<View[] | null>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    apiClient<View[]>(`/admin/video-activity${userId ? `?userId=${userId}` : ''}`)
      .then(setRows)
      .catch((e) => toastError('Could not load video activity', e.message));
  }, [userId, toastError]);

  const flagged = Array.from(new Map((rows || []).filter((r) => r.suspicious).map((r) => [r.user.id, r.user])).values());

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <PlayCircle className="w-6 h-6 text-indigo-400" /> Video activity
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Who watched which lesson, when, on which device and network. Videos stream encrypted, only on the academy site, one device at a time per account.
        </p>
      </div>

      {flagged.length > 0 && (
        <Card className="p-4 border-amber-800 bg-amber-50 flex flex-wrap items-center gap-3 text-sm text-amber-200">
          <ShieldAlert className="w-5 h-5" />
          <span className="font-semibold">Possible account sharing (3+ networks in 24 hours):</span>
          {flagged.map((u) => (
            <button key={u.id} onClick={() => setUserId(u.id)} className="underline underline-offset-2 font-semibold">
              {u.name}
            </button>
          ))}
        </Card>
      )}

      {userId && (
        <button onClick={() => setUserId('')} className="text-sm font-semibold text-indigo-400">← Show everyone</button>
      )}

      <Card className="overflow-hidden">
        {!rows ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-12 rounded-xl skeleton" />)}</div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No protected video has been watched yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Lesson</th>
                  <th className="px-4 py-3 font-semibold">Device &amp; network</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold text-right">Watched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <button onClick={() => setUserId(r.user.id)} className="font-semibold text-ink hover:text-indigo-400 text-left">{r.user.name}</button>
                      <p className="text-xs text-slate-500">{r.user.studentId || r.user.email}</p>
                      {r.suspicious && <Badge variant="warning" className="mt-1">Many networks</Badge>}
                    </td>
                    <td className="px-4 py-3 min-w-[14rem]">
                      <p className="text-ink">{r.lessonTitle}</p>
                      <p className="text-xs text-slate-500">{r.course.title}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-ink flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5 text-slate-500" /> {r.deviceLabel || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 font-code">{r.ipAddress || '—'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">{formatDateTime(r.startedAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">{mins(r.watchedSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
