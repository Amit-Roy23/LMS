import { prisma } from '../../lib/prisma.js';
import { IPaymentProvider } from './payment-provider.interface.js';
import { MockPaymentProvider } from './mock-payment.provider.js';
import { RazorpayProvider } from './razorpay.provider.js';
import { PaymentProvider, PaymentStatus, EnrollmentStatus } from '@academy/shared';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

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

  async createEnrollmentOrder(studentId: string, courseId: string, provider: PaymentProvider = PaymentProvider.MOCK) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check if already actively enrolled
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
        metadata: order.checkoutPayload || {},
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

    return {
      payment: updatedPayment,
      enrollment,
    };
  }
}

export const paymentService = new PaymentService();
