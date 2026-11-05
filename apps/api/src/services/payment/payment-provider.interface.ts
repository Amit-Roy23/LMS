import { PaymentProvider, PaymentStatus } from '@academy/shared';

export interface CreateOrderParams {
  amount: number;
  currency: string;
  courseId: string;
  studentId: string;
  /** Our own reference, shown in the gateway dashboard (receipt). */
  receipt?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
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
  /** Our Payment / Registration id */
  paymentId: string;
  /** Gateway order id (Razorpay: order_xxx) */
  providerRef?: string;
  /** Gateway payment id returned by checkout (Razorpay: pay_xxx) */
  providerPaymentId?: string;
  signature?: string;
  /** Amount we expect to have been paid, in major units (INR) */
  expectedAmount?: number;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  isVerified: boolean;
  status: PaymentStatus;
  providerRef: string;
  providerPaymentId?: string;
  method?: string;
  rawResponse?: any;
}

export interface RefundResult {
  refundId: string;
  status: string;
  rawResponse?: any;
}

export interface IPaymentProvider {
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult>;
  refund?(providerPaymentId: string, amount: number, notes?: Record<string, string>): Promise<RefundResult>;
}
