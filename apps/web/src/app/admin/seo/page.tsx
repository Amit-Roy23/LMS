'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { useToast } from '../../../providers/toast-provider';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input, Textarea } from '../../../components/ui/input';
import { Search, Save, BarChart3, Globe, EyeOff, X } from 'lucide-react';

interface Entry { key: string; title: string | null; description: string | null; image: string | null; noindex: boolean }
interface Target { key: string; label: string; group: string; path: string }

const MAIN_PAGES: [string, string][] = [
  ['/', 'Home'], ['/courses', 'All courses'], ['/instructors', 'Instructors'], ['/about', 'About us'],
  ['/career', 'Career support'], ['/ai', 'AI & Labs'], ['/contact', 'Contact'],
  ['/terms', 'Terms & Conditions'], ['/privacy', 'Privacy Policy'], ['/refund-policy', 'Refund & Cancellation'],
];

const TRACKING: [string, string, string, string][] = [
  ['seo.defaultTitle', 'Default page title', 'ADSIGN Skill Academy | Creative & IT courses with certificates', 'Used for pages without their own title. Up to 70 characters.'],
  ['seo.defaultDescription', 'Default description', 'Job-ready online courses in design, development, marketing and AI…', 'Up to 200 characters; Google shows about 155.'],
  ['seo.searchConsole', 'Google Search Console code', 'Paste the HTML tag or just its content="…" code', 'Search Console → Add property → HTML tag.'],
  ['analytics.gaId', 'Google Analytics 4 ID', 'G-XXXXXXXXXX', ''],
  ['analytics.adsId', 'Google Ads conversion ID', 'AW-123456789', ''],
  ['analytics.pixelId', 'Meta Pixel ID', '123456789012345', ''],
];

function TrackingSettings() {
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
  const changed = TRACKING.map(([k]) => k).filter((k) => (values[k] ?? '') !== (initial[k] ?? ''));

  const save = async () => {
    setBusy(true);
    try {
      const res = await apiClient<any>('/admin/site/settings', { method: 'PUT', body: JSON.stringify({ values: Object.fromEntries(changed.map((k) => [k, values[k] ?? ''])) }) });
      setValues(res.settings);
      setInitial(res.settings);
      success('Saved', 'The website uses the new settings within about a minute.');
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-400" />
        <h2 className="font-bold text-ink">Site-wide defaults & tracking</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRACKING.map(([key, label, placeholder, hint]) => (
          <div key={key} className={key === 'seo.defaultDescription' ? 'md:col-span-2' : ''}>
            {key === 'seo.defaultDescription' ? (
              <Textarea label={label} rows={2} placeholder={placeholder} value={values[key] ?? ''} maxLength={200} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
            ) : (
              <Input label={label} placeholder={placeholder} value={values[key] ?? ''} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
            )}
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
          </div>
        ))}
      </div>
      <Button variant="primary" onClick={save} isLoading={busy} disabled={!changed.length}>
        <Save className="w-4 h-4" /> Save defaults & tracking
      </Button>
    </Card>
  );
}

