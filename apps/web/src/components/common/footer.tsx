import React from 'react';
import Link from 'next/link';
import { GraduationCap, Github, Twitter, Linkedin, Youtube, ShieldCheck, Mail, Phone } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Programs',
    links: [
      { href: '/courses', label: 'All courses' },
      { href: '/courses/fullstack-ai-engineering', label: 'Full-Stack & AI Engineering' },
      { href: '/courses/ui-ux-product-design', label: 'UI/UX & Product Design' },
      { href: '/courses/cloud-devops-kubernetes', label: 'Cloud DevOps & Kubernetes' },
      { href: '/courses/digital-marketing-growth', label: 'Digital Marketing' },
    ],
  },
  {
    title: 'Students',
    links: [
      { href: '/login', label: 'Student portal' },
      { href: '/verify/CERT-2026-AI-001', label: 'Verify a certificate' },
      { href: '/career', label: 'Career support' },
      { href: '/ai', label: 'AI & Labs' },
    ],
  },
  {
    title: 'Academy',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/contact', label: 'Admissions & contact' },
      { href: '/api/docs', label: 'Developer API (Swagger)' },
    ],
  },
];

const SOCIALS = [
  { icon: Github, label: 'GitHub' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Twitter, label: 'X' },
];

export function Footer() {
  return (
    <footer className="relative bg-night-950 text-night-400 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-60" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </span>
              <span className="font-extrabold text-lg text-white tracking-tight">Creative &amp; IT Academy</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm">
              Job-ready programs in technology, design and marketing, with mentor-reviewed projects and
              certificates that employers can verify in seconds.
            </p>
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" /> admissions@creativeit.academy
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-500" /> +91 98765 43210
              </p>
            </div>
            <div className="flex items-center gap-2">
              {SOCIALS.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-4">
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} Online Creative &amp; IT Academy. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Certificates verifiable at /verify
          </p>
        </div>
      </div>
    </footer>
  );
}
