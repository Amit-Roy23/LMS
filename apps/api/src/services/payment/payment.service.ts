import { prisma } from '../../lib/prisma.js';
import { IPaymentProvider } from './payment-provider.interface.js';
import { MockPaymentProvider } from './mock-payment.provider.js';
import { RazorpayProvider } from './razorpay.provider.js';
import { PaymentProvider, PaymentStatus, EnrollmentStatus, RegistrationStatus, DeliveryMode } from '@academy/shared';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { eventBus } from '../../events/event-bus.js';
import { config } from '../../config/env.js';
import { invoiceService } from '../invoice.service.js';
import { isIndianState } from '../../lib/indian-states.js';

export interface BillingDetails {
  name?: string;
  state?: string;
  gstin?: string;
  address?: string;
}

function cleanBilling(b?: BillingDetails | null): BillingDetails {
  if (!b) return {};
  const gstin = (b.gstin || '').toUpperCase().replace(/\s/g, '');
  return {
    ...(b.name ? { name: String(b.name).slice(0, 120) } : {}),
    ...(isIndianState(b.state) ? { state: b.state } : {}),
    ...(/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin) ? { gstin } : {}),
    ...(b.address ? { address: String(b.address).slice(0, 300) } : {}),
  };
}

class PaymentService {
  private providers: Map<string, IPaymentProvider> | null = null;

  private getProvidersMap(): Map<string, IPaymentProvider> {
    if (!this.providers) {
      this.providers = new Map();
      this.providers.set('MOCK', new MockPaymentProvider());
      this.providers.set('RAZORPAY', new RazorpayProvider());
    }
    return this.providers;
  }

  /**
   * The gateway is chosen by the server, never by the browser: Razorpay when its keys are set,
   * otherwise PAYMENT_PROVIDER (MOCK only for demos and local development).
   */
  activeProviderName(): PaymentProvider {
    const rzp = this.getProvidersMap().get('RAZORPAY') as RazorpayProvider;
    if (rzp.isConfigured()) return PaymentProvider.RAZORPAY;
    return (config.payment.defaultProvider || 'MOCK').toUpperCase() === 'RAZORPAY' ? PaymentProvider.RAZORPAY : PaymentProvider.MOCK;
  }

  /** Public checkout configuration for the browser. */
  checkoutConfig() {
    const provider = this.activeProviderName();
    return { provider, keyId: provider === PaymentProvider.RAZORPAY ? config.payment.razorpay.keyId : null, testMode: provider === PaymentProvider.MOCK };
  }

  getProvider(provider: PaymentProvider | string = 'MOCK'): IPaymentProvider {
    const key = (provider || 'MOCK').toString();
    const instance = this.getProvidersMap().get(key);
    if (!instance) {
      throw new BadRequestError(`Payment provider ${provider} is not supported`);
    }
    return instance;
  }

  /**
   * Create an admission order for a new / existing registration
   */
  async createRegistrationOrder(data: {
    applicantName: string;
    email: string;
    phone: string;
    whatsappNumber?: string | null;
    courseId: string;
    batchId?: string | null;
    mode?: DeliveryMode;
    provider?: PaymentProvider;
    city?: string;
    education?: string;
  }) {
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
      include: { batches: true },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const price = data.mode === DeliveryMode.LIVE && course.livePrice
      ? Number(course.livePrice)
      : course.price;

    const providerName = this.activeProviderName();
    const providerInstance = this.getProvider(providerName);

    // Create Registration Record (status PENDING_PAYMENT)
    const registration = await prisma.registration.create({
      data: {
        applicantName: data.applicantName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone.trim(),
        whatsappNumber: data.whatsappNumber || null,
        courseId: course.id,
        batchId: data.batchId || null,
        mode: data.mode || DeliveryMode.RECORDED,
        amount: price,
        currency: course.currency,
        status: RegistrationStatus.PENDING_PAYMENT,
        metadata: {
          city: data.city || null,
          education: data.education || null,
          provider: providerName,
        },
      },
    });

    const order = await providerInstance.createOrder({
      amount: price,
      currency: course.currency,
      courseId: course.id,
      studentId: registration.id,
      receipt: `reg_${registration.id.slice(0, 30)}`,
      description: course.title,
      prefill: { name: data.applicantName, email: data.email, contact: data.phone },
    });
    await prisma.registration.update({
      where: { id: registration.id },
      data: { metadata: { ...((registration.metadata as any) || {}), orderId: order.providerRef } },
    });

    return {
      registrationId: registration.id,
      course: {
        id: course.id,
        title: course.title,
        price,
        currency: course.currency,
      },
      ...order,
    };
  }

