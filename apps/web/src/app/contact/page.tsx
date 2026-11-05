import type { Metadata } from 'next';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { EnquiryForm } from '../../components/marketing/enquiry-form';
import { ACADEMY } from '../../components/legal/policy-page';
import { Mail, Phone, MapPin, Clock3, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admissions & contact',
  description: 'Ask ADSIGN Skill Academy about courses, batch timings, fees and EMI. Our admissions team replies within one working day.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const rows = [
    ACADEMY.email && { icon: Mail, label: 'Email', value: ACADEMY.email, href: `mailto:${ACADEMY.email}` },
    ACADEMY.phone && { icon: Phone, label: 'Phone / WhatsApp', value: ACADEMY.phone, href: `tel:${ACADEMY.phone}` },
    ACADEMY.address && { icon: MapPin, label: 'Address', value: ACADEMY.address },
    { icon: Clock3, label: 'Office hours', value: 'Monday to Saturday, 10am – 7pm IST' },
  ].filter(Boolean) as { icon: any; label: string; value: string; href?: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <section className="relative overflow-hidden hero-mesh text-white">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 animate-fade-up">
          <p className="text-sm font-semibold text-sky-800">Admissions &amp; enquiries</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white">Talk to an advisor</h1>
          <p className="mt-3 max-w-2xl text-night-300 text-lg">Questions about a course, batch timings, fees or EMI? Send us a message and we'll call or WhatsApp you back.</p>
        </div>
      </section>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
        <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 shadow-card space-y-5">
          <h2 className="font-bold text-ink">How to reach us</h2>
          <ul className="space-y-4">
            {rows.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-400 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
                <span>
                  <span className="block text-xs text-slate-500">{label}</span>
                  {href ? <a href={href} className="font-semibold text-ink hover:text-indigo-400">{value}</a> : <span className="font-semibold text-ink">{value}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-xl bg-cream-100 p-4 text-sm text-slate-400">
            <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            Every enquiry goes straight to our admissions team, who usually reply within one working day.
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 sm:p-8 shadow-card">
          <h2 className="text-xl font-bold text-ink mb-5">Send an enquiry</h2>
          <EnquiryForm source="CONTACT_PAGE" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
