import React from 'react';
import Link from 'next/link';
import { GraduationCap, Github, Twitter, Linkedin, ShieldCheck, Award, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-plum text-cream/75">
      <div className="h-6 checker-pink" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1 */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-peach-500 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-plum" />
              </div>
              <span className="font-display font-extrabold text-cream text-lg tracking-tight">
                Creative & IT Academy
              </span>
            </div>
            <p className="text-xs text-cream/70 leading-relaxed">
              Empowering next-generation engineers with industry-vetted curriculums, server-enforced mastery progression, and cryptographically verifiable certifications.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a href="#" className="p-2 rounded-full bg-cream/10 hover:bg-peach-500 hover:text-plum transition-colors">
                <Github className="w-3.5 h-3.5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-cream/10 hover:bg-peach-500 hover:text-plum transition-colors">
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-cream/10 hover:bg-peach-500 hover:text-plum transition-colors">
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-cream">
              Learning Programs
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/courses" className="hover:text-peach-500 transition-colors">
                  Full-Stack Web Development
                </Link>
              </li>
              <li>
                <Link href="/ai" className="hover:text-peach-500 transition-colors">
                  Applied AI & Prompt Engineering
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-peach-500 transition-colors">
                  Cloud DevOps & Microservices
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-peach-500 transition-colors">
                  Mobile App Development
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-cream">
              Verification & Career
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/verify/CERT-2026-DEMO01" className="hover:text-peach-500 transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-peach-500" /> Certificate Verification
                </Link>
              </li>
              <li>
                <Link href="/career" className="hover:text-peach-500 transition-colors">
                  Career Placement Support
                </Link>
              </li>
              <li>
                <Link href="/portfolio/student-1" className="hover:text-peach-500 transition-colors">
                  Student Portfolios
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-peach-500 transition-colors">
                  Accreditation & Standards
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-cream">
              Institute & Trust
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-peach-500 transition-colors">
                  About Our Academy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-peach-500 transition-colors">
                  Admissions Contact
                </Link>
              </li>
              <li>
                <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-peach-500 transition-colors">
                  Developer API Docs (Swagger)
                </a>
              </li>
              <li>
                <span className="text-cream/50">ISO 9001:2015 Compliant</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-cream/60">
          <p>© {new Date().getFullYear()} Online Creative & IT Academy. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with Next.js, Node.js, Prisma, PostgreSQL & Precision Progression Engine
          </p>
        </div>
      </div>
    </footer>
  );
}
