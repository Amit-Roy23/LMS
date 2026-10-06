'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ShieldCheck, KeyRound, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isForced = Boolean(user?.mustChangePassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toastError('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      success('Password Updated!', 'Your new password has been set and your account is active.');
    } catch (err: any) {
      toastError('Password Update Failed', err.message || 'Could not update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
          <KeyRound className="w-4 h-4" />
          <span>SECURITY & CREDENTIALS</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isForced ? 'Set Your Permanent Password' : 'Change Your Account Password'}
        </h1>
        <p className="text-xs text-slate-500">
          {isForced
            ? 'For security, your temporary system-generated password must be changed before accessing your course curriculum.'
            : 'Update your account login password. You will remain logged in on this browser.'}
        </p>
      </div>

      {isForced && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Action Required</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Please choose a permanent, secure password (minimum 8 characters) to unlock all student LMS features.
            </p>
          </div>
        </div>
      )}

      <Card className="border-[#efdfd4] bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isForced && (
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required={!isForced}
            />
          )}

          <Input
            label="New Password (min 8 characters)"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isForced ? 'Set Password & Enter Dashboard' : 'Save New Password'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
