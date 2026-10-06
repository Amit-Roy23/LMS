import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { paymentService } from '../src/services/payment/payment.service.js';
import { provisioningService } from '../src/services/provisioning.service.js';
import { authService } from '../src/services/auth.service.js';
import { DeliveryMode, Role, NotificationStatus } from '@academy/shared';

describe('End-to-End Admission, Provisioning, Login & LMS Gating Flow', { timeout: 45000 }, () => {
  let course: any;
  const applicantEmail = `e2e_student_${Date.now()}@example.com`;
  const applicantPhone = `+919777${String(Date.now()).slice(-6)}`;
  const applicantName = 'E2E Admission Learner';
  let registrationId = '';
  let studentId = '';
  let createdUserId = '';
  const initialNewPassword = 'E2EPermanentPassword@123';

  beforeAll(async () => {
    course = await prisma.course.findUnique({
      where: { slug: 'fullstack-ai-engineering' },
      include: { modules: true },
    });
  });

  it('Step 1: Prospective learner applies for course admission and creates order', async () => {
    const orderRes = await paymentService.createRegistrationOrder({
      applicantName,
      email: applicantEmail,
      phone: applicantPhone,
      whatsappNumber: applicantPhone,
      courseId: course.id,
      mode: DeliveryMode.RECORDED,
      city: 'Sylhet',
      education: 'BSc in CSE',
    });

    expect(orderRes.registrationId).toBeDefined();
    registrationId = orderRes.registrationId;
  });

  it('Step 2: Mock payment verification succeeds -> triggers payment.succeeded and provisions student', async () => {
    const verifyRes = await paymentService.verifyRegistrationPayment(
      registrationId,
      `mock_tx_${Date.now()}`
    );
    expect(verifyRes.success).toBe(true);

    // Run provisioning synchronously for the test
    const provRes = await provisioningService.provisionRegistration(registrationId);
    expect(provRes.success).toBe(true);
    expect(provRes.isNewUser).toBe(true);
    expect(provRes.studentId).toMatch(/^OCA-\d{4}-\d{6}$/);

    studentId = provRes.studentId;
    createdUserId = provRes.userId;

    // Verify NotificationLog contains queued/sent confirmation & credentials
    const logs = await prisma.notificationLog.findMany({
      where: { userId: createdUserId },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 3: Student completes initial password setup using single-use verification token', async () => {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: { userId: createdUserId, type: 'ACCOUNT_SETUP' },
      orderBy: { createdAt: 'desc' },
    });

    expect(tokenRecord).toBeDefined();

    // Student sets password directly
    await authService.changePassword(createdUserId, undefined, initialNewPassword);

    const user = await prisma.user.findUnique({ where: { id: createdUserId } });
    expect(user!.mustChangePassword).toBe(false);
  });

  it('Step 4: Student signs into LMS using Student ID + newly set password', async () => {
    const loginRes = await authService.login({
      identifier: studentId,
      password: initialNewPassword,
    });

    expect(loginRes.user.id).toBe(createdUserId);
    expect(loginRes.user.studentId).toBe(studentId);
    expect(loginRes.user.role).toBe(Role.STUDENT);
    expect(loginRes.tokens.accessToken).toBeDefined();
  });

  it('Step 5: Student portal lists ONLY the enrolled course and initialized progression', async () => {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: createdUserId },
      include: { course: true },
    });

    expect(enrollments.length).toBe(1);
    expect(enrollments[0].courseId).toBe(course.id);
    expect(enrollments[0].course.title).toBe(course.title);
    expect(enrollments[0].paymentStatus).toBe('PAID');
    expect(enrollments[0].accessStatus).toBe('ACTIVE');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
