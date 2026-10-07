'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  HelpCircle,
  FileCode2,
  Award,
  ShieldCheck,
  ArrowRight,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency, formatDuration } from '../../../lib/utils';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { user } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadCourse() {
      try {
        setIsLoading(true);
        const data = await apiClient(`/courses/${slug}`);
        setCourse(data);

        // Expand first module by default
        if (data.modules && data.modules.length > 0) {
          setExpandedModules({ [data.modules[0].id]: true });
        }
      } catch (err) {
        console.error('Failed to load course details', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) loadCourse();
  }, [slug]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto px-4 py-20 w-full animate-pulse space-y-6">
          <div className="h-10 bg-slate-800 rounded-xl w-2/3" />
          <div className="h-6 bg-slate-900 rounded-lg w-1/3" />
          <div className="h-96 bg-slate-900 rounded-2xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Course Not Found</h2>
            <Link href="/courses">
              <Button variant="secondary" size="md" className="mt-4">
                Back to All Courses
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-100">
      <Navbar />

      {/* Header Banner */}
      <section className="py-14 bg-[#f1f5f9] border-b border-[#e2e8f0] tech-dot-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Left 2 Cols: Course Overview */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant="blue">{course.category}</Badge>
                <Badge variant="purple">{course.level}</Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {course.description}
              </p>

              {/* Instructor snippet */}
              {course.instructor && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {course.instructor.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">LEAD INSTRUCTOR</p>
                    <p className="text-xs font-bold text-ink">{course.instructor.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Pricing & Admission Action Card */}
            <Card className="lg:col-span-1 border-[#e2e8f0] bg-[#ffffff] p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">TUITION / FEE:</span>
                <span className="text-2xl font-mono font-bold text-ink">
                  {formatCurrency(course.price, course.currency)}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Full lifetime access to video curriculum</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>3 Hands-on code reviews with instructor feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Timed final mock exam & capstone project</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Cryptographically signed verifiable certificate</span>
                </div>
              </div>

              {course.isEnrolled ? (
                <Link href={`/student/courses/${course.id}/learn`}>
                  <Button variant="primary" size="lg" className="w-full gap-2">
                    <PlayCircle className="w-4 h-4" />
                    <span>Resume Learning Portal</span>
                  </Button>
                </Link>
              ) : (
                <Link href={`/checkout/${course.id}`}>
                  <Button variant="primary" size="lg" className="w-full gap-2">
                    <span>Enroll Now ({formatCurrency(course.price, course.currency)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* Curriculum Syllabus Accordion */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="max-w-4xl space-y-8">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">Curriculum & Syllabus Structure</h2>
            <p className="text-xs text-slate-400 mt-1">
              Modules are unlocked sequentially as each assessment checkpoint is satisfied.
            </p>
          </div>

          <div className="space-y-4">
            {course.modules?.map((mod: any, mIdx: number) => {
              const isOpen = expandedModules[mod.id];

              return (
                <Card key={mod.id} className="border-slate-800 bg-slate-900/80 overflow-hidden">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        0{mIdx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-ink text-sm">{mod.title}</h4>
                        <span className="text-xs text-slate-400">
                          {mod.lessons?.length || 0} Lessons • {mod.quiz ? '1 Quiz' : 'No Quiz'} • {mod.assignment ? '1 Assignment' : 'No Assignment'}
                        </span>
                      </div>
                    </div>

                    <div className="text-slate-400">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 pb-4 border-t border-slate-800/80 divide-y divide-slate-800/50">
                      {mod.lessons?.map((lesson: any) => (
                        <div key={lesson.id} className="py-3 flex items-center justify-between text-xs text-slate-300">
                          <span className="flex items-center gap-2">
                            <PlayCircle className="w-4 h-4 text-indigo-400" />
                            {lesson.title}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {formatDuration(lesson.durationSeconds)}
                          </span>
                        </div>
                      ))}

                      {mod.quiz && (
                        <div className="py-3 flex items-center justify-between text-xs text-purple-300">
                          <span className="flex items-center gap-2 font-medium">
                            <HelpCircle className="w-4 h-4 text-purple-400" />
                            {mod.quiz.title}
                          </span>
                          <span className="text-purple-400 font-semibold">
                            Pass mark: {mod.quiz.passingScorePercent}%
                          </span>
                        </div>
                      )}

                      {mod.assignment && (
                        <div className="py-3 flex items-center justify-between text-xs text-amber-300">
                          <span className="flex items-center gap-2 font-medium">
                            <FileCode2 className="w-4 h-4 text-amber-400" />
                            {mod.assignment.title}
                          </span>
                          <span className="text-amber-400 font-semibold">
                            Instructor Reviewed
                          </span>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
