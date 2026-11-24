'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { BRAND } from '../../lib/brand';
import { useSiteConfig, contactFrom, whatsappLink } from '../../lib/site-config';
import { useCatalog, categoriesOf } from '../../lib/catalog';

type FooterLink = { href: string; label: string; accent?: boolean };

const STUDENTS: FooterLink[] = [
  { href: '/login', label: 'Students Login' },
  { href: '/student/dashboard', label: 'Students Portal' },
  { href: '/#plans', label: 'Subscription' },
  { href: '/#plans', label: 'Learning Plan' },
  { href: '/#live-classes', label: 'Upcoming Events' },
  { href: '/#testimonials', label: 'Student Feedback' },
  { href: '/instructors', label: 'Instructors' },
  { href: '/#showcase', label: 'Portfolio' },
  { href: '/verify/CERT-2026-AI-001', label: 'Verify Certificate' },
  { href: '/#faq', label: 'FAQ' },
];

const ACADEMY: FooterLink[] = [
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Admissions Portal' },
  { href: '/contact', label: 'Scholarship' },
  { href: '/contact', label: 'Entrance Test' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/refund-policy', label: 'Cancellation Policy' },
];

const CAREER: FooterLink[] = [
  { href: '/career', label: 'Positions Open' },
  { href: '/career', label: 'Join us Faculty' },
  { href: '/career', label: 'Freelancer' },
  { href: '/career', label: 'Placements' },
  { href: '/#testimonials', label: 'Success Stories' },
  { href: '/contact', label: 'Apply for the Post' },
  { href: '/contact', label: 'Contact us', accent: true },
];

function Column({ title, links, className = '' }: { title: string; links: FooterLink[]; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="text-[15px] font-bold text-ink">{title}</h4>
      <ul className="space-y-2 text-[13px]">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className={`transition-colors ${l.accent ? 'text-adred font-semibold' : 'text-slate-400 hover:text-adblue'}`}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const contact = contactFrom(useSiteConfig().settings);
  const categories = categoriesOf(useCatalog() || []);
  const programs: FooterLink[] = [
    { href: '/courses', label: 'All Courses' },
    { href: '/courses', label: 'All Categories' },
    ...categories.map((c) => ({ href: `/courses?category=${encodeURIComponent(c.name)}`, label: c.name })),
  ];

  return (
    <footer className="bg-white border-t border-grey3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-x-6">
          <div className="col-span-2 md:col-span-1 py-10 md:py-14 pr-4 space-y-5">
            <Link href="/" className="inline-flex">
              <BrandLogo size="lg" caption="Skill & Art Academy" />
            </Link>
            <p className="text-[13px] leading-relaxed text-slate-400 max-w-xs">
              Job-ready programs in design, development, marketing and AI, with mentor-reviewed projects and certificates employers can
              verify in seconds.
            </p>
            <div className="space-y-2 text-[13px]">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 text-ink hover:text-adblue">
                  <Mail className="w-4 h-4 text-adblue" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 text-ink hover:text-adblue">
                  <Phone className="w-4 h-4 text-adblue" /> {contact.phone}
                </a>
              )}
              {contact.whatsapp && (
                <a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-ink hover:text-adblue">
                  <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp {contact.whatsapp}
                </a>
              )}
            </div>
          </div>
          <Column title="Programs" links={programs} className="bg-grey1 px-5 py-10 md:py-14 -mx-4 sm:mx-0" />
          <Column title="Students Zone" links={STUDENTS} className="py-10 md:py-14" />
          <Column title="Academy" links={ACADEMY} className="py-10 md:py-14" />
          <Column title="Career" links={CAREER} className="py-10 md:py-14" />
        </div>
      </div>
      <div className="bg-grey1 border-t border-grey3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/terms" className="hover:text-adblue">Copyright &amp; Brand Policy</Link>
            <Link href="/privacy" className="hover:text-adblue">Privacy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
