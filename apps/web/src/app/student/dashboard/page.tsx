'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../providers/auth-provider';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { formatCurrency } from '../../../lib/utils';
import {
  BookOpen,
  Award,
  PlayCircle,
  CheckCircle2,
  Receipt,
  Download,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Video,
  Radio,
  FileCheck,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [receiptsData, setReceiptsData] = useState<{ payments: any[]; registrations: any[] }>({
    payments: [],
    registrations: [],
  });
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [liveSessions, setLiveSessions] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [enrollmentRes, certRes, receiptsRes, liveRes] = await Promise.all([
          apiClient<any[]>('/student/courses').catch(() => []),
          apiClient<any[]>('/certificates/my').catch(() => []),
          apiClient<{ payments: any[]; registrations: any[] }>('/student/receipts').catch(() => ({
            payments: [],
            registrations: [],
          })),
          apiClient<any[]>('/student/live-sessions').catch(() => []),
        ]);
        setEnrollments(enrollmentRes || []);
        setCertificates(certRes || []);
        setReceiptsData(receiptsRes || { payments: [], registrations: [] });
        setLiveSessions(liveRes || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeEnrollment = enrollments[0];
  const upcomingLive = liveSessions.find(
    (s) => new Date(s.startsAt).getTime() + (s.durationMinutes || 60) * 60000 >= Date.now()
  );

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#efdfd4] shadow-soft">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-wider">
              STUDENT LMS
            </span>
            {user?.studentId && (
              <Badge variant="primary" className="font-mono text-xs">
                {user.studentId}
              </Badge>
            )}
            <Badge variant="success">ACTIVE ACCOUNT</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Welcome to your personalized learning dashboard. You have direct access to your enrolled curriculum tracks, assessments, and verified payment receipts.
          </p>
        </div>

        {activeEnrollment && (
          <Link href={`/student/courses/${activeEnrollment.id}/learn`}>
            <Button variant="primary" size="lg" className="gap-2 shrink-0 shadow-lg shadow-blue-500/20">
              <PlayCircle className="w-4 h-4" />
              <span>Continue Learning</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Today's Live Class Banner if Scheduled */}
      {upcomingLive && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-purple-900/10 border border-purple-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  Scheduled Live Class
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(upcomingLive.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{upcomingLive.title}</h3>
            </div>
          </div>

          <Link href="/student/schedule">
            <Button variant="primary" size="sm" className="gap-1.5 shrink-0 text-xs shadow-sm">
              <Radio className="w-3.5 h-3.5" />
              <span>View Live Schedule</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-[#efdfd4] bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Enrolled Courses</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{enrollments.length}</p>
          <span className="text-[11px] text-slate-400 font-mono">Registered curricula</span>
        </Card>

        <Card className="p-5 border-[#efdfd4] bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Certificates Earned</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{certificates.length}</p>
          <span className="text-[11px] text-slate-400 font-mono">Verified diplomas</span>
        </Card>

        <Card className="p-5 border-[#efdfd4] bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Admission Status</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">Provisioned</p>
          <span className="text-[11px] text-slate-400 font-mono">ID & Access Active</span>
        </Card>

        <Card className="p-5 border-[#efdfd4] bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Receipts Available</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {receiptsData.payments.length + receiptsData.registrations.length}
          </p>
          <span className="text-[11px] text-slate-400 font-mono">Payment vouchers</span>
        </Card>
      </div>

      {/* Active Enrolled Courses (ONLY enrolled courses) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            My Enrolled Courses
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {enrollments.length} Course{enrollments.length !== 1 ? 's' : ''} Enrolled
          </span>
        </div>

        {enrollments.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-[#efdfd4] bg-white shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600 mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900">No active course enrollments yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Browse our catalog to select your career track in recorded or live cohort modes.
            </p>
            <Link href="/courses">
              <Button variant="primary" size="sm" className="mt-4 gap-2">
                <span>Explore Course Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrollments.map((enr) => (
              <Card
                key={enr.id}
                className="border-[#efdfd4] bg-white p-6 flex flex-col justify-between hover:border-blue-300 transition-all shadow-sm"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{enr.course.category || 'Curriculum'}</Badge>
                      <Badge variant={enr.mode === 'LIVE' ? 'purple' : 'slate'} className="gap-1">
                        {enr.mode === 'LIVE' ? (
                          <>
                            <Radio className="w-3 h-3 text-purple-600 animate-pulse" />
                            <span>LIVE BATCH</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3 text-slate-600" />
                            <span>RECORDED TRACK</span>
                          </>
                        )}
                      </Badge>
                    </div>

                    <Badge variant="success" className="font-mono text-[10px]">
                      {enr.paymentStatus || 'PAID'}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {enr.course.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {enr.course.description}
                    </p>
                  </div>

                  {/* Batch & Instructor info if present */}
                  {enr.batch && (
                    <div className="p-3 rounded-lg bg-[#fff8f3] border border-[#f0e2d8] text-xs space-y-1">
                      <p className="font-semibold text-slate-800">
                        Batch: <span className="text-blue-700">{enr.batch.name}</span> (Section {enr.batch.section})
                      </p>
                      {enr.batch.scheduleText && (
                        <p className="text-[11px] text-slate-500">
                          Schedule: {enr.batch.scheduleText}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Progress Indicator */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-slate-500 font-mono">
                      <span>Curriculum Progression</span>
                      <span>{enr.status === 'COMPLETED' ? '100%' : 'In Progress'}</span>
                    </div>
                    <Progress value={enr.status === 'COMPLETED' ? 100 : 25} />
                  </div>
                </div>

                {/* Card Footer Button */}
                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    {enr.course._count?.modules || 3} Modules in track
                  </span>

                  <Link href={`/student/courses/${enr.courseId}/learn`}>
                    <Button variant="primary" size="sm" className="gap-1.5 shadow-sm">
                      <PlayCircle className="w-4 h-4" />
                      <span>Continue Learning</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Receipts Section */}
      <div className="space-y-4 pt-4 border-t border-[#f0e2d8]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Official Admission Receipts & Invoices
          </h2>
          <span className="text-xs font-mono text-slate-500">Verified Payment Records</span>
        </div>

        {receiptsData.registrations.length === 0 && receiptsData.payments.length === 0 ? (
          <Card className="p-6 text-center border-[#efdfd4] bg-white shadow-sm">
            <p className="text-xs text-slate-500">No payment receipts on record.</p>
          </Card>
        ) : (
          <Card className="border-[#efdfd4] bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fff8f3] text-slate-600 font-mono uppercase text-[10px] border-b border-[#f0e2d8]">
                  <tr>
                    <th className="p-3.5 pl-4">Receipt Ref</th>
                    <th className="p-3.5">Course & Mode</th>
                    <th className="p-3.5">Amount Paid</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {receiptsData.registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-4 font-mono font-bold text-blue-700">
                        RCP-{reg.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900">{reg.course.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono uppercase">{reg.mode} Delivery</p>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {formatCurrency(reg.amount, reg.currency)}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="success">CONFIRMED</Badge>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReceipt(reg)}
                          className="gap-1 text-xs"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {receiptsData.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-4 font-mono font-bold text-blue-700">
                        PAY-{p.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900">{p.course?.title || 'Course Enrollment'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.provider}</p>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="success">{p.status}</Badge>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReceipt({ ...p, applicantName: user?.name, course: p.course })}
                          className="gap-1 text-xs"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal: View / Print Receipt */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#efdfd4] space-y-6 text-slate-900">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Official Admission Receipt</h3>
                <p className="text-xs font-mono text-slate-400">Online Creative & IT Academy</p>
              </div>
              <Badge variant="success">PAID & VERIFIED</Badge>
            </div>

            <div className="space-y-4 text-xs font-mono bg-[#fff8f3] p-4 rounded-xl border border-[#f0e2d8]">
              <div className="flex justify-between">
                <span className="text-slate-500">RECEIPT NO:</span>
                <span className="font-bold">RCP-{selectedReceipt.id.substring(0, 10).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">STUDENT ID:</span>
                <span className="font-bold text-blue-700">{user?.studentId || 'STUDENT'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LEARNER NAME:</span>
                <span className="font-bold">{selectedReceipt.applicantName || user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">COURSE:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.course?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DELIVERY MODE:</span>
                <span className="font-bold">{selectedReceipt.mode || 'RECORDED'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#f0e2d8]">
                <span className="text-slate-500">TOTAL PAID:</span>
                <span className="font-extrabold text-base text-blue-700">
                  {formatCurrency(selectedReceipt.amount, selectedReceipt.currency || 'INR')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={handlePrintReceipt} className="gap-1.5">
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
