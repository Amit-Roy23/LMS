'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Role } from '@academy/shared';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Markdown, PROSE } from '../../../components/legal/markdown';
import { formatDateTime } from '../../../lib/utils';
import { FileText, ExternalLink, History, RotateCcw, Eye, Pencil, Phone, MessageCircle, Save } from 'lucide-react';

const PAGE_PATH: Record<string, string> = { terms: '/terms', privacy: '/privacy', 'refund-policy': '/refund-policy', contact: '/contact' };

interface PageSummary { slug: string; title: string; updatedAt: string | null; versions: number }
interface Version { id: string; title: string; content: string; createdAt: string; author: string }

function PageEditor({ slug, canEdit, onSaved }: { slug: string; canEdit: boolean; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState({ title: '', content: '' });
  const [versions, setVersions] = useState<Version[]>([]);
  const [mode, setMode] = useState<'edit' | 'preview' | 'versions'>('edit');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    apiClient<any>(`/admin/site/pages/${slug}`)
      .then((p) => {
        setTitle(p.title);
        setContent(p.content);
        setSaved({ title: p.title, content: p.content });
        setVersions(p.versions || []);
        setLoaded(true);
      })
      .catch((e) => toastError('Could not load page', e.message));
  }, [slug, toastError]);
  useEffect(() => {
    setLoaded(false);
    setMode('edit');
    load();
  }, [load]);

  const dirty = title !== saved.title || content !== saved.content;

  const save = async () => {
    setBusy(true);
    try {
      const res = await apiClient<any>(`/admin/site/pages/${slug}`, { method: 'PUT', body: JSON.stringify({ title, content }) });
      success(res.changed ? 'Page saved' : 'No changes', res.changed ? 'The website shows the new wording within a minute.' : 'The page already has this wording.');
      load();
      onSaved();
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (v: Version) => {
    if (!confirm(`Restore the version from ${formatDateTime(v.createdAt)}? It becomes the live wording (the current one stays in the history).`)) return;
    try {
      await apiClient(`/admin/site/pages/${slug}/versions/${v.id}/restore`, { method: 'POST' });
      success('Version restored', 'The website shows it within a minute.');
      load();
      onSaved();
    } catch (err: any) {
      toastError('Could not restore', err.message);
    }
  };

  if (!loaded) return <div className="h-96 rounded-2xl skeleton" />;

  return (
    <Card className="p-5 sm:p-6 space-y-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-cream-100 p-1" role="tablist">
          {([
            ['edit', Pencil, canEdit ? 'Edit' : 'Text'],
            ['preview', Eye, 'Preview'],
            ['versions', History, `Versions (${versions.length})`],
          ] as const).map(([m, Icon, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-semibold ${mode === m ? 'bg-white text-ink shadow-sm' : 'text-slate-400 hover:text-ink'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        <Link href={PAGE_PATH[slug]} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-400">
          Open on website <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {mode === 'edit' && (
        <div className="space-y-3">
          <Input label="Page title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} maxLength={120} />
          <div className="space-y-1.5">
            <label htmlFor="page-content" className="block text-sm font-medium text-ink">Page text</label>
            <textarea
              id="page-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!canEdit}
              rows={22}
              className="w-full rounded-xl border border-[#cbd5e1] bg-white p-3 font-code text-[13px] leading-relaxed text-ink disabled:bg-cream-100"
            />
            <p className="text-xs text-slate-500">
              {slug === 'contact'
                ? 'The first paragraph is the banner text; the next paragraph is the note under the contact details.'
                : <>Start a line with <code>## </code> for a heading and <code>- </code> for a bullet. <code>**bold**</code>, links as <code>[text](/contact)</code>.</>}
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={save} isLoading={busy} disabled={!dirty}>
                <Save className="w-4 h-4" /> Save page
              </Button>
              {dirty && (
                <Button variant="outline" onClick={() => { setTitle(saved.title); setContent(saved.content); }}>
                  Discard changes
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'preview' && (
        <div className="rounded-xl border border-[#e2e8f0] p-5 sm:p-8">
          <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
          <div className={`mt-6 ${PROSE}`}>
            <Markdown source={content} />
          </div>
        </div>
      )}

      {mode === 'versions' && (
        versions.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No saved versions yet. The built-in wording is shown until the first save.</p>
        ) : (
          <ul className="divide-y divide-[#e2e8f0] rounded-xl border border-[#e2e8f0]">
            {versions.map((v, n) => (
              <li key={v.id} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-ink">{formatDateTime(v.createdAt)}</span>
                <span className="text-slate-500">{v.author}</span>
                {n === 0 && <Badge variant="success">Live</Badge>}
                <span className="text-xs text-slate-500">{v.content.length.toLocaleString('en-IN')} characters</span>
                <span className="ml-auto flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setTitle(v.title); setContent(v.content); setMode('preview'); }}>
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>
                  {canEdit && n > 0 && (
                    <Button variant="outline" size="sm" onClick={() => restore(v)}>
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )
      )}
    </Card>
  );
}

const CONTACT_FIELDS: [string, string, string][] = [
  ['contact.email', 'Email', 'admissions@your-domain.com'],
  ['contact.phone', 'Phone', '+91 98765 43210'],
  ['contact.whatsapp', 'WhatsApp chat number (shown on the website)', '+91 96813 86103'],
  ['contact.hours', 'Office hours', 'Monday to Saturday, 10am – 7pm IST'],
  ['contact.address', 'Address', 'Street, City, State, PIN'],
];

function ContactSettings({ isAdmin }: { isAdmin: boolean }) {
  const { success, error: toastError } = useToast();
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient<Record<string, string>>('/admin/site/settings')
      .then((s) => { setValues(s); setInitial(s); })
      .catch((e) => toastError('Could not load settings', e.message));
  }, [toastError]);

  if (!values) return <div className="h-64 rounded-2xl skeleton" />;

  const keys = [...CONTACT_FIELDS.map(([k]) => k), ...(isAdmin ? ['notify.admissionsWhatsapp'] : [])];
  const changed = keys.filter((k) => (values[k] ?? '') !== (initial[k] ?? ''));

  const save = async () => {
    setBusy(true);
    try {
      const res = await apiClient<any>('/admin/site/settings', { method: 'PUT', body: JSON.stringify({ values: Object.fromEntries(changed.map((k) => [k, values[k] ?? ''])) }) });
      setValues(res.settings);
      setInitial(res.settings);
      success('Settings saved', res.changed.length ? 'The website shows the new details within a minute.' : 'Nothing changed.');
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-ink">Contact details on the website</h2>
        </div>
        <p className="text-sm text-slate-400 -mt-2">Shown in the footer, on the Contact page, in the home page advisor section and in the policies.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTACT_FIELDS.map(([key, label, placeholder]) => (
            <Input key={key} label={label} placeholder={placeholder} value={values[key] ?? ''} disabled={!isAdmin} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
          ))}
        </div>
      </Card>

      {isAdmin && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-ink">New-enquiry alerts</h2>
          </div>
          <Input
            label="WhatsApp number that receives new-enquiry alerts"
            placeholder="+919681386103"
            value={values['notify.admissionsWhatsapp'] ?? ''}
            onChange={(e) => setValues({ ...values, 'notify.admissionsWhatsapp': e.target.value })}
          />
          <p className="rounded-xl bg-amber-50 border border-amber-800 p-3 text-sm text-amber-200">
            Every enquiry from the website is sent to this number and emailed to the admissions team. Real WhatsApp messages start once a
            WhatsApp Business provider (for example Gupshup or Meta Cloud API) is connected on the server; until then each alert is
            recorded under <Link href="/admin/notifications" className="font-semibold underline">Notifications</Link>.
          </p>
        </Card>
      )}

      {isAdmin && (
        <Button variant="primary" onClick={save} isLoading={busy} disabled={!changed.length}>
          <Save className="w-4 h-4" /> Save settings
        </Button>
      )}
    </div>
  );
}

export default function WebsitePagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const { error: toastError } = useToast();
  const [tab, setTab] = useState<'pages' | 'contact'>('pages');
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [slug, setSlug] = useState('terms');

  const loadPages = useCallback(() => {
    apiClient<PageSummary[]>('/admin/site/pages').then(setPages).catch((e) => toastError('Could not load pages', e.message));
  }, [toastError]);
  useEffect(loadPages, [loadPages]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" /> Website & pages
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Edit the policy pages and the contact details shown on the website. Every save is kept, so an earlier version can be restored.
          {!isAdmin && ' You can view; a main admin makes changes.'}
        </p>
      </div>

      <div className="flex gap-2">
        {([['pages', 'Pages'], ['contact', 'Contact & alerts']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors ${tab === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-[#e2e8f0] text-slate-400 hover:border-indigo-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-start">
          <Card className="p-2">
            <ul className="space-y-1">
              {pages.map((p) => (
                <li key={p.slug}>
                  <button
                    onClick={() => setSlug(p.slug)}
                    aria-current={slug === p.slug ? 'page' : undefined}
                    className={`w-full text-left rounded-xl px-3 py-2.5 ${slug === p.slug ? 'bg-indigo-50' : 'hover:bg-cream-100'}`}
                  >
                    <span className={`block text-sm font-semibold ${slug === p.slug ? 'text-indigo-300' : 'text-ink'}`}>{p.title}</span>
                    <span className="block text-xs text-slate-500">
                      {p.updatedAt ? `Updated ${formatDateTime(p.updatedAt)}` : 'Built-in wording'} · {p.versions} version{p.versions === 1 ? '' : 's'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <PageEditor key={slug} slug={slug} canEdit={isAdmin} onSaved={loadPages} />
        </div>
      ) : (
        <ContactSettings isAdmin={isAdmin} />
      )}
    </div>
  );
}
