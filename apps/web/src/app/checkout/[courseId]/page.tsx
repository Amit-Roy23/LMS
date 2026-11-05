'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../components/common/navbar';
import { Footer } from '../../../components/common/footer';
import { Button } from '../../../components/ui/button';
import { Card, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { apiClient } from '../../../lib/api';
import { openRazorpayCheckout } from '../../../lib/razorpay';
import { INDIAN_STATES, ACADEMY_STATE, GST_RATE } from '../../../lib/indian-states';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { ShieldCheck, Lock, Receipt, Smartphone, CreditCard, Landmark, Wallet, FlaskConical } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import confetti from 'canvas-confetti';

interface CheckoutConfig {
  provider: 'RAZORPAY' | 'MOCK';
  keyId: string | null;
  testMode: boolean;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || '';
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [course, setCourse] = useState<any>(null);
  const [cfg, setCfg] = useState<CheckoutConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingName, setBillingName] = useState('');
  const [state, setState] = useState(ACADEMY_STATE);
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!courseId) return;
    Promise.all([apiClient(`/courses/id/${courseId}`), apiClient<CheckoutConfig>('/payments/config')])
      .then(([c, conf]) => {
        setCourse(c);
        setCfg(conf);
      })
      .catch((err) => console.error('Failed to load checkout', err))
      .finally(() => setIsLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (user && !billingName) setBillingName(user.name);
  }, [user, billingName]);

  const price = course?.price || 0;
  const gst = useMemo(() => {
    const taxable = Math.round((price / (1 + GST_RATE / 100)) * 100) / 100;
    const tax = Math.round((price - taxable) * 100) / 100;
    return { taxable, tax, intra: state === ACADEMY_STATE };
  }, [price, state]);

  const handlePay = async () => {
    if (!user) {
      toastError('Sign in required', 'Please sign in or register to complete your admission.');
      router.push(`/login?redirect=/checkout/${courseId}`);
      return;
    }
    if (gstin && !/^[0-9]{2}[A-Za-z0-9]{13}$/.test(gstin.replace(/\s/g, ''))) {
      toastError('Check GSTIN', 'A GSTIN has 15 characters, e.g. 19ABCDE1234F1Z5. Leave it empty if you do not have one.');
      return;
    }

    try {
      setIsProcessing(true);
      // 1. The server creates the order with the server-side price
      const order = await apiClient<{ paymentId: string; providerRef?: string; checkoutPayload?: any; provider: string }>(
        '/enrollments/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ courseId, billing: { name: billingName, state, gstin: gstin || undefined, address: address || undefined } }),
        }
      );

      // 2. Pay: Razorpay Checkout (UPI, cards, net banking, wallets) or the demo gateway
      let verifyBody: Record<string, any> = { paymentId: order.paymentId };
      if (order.provider === 'RAZORPAY') {
        const result = await openRazorpayCheckout(order.checkoutPayload);
        verifyBody = {
          ...verifyBody,
          providerRef: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        };
      } else {
        verifyBody.providerRef = order.providerRef;
      }

      // 3. The server verifies the payment signature with Razorpay before granting access
      await apiClient('/enrollments/verify', { method: 'POST', body: JSON.stringify(verifyBody) });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0063AD', '#0077BF', '#E71E24', '#E93E08'] });
      success('🎉 Admission confirmed!', 'Your GST invoice has been emailed to you.');
      router.push(`/student/courses/${courseId}`);
    } catch (err: any) {
      if (err?.message === 'Payment cancelled') info('Payment cancelled', 'No money was taken. You can try again any time.');
      else toastError('Payment not completed', err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 sm:py-16 w-full">
        <div className="text-center mb-10 animate-fade-up">
          <Badge variant="primary" className="mb-2">Admission checkout</Badge>
          <h1 className="text-3xl font-extrabold text-ink">Complete your enrolment</h1>
          <p className="text-sm text-slate-400 mt-1">Secure payment · instant course access · GST invoice by email</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
          <div className="min-w-0 space-y-6">
            <Card className="p-6 space-y-4">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" /> Billing details for your invoice
              </CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Name on invoice" value={billingName} onChange={(e) => setBillingName(e.target.value)} />
                <div className="space-y-1.5">
                  <label htmlFor="billing-state" className="block text-sm font-medium text-ink">State</label>
                  <select id="billing-state" value={state} onChange={(e) => setState(e.target.value)} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-ink">
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Input label="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
                <Input label="GSTIN (optional, for businesses)" placeholder="15-character GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} maxLength={15} />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" /> Payment
              </CardTitle>
              {cfg?.provider === 'RAZORPAY' ? (
                <>
                  <p className="text-sm text-slate-400">You'll pay securely with Razorpay. Choose any method in the next step:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                      [Smartphone, 'UPI'],
                      [CreditCard, 'Cards'],
                      [Landmark, 'Net banking'],
                      [Wallet, 'Wallets & EMI'],
                    ].map(([Icon, label]: any) => (
                      <span key={label} className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] px-3 py-2.5 font-semibold text-ink">
                        <Icon className="w-4 h-4 text-indigo-400" /> {label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-amber-800 bg-amber-50 p-4 text-sm text-amber-200 flex gap-3">
                  <FlaskConical className="w-5 h-5 shrink-0" />
                  <span>
                    <strong>Demo mode.</strong> Razorpay keys are not connected on this demo, so payments are simulated instantly.
                    With live keys this button opens Razorpay (UPI, cards, net banking) and access is granted only after the payment signature is verified.
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Your card and UPI details are handled by Razorpay; we never see or store them.
              </p>
            </Card>
          </div>

          <Card className="p-6 space-y-5 lg:sticky lg:top-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order summary</p>
              <p className="font-bold text-ink mt-2">{course?.title}</p>
              <p className="text-xs text-slate-500">{course?.category}</p>
            </div>
            <div className="space-y-2 text-sm border-t border-[#e2e8f0] pt-4">
              <div className="flex justify-between"><span className="text-slate-400">Course fee (taxable value)</span><span className="text-ink tabular-nums">{formatCurrency(gst.taxable)}</span></div>
              {gst.intra ? (
                <>
                  <div className="flex justify-between"><span className="text-slate-400">CGST @ {GST_RATE / 2}%</span><span className="text-ink tabular-nums">{formatCurrency(gst.tax / 2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">SGST @ {GST_RATE / 2}%</span><span className="text-ink tabular-nums">{formatCurrency(gst.tax / 2)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span className="text-slate-400">IGST @ {GST_RATE}%</span><span className="text-ink tabular-nums">{formatCurrency(gst.tax)}</span></div>
              )}
              <div className="flex justify-between border-t border-[#e2e8f0] pt-3 text-base font-extrabold text-ink">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(price, course?.currency)}</span>
              </div>
              <p className="text-xs text-slate-500">Price includes GST. Place of supply: {state}.</p>
            </div>
            <Button variant="primary" size="lg" onClick={handlePay} isLoading={isProcessing} className="w-full">
              <Lock className="w-4 h-4" /> Pay {formatCurrency(price, course?.currency)} &amp; enrol
            </Button>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
