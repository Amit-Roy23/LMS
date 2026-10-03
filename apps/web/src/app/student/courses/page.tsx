'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { BookOpen, PlayCircle, Award, ArrowRight } from 'lucide-react';

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        setIsLoading(true);
        const res = await apiClient<any[]>('/enrollments/my');
        setEnrollments(res || []);
      } catch (err) {
        console.error('Failed to load courses', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourses();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">My Enrolled Courses</h1>
        <p className="text-xs text-slate-400 mt-1">
          Continue your progress across all enrolled academic curriculums.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/40">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No active enrollments found</h3>
          <p className="text-xs text-slate-400 mt-1">Browse our course catalog to get enrolled.</p>
          <Link href="/courses">
            <Button variant="primary" size="sm" className="mt-4">
              Browse Courses
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrollments.map((enr) => (
            <Card
              key={enr.id}
              className="border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="primary">{enr.course.category || 'Engineering'}</Badge>
                  <Badge variant={enr.status === 'COMPLETED' ? 'success' : 'purple'}>
                    {enr.status}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-white line-clamp-2">
                  {enr.course.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {enr.course.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {enr.course._count?.modules || 3} Modules in track
                </span>

                <Link href={`/student/courses/${enr.courseId}/learn`}>
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <PlayCircle className="w-4 h-4" />
                    <span>Open Learning Player</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
