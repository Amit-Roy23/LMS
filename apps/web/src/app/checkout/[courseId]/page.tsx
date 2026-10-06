'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { PaymentProvider } from '@academy/shared';
import { CreditCard, CheckCircle2, ShieldCheck, Lock, ArrowRight, Zap } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import confetti from 'canvas-confetti';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || '';
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<PaymentProvider>(PaymentProvider.MOCK);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      try {
        setIsLoading(true);
        // Fetch course by ID
        const data = await apiClient(`/courses/id/${courseId}`);
        setCourse(data);
      } catch (err) {
        console.error('Failed to load course for checkout', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (courseId) loadCourse();
  }, [courseId]);

  const handleCompleteEnrollment = async () => {
    if (!user) {
      toastError('Login Required', 'Please sign in or register to complete your admission.');
      router.push(`/login?redirect=/checkout/${courseId}`);
      return;
    }

    try {
      setIsProcessing(true);

      // 1. Create order
      const order = await apiClient<{ paymentId: string; providerRef?: string }>(
        '/enrollments/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            courseId,
            paymentProvider: provider,
          }),
        }
      );

      // 2. Verify payment (Mock instant verification)
      await apiClient('/enrollments/verify', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: order.paymentId,
          providerRef: order.providerRef || `txn_mock_${Date.now()}`,
        }),
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      success('🎉 Admission Confirmed!', 'You have successfully enrolled in the course.');

      // Redirect to course player
      router.push(`/student/courses/${courseId}/learn`);
    } catch (err: any) {
      toastError('Enrollment Failed', err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full">
        <div className="text-center mb-10">
          <Badge variant="primary" className="mb-2">Admission Checkout</Badge>
          <h1 className="text-3xl font-extrabold text-ink">Complete Your Enrollment</h1>
          <p className="text-xs text-slate-400 mt-1">
            Secure admission portal for Online Creative & IT Academy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Left: Payment Method Selection */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-slate-800 bg-slate-900/90 p-6 space-y-4">
              <CardTitle className="text-base text-ink flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                Select Payment Method
              </CardTitle>

              <div className="space-y-3">
                {/* Mock Payment */}
                <div
                  onClick={() => setProvider(PaymentProvider.MOCK)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    provider === PaymentProvider.MOCK
                      ? 'bg-indigo-600/20 border-indigo-500 text-ink shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xs">
                      ⚡
                    </div>
                    <div>
                      <p className="font-bold text-sm text-ink">Instant Sandbox Payment (Mock Dev)</p>
                      <p className="text-[11px] text-slate-400">1-click instant approval for rapid testing & demos</p>
                    </div>
                  </div>
                  {provider === PaymentProvider.MOCK && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                </div>

                {/* Razorpay Option */}
                <div
                  onClick={() => setProvider(PaymentProvider.RAZORPAY)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between opacity-80 ${
                    provider === PaymentProvider.RAZORPAY
                      ? 'bg-indigo-600/20 border-indigo-500 text-ink shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold text-xs">
                      ₹
                    </div>
                    <div>
                      <p className="font-bold text-sm text-ink">Razorpay (Cards, UPI, NetBanking)</p>
                      <p className="text-[11px] text-slate-400">Production gateway stub</p>
                    </div>
                  </div>
                  {provider === PaymentProvider.RAZORPAY && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                </div>
              </div>
            </Card>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                All payments are processed securely. You will gain immediate access to the course player and syllabus progression.
              </span>
            </div>
          </div>

          {/* Right: Order Summary */}
          <Card className="md:col-span-1 border-[#efdfd4] bg-[#ffffff] p-6 space-y-6 shadow-xl">
            <h3 className="font-mono font-bold text-xs text-ink border-b border-[#f0e2d8] pb-3 uppercase tracking-wider">
              ORDER SPECIFICATION
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-ink text-sm">{course?.title}</p>
                <p className="text-slate-400 font-mono text-[11px] mt-0.5">{course?.category}</p>
              </div>

              <div className="pt-3 border-t border-[#f0e2d8] flex items-center justify-between">
                <span className="text-slate-400 font-mono">TUITION:</span>
                <span className="font-mono font-semibold text-ink">{formatCurrency(course?.price || 0, course?.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">PLATFORM FEE:</span>
                <span className="text-emerald-400 font-mono font-semibold">$0.00 (WAIVED)</span>
              </div>
              <div className="pt-3 border-t border-[#f0e2d8] flex items-center justify-between text-base font-extrabold text-ink">
                <span className="font-mono">TOTAL DUE:</span>
                <span className="text-blue-400 font-mono">{formatCurrency(course?.price || 0, course?.currency)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleCompleteEnrollment}
              isLoading={isProcessing}
              className="w-full gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Confirm & Activate Admission</span>
            </Button>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
