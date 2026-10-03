'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { User, Award, ExternalLink, Github, Code2, Globe } from 'lucide-react';
import Link from 'next/link';

export default function StudentPortfolioPage() {
  const params = useParams();
  const studentId = params.studentId as string;

  // TODO(client-requirement): Load dynamic public student profile from database with custom domain support
  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 w-full space-y-10 tech-dot-grid">
        {/* Profile Card */}
        <Card className="border-[#232d42] bg-[#0e121c] p-8 shadow-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="w-20 h-20 rounded-xl bg-blue-600 border border-blue-400/30 flex items-center justify-center text-2xl font-mono font-bold text-white shrink-0">
            JD
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-white">John Doe</h1>
              <Badge variant="success" className="gap-1">
                <Award className="w-3.5 h-3.5" /> CERTIFIED GRADUATE
              </Badge>
            </div>
            <p className="text-xs font-mono text-blue-400 font-semibold">
              Full-Stack Engineer & AI Systems Specialist
            </p>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Graduate of the Online Creative & IT Academy. Specializing in high-performance Next.js architectures, Prisma ORM, and automated progression state machine engines.
            </p>
          </div>
        </Card>

        {/* Featured Projects */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Certified Capstone Projects</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="purple">Full-Stack Monorepo</Badge>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">
                Online Creative & IT Academy LMS Platform
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complete LMS scaffold built with npm workspaces, Next.js 15, Node.js Express, Prisma ORM, and PDF certificate generator with QR code verification.
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs">
                <Badge variant="slate">Next.js</Badge>
                <Badge variant="slate">TypeScript</Badge>
                <Badge variant="slate">PostgreSQL</Badge>
                <Badge variant="slate">Prisma</Badge>
              </div>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="primary">AI Agent</Badge>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">
                Multi-Agent RAG Documentation Assistant
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous agent pipeline with vector search embeddings, semantic chunking, and streaming LLM answers.
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs">
                <Badge variant="slate">Python</Badge>
                <Badge variant="slate">LangChain</Badge>
                <Badge variant="slate">Pinecone</Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Verified Certificates */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Verified Academic Credentials</h2>
          <Card className="border-emerald-500/30 bg-slate-900/80 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Full-Stack Web Development & Modern AI Engineering
                </p>
                <p className="text-xs text-slate-400">Issued by Online Creative & IT Academy</p>
              </div>
            </div>

            <Link href="/verify/CERT-2026-DEMO01">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Verify Authenticity</span>
              </Button>
            </Link>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
