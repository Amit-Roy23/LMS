'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { BookOpen, Plus, Edit, Trash2, Users, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { useToast } from '../../../providers/toast-provider';

export default function AdminCoursesPage() {
  const { success, error: toastError } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCourses() {
    try {
      setIsLoading(true);
      const res = await apiClient<any>('/admin/courses');
      setCourses(res.items || []);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await apiClient(`/admin/courses/${id}`, { method: 'DELETE' });
      success('Course Deleted', 'Course was archived.');
      loadCourses();
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Course Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Build, edit, and publish curriculums, modules, quizzes, and assignments.
          </p>
        </div>

        <Link href="/admin/courses/new">
          <Button variant="primary" size="md" className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/40 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No courses created yet</h3>
          <p className="text-xs text-slate-400">Click "Create New Course" to build your first curriculum.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => (
            <Card key={c.id} className="border-slate-800 bg-slate-900/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'PUBLISHED' ? 'success' : 'slate'}>
                    {c.status}
                  </Badge>
                  <Badge variant="purple">{c.level}</Badge>
                  <span className="text-xs text-slate-400">{c.category}</span>
                </div>
                <h3 className="text-base font-bold text-white">{c.title}</h3>
                <p className="text-xs text-slate-400">
                  {formatCurrency(c.price, c.currency)} • {c.modulesCount || 3} Modules • {c.enrolledStudentsCount || 0} Enrolled Students
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/courses/${c.slug}`} target="_blank">
                  <Button variant="secondary" size="sm" className="text-xs gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> Public Page
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
