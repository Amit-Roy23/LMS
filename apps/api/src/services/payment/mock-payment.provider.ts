import { IPaymentProvider, CreateOrderParams, OrderResult, VerifyPaymentParams, VerificationResult } from './payment-provider.interface.js';
import { PaymentProvider, PaymentStatus } from '@academy/shared';

export class MockPaymentProvider implements IPaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const mockRef = `mock_order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId: mockRef,
      amount: params.amount,
      currency: params.currency,
      provider: PaymentProvider.MOCK,
      providerRef: mockRef,
      status: PaymentStatus.PENDING,
      checkoutPayload: {
        provider: 'MOCK',
        orderId: mockRef,
        amount: params.amount,
        currency: params.currency,
        testMode: true,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult> {
    // In mock mode, automatic instant verification for rapid testing & demos
    return {
      isVerified: true,
      status: PaymentStatus.COMPLETED,
      providerRef: params.providerRef || `mock_txn_${Date.now()}`,
      rawResponse: { message: 'Mock payment verified successfully' },
    };
  }
}