  /**
   * Verify and complete an admission registration payment -> triggers payment.succeeded
   */
  async verifyRegistrationPayment(registrationId: string, providerRef?: string, signature?: string, providerPaymentId?: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { course: true, batch: true },
    });

    if (!registration) {
      throw new NotFoundError('Registration not found');
    }

    // Idempotency: if already paid/provisioned
    if (registration.status === RegistrationStatus.ACCOUNT_CREATED || registration.status === RegistrationStatus.PAID) {
      return {
        success: true,
        registrationId: registration.id,
        status: registration.status,
      };
    }

    const meta = (registration.metadata as Record<string, any>) || {};
    const providerName = (meta.provider || 'MOCK') as PaymentProvider;
    if (providerName !== PaymentProvider.MOCK && providerRef && meta.orderId && providerRef !== meta.orderId) {
      throw new BadRequestError('Payment does not match this admission');
    }
    const providerInstance = this.getProvider(providerName);
    const result = await providerInstance.verifyPayment({
      paymentId: registration.id,
      providerRef: providerName === PaymentProvider.MOCK ? providerRef || `txn_${Date.now()}` : meta.orderId,
      providerPaymentId,
      signature,
      expectedAmount: registration.amount,
    });

    if (!result.isVerified) {
      await prisma.registration.update({
        where: { id: registrationId },
        data: { status: RegistrationStatus.CANCELLED },
      });
      throw new BadRequestError('Payment verification failed');
    }

    // Update registration to PAID
    const updatedRegistration = await prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.PAID,
        paymentId: result.providerRef,
      },
    });

    logger.info({ registrationId, paymentId: result.providerRef }, 'Registration payment verified');

    // Emit payment.succeeded domain event!
    await eventBus.emit('payment.succeeded', {
      paymentId: result.providerRef,
      registrationId: updatedRegistration.id,
      courseId: updatedRegistration.courseId,
      batchId: updatedRegistration.batchId,
      mode: updatedRegistration.mode,
      amount: updatedRegistration.amount,
      currency: updatedRegistration.currency,
      provider: providerName,
      providerRef: result.providerRef,
      applicantName: updatedRegistration.applicantName,
      email: updatedRegistration.email,
      phone: updatedRegistration.phone,
      whatsappNumber: updatedRegistration.whatsappNumber,
      metadata: (updatedRegistration.metadata as Record<string, any>) || {},
      occurredAt: new Date(),
    });

    return {
      success: true,
      registration: updatedRegistration,
      message: 'Payment verified and admission provisioning initiated',
    };
  }

  async createEnrollmentOrder(studentId: string, courseId: string, _requestedProvider?: PaymentProvider, billing?: BillingDetails) {
    const provider = this.activeProviderName();
    const [course, student] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.user.findUnique({ where: { id: studentId }, select: { name: true, email: true, phone: true } }),
    ]);

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (existingEnrollment && existingEnrollment.status === EnrollmentStatus.ACTIVE) {
      throw new BadRequestError('You are already actively enrolled in this course');
    }

    if (course.deletedAt || course.status !== 'PUBLISHED') {
      throw new BadRequestError('This course is not open for enrolment');
    }

    const providerInstance = this.getProvider(provider);
    const order = await providerInstance.createOrder({
      amount: course.price,
      currency: course.currency,
      courseId,
      studentId,
      receipt: `enr_${studentId.slice(0, 12)}_${Date.now()}`,
      description: course.title,
      prefill: { name: student?.name, email: student?.email, contact: student?.phone || undefined },
    });

    // Create Payment Record (amount always from the server-side course price)
    const payment = await prisma.payment.create({
      data: {
        studentId,
        courseId,
        provider,
        amount: course.price,
        currency: course.currency,
        status: PaymentStatus.PENDING,
        providerRef: order.providerRef,
        metadata: { checkout: (order.checkoutPayload as any) || {}, billing: cleanBilling(billing) } as any,
      },
    });

    return {
      paymentId: payment.id,
      course: {
        id: course.id,
        title: course.title,
        price: course.price,
        currency: course.currency,
      },
      ...order,
    };
  }

  async verifyAndCompleteEnrollment(
    paymentId: string,
    providerRef?: string,
    signature?: string,
    requesterId?: string,
    providerPaymentId?: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { course: true, student: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment record not found');
    }

    if (requesterId && payment.studentId !== requesterId) {
      throw new ForbiddenError('This payment does not belong to your account');
    }

    // Idempotent: a payment that was already completed just returns its enrollment
    if (payment.status === PaymentStatus.COMPLETED) {
      const existing = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: payment.studentId, courseId: payment.courseId } },
      });
      if (existing) return { payment, enrollment: existing };
    }

    const providerInstance = this.getProvider(payment.provider as PaymentProvider);
    const isMock = payment.provider === PaymentProvider.MOCK;
    const result = await providerInstance.verifyPayment({
      paymentId,
      // The gateway order id always comes from our own record, never from the browser
      providerRef: isMock ? providerRef || payment.providerRef || undefined : payment.providerRef || undefined,
      providerPaymentId,
      signature,
      expectedAmount: payment.amount,
    });

    if (!result.isVerified) {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestError('Payment verification failed');
    }

    return this.completePayment(payment.id, result.providerRef, result.providerPaymentId, result.method);
  }

  /**
   * Marks a payment completed and grants course access. Shared by the browser verification and
   * the Razorpay webhook, and safe to run twice (only the first run does the work).
   */
  async completePayment(paymentId: string, providerRef?: string, providerPaymentId?: string, method?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { student: true } });
    if (!payment) throw new NotFoundError('Payment record not found');
    const meta = (payment.metadata as Record<string, any>) || {};

    const claimed = await prisma.payment.updateMany({
      where: { id: paymentId, status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] } },
      data: {
        status: PaymentStatus.COMPLETED,
        ...(providerRef ? { providerRef } : {}),
        metadata: { ...meta, ...(providerPaymentId ? { providerPaymentId } : {}), ...(method ? { method } : {}), paidAt: new Date().toISOString() },
      },
    });
    const updatedPayment = (await prisma.payment.findUnique({ where: { id: paymentId } }))!;
    if (claimed.count === 0) {
      const existing = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: payment.studentId, courseId: payment.courseId } },
      });
      return { payment: updatedPayment, enrollment: existing };
    }

    // Upsert Enrollment
    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: payment.studentId,
          courseId: payment.courseId,
        },
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.PAID,
        accessStatus: 'ACTIVE',
        paymentId: payment.id,
        enrolledAt: new Date(),
      },
      create: {
        studentId: payment.studentId,
        courseId: payment.courseId,
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.PAID,
        accessStatus: 'ACTIVE',
        paymentId: payment.id,
        enrolledAt: new Date(),
      },
    });

    logger.info({ enrollmentId: enrollment.id, studentId: payment.studentId, courseId: payment.courseId }, 'Student enrolled successfully');

    // Emit payment.succeeded
    await eventBus.emit('payment.succeeded', {
      paymentId: updatedPayment.id,
      studentId: payment.studentId,
      courseId: payment.courseId,
      mode: DeliveryMode.RECORDED,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      provider: updatedPayment.provider,
      providerRef: updatedPayment.providerRef,
      applicantName: payment.student.name,
      email: payment.student.email,
      phone: payment.student.phone || '',
      occurredAt: new Date(),
    });

    await invoiceService.issueForPayment(updatedPayment.id).catch((err) => logger.error({ err, paymentId }, 'Invoice issue failed'));

    return {
      payment: updatedPayment,
      enrollment,
    };
  }

  /** Razorpay webhook: confirms payments even if the student closed the browser, and records refunds/failures. */
  async handleRazorpayWebhook(event: any) {
    const type = event?.event as string;
    const entity = event?.payload?.payment?.entity;
    const orderId = entity?.order_id || event?.payload?.order?.entity?.id;
    if (!orderId) return { handled: false, reason: 'no order id' };

    const payment = await prisma.payment.findFirst({ where: { providerRef: orderId } });
    if (!payment) {
      // Admission (registration) payments are matched by the stored order id
      const registration = await prisma.registration.findFirst({ where: { metadata: { path: ['orderId'], equals: orderId } } });
      if (registration && (type === 'payment.captured' || type === 'order.paid') && entity) {
        if (entity.amount !== Math.round(registration.amount * 100)) return { handled: false, reason: 'amount mismatch' };
        await this.markRegistrationPaidFromWebhook(registration.id, orderId, entity.id);
        return { handled: true, registrationId: registration.id };
      }
      return { handled: false, reason: 'unknown order' };
    }

    if ((type === 'payment.captured' || type === 'order.paid') && entity) {
      if (entity.amount !== Math.round(payment.amount * 100)) {
        logger.error({ paymentId: payment.id, amount: entity.amount }, 'Webhook amount mismatch');
        return { handled: false, reason: 'amount mismatch' };
      }
      await this.completePayment(payment.id, orderId, entity.id, entity.method);
      return { handled: true, paymentId: payment.id };
    }
    if (type === 'payment.failed') {
      await prisma.payment.updateMany({ where: { id: payment.id, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.FAILED } });
      return { handled: true, paymentId: payment.id };
    }
    if (type === 'refund.processed') {
      await prisma.payment.updateMany({ where: { id: payment.id, status: PaymentStatus.COMPLETED }, data: { status: PaymentStatus.REFUNDED } });
      return { handled: true, paymentId: payment.id };
    }
    return { handled: false, reason: `ignored ${type}` };
  }

  private async markRegistrationPaidFromWebhook(registrationId: string, orderId: string, providerPaymentId: string) {
    const registration = await prisma.registration.findUnique({ where: { id: registrationId } });
    if (!registration || registration.status === RegistrationStatus.PAID || registration.status === RegistrationStatus.ACCOUNT_CREATED) return;
    const updated = await prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.PAID, paymentId: orderId, metadata: { ...((registration.metadata as any) || {}), providerPaymentId } },
    });
    await eventBus.emit('payment.succeeded', {
      paymentId: orderId,
      registrationId: updated.id,
      courseId: updated.courseId,
      batchId: updated.batchId,
      mode: updated.mode,
      amount: updated.amount,
      currency: updated.currency,
      provider: PaymentProvider.RAZORPAY,
      providerRef: orderId,
      applicantName: updated.applicantName,
      email: updated.email,
      phone: updated.phone,
      whatsappNumber: updated.whatsappNumber,
      metadata: (updated.metadata as Record<string, any>) || {},
      occurredAt: new Date(),
    });
  }

  /** Refunds a completed payment (main admin with PIN + OTP) and suspends the course access it bought. */
  async refund(paymentId: string, reason: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED) throw new BadRequestError('Only completed payments can be refunded');
    const meta = (payment.metadata as Record<string, any>) || {};

    let refundInfo: Record<string, any> = { simulated: true };
    if (payment.provider === PaymentProvider.RAZORPAY) {
      const rzp = this.getProvider('RAZORPAY');
      if (!meta.providerPaymentId || !rzp.refund) throw new BadRequestError('Razorpay payment id missing; refund from the Razorpay dashboard');
      const r = await rzp.refund(meta.providerPaymentId, payment.amount, { reason: reason.slice(0, 200) });
      refundInfo = { refundId: r.refundId, status: r.status };
    }

    const [updated] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REFUNDED, metadata: { ...meta, refund: { ...refundInfo, reason, at: new Date().toISOString() } } },
      }),
      prisma.enrollment.updateMany({
        where: { paymentId },
        data: { status: EnrollmentStatus.CANCELLED, accessStatus: 'SUSPENDED', paymentStatus: PaymentStatus.REFUNDED },
      }),
    ]);
    return updated;
  }
}

export const paymentService = new PaymentService();

