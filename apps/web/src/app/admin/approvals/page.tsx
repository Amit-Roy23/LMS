'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Role } from '@academy/shared';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { formatDateTime } from '../../../lib/utils';
import { BadgeCheck, Smartphone, Check, X, Link2, EyeOff, ExternalLink } from 'lucide-react';

interface Request {
  id: string;
  type: string;
  oldValue: string | null;
  newValue: string;
  reason?: string | null;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user: { id: string; name: string; email: string; studentId?: string | null };
  reviewedBy?: { name: string } | null;
}

interface LiveLinks {
  userId: string;
  name: string;
  email: string;
  slug: string;
  socials: Record<string, string>;
}

const LABEL: Record<string, string> = {
  linkedin: 'LinkedIn', behance: 'Behance', dribbble: 'Dribbble', github: 'GitHub',
  youtube: 'YouTube', instagram: 'Instagram', website: 'Website',
};

const parseLinks = (raw: string | null): Record<string, string> => {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

function SocialRequest({ r, canDecide, onDone }: { r: Request; canDecide: boolean; onDone: () => void }) {
  const { success, error: toastError } = useToast();
  const proposed = parseLinks(r.newValue);
  const current = parseLinks(r.oldValue);
  const [picked, setPicked] = useState<string[]>(Object.keys(proposed));
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    if (!picked.length) return toastError('Nothing selected', 'Tick at least one link, or decline the request.');
    setBusy(true);
    try {
      await apiClient(`/admin/change-requests/${r.id}/approve`, { method: 'POST', body: JSON.stringify({ keys: picked }) });
      success('Links approved', `${picked.length} link(s) are now live on ${r.user.name}'s profile.`);
      onDone();
    } catch (err: any) {
      toastError('Could not approve', err.message);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    const note = window.prompt('Reason for declining (sent to the instructor):', '');
    if (note === null) return;
    setBusy(true);
    try {
      await apiClient(`/admin/change-requests/${r.id}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
      success('Links declined', `${r.user.name} has been notified.`);
      onDone();
    } catch (err: any) {
      toastError('Could not decline', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="p-5 flex flex-col md:flex-row md:items-start gap-4">
      <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-400 flex items-center justify-center shrink-0">
        <Link2 className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="font-semibold text-ink">
            {r.user.name} <span className="text-sm font-normal text-slate-500">{r.user.email}</span>
          </p>
          <p className="text-xs text-slate-500">Instructor social links · requested {formatDateTime(r.createdAt)}</p>
        </div>
        <ul className="space-y-1.5">
          {Object.entries(proposed).map(([key, url]) => (
            <li key={key} className="flex items-start gap-2 text-sm">
              {canDecide && (
                <input
                  type="checkbox"
                  aria-label={`Approve ${LABEL[key] || key}`}
                  className="mt-1 w-4 h-4 accent-indigo-600"
                  checked={picked.includes(key)}
                  onChange={(e) => setPicked(e.target.checked ? [...picked, key] : picked.filter((k) => k !== key))}
                />
              )}
              <span className="min-w-0">
                <span className="font-semibold text-ink">{LABEL[key] || key}</span>{' '}
                <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-400 break-all hover:underline">
                  {url} <ExternalLink className="inline w-3 h-3" />
                </a>
                {current[key] && <span className="block text-xs text-slate-500 break-all">Replaces {current[key]}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {canDecide && (
        <div className="flex gap-2 shrink-0">
          <Button variant="primary" size="sm" onClick={approve} isLoading={busy}>
            <Check className="w-4 h-4" /> Approve selected
          </Button>
          <Button variant="outline" size="sm" onClick={decline} disabled={busy}>
            <X className="w-4 h-4" /> Decline
          </Button>
        </div>
      )}
    </li>
  );
}

function PhoneRequest({ r, canDecide, onDone }: { r: Request; canDecide: boolean; onDone: () => void }) {
  const { success, error: toastError } = useToast();
  const decide = async (approve: boolean) => {
    const note = approve ? '' : window.prompt('Reason for declining (sent to the student):', '') ?? null;
    if (note === null) return;
    try {
      await apiClient(`/admin/change-requests/${r.id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: JSON.stringify({ note }) });
      success(approve ? 'Mobile number updated' : 'Request declined', `${r.user.name} has been notified.`);
      onDone();
    } catch (err: any) {
      toastError('Could not save decision', err.message);
    }
  };
  return (
    <li className="p-5 flex flex-col md:flex-row md:items-center gap-4">
      <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-400 flex items-center justify-center shrink-0">
        <Smartphone className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink">
          {r.user.name} <span className="text-sm font-normal text-slate-500">{r.user.studentId || r.user.email}</span>
        </p>
        <p className="text-sm text-slate-400 font-code">
          {r.oldValue || 'none'} → <span className="text-ink font-semibold">{r.newValue}</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Mobile number change · verified by OTP · requested {formatDateTime(r.createdAt)}{r.reason ? ` · “${r.reason}”` : ''}
        </p>
      </div>
      {canDecide && (
        <div className="flex gap-2 shrink-0">
          <Button variant="primary" size="sm" onClick={() => decide(true)}>
            <Check className="w-4 h-4" /> Approve
          </Button>
          <Button variant="outline" size="sm" onClick={() => decide(false)}>
            <X className="w-4 h-4" /> Decline
          </Button>
        </div>
      )}
    </li>
  );
}

const summary = (r: Request) => {
  if (r.type === 'SOCIAL_LINKS') {
    const keys = Object.keys(parseLinks(r.newValue)).map((k) => LABEL[k] || k);
    return `Social links: ${keys.join(', ') || 'none'}`;
  }
  return `${r.oldValue || 'none'} → ${r.newValue}`;
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<Request[]>([]);
  const [live, setLive] = useState<LiveLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const canDecide = user?.role === Role.ADMIN;

  const load = useCallback(() => {
    Promise.all([apiClient<Request[]>('/admin/change-requests'), apiClient<LiveLinks[]>('/admin/instructor-links')])
      .then(([reqs, links]) => {
        setItems(reqs);
        setLive(links);
      })
      .catch((e) => toastError('Could not load approvals', e.message))
      .finally(() => setLoading(false));
  }, [toastError]);
  useEffect(load, [load]);

  const hide = async (p: LiveLinks, key: string) => {
    if (!confirm(`Hide ${p.name}'s ${LABEL[key] || key} link from the website?`)) return;
    try {
      await apiClient(`/admin/instructor-links/${p.userId}/${key}`, { method: 'DELETE' });
      success('Link hidden', `It no longer shows on ${p.name}'s profile.`);
      load();
    } catch (err: any) {
      toastError('Could not hide link', err.message);
    }
  };

  const pending = items.filter((i) => i.status === 'PENDING');
  const done = items.filter((i) => i.status !== 'PENDING');

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <BadgeCheck className="w-6 h-6 text-indigo-400" /> Approvals
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          New mobile numbers (confirmed by OTP) and new or changed instructor social links go live only after a main admin approves them.
          {!canDecide && ' You can view requests; a main admin decides.'}
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <h2 className="font-bold text-ink">Waiting for approval</h2>
          <Badge variant={pending.length ? 'warning' : 'success'}>{pending.length}</Badge>
        </div>
        {loading ? (
          <div className="p-6"><div className="h-16 rounded-xl skeleton" /></div>
        ) : pending.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Nothing to approve.</p>
        ) : (
          <ul className="divide-y divide-[#e2e8f0]">
            {pending.map((r) =>
              r.type === 'SOCIAL_LINKS' ? (
                <SocialRequest key={r.id} r={r} canDecide={canDecide} onDone={load} />
              ) : (
                <PhoneRequest key={r.id} r={r} canDecide={canDecide} onDone={load} />
              )
            )}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e2e8f0]">
          <h2 className="font-bold text-ink">Live instructor links</h2>
          <p className="text-xs text-slate-500 mt-0.5">Links currently shown on public instructor profiles.{canDecide ? ' Hide any link at any time.' : ''}</p>
        </div>
        {live.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No live links.</p>
        ) : (
          <ul className="divide-y divide-[#e2e8f0]">
            {live.map((p) => (
              <li key={p.userId} className="px-5 py-4 space-y-2">
                <p className="font-semibold text-ink">{p.name} <span className="text-sm font-normal text-slate-500">{p.email}</span></p>
                <ul className="space-y-1">
                  {Object.entries(p.socials).map(([key, url]) => (
                    <li key={key} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-ink w-24 shrink-0">{LABEL[key] || key}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-400 break-all hover:underline flex-1 min-w-0">{url}</a>
                      {canDecide && (
                        <Button variant="ghost" size="sm" onClick={() => hide(p, key)}>
                          <EyeOff className="w-3.5 h-3.5" /> Hide
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card className="overflow-hidden">
          <h2 className="px-5 py-4 border-b border-[#e2e8f0] font-bold text-ink">History</h2>
          <ul className="divide-y divide-[#e2e8f0]">
            {done.map((r) => (
              <li key={r.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-ink">{r.user.name}</span>
                <span className="font-code text-slate-400 break-all">{summary(r)}</span>
                <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'slate'}>{r.status.toLowerCase()}</Badge>
                <span className="text-xs text-slate-500 ml-auto">
                  {r.reviewedBy?.name ? `${r.reviewedBy.name} · ` : ''}{formatDateTime(r.reviewedAt || r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
