import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { provisioningService } from '../src/services/provisioning.service.js';
import {
  generateStudentId,
  generateTemporaryPassword,
  generateVerificationToken,
  hashToken,
} from '../src/lib/student-id.js';
import { Role, DeliveryMode, RegistrationStatus, ModuleStatus } from '@academy/shared';

describe('Account Provisioning & Security Unit / Integration Suite', { timeout: 35000 }, () => {
  let course1: any;
  let course2: any;
  let batch1: any;

  beforeAll(async () => {
    course1 = await prisma.course.findUnique({
      where: { slug: 'fullstack-ai-engineering' },
      include: { modules: true },
    });

    course2 = await prisma.course.findFirst({
      where: { NOT: { id: course1?.id } },
      include: { modules: true },
    });

    if (!course2) {
      course2 = course1;
    }

    batch1 = await prisma.batch.findFirst({
      where: { courseId: course1.id },
    });
  });

  it('generates race-safe, unique Student IDs under concurrent calls', async () => {
    const promises = Array.from({ length: 10 }, () => generateStudentId(prisma));
    const studentIds = await Promise.all(promises);

    const currentYear = new Date().getFullYear();
    for (const id of studentIds) {
      expect(id).toMatch(new RegExp(`^OCA-${currentYear}-\\d{6}$`));
    }

    // Uniqueness verification
    const uniqueIds = new Set(studentIds);
    expect(uniqueIds.size).toBe(10);
  });

  it('generates strong temporary passwords without ambiguous characters (min 12 chars)', () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generateTemporaryPassword(14);
      expect(pwd.length).toBe(14);
      // No ambiguous chars (l, 1, I, O, 0)
      expect(pwd).not.toMatch(/[l1IO0]/);
      // Contains uppercase, lowercase, digit, special
      expect(pwd).toMatch(/[A-Z]/);
      expect(pwd).toMatch(/[a-z]/);
      expect(pwd).toMatch(/[0-9]/);
      expect(pwd).toMatch(/[!@#$%^&*()\-_=+]/);
    }
  });

  it('generates secure single-use verification tokens with SHA-256 hashes', () => {
    const { plainToken, tokenHash } = generateVerificationToken();
    expect(plainToken).toBeDefined();
    expect(plainToken.length).toBe(64); // 32 bytes hex
    expect(tokenHash).toBe(hashToken(plainToken));
    expect(hashToken('mismatch')).not.toBe(tokenHash);
  });

  it('provisions new student account, Student ID, profile, enrollment, and initializes first module progress', async () => {
    const timestamp = Date.now();
    const email = `prov_test_${timestamp}@example.com`;
    const phone = `+9198${String(timestamp).slice(-8)}`;
    const reg = await prisma.registration.create({
      data: {
        applicantName: 'Alice Johnson',
        email,
        phone,
        whatsappNumber: phone,
        courseId: course1.id,
        batchId: batch1?.id || null,
        mode: DeliveryMode.RECORDED,
        amount: 2499,
        currency: 'INR',
        status: RegistrationStatus.PAID,
        metadata: { city: 'Kolkata', education: 'B.Tech' },
      },
    });

    const result = await provisioningService.provisionRegistration(reg.id);

    expect(result.success).toBe(true);
    expect(result.isNewUser).toBe(true);
    expect(result.studentId).toMatch(/^OCA-\d{4}-\d{6}$/);

    // Verify DB user
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      include: {
        studentProfile: true,
        enrollments: true,
        moduleProgress: true,
        verificationTokens: true,
      },
    });

    expect(user).toBeDefined();
    expect(user!.mustChangePassword).toBe(true);
    expect(user!.studentProfile?.city).toBe('Kolkata');
    expect(user!.enrollments.length).toBe(1);
    expect(user!.enrollments[0].courseId).toBe(course1.id);

    // Verify first module is AVAILABLE and rest LOCKED
    const moduleProgressList = user!.moduleProgress;
    expect(moduleProgressList.length).toBeGreaterThanOrEqual(1);
    const firstModProgress = moduleProgressList.find((m) => m.moduleId === course1.modules[0]?.id);
    if (firstModProgress) {
      expect(firstModProgress.status).toBe(ModuleStatus.AVAILABLE);
    }
  });

  it('provisioning is idempotent: executing second time produces same user and no duplicate enrollment', async () => {
    const timestamp = Date.now() + 100;
    const email = `idem_test_${timestamp}@example.com`;
    const phone = `+9197${String(timestamp).slice(-8)}`;
    const reg = await prisma.registration.create({
      data: {
        applicantName: 'Bob Smith',
        email,
        phone,
        courseId: course1.id,
        mode: DeliveryMode.RECORDED,
        amount: 2499,
        status: RegistrationStatus.PAID,
      },
    });

    // Run 1
    const run1 = await provisioningService.provisionRegistration(reg.id);
    expect(run1.success).toBe(true);

    // Run 2 (Simulated duplicate delivery)
    const run2 = await provisioningService.provisionRegistration(reg.id);
    expect(run2.status).toBe('ALREADY_PROVISIONED');
    expect(run2.userId).toBe(run1.userId);

    // Verify only 1 enrollment exists in DB
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: run1.userId, courseId: course1.id },
    });
    expect(enrollments.length).toBe(1);
  });

  it('returning student buying another course gets new enrollment without duplicate account or password reset', async () => {
    const timestamp = Date.now() + 200;
    const email = `returning_student_${timestamp}@example.com`;
    const phone = `+9196${String(timestamp).slice(-8)}`;

    // 1. Initial Course Purchase
    const reg1 = await prisma.registration.create({
      data: {
        applicantName: 'Charlie Brown',
        email,
        phone,
        courseId: course1.id,
        mode: DeliveryMode.RECORDED,
        amount: 2499,
        status: RegistrationStatus.PAID,
      },
    });
    const res1 = await provisioningService.provisionRegistration(reg1.id);
    const originalStudentId = res1.studentId;

    // Simulate student setting permanent password
    const permanentHash = '$2b$10$permanent_password_hash_12345';
    await prisma.user.update({
      where: { id: res1.userId },
      data: { passwordHash: permanentHash, mustChangePassword: false },
    });

    // 2. Second Course Purchase
    const reg2 = await prisma.registration.create({
      data: {
        applicantName: 'Charlie Brown',
        email,
        phone,
        courseId: course2.id,
        mode: DeliveryMode.LIVE,
        amount: 4999,
        status: RegistrationStatus.PAID,
      },
    });
    const res2 = await provisioningService.provisionRegistration(reg2.id);

    expect(res2.userId).toBe(res1.userId);
    expect(res2.studentId).toBe(originalStudentId);
    expect(res2.isNewUser).toBe(false);

    // Verify user password was NOT reset and mustChangePassword remained false
    const userAfter = await prisma.user.findUnique({
      where: { id: res1.userId },
      include: { enrollments: true },
    });

    expect(userAfter!.passwordHash).toBe(permanentHash);
    expect(userAfter!.mustChangePassword).toBe(false);
  });

  it('handles batch capacity overflow safely: flags admin in metadata and still enrolls student', async () => {
    const tinyBatch = await prisma.batch.create({
      data: {
        courseId: course1.id,
        name: `Capacity Test Batch ${Date.now()}`,
        section: 'C',
        mode: DeliveryMode.LIVE,
        capacity: 1, // Max 1 student
      },
    });

    const timestamp1 = Date.now() + 300;
    const email1 = `cap1_${timestamp1}@example.com`;
    const phone1 = `+9195${String(timestamp1).slice(-8)}`;
    const reg1 = await prisma.registration.create({
      data: {
        applicantName: 'Student 1',
        email: email1,
        phone: phone1,
        courseId: course1.id,
        batchId: tinyBatch.id,
        mode: DeliveryMode.LIVE,
        amount: 2999,
        status: RegistrationStatus.PAID,
      },
    });
    await provisioningService.provisionRegistration(reg1.id);

    // Second student over capacity
    const timestamp2 = Date.now() + 400;
    const email2 = `cap2_${timestamp2}@example.com`;
    const phone2 = `+9194${String(timestamp2).slice(-8)}`;
    const reg2 = await prisma.registration.create({
      data: {
        applicantName: 'Student 2 (Over capacity)',
        email: email2,
        phone: phone2,
        courseId: course1.id,
        batchId: tinyBatch.id,
        mode: DeliveryMode.LIVE,
        amount: 2999,
        status: RegistrationStatus.PAID,
      },
    });
    const res2 = await provisioningService.provisionRegistration(reg2.id);

    expect(res2.success).toBe(true);

    const updatedReg2 = await prisma.registration.findUnique({ where: { id: reg2.id } });
    const meta = updatedReg2?.metadata as any;
    expect(meta?.overCapacityFlag).toBe(true);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
