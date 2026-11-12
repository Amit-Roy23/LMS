'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient, authHeaders, getApiBase, ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../providers/auth-provider';
import { useToast } from '../../../../providers/toast-provider';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input, Textarea } from '../../../../components/ui/input';
import { cn, formatDateTime } from '../../../../lib/utils';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileText,
  ListChecks,
  Paperclip,
  Plus,
  Radio,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';

type Tab = 'details' | 'rules' | 'curriculum' | 'live';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'curriculum', label: 'Curriculum & materials', icon: BookOpen },
  { key: 'rules', label: 'Pass marks & rules', icon: SlidersHorizontal },
  { key: 'details', label: 'Course details', icon: FileText },
  { key: 'live', label: 'Live classes', icon: Radio },
];

const DEFAULT_RULES = {
  passingQuizScorePercent: 70,
  maxQuizAttempts: 3,
  mockTestPassingPercent: 80,
  assignmentPassingPercent: 80,
  finalAssessmentPassingPercent: 80,
  lessonCompletionThresholdPercent: 90,
  sequentialLessonsLock: true,
  watermarkEnabled: true,
};

const fileSize = (b?: number | null) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Course editor: details, pass marks, curriculum with study materials, and live classes. */
export default function CourseEditorPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || '';
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('curriculum');
  const isAdmin = user?.role === 'ADMIN';
  const canDeleteMaterial = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';

  const load = useCallback(async () => {
    try {
      setCourse(await apiClient<any>(`/admin/courses/${courseId}/editor`));
    } catch (err: any) {
      toastError('Could not load the course', err.message);
    }
  }, [courseId, toastError]);
  useEffect(() => {
    if (courseId) load();
  }, [courseId, load]);

  if (!course) return <div className="h-96 rounded-2xl skeleton max-w-6xl" />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300">
            <ArrowLeft className="w-4 h-4" /> All courses
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-ink truncate">{course.title}</h1>
          <p className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={course.status === 'PUBLISHED' ? 'success' : 'slate'}>{course.status.toLowerCase()}</Badge>
            {course.category} · taught by {course.instructor?.name}
          </p>
        </div>
        <Link href={`/courses/${course.slug}`} target="_blank">
          <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /> Public page</Button>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-[#e2e8f0]" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === key ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-ink'
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'details' && <DetailsTab course={course} onSaved={load} />}
      {tab === 'rules' && <RulesTab course={course} onSaved={load} />}
      {tab === 'curriculum' && (
        <CurriculumTab course={course} onChanged={load} isAdmin={isAdmin} canDeleteMaterial={canDeleteMaterial} notify={{ success, toastError }} />
      )}
      {tab === 'live' && <LiveTab course={course} onChanged={load} isAdmin={isAdmin} />}
    </div>
  );
}

