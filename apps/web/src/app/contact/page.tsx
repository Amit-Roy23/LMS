'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/common/navbar';
import { Footer } from '../../components/common/footer';
import { Button } from '../../components/ui/button';
import { Input, Textarea } from '../../components/ui/input';
import { Card, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';
import { useToast } from '../../providers/toast-provider';

export default function ContactPage() {
  const { success } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    success('Message Sent!', 'Our academic admissions team will get back to you shortly.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-20 w-full space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="primary">Admissions & Inquiries</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">Get in Touch</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Have questions regarding curriculum requirements, corporate training, or certification validation?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 border-slate-800 bg-slate-900/80 space-y-6">
            <h3 className="font-bold text-base text-ink">Contact Information</h3>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400">Admissions Email</p>
                  <p className="font-semibold text-ink">admissions@creativeit.academy</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400">Direct Support</p>
                  <p className="font-semibold text-ink">+1 (800) 555-0199</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400">Academy Headquarters</p>
                  <p className="font-semibold text-ink">Innovation Campus, Tech District</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="md:col-span-2 border-slate-800 bg-slate-900/80 p-6">
            <CardTitle className="text-base text-ink mb-4">Send Us a Message</CardTitle>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Your Name" placeholder="John Doe" required />
                <Input label="Your Email" type="email" placeholder="john@example.com" required />
              </div>
              <Input label="Subject / Program of Interest" placeholder="e.g. Admission for Full-Stack AI Course" required />
              <Textarea label="Message" placeholder="How can our counselors assist you?" rows={4} required />

              <Button type="submit" variant="primary" size="md">
                <Send className="w-4 h-4 mr-1.5" />
                <span>Send Inquiry</span>
              </Button>
            </form>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
