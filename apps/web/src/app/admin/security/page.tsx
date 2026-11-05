'use client';

import React, { useEffect, useState } from 'react';
import { Role } from '@academy/shared';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { apiClient } from '../../../lib/api';
import { Card, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { DevicesCard } from '../../../components/account/devices-card';
import { LockKeyhole, ShieldCheck, CheckCircle2 } from 'lucide-react';

const PROTECTED = [
  'Changing course prices',
  'Refunding a payment',
  'Creating staff, instructor or admin accounts, changing roles, suspending accounts',
  'Deleting courses, modules, lessons or live classes',
  'Revoking certificates and changing system settings',
];

export default function AdminSecurityPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [status, setStatus] = useState<{ hasPin: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = user?.role === Role.ADMIN;

  const load = () => apiClient<{ hasPin: boolean }>('/admin/security').then(setStatus).catch(() => undefined);
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirm) return toastError('PINs do not match', 'Enter the same PIN twice.');
    setBusy(true);
    try {
      await apiClient('/admin/security/pin', { method: 'PUT', body: JSON.stringify({ pin, password, currentPin: currentPin || undefined }) });
      success('Security PIN saved', 'Protected actions will ask for this PIN and an OTP.');
      setPassword('');
      setCurrentPin('');
      setPin('');
      setConfirm('');
      load();
    } catch (err: any) {
      toastError('Could not save PIN', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">My security</h1>
        <p className="text-sm text-slate-400 mt-1">Your signed-in devices{isAdmin ? ' and the PIN that protects sensitive admin actions' : ''}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin && (
          <Card className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="w-4 h-4 text-violet-400" /> Security PIN
              </CardTitle>
              {status && <Badge variant={status.hasPin ? 'success' : 'warning'}>{status.hasPin ? 'PIN set' : 'Not set'}</Badge>}
            </div>
            <div className="rounded-xl bg-cream-100 p-4 text-sm text-slate-400 space-y-2">
              <p className="font-semibold text-ink">These actions ask for your PIN and an OTP:</p>
              <ul className="space-y-1">
                {PROTECTED.map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
              <p className="text-xs">After confirming once, you won't be asked again for 10 minutes.</p>
            </div>
            <form onSubmit={save} className="space-y-3">
              <Input label="Account password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {status?.hasPin && (
                <Input label="Current PIN" type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))} required />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label="New PIN (4–6 digits)" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required />
                <Input label="Repeat PIN" type="password" inputMode="numeric" maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))} required />
              </div>
              <Button type="submit" variant="primary" isLoading={busy} disabled={pin.length < 4}>
                <ShieldCheck className="w-4 h-4" /> {status?.hasPin ? 'Change PIN' : 'Set PIN'}
              </Button>
            </form>
          </Card>
        )}
        <DevicesCard showLimit={false} />
      </div>
    </div>
  );
}
