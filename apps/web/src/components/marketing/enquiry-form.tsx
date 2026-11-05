'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { track } from '../../lib/analytics';
import { Input, Textarea } from '../ui/input';
import { Button } from '../ui/button';
import { CheckCircle2, Send } from 'lucide-react';

interface EnquiryFormProps {
  /** Pre-selects the course (course page) */
  courseId?: string;
  courseTitle?: string;
  /** Where the lead came from, shown in the admin inbox */
  source: string;
  compact?: boolean;
}

/** Website enquiry form: saved to the admin Enquiries inbox and announced to the admissions team. */
export function EnquiryForm({ courseId, courseTitle, source, compact }: EnquiryFormProps) {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', courseId: courseId || '', message: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (courseId) return;
    apiClient<any>('/courses?limit=50')
      .then((res) => setCourses((res.items || res).map((c: any) => ({ id: c.id, title: c.title }))))
      .catch(() => undefined);
  }, [courseId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient('/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          courseId: form.courseId || undefined,
          message: form.message || (courseTitle ? `Please call me about ${courseTitle}.` : 'Please call me back.'),
          source,
        }),
      });
      track('generate_lead', { source, course: courseTitle || form.courseId || undefined });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Could not send your enquiry');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-800 bg-emerald-50 p-5 text-center space-y-2 animate-scale-in" role="status">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <p className="font-bold text-ink">Thank you, {form.name.split(' ')[0] || 'we got it'}!</p>
        <p className="text-sm text-slate-400">Our admissions team will call or WhatsApp you shortly, usually within one working day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Honeypot: hidden from people, filled by bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="hidden" aria-hidden="true" />
      <div className={compact ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        <Input label="Your name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        <Input label="Mobile / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required minLength={8} />
      </div>
      <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      {!courseId && (
        <div className="space-y-1.5">
          <label htmlFor="enquiry-course" className="block text-sm font-medium text-ink">Course of interest</label>
          <select id="enquiry-course" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink">
            <option value="">Not sure yet / general question</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}
      {!compact && (
        <Textarea label="Your question" placeholder="Batch timings, fees, EMI, career support…" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required minLength={5} />
      )}
      {error && <p className="text-sm font-medium text-rose-400" role="alert">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" isLoading={busy}>
        <Send className="w-4 h-4" /> {compact ? 'Request a call back' : 'Send enquiry'}
      </Button>
      <p className="text-xs text-slate-500">We use your details only to answer this enquiry.</p>
    </form>
  );
}