function EntryEditor({ target, entry, onClose, onSaved }: { target: Target; entry?: Entry; onClose: () => void; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({ title: entry?.title || '', description: entry?.description || '', image: entry?.image || '', noindex: !!entry?.noindex });
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), []);

  const save = async (clear = false) => {
    setBusy(true);
    try {
      const body = clear ? { key: target.key, title: '', description: '', image: '', noindex: false } : { key: target.key, ...form };
      await apiClient('/admin/site/seo', { method: 'PUT', body: JSON.stringify(body) });
      success(clear ? 'Reset to default' : 'SEO saved', `${target.label} updated. Live on the website within about a minute.`);
      onSaved();
      onClose();
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="scroll-mt-24">
    <Card className="p-5 sm:p-6 space-y-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">{target.label}</h2>
          <p className="text-xs text-slate-500 font-code">{target.path}</p>
        </div>
        <button aria-label="Close" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-cream-100"><X className="w-4 h-4" /></button>
      </div>
      <div>
        <Input label="Title in Google and when shared" value={form.title} maxLength={70} placeholder="Leave empty to use the page's own title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <p className="mt-1 text-xs text-slate-500">{form.title.length}/70</p>
      </div>
      <div>
        <Textarea label="Description" rows={3} value={form.description} maxLength={200} placeholder="Leave empty to use the page's own description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <p className="mt-1 text-xs text-slate-500">{form.description.length}/200 · Google shows about 155 characters</p>
      </div>
      <Input label="Share image (1200 × 630)" value={form.image} placeholder="https://… or /brand/og.png" onChange={(e) => setForm({ ...form, image: e.target.value })} />
      <label className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] p-3 cursor-pointer">
        <input type="checkbox" checked={form.noindex} onChange={(e) => setForm({ ...form, noindex: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
        <span className="text-sm"><span className="font-semibold text-ink">Hide from Google</span> <span className="text-slate-500">(noindex; also removed from the sitemap)</span></span>
      </label>

      <div className="rounded-xl border border-[#e2e8f0] p-4 bg-cream-50">
        <p className="text-xs text-slate-500 mb-1">Google preview</p>
        <p className="text-[#1a0dab] text-lg leading-snug truncate">{form.title || `${target.label} | ADSIGN Skill Academy`}</p>
        <p className="text-xs text-emerald-700">{typeof window !== 'undefined' ? window.location.host : ''}{target.path}</p>
        <p className="text-sm text-slate-400 line-clamp-2">{form.description || 'The page’s own description is used.'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => save(false)} isLoading={busy}><Save className="w-4 h-4" /> Save</Button>
        {entry && <Button variant="outline" onClick={() => save(true)} disabled={busy}>Reset to default</Button>}
      </div>
    </Card>
    </div>
  );
}

export default function SeoPage() {
  const { error: toastError } = useToast();
  const [data, setData] = useState<{ entries: Entry[]; courses: any[]; instructors: any[] } | null>(null);
  const [editing, setEditing] = useState<Target | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    apiClient<any>('/admin/site/seo').then(setData).catch((e) => toastError('Could not load SEO', e.message));
  }, [toastError]);
  useEffect(load, [load]);

  const targets: Target[] = useMemo(() => {
    if (!data) return [];
    return [
      ...MAIN_PAGES.map(([path, label]) => ({ key: `page:${path}`, label, group: 'Pages', path })),
      ...data.courses.map((c) => ({ key: `course:${c.slug}`, label: c.title, group: 'Courses', path: `/courses/${c.slug}` })),
      ...data.instructors.map((i) => ({ key: `instructor:${i.slug}`, label: i.name, group: 'Instructors', path: `/instructors/${i.slug}` })),
    ];
  }, [data]);

  const byKey = useMemo(() => Object.fromEntries((data?.entries || []).map((e) => [e.key, e])), [data]);
  const shown = targets.filter((t) => !filter || `${t.label} ${t.path}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Search className="w-6 h-6 text-indigo-400" /> SEO & analytics
        </h1>
        <p className="text-sm text-slate-400 mt-1">For the SEO team: titles, descriptions and share images for every page, course and instructor, plus tracking IDs.</p>
      </div>

      <TrackingSettings />

      {editing && <EntryEditor key={editing.key} target={editing} entry={byKey[editing.key]} onClose={() => setEditing(null)} onSaved={load} />}

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-400" /> Pages, courses & instructors</h2>
          <input
            aria-label="Filter"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 w-full sm:w-64 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink"
          />
        </div>
        {!data ? (
          <div className="p-6"><div className="h-40 rounded-xl skeleton" /></div>
        ) : (
          <ul className="divide-y divide-[#e2e8f0]">
            {shown.map((t) => {
              const e = byKey[t.key];
              return (
                <li key={t.key} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{t.label} <span className="text-xs font-normal text-slate-500">· {t.group}</span></p>
                    <p className="text-xs text-slate-500 truncate">{e?.title ? `“${e.title}”` : t.path}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e?.noindex && <Badge variant="danger"><EyeOff className="w-3 h-3 mr-1" /> Hidden from Google</Badge>}
                    {e && !e.noindex && <Badge variant="success">Customised</Badge>}
                    {!e && <Badge variant="slate">Default</Badge>}
                    <Button variant="outline" size="sm" onClick={() => setEditing(t)}>Edit</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
