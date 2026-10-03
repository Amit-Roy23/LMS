import React from 'react';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { GraduationCap, ShieldCheck, Award, Target, BookCheck, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-20 w-full space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="primary">About Our Institute</Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Online Creative & IT Academy
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Pioneering verifiable computer science education through server-enforced progression state machines, multi-stage human code reviews, and enterprise certifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 border-slate-800 bg-slate-900/80 space-y-3">
            <Target className="w-8 h-8 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Strict Mastery Standard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No superficial multiple-choice certificates. Students must achieve 90% watch retention, pass quizzes, build practical assignments reviewed by humans, and pass timed exams.
            </p>
          </Card>

          <Card className="p-6 border-slate-800 bg-slate-900/80 space-y-3">
            <Award className="w-8 h-8 text-purple-400" />
            <h3 className="text-base font-bold text-white">Verifiable Diplomas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every certificate contains an immutable cryptographic ID and anti-tamper QR code with a publicly verifiable online record.
            </p>
          </Card>

          <Card className="p-6 border-slate-800 bg-slate-900/80 space-y-3">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Next-Gen Tech Curriculum</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Curriculums covering Next.js 15 App Router, TypeScript, Prisma ORM, PostgreSQL, Docker, and Autonomous AI Agent architectures.
            </p>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
