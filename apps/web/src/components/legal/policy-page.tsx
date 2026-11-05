import React from 'react';
import Link from 'next/link';
import { Navbar } from '../common/navbar';
import { Footer } from '../common/footer';

const POLICIES = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund & Cancellation' },
  { href: '/contact', label: 'Contact us' },
];

/** Shared layout for legal pages (required by Razorpay for live payments). */
export function PolicyPage({ title, updated, current, children }: { title: string; updated: string; current: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <nav aria-label="Policies" className="lg:sticky lg:top-24 self-start">
          <ul className="flex lg:flex-col flex-wrap gap-2">
            {POLICIES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={p.href === current ? 'page' : undefined}
                  className={`block rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${p.href === current ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white hover:text-ink'}`}
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0 rounded-2xl bg-white border border-[#e2e8f0] shadow-card p-6 sm:p-10">
          <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Last updated: {updated}</p>
          <div className="mt-8 space-y-6 text-slate-300 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-indigo-400 [&_a]:font-semibold">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

export const ACADEMY = {
  name: 'ADSIGN Skill Academy',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',
  address: process.env.NEXT_PUBLIC_ACADEMY_ADDRESS || '',
};
