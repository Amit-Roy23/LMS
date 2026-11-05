import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { config } from '../src/config/env.js';
import { authService } from '../src/services/auth.service.js';

describe('Console permissions: instructors, staff, PIN + OTP step-up and undo', () => {
  let server: http.Server;
  let base = '';
  const stamp = Date.now();
  const emails = ["admin", "staff", "teacher-a", "teacher-b"].map((r) => `${r}.${stamp}@perm.test`);
  const tokens: Record<string, string> = {};
  let courseA = '';
  let courseB = '';
  let lessonB = '';

  async function call(method: string, path: string, token?: string, body?: any, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json', ...extra };
    if (token) headers.authorization = `Bearer ${token}`;
    const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const j: any = await r.json().catch(() => ({}));
    return { status: r.status, data: j.data, error: j.error };
  }

  beforeAll(async () => {
    config.security.requireOtpNewDevice = false;
    config.security.otpDemoMode = true;
    const passwordHash = await bcrypt.hash('Secret@123', 10);
    const [admin, , teacherA, teacherB] = await Promise.all(
      (['ADMIN', 'STAFF', 'INSTRUCTOR', 'INSTRUCTOR'] as const).map((role, i) =>
        prisma.user.create({
          data: { email: emails[i], name: `${role} ${i}`, role, passwordHash, ...(role === 'ADMIN' ? { pinHash: bcrypt.hashSync('2580', 10) } : {}) },
        })
      )
    );
    const mk = (instructorId: string, slug: string) =>
      prisma.course.create({
        data: {
          title: slug, slug: `${slug}-${stamp}`, description: 'd', category: 'Test', price: 1000, instructorId, status: 'PUBLISHED',
          modules: { create: { title: 'M1', order: 1, lessons: { create: { title: 'L1', order: 1, videoUrl: '' } } } },
        },
        include: { modules: { include: { lessons: true } } },
      });
    const a = await mk(teacherA.id, 'perm-a');
    const b = await mk(teacherB.id, 'perm-b');
    courseA = a.id;
    courseB = b.id;
    lessonB = b.modules[0].lessons[0].id;
    for (const [i, key] of ['admin', 'staff', 'teacherA', 'teacherB'].entries()) {
      const res: any = await authService.login({ email: emails[i], password: 'Secret@123' });
      tokens[key] = res.tokens.accessToken;
    }
    expect(admin.id).toBeTruthy();
    server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  });

  afterAll(async () => {
    server.close();
    await prisma.course.deleteMany({ where: { id: { in: [courseA, courseB] } } });
    await prisma.auditLog.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('keeps instructors inside their own courses', async () => {
    const list = await call('GET', '/admin/courses?limit=100', tokens.teacherA);
    const ids = (list.data.items || list.data).map((c: any) => c.id);
    expect(ids).toContain(courseA);
    expect(ids).not.toContain(courseB);
    expect((await call('PUT', `/admin/courses/${courseB}`, tokens.teacherA, { title: 'hijack' })).status).toBe(403);
    expect((await call('PUT', `/admin/lessons/${lessonB}`, tokens.teacherA, { title: 'hijack' })).status).toBe(403);
    expect((await call('PUT', `/admin/courses/${courseA}`, tokens.teacherA, { price: 5 })).status).toBe(403);
    expect((await call('GET', '/admin/inquiries', tokens.teacherA)).status).toBe(403);
  });

  it('lets staff do day-to-day work but not deletes, prices or grading', async () => {
    expect((await call('GET', '/admin/inquiries', tokens.staff)).status).toBe(200);
    expect((await call('PUT', `/admin/lessons/${lessonB}`, tokens.staff, { title: 'Staff typo' })).status).toBe(200);
    expect((await call('DELETE', `/admin/courses/${courseB}`, tokens.staff)).status).toBe(403);
    expect((await call('PUT', `/admin/courses/${courseB}`, tokens.staff, { price: 1 })).status).toBe(403);
    expect((await call('GET', '/reviews/pending', tokens.staff)).status).toBe(403);
  });

  it('requires PIN + OTP for sensitive admin actions and lets the admin undo staff edits', async () => {
    const blocked = await call('PUT', `/admin/courses/${courseB}`, tokens.admin, { price: 2000 });
    expect(blocked.error.code).toBe('STEP_UP_REQUIRED');
    expect((await call('POST', '/admin/security/step-up', tokens.admin, { pin: '1111' })).status).toBe(400);
    const otp = await call('POST', '/admin/security/step-up', tokens.admin, { pin: '2580' });
    const ok = await call('POST', '/admin/security/step-up/verify', tokens.admin, { challengeId: otp.data.challengeId, code: otp.data.devCode });
    const su = { 'x-step-up-token': ok.data.stepUpToken };
    expect((await call('PUT', `/admin/courses/${courseB}`, tokens.admin, { price: 2000 }, su)).data.price).toBe(2000);
    expect((await call('PUT', `/admin/courses/${courseB}`, tokens.staff, { price: 3000 }, su)).status).toBe(403);

    const activity = await call('GET', '/admin/activity?actorRole=STAFF&take=200', tokens.admin);
    const edit = activity.data.find((a: any) => a.entityId === lessonB && a.action === 'LESSON_UPDATED');
    expect(edit.before.title).toBe('L1');
    expect((await call('POST', `/admin/activity/${edit.id}/revert`, tokens.admin, {})).status).toBe(200);
    expect((await prisma.lesson.findUnique({ where: { id: lessonB } }))!.title).toBe('L1');

    expect((await call('DELETE', `/admin/lessons/${lessonB}`, tokens.admin, undefined, su)).status).toBe(200);
    const del = (await call('GET', '/admin/activity?take=200', tokens.admin)).data.find((a: any) => a.entityId === lessonB && a.action === 'LESSON_DELETED');
    expect((await call('POST', `/admin/activity/${del.id}/revert`, tokens.admin, {})).status).toBe(200);
    expect((await prisma.lesson.findUnique({ where: { id: lessonB } }))!.deletedAt).toBeNull();
  });
});
