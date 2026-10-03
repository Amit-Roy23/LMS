'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { CertificateCard } from '../../../components/certificate/certificate-card';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Award, Lock, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCertificates() {
      try {
        setIsLoading(true);
        const data = await apiClient<any[]>('/certificates/my');
        setCertificates(data || []);
      } catch (err) {
        console.error('Failed to load certificates', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCertificates();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">My Earned Certificates</h1>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically registered completion diplomas with public verification links and downloadable PDFs.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/40 space-y-3">
          <Award className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Certificates Issued Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Complete all video lessons (≥90%), pass module quizzes, obtain instructor approvals on assignments, and pass the final certification assessment to receive your verifiable certificate.
          </p>
          <Link href="/student/courses">
            <Button variant="primary" size="sm" className="mt-2">
              Continue Course Learning
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
