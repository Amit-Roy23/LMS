import crypto from 'crypto';
import { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors.js';
import { getIp, getUserAgent, describeDevice } from '../lib/request-info.js';
import { logger } from '../lib/logger.js';

/** How long a playlist/key link works; the player refreshes it with each lesson load. */
const TOKEN_TTL_SECONDS = 10 * 60;
/** A stream counts as live if its player sent a heartbeat this recently. */
const ACTIVE_WINDOW_MS = 45_000;

interface StreamClaims {
  u: string; // user id
  l: string; // lesson id
  s: string; // device session id
  v: string; // view log id
  e: number; // expiry (unix seconds)
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (payload: string) => crypto.createHmac('sha256', config.security.signingSecret).update(`stream:${payload}`).digest('base64url');

const templateCache = new Map<string, { text: string; at: number }>();

/**
 * Protected HLS delivery:
 *  - the player gets a 10-minute signed playlist link bound to the student, lesson and device
 *  - the playlist points at AES-128 encrypted segments; the decryption key is served only for a
 *    valid link, from the academy's own site (Origin/Referer check), to the active stream
 *  - one live stream per account: another device can take over, and the old one is paused
 *  - every viewing is logged (who, what, when, device, IP, minutes watched)
 */
export class StreamService {
  isHls(lesson: { videoProvider: string; videoUrl: string; hlsKeyHex?: string | null }) {
    return lesson.videoProvider === 'HLS' && !!lesson.hlsKeyHex && lesson.videoUrl.endsWith('.m3u8');
  }

  issueToken(claims: Omit<StreamClaims, 'e'>) {
    const payload = b64(JSON.stringify({ ...claims, e: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }));
    return `${payload}.${sign(payload)}`;
  }

  readToken(token: string, lessonId: string): StreamClaims {
    const [payload, sig] = String(token || '').split('.');
    const expected = payload ? sign(payload) : '';
    if (!payload || !sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new UnauthorizedError('Invalid video link');
    }
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as StreamClaims;
    if (claims.l !== lessonId) throw new UnauthorizedError('Invalid video link');
    if (claims.e < Date.now() / 1000) throw new AppError('This video link has expired. Reload the lesson.', 401, 'STREAM_LINK_EXPIRED');
    return claims;
  }

  /** Video may only be fetched from the academy's own pages. */
  assertAllowedOrigin(req: Request) {
    const allowed = new Set(
      [config.clientUrl, ...config.security.allowedVideoOrigins]
        .filter(Boolean)
        .map((o) => o.replace(/\/$/, ''))
    );
    const origin = (req.headers.origin as string) || '';
    const referer = (req.headers.referer as string) || '';
    let source = origin;
    if (!source && referer) {
      try {
        source = new URL(referer).origin;
      } catch {
        source = '';
      }
    }
    const devLocal = config.env !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(source);
    const vercelPreview = process.env.VERCEL && source.endsWith('.vercel.app') && config.clientUrl.endsWith('.vercel.app');
    if (!source || !(allowed.has(source) || devLocal || vercelPreview)) {
      logger.warn({ origin, referer }, 'Blocked video request from another site');
      throw new ForbiddenError('This video can only be played on the academy website.');
    }
  }

  /**
   * Called when a student opens a lesson: enforces one live stream per account and returns a
   * signed playlist link. Pass takeover=true to move the stream to this device.
   */
  async startStream(req: Request, lesson: { id: string; courseId: string }, takeover: boolean) {
    const userId = req.user!.userId;
    const sid = req.user!.sid || `user-${userId}`;
    const current = await prisma.streamSession.findUnique({ where: { userId } });
    if (current && current.deviceSid !== sid && Date.now() - current.lastBeatAt.getTime() < ACTIVE_WINDOW_MS && !takeover) {
      const device = await prisma.userDevice.findUnique({ where: { id: current.deviceSid }, select: { label: true } }).catch(() => null);
      return { conflict: { deviceLabel: device?.label || 'another device' } };
    }

    const ua = getUserAgent(req);
    const view = await prisma.videoViewLog.create({
      data: {
        userId,
        lessonId: lesson.id,
        courseId: lesson.courseId,
        deviceSid: req.user!.sid || null,
        deviceLabel: describeDevice(ua),
        ipAddress: getIp(req),
        userAgent: ua,
      },
    });
    await prisma.streamSession.upsert({
      where: { userId },
      create: { userId, deviceSid: sid, lessonId: lesson.id, viewLogId: view.id, lastBeatAt: new Date() },
      update: { deviceSid: sid, lessonId: lesson.id, viewLogId: view.id, lastBeatAt: new Date() },
    });

    const token = this.issueToken({ u: userId, l: lesson.id, s: sid, v: view.id });
    return { url: `/api/v1/stream/lessons/${lesson.id}/playlist.m3u8?t=${encodeURIComponent(token)}`, viewLogId: view.id, expiresInSeconds: TOKEN_TTL_SECONDS };
  }

  /** Heartbeat from the player: keeps this device's stream alive, or tells it another device took over. */
  async heartbeat(userId: string, sid: string | null | undefined, lessonId: string, watchedDelta: number) {
    const session = await prisma.streamSession.findUnique({ where: { userId } });
    const me = sid || `user-${userId}`;
    if (session && session.deviceSid !== me && Date.now() - session.lastBeatAt.getTime() < ACTIVE_WINDOW_MS) {
      throw new AppError('Your account started playing on another device, so playback stopped here.', 409, 'STREAM_ACTIVE_ELSEWHERE');
    }
    await prisma.streamSession.upsert({
      where: { userId },
      create: { userId, deviceSid: me, lessonId, lastBeatAt: new Date() },
      update: { deviceSid: me, lessonId, lastBeatAt: new Date() },
    });
    if (session?.viewLogId && session.lessonId === lessonId) {
      await prisma.videoViewLog
        .update({
          where: { id: session.viewLogId },
          data: { lastSeenAt: new Date(), watchedSeconds: { increment: Math.max(0, Math.min(Math.round(watchedDelta), 120)) } },
        })
        .catch(() => undefined);
    }
  }

  private async assertStillActive(claims: StreamClaims) {
    const session = await prisma.streamSession.findUnique({ where: { userId: claims.u } });
    if (session && session.deviceSid !== claims.s && Date.now() - session.lastBeatAt.getTime() < ACTIVE_WINDOW_MS) {
      throw new AppError('This account is playing on another device.', 409, 'STREAM_ACTIVE_ELSEWHERE');
    }
  }

  private async loadTemplate(videoUrl: string) {
    const hit = templateCache.get(videoUrl);
    if (hit && Date.now() - hit.at < 10 * 60_000) return hit.text;
    const base = (process.env.MEDIA_BASE_URL || config.clientUrl).replace(/\/$/, '');
    const res = await fetch(`${base}${videoUrl}`);
    if (!res.ok) throw new NotFoundError('Video not found');
    const text = await res.text();
    templateCache.set(videoUrl, { text, at: Date.now() });
    return text;
  }

  /** The student's playlist: encrypted segment links plus a short-lived key link. */
  async playlist(req: Request, lessonId: string, token: string) {
    this.assertAllowedOrigin(req);
    const claims = this.readToken(token, lessonId);
    await this.assertStillActive(claims);
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { videoUrl: true, videoProvider: true, hlsKeyHex: true } });
    if (!lesson || !this.isHls(lesson)) throw new NotFoundError('Video not found');

    const template = await this.loadTemplate(lesson.videoUrl);
    const mediaBase = (process.env.MEDIA_BASE_URL || '').replace(/\/$/, '');
    const dir = lesson.videoUrl.slice(0, lesson.videoUrl.lastIndexOf('/') + 1);
    const keyUri = `/api/v1/stream/lessons/${lessonId}/key?t=${encodeURIComponent(token)}`;
    return template
      .split('\n')
      .map((line) => {
        if (line.startsWith('#EXT-X-KEY')) return line.replace('__KEY_URI__', keyUri);
        if (line && !line.startsWith('#')) return `${mediaBase}${dir}${line.trim()}`;
        return line;
      })
      .join('\n');
  }

  /** The 16-byte AES key, only for a valid link from the academy site to the active stream. */
  async key(req: Request, lessonId: string, token: string) {
    this.assertAllowedOrigin(req);
    const claims = this.readToken(token, lessonId);
    await this.assertStillActive(claims);
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { hlsKeyHex: true } });
    if (!lesson?.hlsKeyHex) throw new NotFoundError('Video not found');
    return Buffer.from(lesson.hlsKeyHex, 'hex');
  }

  /** Viewing log for the admin console (instructors: own courses only). */
  async viewLog(params: { courseIds: string[] | null; userId?: string; take?: number }) {
    const rows = await prisma.videoViewLog.findMany({
      where: {
        ...(params.courseIds ? { courseId: { in: params.courseIds } } : {}),
        ...(params.userId ? { userId: params.userId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: Math.min(params.take || 100, 300),
      include: {
        user: { select: { id: true, name: true, email: true, studentId: true } },
        course: { select: { id: true, title: true } },
      },
    });
    const lessonIds = Array.from(new Set(rows.map((r) => r.lessonId)));
    const lessons = await prisma.lesson.findMany({ where: { id: { in: lessonIds } }, select: { id: true, title: true } });
    const titles = new Map(lessons.map((l) => [l.id, l.title]));

    // Flag accounts seen from many networks in the last 24 hours (possible account sharing)
    const since = Date.now() - 24 * 3600_000;
    const ipsByUser = new Map<string, Set<string>>();
    for (const r of rows) {
      if (r.startedAt.getTime() < since || !r.ipAddress) continue;
      if (!ipsByUser.has(r.userId)) ipsByUser.set(r.userId, new Set());
      ipsByUser.get(r.userId)!.add(r.ipAddress);
    }
    return rows.map((r) => ({
      ...r,
      lessonTitle: titles.get(r.lessonId) || 'Lesson',
      userAgent: undefined,
      suspicious: (ipsByUser.get(r.userId)?.size || 0) >= 3,
    }));
  }
}

export const streamService = new StreamService();
