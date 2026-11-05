'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Input, Textarea } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { UserRound, ExternalLink } from 'lucide-react';

const SOCIALS = ['linkedin', 'github', 'behance', 'youtube', 'instagram', 'website'] as const;

export default function InstructorProfileEditor() {
  const { success, error: toastError } = useToast();
  const [p, setP] = useState<any>(null);
  const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient<any>('/admin/instructor-profile')
      .then((data) => {
        setP({ ...data, socials: data.socials || {} });
        setSkills((data.skills || []).join(', '));
      })
      .catch((e) => toastError('Could not load profile', e.message));
  }, [toastError]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await apiClient<any>('/admin/instructor-profile', { method: 'PUT', body: JSON.stringify({ ...p, skills }) });
      setP({ ...saved, socials: saved.socials || {} });
      success('Profile saved', saved.isPublic ? 'Your public profile is live.' : 'Saved as hidden.');
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!p) return <div className="h-96 rounded-2xl skeleton max-w-4xl" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <UserRound className="w-6 h-6 text-indigo-400" /> My public profile
          </h1>
          <p className="text-sm text-slate-400 mt-1">Shown on the Instructors page and linked from every course you teach.</p>
        </div>
        {p.isPublic && p.slug && (
          <Link href={`/instructors/${p.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400">
            View public page <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>
      <Card className="p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Headline" placeholder="e.g. Lead Product Designer" value={p.headline} onChange={(e) => setP({ ...p, headline: e.target.value })} maxLength={140} />
            <Input label="Profile link" value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} />
          </div>
          <Textarea label="Bio" rows={6} placeholder="Your experience, what you teach and how" value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} maxLength={3000} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Skills (comma separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
            <Input label="Years of experience" type="number" min={0} max={60} value={p.experienceYears ?? ''} onChange={(e) => setP({ ...p, experienceYears: e.target.value })} />
          </div>
          <Input label="Photo URL (https)" value={p.avatar || ''} onChange={(e) => setP({ ...p, avatar: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOCIALS.map((k) => (
              <Input key={k} label={`${k.charAt(0).toUpperCase() + k.slice(1)} (https)`} value={p.socials?.[k] || ''} onChange={(e) => setP({ ...p, socials: { ...p.socials, [k]: e.target.value } })} />
            ))}
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] p-4 cursor-pointer">
            <input type="checkbox" checked={!!p.isPublic} onChange={(e) => setP({ ...p, isPublic: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
            <span className="text-sm">
              <span className="font-semibold text-ink">Show my profile on the website</span>{' '}
              <Badge variant={p.isPublic ? 'success' : 'slate'} className="ml-1">{p.isPublic ? 'Public' : 'Hidden'}</Badge>
            </span>
          </label>
          <Button type="submit" variant="primary" isLoading={busy}>Save profile</Button>
        </form>
      </Card>
    </div>
  );
}
