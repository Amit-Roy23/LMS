import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import {
  generateStudentId,
  generateTemporaryPassword,
  generateVerificationToken,
  maskRecipient,
} from '../lib/student-id.js';
import { eventBus } from '../events/event-bus.js';
import { PaymentSucceededEvent } from '../events/events.interface.js';
import {
  Role,
  RegistrationStatus,
  EnrollmentStatus,
  PaymentStatus,
  AccessStatus,
  ModuleStatus,
  NotificationChannel,
} from '@academy/shared';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import { notificationService } from './notification/notification.service.js';

export class ProvisioningService {
  /**
   * Subscriber handler for payment.succeeded domain event
   */
  async handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    logger.info(
      {
        paymentId: event.paymentId,
        registrationId: event.registrationId,
        email: maskRecipient(event.email),
      },
      'Provisioning subscriber handling payment.succeeded event'
    );

    try {
      if (event.registrationId) {
        await this.provisionRegistration(event.registrationId);
      } else {
        await this.provisionFromPaymentDirectly(event);
      }
    } catch (err: any) {
      logger.error(
        {
          error: err.message,
          stack: err.stack,
          paymentId: event.paymentId,
          registrationId: event.registrationId,
        },
        'Account provisioning failed for payment.succeeded event'
      );
      // Do not throw here so other subscribers (if any) are not interrupted
    }
  }

  /**
   * Core Idempotent Provisioning Engine (Single Atomic DB Transaction)
   */
  async provisionRegistration(registrationId: string) {
    // 1. Load Registration + Course + Batch
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        course: {
          include: {
            modules: { orderBy: { order: 'asc' } },
          },
        },
        batch: {
          include: {
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    if (!registration) {
      throw new NotFoundError(`Registration ${registrationId} not found`);
    }

    // Idempotency: Ignore if already ACCOUNT_CREATED
    if (registration.status === RegistrationStatus.ACCOUNT_CREATED && registration.userId) {
      logger.info(
        { registrationId, userId: registration.userId },
        'Registration already provisioned (ACCOUNT_CREATED). Skipping to maintain idempotency.'
      );
      return { status: 'ALREADY_PROVISIONED', registrationId, userId: registration.userId };
    }

    const normalizedEmail = registration.email.toLowerCase().trim();
    const normalizedPhone = registration.phone.trim();
    const course = registration.course;
    const batch = registration.batch;

    // Ephemeral variables held only in memory for notification dispatch
    let plainTempPassword: string | undefined;
    let plainSetupToken: string | undefined;
    let isNewUser = false;
    let studentIdToUse: string;

    // 2. Execute in ONE atomic database transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Step A: Find or create User
      let user = await tx.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ],
        },
      });

      if (!user) {
        // New Student Provisioning
        isNewUser = true;
        studentIdToUse = await generateStudentId(tx);
        plainTempPassword = generateTemporaryPassword(14);
        const passwordHash = await bcrypt.hash(plainTempPassword, 10);

        user = await tx.user.create({
          data: {
            name: registration.applicantName,
            email: normalizedEmail,
            phone: normalizedPhone || null,
            studentId: studentIdToUse,
            passwordHash,
            role: Role.STUDENT,
            status: 'ACTIVE',
            mustChangePassword: true,
          },
        });

        // Create StudentProfile
        const regMetadata = (registration.metadata as Record<string, any>) || {};
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            phone: normalizedPhone || null,
            whatsappNumber: registration.whatsappNumber || null,
            city: regMetadata.city || null,
            education: regMetadata.education || null,
          },
        });

        // Setup Link mode: generate 72h single-use token stored as SHA-256 hash
        if (config.notifications.credentialDelivery === 'setup_link') {
          const { plainToken, tokenHash } = generateVerificationToken();
          plainSetupToken = plainToken;
          const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

          await tx.verificationToken.create({
            data: {
              tokenHash,
              userId: user.id,
              type: 'ACCOUNT_SETUP',
              expiresAt,
            },
          });
        }
      } else {
        // Returning student: keep existing user ID and password
        isNewUser = false;
        studentIdToUse = user.studentId || user.email;

        // If user didn't have a studentId before, generate one for them
        if (!user.studentId) {
          studentIdToUse = await generateStudentId(tx);
          await tx.user.update({
            where: { id: user.id },
            data: { studentId: studentIdToUse },
          });
        }
      }

      // Step B: Batch capacity check
      let isOverCapacity = false;
      if (batch) {
        const currentCount = batch._count?.enrollments || 0;
        if (currentCount >= batch.capacity) {
          isOverCapacity = true;
          logger.warn(
            {
              batchId: batch.id,
              batchName: batch.name,
              capacity: batch.capacity,
              currentCount,
              userId: user.id,
            },
            'Batch capacity exceeded; student enrolled and flagged for admin'
          );
        }
      }

      // Step C: Link or create Payment Record
      let linkedPaymentId: string | null = null;
      if (registration.paymentId) {
        try {
          const existingPayment = await tx.payment.findUnique({
            where: { id: registration.paymentId },
          });
          if (existingPayment) {
            linkedPaymentId = existingPayment.id;
          } else {
            const newPayment = await tx.payment.create({
              data: {
                studentId: user.id,
                courseId: course.id,
                provider: 'MOCK',
                amount: registration.amount,
                currency: registration.currency,
                status: PaymentStatus.COMPLETED,
                providerRef: registration.paymentId,
              },
            });
            linkedPaymentId = newPayment.id;
          }
        } catch {
          // If payment lookup fails due to non-uuid string, create payment record
          const newPayment = await tx.payment.create({
            data: {
              studentId: user.id,
              courseId: course.id,
              provider: 'MOCK',
              amount: registration.amount,
              currency: registration.currency,
              status: PaymentStatus.COMPLETED,
              providerRef: registration.paymentId,
            },
          });
          linkedPaymentId = newPayment.id;
        }
      }

      // Step D: Create or Upsert Enrollment
      const enrollment = await tx.enrollment.upsert({
        where: {
          studentId_courseId: {
            studentId: user.id,
            courseId: course.id,
          },
        },
        update: {
          batchId: registration.batchId || null,
          mode: registration.mode,
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
          accessStatus: AccessStatus.ACTIVE,
          paymentId: linkedPaymentId,
          enrolledAt: new Date(),
        },
        create: {
          studentId: user.id,
          courseId: course.id,
          batchId: registration.batchId || null,
          mode: registration.mode,
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
          accessStatus: AccessStatus.ACTIVE,
          paymentId: linkedPaymentId,
          enrolledAt: new Date(),
        },
      });

      // Step D: Initialize Module Progress (first module AVAILABLE, rest LOCKED)
      if (course.modules && course.modules.length > 0) {
        for (let idx = 0; idx < course.modules.length; idx++) {
          const mod = course.modules[idx];
          const initialStatus = idx === 0 ? ModuleStatus.AVAILABLE : ModuleStatus.LOCKED;

          await tx.moduleProgress.upsert({
            where: {
              studentId_moduleId: {
                studentId: user.id,
                moduleId: mod.id,
              },
            },
            update: {}, // Don't reset if already exists
            create: {
              studentId: user.id,
              moduleId: mod.id,
              status: initialStatus,
            },
          });
        }
      }

      // Step E: Update Registration to ACCOUNT_CREATED and link userId
      const updatedMetadata = {
        ...((registration.metadata as Record<string, any>) || {}),
        overCapacityFlag: isOverCapacity,
        provisionedAt: new Date().toISOString(),
      };

      await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: RegistrationStatus.ACCOUNT_CREATED,
          userId: user.id,
          metadata: updatedMetadata,
        },
      });

        return {
          user,
          enrollment,
          isNewUser,
          studentId: studentIdToUse,
          courseTitle: course.title,
          batchName: batch?.name || 'Self-Paced Track',
        };
      },
      { maxWait: 15000, timeout: 25000 }
    );

    logger.info(
      {
        registrationId,
        userId: transactionResult.user.id,
        studentId: transactionResult.studentId,
        isNewUser,
      },
      'Atomic account provisioning transaction committed successfully'
    );

    // 3. Post-Commit Domain Events & Notifications (Failures must NOT roll back provisioning)
    try {
      const loginUrl = `${config.clientUrl}/login`;
      const receiptUrl = `${config.clientUrl}/receipts/${registration.id}`;
      const setupUrl = plainSetupToken
        ? `${config.clientUrl}/reset-password?token=${plainSetupToken}&setup=true`
        : undefined;

      // Emit domain events
      if (isNewUser) {
        await eventBus.emit('account.created', {
          userId: transactionResult.user.id,
          studentId: transactionResult.studentId,
          name: registration.applicantName,
          email: normalizedEmail,
          phone: normalizedPhone,
          whatsappNumber: registration.whatsappNumber,
          tempPassword: plainTempPassword,
          setupToken: plainSetupToken,
          courseId: course.id,
          courseTitle: course.title,
          batchId: registration.batchId,
          batchName: transactionResult.batchName,
          mode: registration.mode,
          isNewAccount: true,
          loginUrl,
          occurredAt: new Date(),
        });
      }

      await eventBus.emit('enrollment.created', {
        enrollmentId: transactionResult.enrollment.id,
        userId: transactionResult.user.id,
        studentId: transactionResult.studentId,
        courseId: course.id,
        courseTitle: course.title,
        batchId: registration.batchId,
        batchName: transactionResult.batchName,
        mode: registration.mode,
        isNewAccount: isNewUser,
        email: normalizedEmail,
        phone: normalizedPhone,
        whatsappNumber: registration.whatsappNumber,
        name: registration.applicantName,
        occurredAt: new Date(),
      });

      // Queue registration confirmation and credentials across configured channels
      await this.queueAdmissionNotifications({
        registration,
        studentId: transactionResult.studentId,
        studentName: registration.applicantName,
        email: normalizedEmail,
        phone: normalizedPhone,
        whatsappNumber: registration.whatsappNumber,
        courseTitle: course.title,
        batchName: transactionResult.batchName,
        mode: registration.mode,
        amount: registration.amount,
        currency: registration.currency,
        paymentId: registration.paymentId || 'DIRECT_MOCK',
        receiptUrl,
        loginUrl,
        tempPassword: plainTempPassword,
        setupUrl,
        isNewUser,
        userId: transactionResult.user.id,
      });
    } catch (notifErr: any) {
      logger.error(
        { error: notifErr.message, registrationId },
        'Post-provisioning notification queuing failed (provisioning remains intact)'
      );
    }

    return {
      success: true,
      registrationId: registration.id,
      userId: transactionResult.user.id,
      studentId: transactionResult.studentId,
      isNewUser,
    };
  }

  /**
   * Provision direct payment (e.g. from /enrollments/checkout)
   */
  async provisionFromPaymentDirectly(event: PaymentSucceededEvent) {
    const course = await prisma.course.findUnique({
      where: { id: event.courseId },
      include: { modules: { orderBy: { order: 'asc' } } },
    });

    if (!course) {
      throw new NotFoundError(`Course ${event.courseId} not found`);
    }

    // Find student
    const student = await prisma.user.findUnique({
      where: { id: event.studentId },
    });

    if (!student) {
      throw new NotFoundError(`User ${event.studentId} not found`);
    }

    // Upsert enrollment & module progress
    await prisma.$transaction(async (tx) => {
      await tx.enrollment.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: course.id,
          },
        },
        update: {
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
          accessStatus: AccessStatus.ACTIVE,
          paymentId: event.paymentId,
        },
        create: {
          studentId: student.id,
          courseId: course.id,
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
          accessStatus: AccessStatus.ACTIVE,
          paymentId: event.paymentId,
        },
      });

      if (course.modules && course.modules.length > 0) {
        for (let idx = 0; idx < course.modules.length; idx++) {
          const mod = course.modules[idx];
          const initialStatus = idx === 0 ? ModuleStatus.AVAILABLE : ModuleStatus.LOCKED;
          await tx.moduleProgress.upsert({
            where: {
              studentId_moduleId: {
                studentId: student.id,
                moduleId: mod.id,
              },
            },
            update: {},
            create: {
              studentId: student.id,
              moduleId: mod.id,
              status: initialStatus,
            },
          });
        }
      }
    });
  }

  /**
   * Queue Admission Notifications across configured channels
   */
  async queueAdmissionNotifications(params: {
    registration: any;
    studentId: string;
    studentName: string;
    email: string;
    phone?: string | null;
    whatsappNumber?: string | null;
    courseTitle: string;
    batchName: string;
    mode: string;
    amount: number;
    currency: string;
    paymentId: string;
    receiptUrl: string;
    loginUrl: string;
    tempPassword?: string;
    setupUrl?: string;
    isNewUser: boolean;
    userId: string;
  }) {
    const configuredChannels = config.notifications.channelsRegistration as NotificationChannel[];
    const locale = 'en';

    // 1. Registration Confirmation
    const confirmationVariables = {
      studentName: params.studentName,
      courseTitle: params.courseTitle,
      batchName: params.batchName,
      mode: params.mode,
      amount: params.amount,
      currency: params.currency,
      paymentId: params.paymentId,
      receiptUrl: params.receiptUrl,
    };

    // 2. Account Credentials (or Course Added for returning students)
    const credentialsVariables = {
      studentName: params.studentName,
      studentId: params.studentId,
      email: params.email,
      loginUrl: params.loginUrl,
      tempPassword: params.tempPassword,
      setupUrl: params.setupUrl,
      courseTitle: params.courseTitle,
      mode: params.mode,
    };

    const credentialsTemplateKey = params.isNewUser ? 'account_credentials' : 'course_added';

    // Dispatch via Email
    if (configuredChannels.includes(NotificationChannel.EMAIL) && params.email) {
      await notificationService.enqueueNotification({
        to: params.email,
        channel: NotificationChannel.EMAIL,
        templateKey: 'registration_confirmation',
        locale,
        variables: confirmationVariables,
        userId: params.userId,
        idempotencyKey: `reg_conf_email_${params.registration.id}`,
      });

      await notificationService.enqueueNotification({
        to: params.email,
        channel: NotificationChannel.EMAIL,
        templateKey: credentialsTemplateKey,
        locale,
        variables: credentialsVariables,
        userId: params.userId,
        idempotencyKey: `cred_email_${params.registration.id}`,
      });
    }

    // Dispatch via WhatsApp
    const waTarget = params.whatsappNumber || params.phone;
    if (configuredChannels.includes(NotificationChannel.WHATSAPP) && waTarget) {
      await notificationService.enqueueNotification({
        to: waTarget,
        channel: NotificationChannel.WHATSAPP,
        templateKey: 'registration_confirmation',
        locale,
        variables: confirmationVariables,
        userId: params.userId,
        idempotencyKey: `reg_conf_wa_${params.registration.id}`,
        fallbackChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      });

      await notificationService.enqueueNotification({
        to: waTarget,
        channel: NotificationChannel.WHATSAPP,
        templateKey: credentialsTemplateKey,
        locale,
        variables: credentialsVariables,
        userId: params.userId,
        idempotencyKey: `cred_wa_${params.registration.id}`,
        fallbackChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      });
    }

    // Dispatch via SMS
    if (configuredChannels.includes(NotificationChannel.SMS) && params.phone) {
      await notificationService.enqueueNotification({
        to: params.phone,
        channel: NotificationChannel.SMS,
        templateKey: 'registration_confirmation',
        locale,
        variables: confirmationVariables,
        userId: params.userId,
        idempotencyKey: `reg_conf_sms_${params.registration.id}`,
      });

      await notificationService.enqueueNotification({
        to: params.phone,
        channel: NotificationChannel.SMS,
        templateKey: credentialsTemplateKey,
        locale,
        variables: credentialsVariables,
        userId: params.userId,
        idempotencyKey: `cred_sms_${params.registration.id}`,
      });
    }
  }

  /**
   * Resend Student Credentials (Admin Action)
   */
  async resendCredentials(studentUserId: string, channel?: NotificationChannel) {
    const student = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: { studentProfile: true },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const { plainToken, tokenHash } = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        tokenHash,
        userId: student.id,
        type: 'ACCOUNT_SETUP',
        expiresAt,
      },
    });

    const setupUrl = `${config.clientUrl}/reset-password?token=${plainToken}&setup=true`;
    const loginUrl = `${config.clientUrl}/login`;

    const variables = {
      studentName: student.name,
      studentId: student.studentId || student.email,
      email: student.email,
      loginUrl,
      setupUrl,
    };

    const targetChannel = channel || NotificationChannel.EMAIL;
    const to =
      targetChannel === NotificationChannel.EMAIL
        ? student.email
        : student.studentProfile?.whatsappNumber || student.phone || student.email;

    await notificationService.enqueueNotification({
      to,
      channel: targetChannel,
      templateKey: 'account_credentials',
      locale: 'en',
      variables,
      userId: student.id,
      idempotencyKey: `resend_cred_${student.id}_${Date.now()}`,
    });

    return {
      message: `Credentials re-sent successfully via ${targetChannel}`,
      studentId: student.studentId,
    };
  }

  /**
   * Reconciliation Cron: Finds PAID registrations without an account for > 5 minutes and retries them
   */
  async runReconciliationJob(): Promise<{ checked: number; recovered: number }> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stalePaidRegistrations = await prisma.registration.findMany({
      where: {
        status: RegistrationStatus.PAID,
        userId: null,
        updatedAt: { lte: fiveMinutesAgo },
      },
      take: 50,
    });

    let recovered = 0;
    for (const reg of stalePaidRegistrations) {
      try {
        logger.info({ registrationId: reg.id }, 'Reconciliation job provisioning stale PAID registration');
        await this.provisionRegistration(reg.id);
        recovered++;
      } catch (err: any) {
        logger.error({ registrationId: reg.id, error: err.message }, 'Reconciliation job failed for registration');
      }
    }

    return { checked: stalePaidRegistrations.length, recovered };
  }
}

export const provisioningService = new ProvisioningService();
