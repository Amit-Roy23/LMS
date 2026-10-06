'use client';

import React from 'react';
import { CertificateDetail, CertificateStatus } from '@academy/shared';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Award, Download, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../providers/toast-provider';
import Link from 'next/link';

export function CertificateCard({ certificate }: { certificate: any }) {
  const { success } = useToast();
  const [copied, setCopied] = React.useState(false);

  const verificationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${certificate.certificateId}`;

  const copyVerificationLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    success('Link Copied!', 'Verification URL copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-[#efdfd4] bg-[#ffffff] overflow-hidden shadow-xl hover:border-blue-500/50 transition-all">
      {/* Decorative Top Solid Line */}
      <div className="h-1 w-full bg-blue-600" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-semibold text-slate-300">
              VERIFIED CREDENTIAL
            </span>
          </div>
          <Badge variant={certificate.status === 'VALID' ? 'success' : 'danger'}>
            {certificate.status}
          </Badge>
        </div>

        <CardTitle className="text-base text-ink mt-2 font-bold">
          {certificate.course?.title || certificate.courseTitle || 'Mastery Certification'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-3.5 rounded-lg bg-[#fff8f3] border border-[#f0e2d8] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px]">SERIAL NO:</span>
            <span className="font-mono font-bold text-ink text-[11px]">{certificate.certificateId}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px]">ISSUED:</span>
            <span className="text-slate-200 font-mono text-[11px]">{formatDate(certificate.issuedAt)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px]">AUTH STATUS:</span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> SIGNED & VERIFIED
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={copyVerificationLink}
          className="text-xs gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy Link'}
        </Button>

        <div className="flex items-center gap-2">
          <Link href={`/verify/${certificate.certificateId}`}>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              Verify
            </Button>
          </Link>

          {certificate.pdfUrl && (
            <a href={certificate.pdfUrl} target="_blank" rel="noreferrer" download>
              <Button variant="primary" size="sm" className="text-xs gap-1">
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            </a>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