function DetailsTab({ course, onSaved }: { course: any; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    status: course.status,
    thumbnail: course.thumbnail || '',
    price: course.price,
  });
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient(`/admin/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, price: Number(form.price), thumbnail: form.thumbnail || null }),
      });
      success('Course saved', form.title);
      onSaved();
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-6">
      <form onSubmit={save} className="space-y-4">
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
        <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={10} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <div className="space-y-1.5">
            <label htmlFor="level" className="block text-sm font-medium text-ink">Level</label>
            <select id="level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'].map((l) => <option key={l} value={l}>{l.replace('_', ' ').toLowerCase()}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm font-medium text-ink">Status</label>
            <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink">
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cover image (web address or /media/... path)" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} />
          <div>
            <Input label="Price (₹, includes GST)" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Price changes need a main admin's PIN and OTP.</p>
          </div>
        </div>
        <Button type="submit" variant="primary" isLoading={busy}><Save className="w-4 h-4" /> Save details</Button>
      </form>
    </Card>
  );
}

function RulesTab({ course, onSaved }: { course: any; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const [rules, setRules] = useState<any>({ ...DEFAULT_RULES, ...(course.settings || {}) });
  const [busy, setBusy] = useState(false);
  const num = (key: string, label: string, help: string, min = 0, max = 100) => (
    <div>
      <Input label={label} type="number" min={min} max={max} value={rules[key]} onChange={(e) => setRules({ ...rules, [key]: e.target.value })} />
      <p className="text-xs text-slate-500 mt-1">{help}</p>
    </div>
  );
  const save = async () => {
    setBusy(true);
    try {
      const settings = Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, typeof v === 'boolean' ? v : Number(v)]));
      await apiClient(`/admin/courses/${course.id}`, { method: 'PUT', body: JSON.stringify({ settings }) });
      success('Pass marks saved', 'Students see the new rules straight away.');
      onSaved();
    } catch (err: any) {
      toastError('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {num('passingQuizScorePercent', 'Module quiz pass mark (%)', 'Score needed to unlock the next module.')}
        {num('maxQuizAttempts', 'Quiz attempts allowed', 'An instructor can reset attempts for a student.', 1, 20)}
        {num('mockTestPassingPercent', 'Mock test pass mark (%)', 'Needed before the final project and exam.')}
        {num('assignmentPassingPercent', 'Assignment pass mark (%)', "Grade as a share of the assignment's marks; below it, the work goes back to the student.")}
        {num('finalAssessmentPassingPercent', 'Final exam pass mark (%)', 'Needed for the certificate.')}
        {num('lessonCompletionThresholdPercent', 'Video watched to complete (%)', 'Skipping ahead does not count.', 50, 100)}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {[
          ['sequentialLessonsLock', 'Lessons unlock one by one'],
          ['watermarkEnabled', 'Student watermark on videos'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={!!rules[key]} onChange={(e) => setRules({ ...rules, [key]: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
            <span className="text-sm font-semibold text-ink">{label}</span>
          </label>
        ))}
      </div>
      <Button variant="primary" onClick={save} isLoading={busy}><Save className="w-4 h-4" /> Save pass marks</Button>
    </Card>
  );
}

function CurriculumTab({ course, onChanged, isAdmin, canDeleteMaterial, notify }: any) {
  const [open, setOpen] = useState<Record<string, boolean>>({ [course.modules[0]?.id]: true });
  const [newModule, setNewModule] = useState('');
  const add = async (path: string, body: any, done: string) => {
    try {
      await apiClient(path, { method: 'POST', body: JSON.stringify(body) });
      notify.success(done, body.title || '');
      onChanged();
    } catch (err: any) {
      notify.toastError('Could not add', err.message);
    }
  };
  return (
    <div className="space-y-4">
      {course.modules.map((m: any, mi: number) => (
        <Card key={m.id} className="overflow-hidden">
          <button
            onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-cream-100/60"
            aria-expanded={!!open[m.id]}
          >
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-400 font-bold flex items-center justify-center shrink-0">{mi + 1}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-ink truncate">{m.title}</span>
              <span className="block text-xs text-slate-500">
                {m.lessons.length} lessons · {m.lessons.reduce((n: number, l: any) => n + l.lessonResources.length, 0)} materials
                {m.quiz ? ' · quiz' : ''}{m.assignment ? ' · assignment' : ''}
              </span>
            </span>
            <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform', open[m.id] && 'rotate-180')} />
          </button>
          {open[m.id] && (
            <div className="border-t border-[#e2e8f0] divide-y divide-[#e2e8f0]">
              {m.lessons.map((l: any) => (
                <LessonRow key={l.id} lesson={l} onChanged={onChanged} isAdmin={isAdmin} canDeleteMaterial={canDeleteMaterial} notify={notify} />
              ))}
              <div className="px-5 py-4 flex flex-wrap items-center gap-2 bg-cream-100/40">
                <NewLessonForm onAdd={(title) => add('/admin/lessons', { moduleId: m.id, title, order: m.lessons.length + 1, videoProvider: 'MP4' }, 'Lesson added')} />
                {m.quiz && (
                  <Link href={`/admin/courses/${course.id}/quizzes/${m.quiz.id}`}>
                    <Button variant="outline" size="sm"><ListChecks className="w-4 h-4" /> Edit quiz</Button>
                  </Link>
                )}
                {m.assignment && <Badge variant="slate">Assignment: {m.assignment.title} ({m.assignment.maxScore} marks)</Badge>}
              </div>
            </div>
          )}
        </Card>
      ))}
      <Card className="p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <Input label="New module" placeholder="e.g. Module 3: Branding in practice" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
        </div>
        <Button
          variant="primary"
          disabled={newModule.trim().length < 2}
          onClick={() => {
            add('/admin/modules', { courseId: course.id, title: newModule.trim(), order: course.modules.length + 1 }, 'Module added');
            setNewModule('');
          }}
        >
          <Plus className="w-4 h-4" /> Add module
        </Button>
      </Card>
    </div>
  );
}

function NewLessonForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim().length >= 2) {
          onAdd(title.trim());
          setTitle('');
        }
      }}
      className="flex flex-1 min-w-[16rem] gap-2"
    >
      <label className="sr-only" htmlFor={`new-lesson-${title.length}`}>New lesson title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New lesson title"
        className="h-9 flex-1 min-w-0 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={title.trim().length < 2}><Plus className="w-4 h-4" /> Lesson</Button>
    </form>
  );
}

function LessonRow({ lesson, onChanged, isAdmin, canDeleteMaterial, notify }: any) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: lesson.title, description: lesson.description || '', isPreview: lesson.isPreview });
  const [uploading, setUploading] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    try {
      await apiClient(`/admin/lessons/${lesson.id}`, { method: 'PUT', body: JSON.stringify(form) });
      notify.success('Lesson saved', form.title);
      setEditing(false);
      onChanged();
    } catch (err: any) {
      notify.toastError('Could not save', err.message);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('title', materialTitle || file.name.replace(/\.[^.]+$/, ''));
      const headers = authHeaders(undefined, body);
      const res = await fetch(`${getApiBase()}/admin/lessons/${lesson.id}/resources/upload`, { method: 'POST', body, headers, credentials: 'include' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new ApiError(json?.error?.message || 'Upload failed', res.status);
      notify.success('Material uploaded', file.name);
      setMaterialTitle('');
      onChanged();
    } catch (err: any) {
      notify.toastError('Upload failed', err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeMaterial = async (r: any) => {
    if (!confirm(`Remove "${r.title}" from this lesson? It can be restored from the Activity log.`)) return;
    try {
      await apiClient(`/admin/resources/${r.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err: any) {
      notify.toastError('Could not remove', err.message);
    }
  };

  const removeLesson = async () => {
    if (!confirm(`Delete the lesson "${lesson.title}"? It can be restored from the Activity log.`)) return;
    try {
      await apiClient(`/admin/lessons/${lesson.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err: any) {
      notify.toastError('Could not delete', err.message);
    }
  };

  return (
    <div className="px-5 py-4 space-y-3">
      {editing ? (
        <div className="space-y-3">
          <Input label="Lesson title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Summary" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isPreview} onChange={(e) => setForm({ ...form, isPreview: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
            Free preview (anyone can watch it on the course page)
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={save}><Save className="w-4 h-4" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink flex-1 min-w-[12rem]">{lesson.title}</span>
          {lesson.isPreview && <Badge variant="primary">Free preview</Badge>}
          {lesson.videoProvider === 'HLS' && <Badge variant="success">Encrypted video</Badge>}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="text-rose-400" aria-label={`Delete ${lesson.title}`} onClick={removeLesson}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      <div className="rounded-xl bg-cream-100/60 p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Study materials</p>
        {lesson.lessonResources.length === 0 && <p className="text-sm text-slate-500">No materials yet.</p>}
        {lesson.lessonResources.map((r: any) => (
          <div key={r.id} className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <a href={r.downloadUrl?.startsWith('/') ? `${getApiBase().replace(/\/api\/v1$/, '')}${r.downloadUrl}` : r.downloadUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate font-semibold text-ink hover:text-indigo-400">
              {r.title}
            </a>
            <span className="text-xs text-slate-500 whitespace-nowrap">{r.type} {fileSize(r.sizeBytes)}</span>
            {canDeleteMaterial && (
              <button onClick={() => removeMaterial(r)} aria-label={`Remove ${r.title}`} className="p-1 rounded-lg text-slate-500 hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <label className="sr-only" htmlFor={`mat-${lesson.id}`}>Material title</label>
          <input
            id={`mat-${lesson.id}`}
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            placeholder="Title (optional), e.g. Lesson notes"
            className="h-9 flex-1 min-w-0 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink"
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.zip,.ppt,.pptx,.doc,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button size="sm" variant="secondary" isLoading={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Upload material
          </Button>
        </div>
        <p className="text-[11px] text-slate-500">PDF, slides, documents, spreadsheets, images or ZIP. Students download through a private link that expires after 15 minutes.</p>
      </div>
    </div>
  );
}

function LiveTab({ course, onChanged, isAdmin }: { course: any; onChanged: () => void; isAdmin: boolean }) {
  const { success, error: toastError } = useToast();
  const batches = course.batches || [];
  const [form, setForm] = useState({ batchId: batches[0]?.id || '', title: '', startsAt: '', durationMinutes: 60, provider: 'MEET', joinUrl: '' });
  const [busy, setBusy] = useState(false);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient('/admin/live-sessions', {
        method: 'POST',
        body: JSON.stringify({ ...form, durationMinutes: Number(form.durationMinutes), startsAt: new Date(form.startsAt).toISOString() }),
      });
      success('Live class scheduled', form.title);
      setForm({ ...form, title: '', startsAt: '', joinUrl: '' });
      onChanged();
    } catch (err: any) {
      toastError('Could not schedule', err.message);
    } finally {
      setBusy(false);
    }
  };
  const setRecording = async (s: any) => {
    const url = window.prompt('Recording link (leave empty to remove):', s.recordingUrl || '');
    if (url === null) return;
    try {
      await apiClient(`/admin/live-sessions/${s.id}`, { method: 'PUT', body: JSON.stringify({ recordingUrl: url || null, status: url ? 'COMPLETED' : s.status }) });
      onChanged();
    } catch (err: any) {
      toastError('Could not save', err.message);
    }
  };
  const remove = async (s: any) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    try {
      await apiClient(`/admin/live-sessions/${s.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err: any) {
      toastError('Could not delete', err.message);
    }
  };

  if (batches.length === 0) {
    return <Card className="p-8 text-center text-sm text-slate-500">This course has no batches yet. Live classes are scheduled for a batch.</Card>;
  }
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-bold text-ink mb-4">Schedule a live class</h2>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="batch" className="block text-sm font-medium text-ink">Batch</label>
            <select id="batch" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink">
              {batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Input label="Topic" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
          <Input label="Starts at" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
          <Input label="Length (minutes)" type="number" min={15} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
          <div className="space-y-1.5">
            <label htmlFor="provider" className="block text-sm font-medium text-ink">Platform</label>
            <select id="provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink">
              <option value="MEET">Google Meet</option>
              <option value="ZOOM">Zoom</option>
              <option value="YOUTUBE">YouTube Live</option>
              <option value="OTHER">Other (e.g. Jitsi)</option>
            </select>
          </div>
          <Input label="Join link" type="url" placeholder="https://meet.google.com/..." value={form.joinUrl} onChange={(e) => setForm({ ...form, joinUrl: e.target.value })} required />
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" isLoading={busy}><Plus className="w-4 h-4" /> Schedule class</Button>
          </div>
        </form>
      </Card>
      {batches.map((b: any) => (
        <Card key={b.id} className="overflow-hidden">
          <h3 className="px-5 py-4 border-b border-[#e2e8f0] font-bold text-ink">{b.name} <span className="text-sm font-normal text-slate-500">· {b.liveSessions.length} classes</span></h3>
          <ul className="divide-y divide-[#e2e8f0]">
            {b.liveSessions.map((s: any) => (
              <li key={s.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="flex-1 min-w-[12rem]">
                  <span className="block font-semibold text-ink">{s.title}</span>
                  <span className="block text-xs text-slate-500">{formatDateTime(s.startsAt)} · {s.durationMinutes} min · {s.provider}</span>
                </span>
                {s.recordingUrl ? <Badge variant="success">Recording added</Badge> : <Badge variant="slate">{s.status.toLowerCase()}</Badge>}
                <Button size="sm" variant="ghost" onClick={() => setRecording(s)}>Recording link</Button>
                {isAdmin && (
                  <Button size="sm" variant="ghost" className="text-rose-400" aria-label={`Delete ${s.title}`} onClick={() => remove(s)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
