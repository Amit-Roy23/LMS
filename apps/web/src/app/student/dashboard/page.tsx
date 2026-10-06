'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../providers/auth-provider';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import {
  BookOpen,
  Award,
  PlayCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [enrollmentRes, certRes] = await Promise.all([
          apiClient<any[]>('/enrollments/my'),
          apiClient<any[]>('/certificates/my'),
        ]);
        setEnrollments(enrollmentRes || []);
        setCertificates(certRes || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeEnrollment = enrollments[0];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-lg bg-[#ffffff] border border-[#efdfd4] shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider">
              STUDENT TERMINAL
            </span>
            <Badge variant="success">ACTIVE ENROLLMENT</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Deterministic state engine active. Complete video checkpoints, pass quizzes, and submit assignments for certification.
          </p>
        </div>

        {activeEnrollment && (
          <Link href={`/student/courses/${activeEnrollment.courseId}/learn`}>
            <Button variant="primary" size="lg" className="gap-2 shrink-0">
              <PlayCircle className="w-4 h-4" />
              <span>Resume Course Player</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Enrolled Courses</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{enrollments.length}</p>
          <span className="text-[11px] text-slate-500">Active curriculums</span>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Certificates Earned</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{certificates.length}</p>
          <span className="text-[11px] text-slate-500">Verified diplomas</span>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Progression State</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 mt-2">Server Enforced</p>
          <span className="text-[11px] text-slate-500">Strict prerequisites</span>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Assignments</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400 mt-2">Human Reviewed</p>
          <span className="text-[11px] text-slate-500">Instructor feedback</span>
        </Card>
      </div>

      {/* Active Enrolled Courses */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          My Active Courses
        </h2>

        {enrollments.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/40">
            <p className="text-sm font-semibold text-ink">You have not enrolled in any courses yet.</p>
            <p className="text-xs text-slate-400 mt-1">Explore our courses catalog to get started.</p>
            <Link href="/courses">
              <Button variant="primary" size="sm" className="mt-4">
                Explore Courses Catalog
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
                    <Badge variant="primary">{enr.course.category || 'Software Engineering'}</Badge>
                    <Badge variant={enr.status === 'COMPLETED' ? 'success' : 'purple'}>
                      {enr.status}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-ink line-clamp-2">
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
                      <span>Enter Learning Portal</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
