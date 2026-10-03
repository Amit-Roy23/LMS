import { PaymentProvider, PaymentStatus } from '@academy/shared';

export interface CreateOrderParams {
  amount: number;
  currency: string;
  courseId: string;
  studentId: string;
  metadata?: Record<string, any>;
}

export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerRef?: string;
  status: PaymentStatus;
  checkoutPayload?: Record<string, any>;
}

export interface VerifyPaymentParams {
  paymentId: string;
  providerRef?: string;
  signature?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  isVerified: boolean;
  status: PaymentStatus;
  providerRef: string;
  rawResponse?: any;
}

export interface IPaymentProvider {
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult>;
}
