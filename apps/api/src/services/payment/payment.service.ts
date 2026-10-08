import { prisma } from '../../lib/prisma.js';
import { IPaymentProvider } from './payment-provider.interface.js';
import { MockPaymentProvider } from './mock-payment.provider.js';
import { RazorpayProvider } from './razorpay.provider.js';
import { PaymentProvider, PaymentStatus, EnrollmentStatus, RegistrationStatus, DeliveryMode } from '@academy/shared';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { eventBus } from '../../events/event-bus.js';

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

    const providerName = data.provider || PaymentProvider.MOCK;
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
        },
      },
    });

    const order = await providerInstance.createOrder({
      amount: price,
      currency: course.currency,
      courseId: course.id,
      studentId: registration.id,
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
  async verifyRegistrationPayment(registrationId: string, providerRef?: string, signature?: string) {
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

    const providerInstance = this.getProvider('MOCK');
    const result = await providerInstance.verifyPayment({
      paymentId: registration.id,
      providerRef: providerRef || `txn_${Date.now()}`,
      signature,
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
      provider: 'MOCK',
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

  async createEnrollmentOrder(studentId: string, courseId: string, provider: PaymentProvider = PaymentProvider.MOCK) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

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

    const providerInstance = this.getProvider(provider);
    const order = await providerInstance.createOrder({
      amount: course.price,
      currency: course.currency,
      courseId,
      studentId,
    });

    // Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        studentId,
        courseId,
        provider,
        amount: course.price,
        currency: course.currency,
        status: PaymentStatus.PENDING,
        providerRef: order.providerRef,
        metadata: (order.checkoutPayload as any) || {},
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

  async verifyAndCompleteEnrollment(paymentId: string, providerRef?: string, signature?: string, requesterId?: string) {
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
    const result = await providerInstance.verifyPayment({
      paymentId,
      providerRef: providerRef || payment.providerRef || undefined,
      signature,
    });

    if (!result.isVerified) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestError('Payment verification failed');
    }

    // Update payment to COMPLETED
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        providerRef: result.providerRef,
      },
    });

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

    return {
      payment: updatedPayment,
      enrollment,
    };
  }
}

export const paymentService = new PaymentService();

