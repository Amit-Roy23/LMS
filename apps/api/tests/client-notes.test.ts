import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { config } from '../src/config/env.js';
import { fileService } from '../src/services/file.service.js';
import { instructorService, validateSocials } from '../src/services/instructor.service.js';
import { changeRequestService } from '../src/services/change-request.service.js';
import { siteService, DEFAULT_ADMISSIONS_WHATSAPP } from '../src/services/site.service.js';
import { reviewService } from '../src/services/review.service.js';
import { authService } from '../src/services/auth.service.js';
import { SubmissionStatus } from '@academy/shared';

/** Client red-note items: photos, link approval, materials, 80% rule, student IDs, pages, SEO, alerts. */
describe('Client review items', { timeout: 30000 }, () => {
  const PNG = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a5d8a8d50000000049454e44ae426082',
    'hex'
  );
  let admin: { id: string };
  let instructorId = '';
  const created: string[] = [];
  const savedSettings: Record<string, string | null> = {};

  beforeAll(async () => {
    config.security.requireOtpRegistration = false;
    admin = (await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' }, select: { id: true } }))!;
    const instructor = await prisma.user.create({
      data: { name: 'Test Instructor', email: `t_instr_${Date.now()}@example.com`, passwordHash: 'x', role: 'INSTRUCTOR' },
    });
    instructorId = instructor.id;
    for (const key of ['notify.admissionsWhatsapp', 'analytics.gaId', 'seo.searchConsole']) {
      savedSettings[key] = (await prisma.setting.findUnique({ where: { key } }))?.value ?? null;
    }
  });

  afterAll(async () => {
    await prisma.changeRequest.deleteMany({ where: { userId: instructorId } });
    await prisma.instructorProfile.deleteMany({ where: { userId: instructorId } });
    await prisma.storedFile.deleteMany({ where: { id: { in: created } } });
    await prisma.user.delete({ where: { id: instructorId } }).catch(() => undefined);
    for (const [key, value] of Object.entries(savedSettings)) {
      if (value === null) await prisma.setting.deleteMany({ where: { key } });
      else await prisma.setting.update({ where: { key }, data: { value } });
    }
    await prisma.seoEntry.deleteMany({ where: { key: 'course:test-seo-course' } });
  });

  describe('File storage', () => {
    it('accepts a real PNG avatar and rejects a fake or oversized one', async () => {
      const f = await fileService.save({ purpose: 'AVATAR', buffer: PNG, filename: 'me.png', mimetype: 'image/png' });
      created.push(f.id);
      expect(f.isPublic).toBe(true);
      await expect(fileService.save({ purpose: 'AVATAR', buffer: Buffer.from('hello world'), filename: 'x.png', mimetype: 'image/png' })).rejects.toThrow();
      await expect(
        fileService.save({ purpose: 'AVATAR', buffer: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]), filename: 'big.png', mimetype: 'image/png' })
      ).rejects.toThrow();
    });

    it('refuses executables as study material', async () => {
      await expect(fileService.save({ purpose: 'MATERIAL', buffer: Buffer.from('MZ\x90\x00'), filename: 'setup.exe', mimetype: 'application/octet-stream' })).rejects.toThrow();
    });

    it('download links are per-user, tamper-proof and expire', async () => {
      const f = await fileService.save({ purpose: 'MATERIAL', buffer: Buffer.from('%PDF-1.4\n%%EOF'), filename: 'notes.pdf', mimetype: 'application/pdf' });
      created.push(f.id);
      expect(f.isPublic).toBe(false);
      const url = new URL('http://x' + fileService.signedDownloadUrl(f.id, 'user-a'));
      const [u, exp, sig] = ['u', 'exp', 'sig'].map((k) => url.searchParams.get(k)!);
      expect(() => fileService.verifyDownload(f.id, u, exp, sig)).not.toThrow();
      expect(() => fileService.verifyDownload(f.id, 'user-b', exp, sig)).toThrow();
      expect(() => fileService.verifyDownload(f.id, u, exp, sig.replace(/^./, sig[0] === 'a' ? 'b' : 'a'))).toThrow();
      expect(() => fileService.verifyDownload(f.id, u, String(Number(exp) + 60), sig)).toThrow();
      const old = new URL('http://x' + fileService.signedDownloadUrl(f.id, 'user-a', -5));
      expect(() => fileService.verifyDownload(f.id, 'user-a', old.searchParams.get('exp')!, old.searchParams.get('sig')!)).toThrow(/expired/);
    });
  });

  describe('Instructor social links', () => {
    it('only accepts secure links on the matching site', () => {
      expect(validateSocials({ linkedin: 'https://www.linkedin.com/in/someone' })).toEqual({ linkedin: 'https://www.linkedin.com/in/someone' });
      expect(() => validateSocials({ linkedin: 'https://evil.example.com/in/x' })).toThrow();
      expect(() => validateSocials({ github: 'http://github.com/x' })).toThrow();
    });

    it('new links wait for a main admin; approval can be partial; removals are immediate', async () => {
      const base = { headline: 'Teacher', bio: 'I teach design and code to beginners.', skills: 'Figma' };
      const first = await instructorService.upsertOwn(instructorId, {
        ...base,
        socials: { linkedin: 'https://www.linkedin.com/in/t1', github: 'https://github.com/t1' },
      });
      expect(first.linksAwaitingApproval.sort()).toEqual(['github', 'linkedin']);
      let profile = await prisma.instructorProfile.findUniqueOrThrow({ where: { userId: instructorId } });
      expect(profile.socials).toEqual({});

      const request = await prisma.changeRequest.findFirstOrThrow({ where: { userId: instructorId, type: 'SOCIAL_LINKS', status: 'PENDING' } });
      await changeRequestService.decideWithKeys(request.id, admin.id, ['linkedin']);
      profile = await prisma.instructorProfile.findUniqueOrThrow({ where: { userId: instructorId } });
      expect(profile.socials).toEqual({ linkedin: 'https://www.linkedin.com/in/t1' });
      expect(profile.pendingSocials).toBeNull();

      // Removing the live link takes effect without approval
      const second = await instructorService.upsertOwn(instructorId, { ...base, socials: {} });
      expect(second.linksAwaitingApproval).toEqual([]);
      profile = await prisma.instructorProfile.findUniqueOrThrow({ where: { userId: instructorId } });
      expect(profile.socials).toEqual({});
    });

    it("a main admin's own links go live at once", async () => {
      const res = await instructorService.upsertOwn(
        instructorId,
        { headline: 'Teacher', bio: 'I teach design and code to beginners.', skills: '', socials: { website: 'https://example.com' } },
        { autoApproveLinks: true }
      );
      expect(res.linksAwaitingApproval).toEqual([]);
      const profile = await prisma.instructorProfile.findUniqueOrThrow({ where: { userId: instructorId } });
      expect(profile.socials).toEqual({ website: 'https://example.com/' }); // stored in normalised form
    });
  });

  describe('Assignment pass mark (80%)', () => {
    it('a grade below 80% of the marks is returned for resubmission', async () => {
      const submission = await prisma.assignmentSubmission.findFirst({
        where: { status: 'PENDING' },
        include: { assignment: { include: { module: { include: { course: true } } } } },
      });
      if (!submission) return; // seed has pending submissions; nothing to check otherwise
      const reviewer = submission.assignment.module.course.instructorId || admin.id;
      const max = (submission.assignment as any).maxScore ?? 100;
      try {
        const res: any = await reviewService.reviewAssignmentSubmission({
          submissionId: submission.id,
          reviewerId: reviewer,
          reviewerRole: 'ADMIN',
          status: SubmissionStatus.APPROVED,
          feedback: 'Nice work',
          grade: Math.ceil(max * 0.8) - 1,
        });
        expect(res.submission.status).toBe('CHANGES_REQUESTED');
        expect(res.passMark.belowPassMark).toBe(true);
        expect(res.submission.feedback).toMatch(/below the pass mark/);
      } finally {
        await prisma.assignmentSubmission.update({ where: { id: submission.id }, data: { status: 'PENDING', grade: null, feedback: null, reviewedAt: null, reviewedById: null } });
      }
    });
  });

  describe('Student ID', () => {
    it('self-registered students get an ADS ID', async () => {
      const email = `t_reg_${Date.now()}@example.com`;
      const res: any = await authService.register({ name: 'Reg Test', email, password: 'Learner@123' });
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.studentId).toMatch(/^ADS-\d{4}-\d{6}$/);
      expect(res.user?.studentId ?? user.studentId).toBe(user.studentId);
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    });
  });

  describe('Website settings', () => {
    it('the WhatsApp alert number has a default and only a main admin can change it', async () => {
      await prisma.setting.deleteMany({ where: { key: 'notify.admissionsWhatsapp' } });
      expect(await siteService.admissionsWhatsapp()).toBe(config.notifications.admissionsWhatsapp || DEFAULT_ADMISSIONS_WHATSAPP);
      await expect(siteService.updateSettings({ 'notify.admissionsWhatsapp': '+919000000000' }, 'STAFF')).rejects.toThrow();
      await expect(siteService.updateSettings({ 'notify.admissionsWhatsapp': 'call me' }, 'ADMIN')).rejects.toThrow();
      await siteService.updateSettings({ 'notify.admissionsWhatsapp': '+91 96813 86103' }, 'ADMIN');
      expect(await siteService.admissionsWhatsapp()).toBe('+919681386103');
      const pub = await siteService.publicConfig();
      expect(pub.settings).not.toHaveProperty('notify.admissionsWhatsapp');
    });

    it('tracking IDs are validated and tidied', async () => {
      const { settings } = await siteService.updateSettings(
        { 'analytics.gaId': 'g-abcd1234', 'seo.searchConsole': '<meta name="google-site-verification" content="abcDEF_123-xyz9" />' },
        'STAFF'
      );
      expect(settings['analytics.gaId']).toBe('G-ABCD1234');
      expect(settings['seo.searchConsole']).toBe('abcDEF_123-xyz9');
      await expect(siteService.updateSettings({ 'analytics.pixelId': "1');alert(1)//" }, 'STAFF')).rejects.toThrow();
      await expect(siteService.updateSettings({ 'unknown.key': 'x' }, 'ADMIN')).rejects.toThrow();
    });
  });

  describe('Website pages', () => {
    it('saves versions and restores an earlier one', async () => {
      const before = await siteService.getPage('privacy');
      const v0 = (await siteService.versions('privacy')).length;
      const saved = await siteService.savePage('privacy', { title: before.title, content: before.content + '\n\nTest paragraph.' }, admin.id);
      expect(saved.changed).toBe(true);
      const versions = await siteService.versions('privacy');
      expect(versions.length).toBe(v0 + 1);
      const previous = versions[1] ?? null;
      if (previous) {
        const restored = await siteService.restore('privacy', previous.id, admin.id);
        expect(restored.page.content).toBe(previous.content);
      } else {
        await siteService.savePage('privacy', { title: before.title, content: before.content }, admin.id);
      }
      expect((await siteService.getPage('privacy')).content).toBe(before.content);
      await expect(siteService.savePage('privacy', { title: 'Privacy', content: 'short' }, admin.id)).rejects.toThrow();
      await expect(siteService.savePage('not-a-page', { title: 'Hello', content: 'x'.repeat(40) }, admin.id)).rejects.toThrow();
    });
  });

  describe('SEO entries', () => {
    it('validates keys and images; clearing everything removes the entry', async () => {
      await expect(siteService.saveSeo('nonsense', { title: 'x' }, admin.id)).rejects.toThrow();
      await expect(siteService.saveSeo('course:test-seo-course', { image: 'javascript:alert(1)' }, admin.id)).rejects.toThrow();
      await expect(siteService.saveSeo('course:test-seo-course', { title: 'x'.repeat(71) }, admin.id)).rejects.toThrow();
      const { entry } = await siteService.saveSeo('course:test-seo-course', { title: 'Great course', noindex: true }, admin.id);
      expect(entry).toMatchObject({ title: 'Great course', noindex: true });
      expect((await siteService.publicConfig()).seo['course:test-seo-course']).toMatchObject({ noindex: true });
      const cleared = await siteService.saveSeo('course:test-seo-course', {}, admin.id);
      expect(cleared.entry).toBeNull();
      expect(await prisma.seoEntry.findUnique({ where: { key: 'course:test-seo-course' } })).toBeNull();
    });
  });
});
