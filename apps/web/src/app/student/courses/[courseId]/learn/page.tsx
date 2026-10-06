'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api';
import { CourseProgressionSummary, ModuleStatus, SubmissionStatus } from '@academy/shared';
import { VideoPlayer } from '../../../../../components/video/video-player';
import { QuizRunner } from '../../../../../components/quiz/quiz-runner';
import { AssignmentSubmitter } from '../../../../../components/assignment/assignment-submitter';
import { MockTestRunner } from '../../../../../components/mock-test/mock-test-runner';
import { CertificateCard } from '../../../../../components/certificate/certificate-card';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/card';
import { ModuleStatusBadge } from '../../../../../components/ui/state-indicator';
import { Progress } from '../../../../../components/ui/progress';
import { Textarea, Input } from '../../../../../components/ui/input';
import {
  PlayCircle,
  CheckCircle2,
  Lock,
  Unlock,
  HelpCircle,
  FileCode2,
  Award,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  BookOpen,
  Send,
  Upload,
} from 'lucide-react';
import { useToast } from '../../../../../providers/toast-provider';
import confetti from 'canvas-confetti';

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || '';
  const { success, error: toastError } = useToast();

  const [progression, setProgression] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active view state
  const [activeModuleId, setActiveModuleId] = useState<string>('');
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<'video' | 'quiz' | 'assignment' | 'mock-test' | 'final-project' | 'final-assessment' | 'certificate'>('video');

  // Submissions for final project
  const [projectText, setProjectText] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [isClaimingCert, setIsClaimingCert] = useState(false);

  // Load progression & course details
  const refreshData = useCallback(async () => {
    try {
      const [progData, courseData] = await Promise.all([
        apiClient<any>(`/courses/${courseId}/progression`),
        apiClient<any>(`/courses/id/${courseId}`),
      ]);

      setProgression(progData);
      setCourse(courseData);

      // Set initial active module and lesson if none selected
      if (!activeLessonId && progData.modules?.length > 0) {
        // Find first unlocked module
        const firstUnlockedMod = progData.modules.find((m: any) => !m.isLocked) || progData.modules[0];
        setActiveModuleId(firstUnlockedMod.id);

        const firstUnlockedLesson = firstUnlockedMod.lessons?.find((l: any) => !l.isLocked) || firstUnlockedMod.lessons?.[0];
        if (firstUnlockedLesson) {
          setActiveLessonId(firstUnlockedLesson.id);
        }
      }
    } catch (err) {
      console.error('Failed to load course player data', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, activeLessonId]);

  useEffect(() => {
    if (courseId) refreshData();
  }, [courseId, refreshData]);

  // Find active module & lesson objects
  const activeModule = progression?.modules?.find((m: any) => m.id === activeModuleId);
  const activeLesson = activeModule?.lessons?.find((l: any) => l.id === activeLessonId);

  // Navigate to Next Lesson
  const handleNextLesson = () => {
    if (!activeModule) return;
    const currIdx = activeModule.lessons.findIndex((l: any) => l.id === activeLessonId);
    if (currIdx < activeModule.lessons.length - 1) {
      const nextL = activeModule.lessons[currIdx + 1];
      if (!nextL.isLocked) {
        setActiveLessonId(nextL.id);
        setActiveViewMode('video');
      } else {
        toastError('Lesson Locked', 'Please complete the current lesson first.');
      }
    } else if (activeModule.quizDetail && !activeModule.quizDetail.isLocked) {
      setActiveViewMode('quiz');
    }
  };

  // Submit Final Project
  const handleSubmitFinalProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectText.trim()) {
      toastError('Required Description', 'Please provide a project description.');
      return;
    }

    try {
      setIsSubmittingProject(true);
      await apiClient(`/final-projects/${course?.finalProject?.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          description: projectText,
          linkUrl: projectLink || null,
        }),
      });

      success('Project Submitted!', 'Your capstone project is now queued for instructor evaluation.');
      setProjectText('');
      setProjectLink('');
      refreshData();
    } catch (err: any) {
      toastError('Submission Error', err.message || 'Failed to submit final project');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  // Claim Certificate
  const handleClaimCertificate = async () => {
    try {
      setIsClaimingCert(true);
      const res = await apiClient<any>('/certificates/claim', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      });

      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      success('🎉 Certificate Issued!', 'Your official verified certificate is ready.');
      refreshData();
    } catch (err: any) {
      toastError('Claim Failed', err.message || 'Could not issue certificate.');
    } finally {
      setIsClaimingCert(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Learning Navigation Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/student/courses')}
            className="text-xs text-slate-400 hover:text-ink"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            My Courses
          </Button>

          <div className="h-4 w-px bg-slate-800" />
          <span className="font-bold text-sm text-ink truncate max-w-xs sm:max-w-md">
            {course?.title}
          </span>
        </div>

        {/* Course Progress Indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs text-slate-400">Course Progress:</span>
            <Progress value={progression?.coursePercent || 0} size="sm" showLabel className="w-28" />
          </div>

          {progression?.certificate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveViewMode('certificate')}
              className="text-xs gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-ink" />
              <span>View Certificate</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Workspace (Sidebar on Left, Player/Stage on Right) */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden">
        {/* Left Player Sidebar: Curriculum State Machine */}
        <aside className="w-full lg:w-96 border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-xl overflow-y-auto shrink-0 flex flex-col justify-between">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Curriculum Progression
              </h3>
              <span className="text-xs font-semibold text-indigo-400">
                {progression?.completedModules || 0} / {progression?.totalModules || 0} Done
              </span>
            </div>

            {/* Modules List */}
            <div className="space-y-3">
              {progression?.modules?.map((mod: any, mIdx: number) => {
                const isCurrentMod = mod.id === activeModuleId;

                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isCurrentMod
                        ? 'border-indigo-500/50 bg-slate-900 shadow-lg'
                        : 'border-slate-800/80 bg-slate-950/50'
                    }`}
                  >
                    {/* Module Header */}
                    <div
                      onClick={() => {
                        if (!mod.isLocked) {
                          setActiveModuleId(mod.id);
                          const firstUnlocked = mod.lessons?.find((l: any) => !l.isLocked) || mod.lessons?.[0];
                          if (firstUnlocked) {
                            setActiveLessonId(firstUnlocked.id);
                            setActiveViewMode('video');
                          }
                        } else {
                          toastError('Module Locked', 'Complete the preceding module first.');
                        }
                      }}
                      className="p-3.5 flex items-start justify-between gap-2 cursor-pointer hover:bg-slate-800/40"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase">
                            Module {mIdx + 1}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-ink leading-snug">
                          {mod.title}
                        </h4>
                      </div>

                      <ModuleStatusBadge status={mod.status} />
                    </div>

                    {/* Lessons & Assessments under this Module */}
                    {isCurrentMod && !mod.isLocked && (
                      <div className="p-2 pt-0 space-y-1 border-t border-slate-800/60">
                        {/* Video Lessons */}
                        {mod.lessons?.map((lesson: any) => {
                          const isCurrentLesson = lesson.id === activeLessonId && activeViewMode === 'video';

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => {
                                if (!lesson.isLocked) {
                                  setActiveLessonId(lesson.id);
                                  setActiveViewMode('video');
                                } else {
                                  toastError('Lesson Locked', 'Please complete the previous lesson first.');
                                }
                              }}
                              className={`w-full p-2.5 rounded-lg flex items-center justify-between text-xs text-left transition-all ${
                                isCurrentLesson
                                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                  : lesson.isLocked
                                  ? 'text-slate-500 cursor-not-allowed'
                                  : 'text-slate-300 hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {lesson.isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : lesson.isLocked ? (
                                  <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                                ) : (
                                  <PlayCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                                )}
                                <span className="truncate">{lesson.title}</span>
                              </div>

                              {lesson.progressPercent > 0 && !lesson.isCompleted && (
                                <span className="text-[10px] text-amber-400 font-mono ml-2 shrink-0">
                                  {Math.round(lesson.progressPercent)}%
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {/* Module Quiz Item */}
                        {mod.quizDetail && (
                          <button
                            onClick={() => {
                              if (!mod.quizDetail.isLocked) {
                                setActiveViewMode('quiz');
                              } else {
                                toastError('Quiz Locked', 'Complete all module lessons to unlock this quiz.');
                              }
                            }}
                            className={`w-full p-2.5 rounded-lg flex items-center justify-between text-xs text-left transition-all ${
                              activeViewMode === 'quiz' && activeModuleId === mod.id
                                ? 'bg-purple-600 text-white font-bold shadow-sm'
                                : mod.quizDetail.isLocked
                                ? 'text-slate-500 cursor-not-allowed'
                                : 'text-purple-300 hover:bg-purple-950/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {mod.quizDetail.isPassed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : mod.quizDetail.isLocked ? (
                                <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                              ) : (
                                <HelpCircle className="w-4 h-4 text-purple-400 shrink-0" />
                              )}
                              <span className="truncate">{mod.quizDetail.title}</span>
                            </div>
                            {mod.quizDetail.isPassed && (
                              <Badge variant="success" size="sm">Passed</Badge>
                            )}
                          </button>
                        )}

                        {/* Module Assignment Item */}
                        {mod.assignmentDetail && (
                          <button
                            onClick={() => {
                              if (!mod.assignmentDetail.isLocked) {
                                setActiveViewMode('assignment');
                              } else {
                                toastError('Assignment Locked', 'Pass the module quiz to unlock this practical assignment.');
                              }
                            }}
                            className={`w-full p-2.5 rounded-lg flex items-center justify-between text-xs text-left transition-all ${
                              activeViewMode === 'assignment' && activeModuleId === mod.id
                                ? 'bg-amber-600 text-white font-bold shadow-sm'
                                : mod.assignmentDetail.isLocked
                                ? 'text-slate-500 cursor-not-allowed'
                                : 'text-amber-300 hover:bg-amber-950/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {mod.assignmentDetail.isApproved ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : mod.assignmentDetail.isLocked ? (
                                <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                              ) : (
                                <FileCode2 className="w-4 h-4 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate">{mod.assignmentDetail.title}</span>
                            </div>
                            {mod.assignmentDetail.isApproved && (
                              <Badge variant="success" size="sm">Approved</Badge>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Post-Module Final Stages */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Post-Curriculum Final Stages
              </h4>

              {/* Mock Test */}
              <button
                onClick={() => {
                  if (progression?.isAllModulesCompleted) {
                    setActiveViewMode('mock-test');
                  } else {
                    toastError('Locked', 'Complete all course modules first.');
                  }
                }}
                className={`w-full p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  activeViewMode === 'mock-test'
                    ? 'border-indigo-500 bg-indigo-600/30 text-ink font-bold'
                    : progression?.isAllModulesCompleted
                    ? 'border-indigo-500/30 bg-slate-900 text-indigo-300 hover:bg-indigo-950/30'
                    : 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  {progression?.mockTestPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : !progression?.isAllModulesCompleted ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>Final Mock Exam</span>
                </div>
                {progression?.mockTestPassed && <Badge variant="success">Passed</Badge>}
              </button>

              {/* Final Project */}
              <button
                onClick={() => {
                  if (progression?.isAllModulesCompleted && progression?.mockTestPassed) {
                    setActiveViewMode('final-project');
                  } else {
                    toastError('Locked', 'Pass the mock exam first.');
                  }
                }}
                className={`w-full p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  activeViewMode === 'final-project'
                    ? 'border-purple-500 bg-purple-600/30 text-ink font-bold'
                    : progression?.isAllModulesCompleted && progression?.mockTestPassed
                    ? 'border-purple-500/30 bg-slate-900 text-purple-300 hover:bg-purple-950/30'
                    : 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  {progression?.finalProjectApproved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : !(progression?.isAllModulesCompleted && progression?.mockTestPassed) ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <FileCode2 className="w-4 h-4 text-purple-400" />
                  )}
                  <span>Capstone Project</span>
                </div>
                {progression?.finalProjectApproved && <Badge variant="success">Approved</Badge>}
              </button>

              {/* Final Assessment */}
              <button
                onClick={() => {
                  if (progression?.finalProjectApproved) {
                    setActiveViewMode('final-assessment');
                  } else {
                    toastError('Locked', 'Have your final project approved first.');
                  }
                }}
                className={`w-full p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  activeViewMode === 'final-assessment'
                    ? 'border-cyan-500 bg-cyan-600/30 text-ink font-bold'
                    : progression?.finalProjectApproved
                    ? 'border-cyan-500/30 bg-slate-900 text-cyan-300 hover:bg-cyan-950/30'
                    : 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  {progression?.finalAssessmentPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : !progression?.finalProjectApproved ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Award className="w-4 h-4 text-cyan-400" />
                  )}
                  <span>Official Final Assessment</span>
                </div>
                {progression?.finalAssessmentPassed && <Badge variant="success">Passed</Badge>}
              </button>

              {/* Certificate */}
              <button
                onClick={() => {
                  if (progression?.certificateEligible || progression?.certificate) {
                    setActiveViewMode('certificate');
                  } else {
                    toastError('Locked', 'Pass the final assessment to unlock certificate.');
                  }
                }}
                className={`w-full p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  activeViewMode === 'certificate'
                    ? 'border-emerald-500 bg-emerald-600/30 text-ink font-bold'
                    : progression?.certificateEligible || progression?.certificate
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 animate-pulse'
                    : 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Verified Diploma Certificate</span>
                </div>
                {progression?.certificate ? (
                  <Badge variant="success">Issued</Badge>
                ) : progression?.certificateEligible ? (
                  <Badge variant="success">Claimable</Badge>
                ) : null}
              </button>
            </div>
          </div>
        </aside>

        {/* Right Active Learning Stage View */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-5xl">
          {/* Mode 1: Video Player */}
          {activeViewMode === 'video' && activeLesson && (
            <div className="space-y-6">
              <VideoPlayer
                lessonId={activeLesson.id}
                videoUrl={activeLesson.videoUrl}
                title={activeLesson.title}
                initialPercent={activeLesson.progressPercent || 0}
                initialWatchedSeconds={0}
                isCompleted={activeLesson.isCompleted}
                onComplete={() => refreshData()}
              />

              {/* Next Navigation Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Status: {activeLesson.isCompleted ? '✓ Completed' : 'Watching'}
                </span>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNextLesson}
                  className="gap-2"
                >
                  <span>Next Activity</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Mode 2: Module Quiz */}
          {activeViewMode === 'quiz' && activeModule?.quizDetail && (
            <QuizRunner
              quiz={activeModule.quizDetail}
              courseId={courseId}
              moduleId={activeModule.id}
              attemptsCount={activeModule.quizDetail.attemptsCount}
              maxAttempts={activeModule.quizDetail.maxAttempts}
              isPassed={activeModule.quizDetail.isPassed}
              onQuizCompleted={() => refreshData()}
            />
          )}

          {/* Mode 3: Module Assignment */}
          {activeViewMode === 'assignment' && activeModule?.assignmentDetail && (
            <AssignmentSubmitter
              assignment={activeModule.assignmentDetail}
              courseId={courseId}
              moduleId={activeModule.id}
              onSubmitted={() => refreshData()}
            />
          )}

          {/* Mode 4: Final Mock Test */}
          {activeViewMode === 'mock-test' && course?.mockTest && (
            <MockTestRunner
              mockTest={course.mockTest}
              courseId={courseId}
              onCompleted={() => refreshData()}
            />
          )}

          {/* Mode 5: Final Project */}
          {activeViewMode === 'final-project' && course?.finalProject && (
            <div className="space-y-6">
              <Card className="border-purple-500/30 bg-slate-900/90 p-6 space-y-4">
                <Badge variant="purple">Capstone Requirement</Badge>
                <CardTitle className="text-xl text-ink">{course.finalProject.title}</CardTitle>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {course.finalProject.description}
                </div>
              </Card>

              {progression?.finalProjectApproved ? (
                <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-ink">Capstone Project Approved!</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Your project has been reviewed and passed by your instructor. You may now proceed to the Official Final Assessment.
                    </p>
                  </div>
                </div>
              ) : (
                <Card className="border-slate-800 bg-slate-900/90 p-6">
                  <form onSubmit={handleSubmitFinalProject} className="space-y-4">
                    <Textarea
                      label="Project Description & Architecture Overview"
                      placeholder="Detail how you engineered the solution, database patterns, and test suites..."
                      value={projectText}
                      onChange={(e) => setProjectText(e.target.value)}
                      rows={5}
                      required
                    />

                    <Input
                      label="GitHub Repository or Live Deployment URL"
                      placeholder="https://github.com/username/capstone-project"
                      value={projectLink}
                      onChange={(e) => setProjectLink(e.target.value)}
                    />

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={isSubmittingProject}
                      >
                        <Send className="w-4 h-4 mr-1.5" />
                        Submit Capstone Project
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          )}

          {/* Mode 6: Final Assessment */}
          {activeViewMode === 'final-assessment' && course?.finalAssessment && (
            <MockTestRunner
              mockTest={course.finalAssessment}
              courseId={courseId}
              onCompleted={() => refreshData()}
            />
          )}

          {/* Mode 7: Certificate Claim & View */}
          {activeViewMode === 'certificate' && (
            <div className="space-y-6">
              {progression?.certificate ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Your certificate has been generated, signed, and registered in our public registry.</span>
                  </div>
                  <CertificateCard certificate={progression.certificate} />
                </div>
              ) : progression?.certificateEligible ? (
                <Card className="border-[#efdfd4] bg-[#ffffff] p-8 text-center space-y-6 shadow-xl">
                  <div className="w-14 h-14 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ink">All Requirements Satisfied!</h2>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                      You have completed all video lessons, passed all quizzes, received approvals on assignments & capstone project, and passed the final assessment.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleClaimCertificate}
                    isLoading={isClaimingCert}
                    className="px-8"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    <span>Claim & Generate Verifiable Certificate</span>
                  </Button>
                </Card>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <Lock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-ink">Certificate Locked</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Complete all modules, mock tests, assignments, and the final assessment to unlock your official diploma.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
