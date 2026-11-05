import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../src/lib/prisma.js';
import { config } from '../src/config/env.js';
import { RazorpayProvider } from '../src/services/payment/razorpay.provider.js';
import { paymentService } from '../src/services/payment/payment.service.js';
import { computeGst, financialYear } from '../src/services/invoice.service.js';

describe('Razorpay verification, webhook and GST maths', () => {
  const stamp = Date.now();
  let studentId = '';
  let courseId = '';
  let paymentId = '';
  const realFetch = global.fetch;

  beforeAll(async () => {
    config.payment.razorpay.keyId = 'rzp_test_key';
    config.payment.razorpay.keySecret = 'rzp_test_secret';
    config.payment.razorpay.webhookSecret = 'whsec_test';
    const instructor = await prisma.user.create({ data: { email: `rzp-i-${stamp}@t.dev`, name: 'I', role: 'INSTRUCTOR', passwordHash: 'x' } });
    const student = await prisma.user.create({ data: { email: `rzp-s-${stamp}@t.dev`, name: 'S', role: 'STUDENT', passwordHash: 'x' } });
    const course = await prisma.course.create({ data: { title: 'Rzp', slug: `rzp-${stamp}`, description: 'd', category: 'T', price: 1180, instructorId: instructor.id, status: 'PUBLISHED' } });
    studentId = student.id;
    courseId = course.id;
    // Fake Razorpay API: orders and payment lookups
    global.fetch = vi.fn(async (url: any, init: any) => {
      const u = String(url);
      if (u.endsWith('/orders')) return new Response(JSON.stringify({ id: `order_${stamp}`, amount: JSON.parse(init.body).amount }), { status: 200 });
      if (u.includes('/payments/pay_good')) return new Response(JSON.stringify({ id: 'pay_good', order_id: `order_${stamp}`, amount: 118000, status: 'captured', method: 'upi' }), { status: 200 });
      return new Response(JSON.stringify({ error: { description: 'not found' } }), { status: 404 });
    }) as any;
  });

  afterAll(async () => {
    global.fetch = realFetch;
    config.payment.razorpay.keyId = '';
    config.payment.razorpay.keySecret = '';
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `${stamp}@t.dev` } } });
  });

  it('uses Razorpay whenever keys are configured, whatever the browser asks for', async () => {
    const order: any = await paymentService.createEnrollmentOrder(studentId, courseId, 'MOCK' as any);
    expect(order.provider).toBe('RAZORPAY');
    expect(order.checkoutPayload.amount).toBe(118000);
    paymentId = order.paymentId;
  });

  it('rejects a forged checkout signature and accepts the real one', async () => {
    await expect(paymentService.verifyAndCompleteEnrollment(paymentId, `order_${stamp}`, 'forged', studentId, 'pay_good')).rejects.toThrow(/verification failed/);
    const sig = crypto.createHmac('sha256', 'rzp_test_secret').update(`order_${stamp}|pay_good`).digest('hex');
    const result: any = await paymentService.verifyAndCompleteEnrollment(paymentId, `order_${stamp}`, sig, studentId, 'pay_good');
    expect(result.payment.status).toBe('COMPLETED');
    expect(result.enrollment.accessStatus).toBe('ACTIVE');
    // Webhook for the same payment afterwards is a no-op
    await paymentService.handleRazorpayWebhook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_good', order_id: `order_${stamp}`, amount: 118000, method: 'upi' } } } });
    expect(await prisma.invoice.count({ where: { paymentId } })).toBe(1);
  });

  it('checks webhook signatures against the raw body', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const good = crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex');
    expect(RazorpayProvider.verifyWebhook(Buffer.from(body), good)).toBe(true);
    expect(RazorpayProvider.verifyWebhook(Buffer.from(body + ' '), good)).toBe(false);
    expect(RazorpayProvider.verifyWebhook(Buffer.from(body), undefined)).toBe(false);
  });

  it('splits GST-inclusive prices into CGST+SGST or IGST', () => {
    expect(computeGst(1180, 18, true)).toEqual({ taxable: 1000, cgst: 90, sgst: 90, igst: 0, tax: 180 });
    expect(computeGst(1180, 18, false)).toEqual({ taxable: 1000, cgst: 0, sgst: 0, igst: 180, tax: 180 });
    const t = computeGst(4999, 18, true);
    expect(Math.round((t.taxable + t.cgst + t.sgst) * 100) / 100).toBe(4999);
    expect(financialYear(new Date('2027-03-31'))).toBe('2026-27');
    expect(financialYear(new Date('2027-04-01'))).toBe('2027-28');
  });
});
