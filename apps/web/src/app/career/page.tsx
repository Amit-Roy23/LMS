import React from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Briefcase, Building2, TrendingUp, Users, ArrowRight } from 'lucide-react';

export default function CareerPage() {
  // TODO(client-requirement): Integrate live job board API and direct hiring partner application portal
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-20 w-full space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="success" className="gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Career Placement Cell
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Accelerate Your Engineering Career
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Every graduate of our academy earns verified credentials that hiring managers trust. Access our exclusive partner network and 1-on-1 resume reviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <Building2 className="w-8 h-8 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">50+ Global Hiring Partners</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Top tech companies hire directly from our certified student portfolio roster.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">94% Placement Rate</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Students who pass all 3 modules and the final assessment secure senior software roles within 6 months.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <Users className="w-8 h-8 text-purple-400" />
            <h3 className="text-lg font-bold text-white">1-on-1 Mock Technical Interviews</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Practice live algorithmic and system design interview rounds with senior engineering leaders.
            </p>
          </div>
        </div>

        <div className="text-center pt-8">
          <Link href="/courses">
            <Button variant="primary" size="lg">
              Start Your Career Journey
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
