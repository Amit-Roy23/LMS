import crypto from 'crypto';
import {
  IPaymentProvider,
  CreateOrderParams,
  OrderResult,
  VerifyPaymentParams,
  VerificationResult,
  RefundResult,
} from './payment-provider.interface.js';
import { PaymentProvider, PaymentStatus } from '@academy/shared';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { AppError, BadRequestError } from '../../lib/errors.js';

const API = 'https://api.razorpay.com/v1';

/** Constant-time comparison of two hex signatures. */
function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a || '', 'utf8');
  const bb = Buffer.from(b || '', 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Razorpay Orders API + Checkout. Flow:
 *  1. createOrder: server creates the order with the server-side price
 *  2. browser opens Razorpay Checkout with the order id
 *  3. verifyPayment: server checks the checkout signature HMAC(order_id|payment_id) and
 *     fetches the payment from Razorpay to confirm it is captured for the right order and amount
 *  4. the payment.captured / order.paid webhook confirms the same payment if the browser closed
 */
export class RazorpayProvider implements IPaymentProvider {
  get keyId() {
    return config.payment.razorpay.keyId;
  }
  private get keySecret() {
    return config.payment.razorpay.keySecret;
  }

  isConfigured() {
    return Boolean(this.keyId && this.keySecret);
  }

  private async request(method: string, path: string, body?: any) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      logger.error({ status: res.status, error: data?.error }, 'Razorpay API error');
      throw new AppError(data?.error?.description || 'Payment gateway error', 502, 'PAYMENT_GATEWAY_ERROR');
    }
    return data;
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    if (!this.isConfigured()) {
      throw new AppError('Online payments are not configured yet. Please contact the academy.', 503, 'PAYMENTS_NOT_CONFIGURED');
    }
    const amountPaise = Math.round(params.amount * 100);
    const order = await this.request('POST', '/orders', {
      amount: amountPaise,
      currency: params.currency,
      receipt: (params.receipt || `${params.courseId}`).slice(0, 40),
      notes: { courseId: params.courseId, studentId: params.studentId },
    });
    return {
      orderId: order.id,
      amount: params.amount,
      currency: params.currency,
      provider: PaymentProvider.RAZORPAY,
      providerRef: order.id,
      status: PaymentStatus.PENDING,
      checkoutPayload: {
        provider: 'RAZORPAY',
        key: this.keyId,
        order_id: order.id,
        amount: amountPaise,
        currency: params.currency,
        name: 'ADSIGN Skill Academy',
        description: params.description,
        prefill: params.prefill,
        theme: { color: '#0063AD' },
      },
    };
  }

  /** Checkout signature check, then confirm the payment with Razorpay itself. */
  async verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult> {
    const fail = (reason: string): VerificationResult => {
      logger.warn({ paymentId: params.paymentId, reason }, 'Razorpay verification failed');
      return { isVerified: false, status: PaymentStatus.FAILED, providerRef: params.providerRef || '' };
    };
    if (!this.isConfigured()) return fail('not configured');
    if (!params.providerRef || !params.providerPaymentId || !params.signature) return fail('missing checkout fields');

    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${params.providerRef}|${params.providerPaymentId}`)
      .digest('hex');
    if (!safeEqualHex(expected, params.signature)) return fail('signature mismatch');

    const payment = await this.request('GET', `/payments/${params.providerPaymentId}`);
    if (payment.order_id !== params.providerRef) return fail('order mismatch');
    if (params.expectedAmount !== undefined && payment.amount !== Math.round(params.expectedAmount * 100)) return fail('amount mismatch');
    if (payment.status === 'authorized') {
      // Accounts without auto-capture: capture now so the money is settled
      await this.request('POST', `/payments/${payment.id}/capture`, { amount: payment.amount, currency: payment.currency });
    } else if (payment.status !== 'captured') {
      return fail(`payment status ${payment.status}`);
    }
    return {
      isVerified: true,
      status: PaymentStatus.COMPLETED,
      providerRef: params.providerRef,
      providerPaymentId: payment.id,
      method: payment.method,
      rawResponse: { id: payment.id, method: payment.method, email: payment.email, contact: payment.contact },
    };
  }

  async refund(providerPaymentId: string, amount: number, notes?: Record<string, string>): Promise<RefundResult> {
    if (!this.isConfigured()) throw new BadRequestError('Razorpay is not configured');
    const refund = await this.request('POST', `/payments/${providerPaymentId}/refund`, {
      amount: Math.round(amount * 100),
      notes,
    });
    return { refundId: refund.id, status: refund.status, rawResponse: refund };
  }

  /** Validates the X-Razorpay-Signature header of a webhook against the raw request body. */
  static verifyWebhook(rawBody: Buffer | string, signature: string | undefined): boolean {
    const secret = config.payment.razorpay.webhookSecret;
    if (!secret || !signature || !rawBody) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
  }
}
