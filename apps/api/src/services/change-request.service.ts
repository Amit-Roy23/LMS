import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
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
    if (request.type === 'SOCIAL_LINKS') return this.decideSocialLinks(request, reviewerId, approve, note);

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

  /**
   * Instructor social links: approve all, or only the links listed in `keys`; the rest are
   * dropped. Approved links appear on the public profile at once.
   */
  private async decideSocialLinks(request: any, reviewerId: string, approve: boolean, note?: string, keys?: string[]) {
    const pending: Record<string, string> = JSON.parse(request.newValue || '{}');
    const profile = await prisma.instructorProfile.findUnique({ where: { userId: request.userId } });
    const live = { ...((profile?.socials as Record<string, string>) || {}) };
    const picked = approve ? Object.fromEntries(Object.entries(pending).filter(([k]) => !keys || keys.includes(k))) : {};
    await prisma.$transaction(async (tx) => {
      if (profile) {
        await tx.instructorProfile.update({
          where: { userId: request.userId },
          data: { socials: { ...live, ...picked }, pendingSocials: Prisma.DbNull },
        });
      }
      await tx.changeRequest.update({
        where: { id: request.id },
        data: {
          status: approve && Object.keys(picked).length ? 'APPROVED' : 'REJECTED',
          reviewNote: note || (approve && keys && keys.length < Object.keys(pending).length ? `Approved: ${Object.keys(picked).join(', ')}` : null),
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          actorRole: 'ADMIN',
          action: approve ? 'SOCIAL_LINKS_APPROVED' : 'SOCIAL_LINKS_REJECTED',
          entityType: 'InstructorProfile',
          entityId: profile?.id || null,
          before: live,
          after: approve ? { ...live, ...picked } : undefined,
          details: { requestId: request.id, links: Object.keys(picked) },
        },
      });
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: approve && Object.keys(picked).length ? 'Social links approved' : 'Social links not approved',
          message:
            approve && Object.keys(picked).length
              ? `These links are now on your public profile: ${Object.keys(picked).join(', ')}.`
              : `Your submitted links were not approved.${note ? ` Note: ${note}` : ''}`,
          type: 'SYSTEM' as any,
          link: '/admin/profile',
        },
      });
    });
    return prisma.changeRequest.findUnique({ where: { id: request.id } });
  }

  async decideWithKeys(id: string, reviewerId: string, keys: string[] | undefined, note?: string) {
    const request = await prisma.changeRequest.findUnique({ where: { id }, include: { user: true } });
    if (!request || request.status !== 'PENDING') throw new NotFoundError('Pending request not found');
    if (request.type !== 'SOCIAL_LINKS') return this.decide(id, reviewerId, true, note);
    return this.decideSocialLinks(request, reviewerId, true, note, keys);
  }
}

export const changeRequestService = new ChangeRequestService();
