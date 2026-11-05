'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { formatDate } from '../../../lib/utils';
import { Ban, CheckCircle2, Plus, UserCheck, X, Copy } from 'lucide-react';

const ROLES = ['ADMIN', 'STAFF', 'INSTRUCTOR', 'STUDENT'] as const;
const ROLE_LABEL: Record<string, string> = { ADMIN: 'Main admin', STAFF: 'Staff', INSTRUCTOR: 'Instructor', STUDENT: 'Student' };
const ROLE_TONE: Record<string, any> = { ADMIN: 'purple', STAFF: 'warning', INSTRUCTOR: 'primary', STUDENT: 'slate' };
const MAX_ADMINS = 3;

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [adminCount, setAdminCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'STAFF' });
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const [res, admins] = await Promise.all([
        apiClient<any>(`/admin/users?limit=100${roleFilter ? `&role=${roleFilter}` : ''}`),
        apiClient<any>('/admin/users?limit=10&role=ADMIN'),
      ]);
      setUsers(Array.isArray(res) ? res : res.items || []);
      setAdminCount((Array.isArray(admins) ? admins : admins.items || []).filter((u: any) => u.status === 'ACTIVE').length);
    } catch (err: any) {
      toastError('Could not load users', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, toastError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleStatus = async (u: any) => {
    const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiClient(`/admin/users/${u.id}/status`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) });
      success('Account updated', `${u.name} is now ${nextStatus.toLowerCase()}.`);
      loadUsers();
    } catch (err: any) {
      toastError('Update failed', err.message);
    }
  };

  const changeRole = async (u: any, role: string) => {
    if (role === u.role) return;
    try {
      await apiClient(`/admin/users/${u.id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
      success('Role changed', `${u.name} is now ${ROLE_LABEL[role]}.`);
      loadUsers();
    } catch (err: any) {
      toastError('Could not change role', err.message);
      loadUsers();
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiClient<{ user: any; tempPassword: string }>('/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setCreated({ email: res.user.email, tempPassword: res.tempPassword });
      setForm({ name: '', email: '', phone: '', role: 'STAFF' });
      loadUsers();
    } catch (err: any) {
      toastError('Could not create account', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-400" /> Users & roles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Main admins: <strong className="text-ink">{adminCount} of {MAX_ADMINS}</strong>. Creating accounts, changing roles and suspending need your PIN + OTP.
          </p>
        </div>
        <Button variant="primary" onClick={() => { setCreating(true); setCreated(null); }}>
          <Plus className="w-4 h-4" /> Add team member
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', ...ROLES].map((r) => (
          <button
            key={r || 'all'}
            onClick={() => setRoleFilter(r)}
            className={`h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors ${roleFilter === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-[#e2e8f0] text-slate-400 hover:border-indigo-500'}`}
          >
            {r ? ROLE_LABEL[r] : 'Everyone'}
          </button>
        ))}
      </div>

      {creating && (
        <Card className="p-6 space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">New team account</h2>
            <button aria-label="Close" onClick={() => setCreating(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-cream-100"><X className="w-4 h-4" /></button>
          </div>
          {created ? (
            <div className="rounded-xl border border-emerald-800 bg-emerald-50 p-4 text-sm text-emerald-200 space-y-2">
              <p><strong>Account created for {created.email}.</strong> Share this temporary password securely; they must change it at first sign-in.</p>
              <p className="flex items-center gap-2">
                <span className="font-code text-base font-bold tracking-wide text-ink">{created.tempPassword}</span>
                <button className="inline-flex items-center gap-1 text-xs font-semibold underline" onClick={() => navigator.clipboard?.writeText(created.tempPassword)}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Mobile number (for OTP)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <div className="space-y-1.5">
                <label htmlFor="new-role" className="block text-sm font-medium text-ink">Role</label>
                <select id="new-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink">
                  <option value="STAFF">Staff: admissions, enquiries, content</option>
                  <option value="INSTRUCTOR">Instructor: own courses & students</option>
                  <option value="ADMIN" disabled={adminCount >= MAX_ADMINS}>Main admin{adminCount >= MAX_ADMINS ? ' (limit reached)' : ''}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" variant="primary" isLoading={busy}>Create account</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-20 rounded-2xl skeleton" />)}</div>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[#e2e8f0]">
            {users.map((u) => {
              const self = u.id === me?.id;
              return (
                <li key={u.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-300 font-bold flex items-center justify-center shrink-0">{u.name?.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{u.name} {self && <span className="text-xs text-slate-500">(you)</span>}</p>
                      <p className="text-xs text-slate-500 truncate">{u.studentId ? `${u.studentId} · ` : ''}{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {self || u.role === 'STUDENT' ? (
                      <Badge variant={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role] || u.role}</Badge>
                    ) : (
                      <select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-2.5 text-sm text-ink"
                      >
                        {ROLES.filter((r) => r !== 'STUDENT').map((r) => (
                          <option key={r} value={r} disabled={r === 'ADMIN' && u.role !== 'ADMIN' && adminCount >= MAX_ADMINS}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    )}
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>{u.status.toLowerCase()}</Badge>
                    <span className="text-xs text-slate-500 whitespace-nowrap">Joined {formatDate(u.createdAt)}</span>
                    {!self && (
                      <Button variant="ghost" size="sm" onClick={() => toggleStatus(u)}>
                        {u.status === 'ACTIVE' ? (
                          <span className="text-rose-400 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Suspend</span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Activate</span>
                        )}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
