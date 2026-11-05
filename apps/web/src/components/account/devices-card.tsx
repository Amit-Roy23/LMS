'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import { Card, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatDate } from '../../lib/utils';
import { Laptop, Smartphone, ShieldCheck } from 'lucide-react';

interface Device {
  id: string;
  kind: 'MOBILE' | 'DESKTOP';
  label: string;
  ipAddress?: string | null;
  lastSeenAt: string;
  trustedAt: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
  isCurrent: boolean;
}

/** Devices signed in to this account, with "sign out" for each (students: 1 phone + 1 computer). */
export function DevicesCard({ showLimit = true }: { showLimit?: boolean }) {
  const { success, error: toastError } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const load = useCallback(() => {
    apiClient<Device[]>('/auth/devices').then(setDevices).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const signOut = async (d: Device) => {
    try {
      await apiClient(`/auth/devices/${d.id}`, { method: 'DELETE' });
      success('Device signed out', d.label);
      load();
    } catch (err: any) {
      toastError('Could not sign out device', err.message);
    }
  };

  const active = devices.filter((d) => !d.revokedAt);
  const recent = devices.filter((d) => d.revokedAt).slice(0, 3);

  return (
    <Card className="border-[#e2e8f0] bg-white p-6 space-y-4 shadow-sm">
      <div>
        <CardTitle className="text-base text-ink flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" /> Signed-in devices
        </CardTitle>
        {showLimit && (
          <p className="text-xs text-slate-500 mt-1">
            Your account can stay signed in on one phone and one computer. Signing in on another device signs out the older one.
          </p>
        )}
      </div>
      <ul className="divide-y divide-[#e2e8f0]">
        {active.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-3">
            <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-400 flex items-center justify-center shrink-0">
              {d.kind === 'MOBILE' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-ink truncate">
                {d.label} {d.isCurrent && <Badge variant="success" className="ml-1">This device</Badge>}
              </span>
              <span className="block text-xs text-slate-500">Last active {formatDate(d.lastSeenAt)}{d.ipAddress ? ` · ${d.ipAddress}` : ''}</span>
            </span>
            {!d.isCurrent && (
              <Button variant="outline" size="sm" onClick={() => signOut(d)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
        {active.length === 0 && <li className="py-3 text-sm text-slate-500">No devices yet.</li>}
      </ul>
      {recent.length > 0 && (
        <div className="text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">Recently signed out</p>
          {recent.map((d) => (
            <p key={d.id}>
              {d.label} · {formatDate(d.revokedAt!)} · {d.revokedReason}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
