import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors.js';
import { normalizePhone } from '../lib/phone.js';
import { otpService } from './otp.service.js';
import { notificationService } from './notification/notification.service.js';
import { NotificationChannel } from '@academy/shared';
import { logger } from '../lib/logger.js';

/**
 * A student's registered mobile number is their login and OTP channel, so it can only be
 * changed through a request that the student confirms with an OTP and an admin approves.
 */
export class ChangeRequestService {
  async requestPhoneOtp(userId: string, newPhoneRaw: string) {
    const newPhone = normalizePhone(newPhoneRaw);
    if (!newPhone) throw new BadRequestError('Please enter a valid 10-digit mobile number');
    const [user, taken, pending] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
      prisma.user.findUnique({ where: { phone: newPhone }, select: { id: true } }),
      prisma.changeRequest.findFirst({ where: { userId, type: 'PHONE', status: 'PENDING' } }),
    ]);
    if (user?.phone === newPhone) throw new BadRequestError('This is already your registered mobile number');
    if (taken) throw new BadRequestError('This mobile number is already registered to another account');
    if (pending) throw new ConflictError('You already have a mobile number change waiting for approval');
    return otpService.issue({ purpose: 'PHONE_CHANGE', target: newPhone, userId });
  }

  async submitPhoneChange(userId: string, params: { challengeId: string; code: string; reason?: string }) {
    const challenge = await otpService.verify({ challengeId: params.challengeId, code: params.code, purpose: 'PHONE_CHANGE', userId });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    const pending = await prisma.changeRequest.findFirst({ where: { userId, type: 'PHONE', status: 'PENDING' } });
    if (pending) throw new ConflictError('You already have a mobile number change waiting for approval');
    return prisma.changeRequest.create({
      data: {
        userId,
        type: 'PHONE',
        oldValue: user?.phone || null,
        newValue: challenge.target,
        reason: params.reason?.slice(0, 500) || null,
      },
    });
  }

  async myRequests(userId: string) {
    return prisma.changeRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 });
  }

  async cancel(userId: string, id: string) {
    const r = await prisma.changeRequest.findFirst({ where: { id, userId, status: 'PENDING' } });
    if (!r) throw new NotFoundError('Pending request not found');
    return prisma.changeRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async list(status?: string) {
    return prisma.changeRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true, studentId: true, phone: true } },
        reviewedBy: { select: { name: true } },
      },
    });
  }

  async decide(id: string, reviewerId: string, approve: boolean, note?: string) {
    const request = await prisma.changeRequest.findUnique({ where: { id }, include: { user: true } });
    if (!request || request.status !== 'PENDING') throw new NotFoundError('Pending request not found');

    if (approve) {
      const taken = await prisma.user.findUnique({ where: { phone: request.newValue }, select: { id: true } });
      if (taken && taken.id !== request.userId) {
        throw new ConflictError('This mobile number has since been registered to another account');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (approve) {
        await tx.user.update({ where: { id: request.userId }, data: { phone: request.newValue } });
        await tx.studentProfile.updateMany({ where: { userId: request.userId }, data: { phone: request.newValue } });
      }
      const r = await tx.changeRequest.update({
        where: { id },
        data: { status: approve ? 'APPROVED' : 'REJECTED', reviewNote: note || null, reviewedById: reviewerId, reviewedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: approve ? 'PHONE_CHANGE_APPROVED' : 'PHONE_CHANGE_REJECTED',
          entityType: 'User',
          entityId: request.userId,
          before: { phone: request.oldValue },
          after: approve ? { phone: request.newValue } : undefined,
          details: { requestId: id, note: note || null },
        },
      });
      return r;
    });

    notificationService
      .enqueueNotification({
        to: request.user.email,
        channel: NotificationChannel.EMAIL,
        templateKey: 'phone_change_decision',
        userId: request.userId,
        variables: {
          studentName: request.user.name,
          newPhone: request.newValue,
          decision: approve ? 'approved' : 'declined',
          note: note ? `Note from the academy: ${note}` : approve ? 'Use your new number to sign in from now on.' : '',
          loginUrl: `${config.clientUrl}/login`,
        },
      })
      .catch((err) => logger.error({ err }, 'Failed to send phone change decision'));

    return updated;
  }
}

export const changeRequestService = new ChangeRequestService();
