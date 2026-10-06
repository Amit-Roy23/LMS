'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { ArrowLeft, BookOpen, Award, CheckCircle2, User } from 'lucide-react';
import { formatDate } from '../../../../lib/utils';

export default function AdminStudentDetailPage() {
  const params = useParams();
  const studentId = (params?.studentId as string) || '';

  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStudent() {
      try {
        setIsLoading(true);
        const data = await apiClient(`/admin/users/${studentId}`);
        setStudent(data);
      } catch (err) {
        console.error('Failed to load student details', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (studentId) loadStudent();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-10 h-10 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm" className="text-xs text-slate-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Students
          </Button>
        </Link>
        <h1 className="text-2xl font-extrabold text-ink">Student Progression Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Summary Card */}
        <Card className="p-6 border-slate-800 bg-slate-900/80 space-y-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600/30 text-indigo-300 font-extrabold text-3xl flex items-center justify-center mx-auto">
            {student?.name?.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">{student?.name}</h3>
            <p className="text-xs text-slate-400">{student?.email}</p>
          </div>
          <Badge variant="success" className="mx-auto">
            Status: {student?.status}
          </Badge>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Enrolled since {formatDate(student?.createdAt)}
          </p>
        </Card>

        {/* Enrollments & Certificates */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Active Enrolled Courses ({student?.enrollments?.length || 0})
            </h3>

            <div className="space-y-2">
              {student?.enrollments?.map((enr: any) => (
                <div
                  key={enr.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-ink">{enr.course?.title}</p>
                    <p className="text-[11px] text-slate-400">Enrolled: {formatDate(enr.enrolledAt)}</p>
                  </div>
                  <Badge variant={enr.status === 'COMPLETED' ? 'success' : 'purple'}>
                    {enr.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Earned Verifiable Diplomas ({student?.certificates?.length || 0})
            </h3>

            <div className="space-y-2">
              {student?.certificates?.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No certificates earned yet.</p>
              ) : (
                student?.certificates?.map((cert: any) => (
                  <div
                    key={cert.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-ink">{cert.course?.title}</p>
                      <p className="font-mono text-indigo-300 text-[10px]">{cert.certificateId}</p>
                    </div>
                    <Badge variant="success">Verified</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
