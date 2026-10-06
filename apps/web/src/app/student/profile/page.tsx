'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { apiClient } from '../../../lib/api';
import { Card, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { KeyRound, ShieldCheck, CheckCircle2, User, Phone, MessageSquare, MapPin, GraduationCap } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export default function StudentProfilePage() {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || user?.studentProfile?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.studentProfile?.whatsappNumber || '');
  const [city, setCity] = useState(user?.studentProfile?.city || '');
  const [education, setEducation] = useState(user?.studentProfile?.education || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || user.studentProfile?.phone || '');
      setWhatsappNumber(user.studentProfile?.whatsappNumber || '');
      setCity(user.studentProfile?.city || '');
      setEducation(user.studentProfile?.education || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await apiClient('/student/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          phone,
          whatsappNumber,
          city,
          education,
          avatar: avatar || undefined,
        }),
      });
      await refreshUser();
      success('Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      toastError('Save Failed', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Student Profile & Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your student account identity, contact channels, and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="border-[#efdfd4] bg-white p-6 text-center space-y-4 shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-2xl font-bold text-blue-700 mx-auto">
            {avatar ? (
              <img src={avatar} alt={user?.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>

          {user?.studentId && (
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-[10px] font-mono text-blue-600 font-bold uppercase">OFFICIAL STUDENT ID</p>
              <p className="text-sm font-mono font-extrabold text-blue-950">{user.studentId}</p>
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Badge variant="purple">Role: {user?.role}</Badge>
            <Badge variant="success">Active</Badge>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link href="/student/change-password">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </Button>
            </Link>
          </div>
        </Card>

        {/* Profile Edit Form */}
        <Card className="md:col-span-2 border-[#efdfd4] bg-white p-6 space-y-6 shadow-sm">
          <CardTitle className="text-base text-slate-900">Personal Information</CardTitle>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Registered Email (Immutable User ID)"
              value={user?.email || ''}
              readOnly
              className="opacity-75 bg-slate-50"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Primary Phone Number"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                label="WhatsApp Number (Alerts)"
                placeholder="+91 98765 43210"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City / Location"
                placeholder="e.g. Dhaka or Kolkata"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              <Input
                label="Educational Background"
                placeholder="e.g. B.Tech Computer Science"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </div>

            <Input
              label="Avatar Image URL (optional)"
              placeholder="https://example.com/avatar.jpg"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
