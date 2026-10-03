'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { UserCheck, ShieldCheck, User, Mail, Ban, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { useToast } from '../../../providers/toast-provider';

export default function AdminUsersPage() {
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadUsers() {
    try {
      setIsLoading(true);
      const res = await apiClient<any>('/admin/users');
      setUsers(res.items || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleStatus = async (user: any) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiClient(`/admin/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      success('User Status Updated', `${user.name} is now ${nextStatus}.`);
      loadUsers();
    } catch (err: any) {
      toastError('Update Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">System User Management</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage roles, credentials, and access status across all academy accounts.
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
            {users.map((u) => (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center">
                    {u.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{u.name}</h4>
                    <p className="text-slate-400">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge
                    variant={
                      u.role === 'ADMIN' ? 'purple' : u.role === 'INSTRUCTOR' ? 'primary' : 'slate'
                    }
                  >
                    {u.role}
                  </Badge>

                  <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {u.status}
                  </Badge>

                  <span className="text-slate-500 font-mono text-[11px]">
                    Joined {formatDate(u.createdAt)}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(u)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    {u.status === 'ACTIVE' ? (
                      <span className="text-rose-400 flex items-center gap-1">
                        <Ban className="w-3.5 h-3.5" /> Suspend
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
