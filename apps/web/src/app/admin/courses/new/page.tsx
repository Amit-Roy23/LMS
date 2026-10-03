'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input, Textarea } from '../../../../components/ui/input';
import { useToast } from '../../../../providers/toast-provider';
import { CourseLevel, CourseStatus } from '@academy/shared';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function NewCoursePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(199);
  const [category, setCategory] = useState('Software Engineering');
  const [level, setLevel] = useState<CourseLevel>(CourseLevel.INTERMEDIATE);
  const [status, setStatus] = useState<CourseStatus>(CourseStatus.PUBLISHED);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !description) {
      toastError('Missing Fields', 'Please complete all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient('/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug,
          description,
          price: Number(price),
          category,
          level,
          status,
        }),
      });

      success('Course Created!', 'New course track was created successfully.');
      router.push('/admin/courses');
    } catch (err: any) {
      toastError('Creation Failed', err.message || 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/courses">
          <Button variant="ghost" size="sm" className="text-xs text-slate-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-extrabold text-white">Create New Course Track</h1>
      </div>

      <Card className="border-slate-800 bg-slate-900/90 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Course Title"
            placeholder="e.g. Distributed Cloud Systems & Kubernetes"
            value={title}
            onChange={handleTitleChange}
            required
          />

          <Input
            label="URL Slug"
            placeholder="distributed-cloud-systems"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />

          <Textarea
            label="Course Description"
            placeholder="Detailed overview of prerequisites, learning objectives, and curriculum scope..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Tuition Price (USD)"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="Software Engineering">Software Engineering</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="DevOps & Cloud">DevOps & Cloud</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CourseLevel)}
                className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value={CourseLevel.BEGINNER}>Beginner</option>
                <option value={CourseLevel.INTERMEDIATE}>Intermediate</option>
                <option value={CourseLevel.ADVANCED}>Advanced</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              <span>Publish Course Track</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
