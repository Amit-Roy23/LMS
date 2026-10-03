import { IPaymentProvider, CreateOrderParams, OrderResult, VerifyPaymentParams, VerificationResult } from './payment-provider.interface.js';
import { PaymentProvider, PaymentStatus } from '@academy/shared';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import crypto from 'crypto';

export class RazorpayProvider implements IPaymentProvider {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = config.payment.razorpay.keyId;
    this.keySecret = config.payment.razorpay.keySecret;
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    // TODO(client-requirement): Use official razorpay SDK instance once live API keys are provided
    logger.info({ params }, 'Creating Razorpay order stub');
    const orderId = `rzp_ord_${Date.now()}`;
    return {
      orderId,
      amount: params.amount,
      currency: params.currency,
      provider: PaymentProvider.RAZORPAY,
      providerRef: orderId,
      status: PaymentStatus.PENDING,
      checkoutPayload: {
        key: this.keyId || 'rzp_test_placeholder',
        order_id: orderId,
        amount: Math.round(params.amount * 100), // in paise/cents
        currency: params.currency,
        name: 'Online Creative & IT Academy',
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult> {
    // TODO(client-requirement): Verify signature using crypto HMAC SHA256 when Razorpay webhook or client returns signature
    if (this.keySecret && params.signature && params.providerRef) {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${params.providerRef}|${params.paymentId}`)
        .digest('hex');

      const isVerified = expectedSignature === params.signature;
      return {
        isVerified,
        status: isVerified ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        providerRef: params.providerRef,
      };
    }

    // Fallback in test mode
    return {
      isVerified: true,
      status: PaymentStatus.COMPLETED,
      providerRef: params.providerRef || `rzp_pay_${Date.now()}`,
    };
  }
}
