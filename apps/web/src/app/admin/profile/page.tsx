'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient, authHeaders, getApiBase } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Input, Textarea } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { SquarePhotoCropper } from '../../../components/media/square-photo-cropper';
import { UserRound, ExternalLink, Camera, Trash2, Clock3 } from 'lucide-react';

const SOCIALS = [
  ['linkedin', 'LinkedIn', 'https://www.linkedin.com/in/your-name'],
  ['behance', 'Behance', 'https://www.behance.net/your-name'],
  ['dribbble', 'Dribbble', 'https://dribbble.com/your-name'],
  ['github', 'GitHub', 'https://github.com/your-name'],
  ['youtube', 'YouTube', 'https://www.youtube.com/@your-channel'],
  ['instagram', 'Instagram', 'https://www.instagram.com/your-name'],
  ['website', 'Website', 'https://your-portfolio.com'],
] as const;

export default function InstructorProfileEditor() {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError, info } = useToast();
  const [p, setP] = useState<any>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'ADMIN';

  const apply = (data: any) => {
    setP(data);
    // Show what the instructor submitted: waiting links first, otherwise the live ones
    setLinks({ ...(data.socials || {}), ...(data.pendingSocials || {}) });
    setSkills((data.skills || []).join(', '));
  };

  useEffect(() => {
    apiClient<any>('/admin/instructor-profile')
      .then(apply)
      .catch((e) => toastError('Could not load profile', e.message));
  }, [toastError]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await apiClient<any>('/admin/instructor-profile', {
        method: 'PUT',
        body: JSON.stringify({ ...p, skills, socials: links }),
      });
      apply(saved);
      success('Profile saved', saved.isPublic ? 'Your public profile is live.' : 'Saved as hidden.');
      if (saved.linksAwaitingApproval?.length) {
        info('Links sent for approval', `${saved.linksAwaitingApproval.join(', ')} will appear once a main admin approves them.`);
      }
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (blob: Blob) => {
    const body = new FormData();
    body.append('photo', blob, 'photo.jpg');
    const res = await fetch(`${getApiBase()}/admin/instructor-profile/photo`, { method: 'POST', body, headers: authHeaders(undefined, body), credentials: 'include' });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      toastError('Photo not saved', json?.error?.message || 'Upload failed');
      return;
    }
    setP((prev: any) => ({ ...prev, avatar: json.data.avatar }));
    setCropFile(null);
    success('Photo updated', 'Your new photo is on your profile.');
    refreshUser();
  };

  const removePhoto = async () => {
    if (!confirm('Remove your profile photo?')) return;
    try {
      await apiClient('/admin/instructor-profile/photo', { method: 'DELETE' });
      setP((prev: any) => ({ ...prev, avatar: null }));
      refreshUser();
    } catch (err: any) {
      toastError('Could not remove', err.message);
    }
  };

  const pickFile = (f?: File) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toastError('Unsupported photo', 'Use a JPG, PNG or WebP image.');
    if (f.size > 15 * 1024 * 1024) return toastError('Photo too large', 'Choose a photo under 15 MB; it is resized to 512 × 512.');
    setCropFile(f);
  };

  if (!p) return <div className="h-96 rounded-2xl skeleton max-w-4xl" />;

  const linkStatus = (key: string) => {
    if (!links[key]) return null;
    if (p.pendingSocials?.[key] === links[key]) return 'pending';
    if (p.socials?.[key] === links[key]) return 'live';
    return 'edited';
  };

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

      <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {p.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar} alt="Your profile photo" className="w-28 h-28 rounded-2xl object-cover ring-1 ring-[#e2e8f0]" />
        ) : (
          <span className="w-28 h-28 rounded-2xl bg-brand-gradient text-white text-4xl font-extrabold flex items-center justify-center">{user?.name?.charAt(0)}</span>
        )}
        <div className="space-y-3">
          <div>
            <h2 className="font-bold text-ink">Profile photo</h2>
            <p className="text-sm text-slate-400">JPG, PNG or WebP. You choose the square; it is saved at 512 × 512.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()}>
              <Camera className="w-4 h-4" /> {p.avatar ? 'Replace photo' : 'Upload photo'}
            </Button>
            {p.avatar && (
              <Button variant="outline" size="sm" onClick={removePhoto}>
                <Trash2 className="w-4 h-4" /> Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

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

          <div className="rounded-xl border border-[#e2e8f0] p-4 space-y-3">
            <div>
              <h2 className="font-bold text-ink">Social links</h2>
              <p className="text-sm text-slate-400">
                {isAdmin
                  ? 'As a main admin, your links go live when you save.'
                  : 'New or changed links appear on your profile after a main admin approves them. Removing a link takes effect at once.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOCIALS.map(([key, label, placeholder]) => {
                const st = linkStatus(key);
                return (
                  <div key={key}>
                    <Input label={label} type="url" placeholder={placeholder} value={links[key] || ''} onChange={(e) => setLinks({ ...links, [key]: e.target.value })} />
                    {st === 'live' && <Badge variant="success" className="mt-1.5">Live on your profile</Badge>}
                    {st === 'pending' && (
                      <Badge variant="warning" className="mt-1.5"><Clock3 className="w-3 h-3 mr-1" /> Waiting for approval</Badge>
                    )}
                    {st === 'edited' && !isAdmin && <Badge variant="slate" className="mt-1.5">Will be sent for approval when you save</Badge>}
                  </div>
                );
              })}
            </div>
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

      {cropFile && <SquarePhotoCropper file={cropFile} onCancel={() => setCropFile(null)} onCropped={uploadPhoto} />}
    </div>
  );
}
