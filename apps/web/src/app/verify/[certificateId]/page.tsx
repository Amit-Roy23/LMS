'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { apiClient } from '../../../lib/api';
import { ShieldCheck, Award, CheckCircle2, Download, AlertTriangle, Calendar, User, BookOpen } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import Link from 'next/link';

export default function CertificateVerificationPage() {
  const params = useParams();
  const certificateId = (params?.certificateId as string) || '';

  const [cert, setCert] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient(`/certificates/verify/${certificateId}`);
        setCert(data);
      } catch (err: any) {
        setError(err.message || 'Certificate not found or verification failed');
      } finally {
        setIsLoading(false);
      }
    }
    if (certificateId) verify();
  }, [certificateId]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-20 w-full">
        <div className="text-center space-y-2 mb-10">
          <Badge variant="success" className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Verification Registry
          </Badge>
          <h1 className="text-3xl font-extrabold text-ink">Certificate Authentication</h1>
          <p className="text-xs text-slate-400">
            Cryptographic ledger validation for Online Creative & IT Academy credentials
          </p>
        </div>

        {isLoading ? (
          <Card className="border-slate-800 bg-slate-900/80 p-12 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-xs text-slate-400">Verifying credential on academy registry...</p>
          </Card>
        ) : error ? (
          <Card className="border-rose-500/40 bg-rose-950/20 p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-ink">Verification Failed</h3>
              <p className="text-xs text-rose-300 mt-1">{error}</p>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm">
                Return Home
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="border-[#e7d5bd] bg-[#fffbf4] p-8 shadow-xl space-y-8">
            {/* Top Verified Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#eadac4]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      CRYPTOGRAPHIC RECORD
                    </span>
                    <Badge variant="success">AUTHENTIC</Badge>
                  </div>
                  <h3 className="text-xl font-bold text-ink mt-0.5">
                    {cert.courseTitle}
                  </h3>
                </div>
              </div>

              {cert.pdfUrl && (
                <a href={cert.pdfUrl} target="_blank" rel="noreferrer" download>
                  <Button variant="primary" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    <span>Download Official PDF</span>
                  </Button>
                </a>
              )}
            </div>

            {/* Credential Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> Awarded To
                </span>
                <p className="text-base font-bold text-ink">{cert.studentName}</p>
                <p className="text-xs text-slate-400">{cert.studentEmail}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> Issue Date
                </span>
                <p className="text-base font-bold text-ink">{formatDate(cert.issuedAt)}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Permanent Record
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-400">Unique Verification Identifier (UUID)</span>
                <p className="font-mono font-bold text-indigo-300 text-sm">{cert.certificateId}</p>
              </div>
            </div>

            {/* Issuer Badge */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-400">
              Issued by <span className="text-ink font-semibold">Online Creative & IT Academy</span> • Accreditations verified through ISO 9001 compliance standards.
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
