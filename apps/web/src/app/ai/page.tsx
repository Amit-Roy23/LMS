import React from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Sparkles, Bot, Cpu, Network, ArrowRight } from 'lucide-react';

export default function AiPage() {
  // TODO(client-requirement): Extend AI modules with live interactive code playgrounds and model fine-tuning tracks
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-20 w-full space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="purple" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Creative AI Engineering Lab
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">
            Applied Generative AI & Autonomous Agents
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Learn to build, deploy, and evaluate production-grade multi-agent architectures, function-calling workflows, vector embeddings, and RAG pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">Autonomous Agent Workflows</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Design multi-step reasoning agents with tool usage, memory persistence, dynamic execution plans, and human-in-the-loop validation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">RAG & Vector Retrieval</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Semantic chunking strategies, hybrid keyword-vector search, reranking algorithms, and real-time streaming citations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">Model Evaluation & Safety</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated LLM unit testing, prompt regression testing, red-teaming safety guardrails, and latency optimization.
            </p>
          </div>
        </div>

        <div className="text-center pt-8">
          <Link href="/courses">
            <Button variant="primary" size="lg" className="gap-2">
              <span>View Available AI Curriculums</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
