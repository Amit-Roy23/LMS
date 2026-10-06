'use client';

import React from 'react';
import { useAuth } from '../../../providers/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { User, Mail, Phone, ShieldCheck, Award } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export default function StudentProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Student Profile & Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account credentials and personal information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="border-slate-800 bg-slate-900/80 p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-2xl font-bold text-indigo-300 mx-auto">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">{user?.name}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <Badge variant="purple" className="mx-auto">
            Role: {user?.role}
          </Badge>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500">
            Account created {user?.createdAt ? formatDate(user.createdAt) : 'Recently'}
          </div>
        </Card>

        {/* Profile Details */}
        <Card className="md:col-span-2 border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <CardTitle className="text-base text-ink">Account Information</CardTitle>
          <div className="space-y-4">
            <Input label="Full Name" defaultValue={user?.name || ''} readOnly />
            <Input label="Email Address" defaultValue={user?.email || ''} readOnly />
            <Input label="Phone Number" defaultValue={user?.phone || 'Not provided'} readOnly />
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Authentication Security: </span>
              JWT Access and Refresh Tokens with httpOnly storage and RBAC authorization middleware.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
