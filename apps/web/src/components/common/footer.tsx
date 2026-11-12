'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Twitter, Linkedin, Youtube, ShieldCheck, Mail, Phone, MessageCircle } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { BRAND } from '../../lib/brand';
import { useSiteConfig, contactFrom, whatsappLink } from '../../lib/site-config';

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
      { href: '/instructors', label: 'Our instructors' },
      { href: '/contact', label: 'Admissions & contact' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { href: '/terms', label: 'Terms & conditions' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/refund-policy', label: 'Refund & cancellation' },
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
  const contact = contactFrom(useSiteConfig().settings);
  return (
    <footer className="relative bg-night-950 text-night-400 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-60" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          <div className="col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo tone="dark" size="lg" caption="Skill Academy · Creative | Digital | Studio" />
            </Link>
            <p className="text-sm leading-relaxed max-w-sm">
              Job-ready programs in technology, design and marketing, with mentor-reviewed projects and
              certificates that employers can verify in seconds.
            </p>
            <div className="space-y-1.5 text-sm">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-white">
                  <Mail className="w-4 h-4 text-indigo-500" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white">
                  <Phone className="w-4 h-4 text-indigo-500" /> {contact.phone}
                </a>
              )}
              {contact.whatsapp && (
                <a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white">
                  <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp {contact.whatsapp}
                </a>
              )}
              <Link href="/contact" className="flex items-center gap-2 hover:text-white">
                <Mail className="w-4 h-4 text-indigo-500" /> Send an enquiry
              </Link>
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
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Certificates verifiable at /verify
          </p>
        </div>
      </div>
    </footer>
  );
}
