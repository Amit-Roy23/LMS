import { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { NotFoundError } from '../lib/errors.js';
import { describeDevice, detectDeviceKind, getIp, getUserAgent } from '../lib/request-info.js';

const CACHE_TTL_MS = 15_000;
const TOUCH_INTERVAL_MS = 5 * 60_000;

/**
 * Tracks the browsers/phones each account has verified. Students may keep a limited number
 * signed in at once (default: 1 phone + 1 computer); verifying another signs out the oldest.
 */
export class DeviceService {
  private cache = new Map<string, { active: boolean; at: number; touchedAt: number }>();

  async findActive(userId: string, deviceId: string) {
    return prisma.userDevice.findFirst({ where: { userId, deviceId, revokedAt: null } });
  }

  /**
   * Marks a device as verified for the user. With `enforceLimit`, older devices of the same
   * kind beyond the limit are signed out. Returns the device and the labels signed out.
   */
  async trust(userId: string, deviceId: string, req: Request, opts: { enforceLimit: boolean }) {
    const userAgent = getUserAgent(req);
    const kind = detectDeviceKind(userAgent);
    const now = new Date();
    const device = await prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId, kind, label: describeDevice(userAgent), ipAddress: getIp(req) },
      update: { kind, label: describeDevice(userAgent), ipAddress: getIp(req), revokedAt: null, revokedReason: null, trustedAt: now, lastSeenAt: now },
    });
    this.cache.set(device.id, { active: true, at: Date.now(), touchedAt: Date.now() });

    const signedOut: string[] = [];
    if (opts.enforceLimit) {
      const limit = kind === 'MOBILE' ? config.security.deviceLimitMobile : config.security.deviceLimitDesktop;
      const others = await prisma.userDevice.findMany({
        where: { userId, kind, revokedAt: null, id: { not: device.id } },
        orderBy: { lastSeenAt: 'desc' },
      });
      const excess = others.slice(Math.max(0, limit - 1));
      for (const old of excess) {
        await this.revoke(old.id, `Signed out after sign-in on ${device.label}`);
        signedOut.push(old.label);
      }
    }
    return { device, signedOut };
  }

  /** Signs a device out everywhere: its refresh tokens stop working and its access tokens are rejected. */
  async revoke(deviceRowId: string, reason: string) {
    const now = new Date();
    await prisma.$transaction([
      prisma.userDevice.update({ where: { id: deviceRowId }, data: { revokedAt: now, revokedReason: reason } }),
      prisma.refreshToken.updateMany({ where: { deviceSid: deviceRowId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    this.cache.set(deviceRowId, { active: false, at: Date.now(), touchedAt: 0 });
  }

  async revokeForUser(userId: string, deviceRowId: string, reason: string) {
    const device = await prisma.userDevice.findFirst({ where: { id: deviceRowId, userId } });
    if (!device) throw new NotFoundError('Device not found');
    if (!device.revokedAt) await this.revoke(device.id, reason);
  }

  /** Whether the session's device is still signed in (cached briefly to keep requests fast). */
  async isActive(sid: string): Promise<boolean> {
    const hit = this.cache.get(sid);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      this.maybeTouch(sid, hit);
      return hit.active;
    }
    const device = await prisma.userDevice.findUnique({ where: { id: sid }, select: { revokedAt: true } });
    const entry = { active: !!device && !device.revokedAt, at: Date.now(), touchedAt: hit?.touchedAt || 0 };
    this.cache.set(sid, entry);
    this.maybeTouch(sid, entry);
    return entry.active;
  }

  private maybeTouch(sid: string, entry: { active: boolean; touchedAt: number }) {
    if (!entry.active || Date.now() - entry.touchedAt < TOUCH_INTERVAL_MS) return;
    entry.touchedAt = Date.now();
    prisma.userDevice.update({ where: { id: sid }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  async list(userId: string) {
    return prisma.userDevice.findMany({
      where: { userId },
      orderBy: [{ revokedAt: { sort: 'desc', nulls: 'first' } }, { lastSeenAt: 'desc' }],
      take: 20,
      select: { id: true, kind: true, label: true, ipAddress: true, trustedAt: true, lastSeenAt: true, revokedAt: true, revokedReason: true },
    });
  }
}

export const deviceService = new DeviceService();
