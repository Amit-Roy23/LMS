import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { authService } from '../src/services/auth.service.js';
import { Role, UserStatus } from '@academy/shared';
import bcrypt from 'bcryptjs';

describe('Student Authentication, Lockout, and Password Reset Flow', { timeout: 35000 }, () => {
  let testStudent: any;
  const rawPassword = 'StudentTempPassword@123';
  let studentId = '';
  const email = `auth_test_${Date.now()}@example.com`;
  const phone = `+91998877${String(Date.now()).slice(-4)}`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    studentId = `OCA-2026-${String(Date.now()).slice(-6)}`;

    testStudent = await prisma.user.create({
      data: {
        name: 'Auth Test Student',
        email,
        phone,
        studentId,
        passwordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        mustChangePassword: true,
      },
    });
  });

  it('allows student login using official Student ID (OCA-...)', async () => {
    const res = await authService.login({
      identifier: studentId,
      password: rawPassword,
    });

    expect(res.user.id).toBe(testStudent.id);
    expect(res.user.studentId).toBe(studentId);
    expect(res.user.mustChangePassword).toBe(true);
    expect(res.tokens.accessToken).toBeDefined();
  });

  it('allows student login using registered Email', async () => {
    const res = await authService.login({
      email,
      password: rawPassword,
    });

    expect(res.user.id).toBe(testStudent.id);
  });

  it('allows student login using registered Phone number', async () => {
    const res = await authService.login({
      identifier: phone,
      password: rawPassword,
    });

    expect(res.user.id).toBe(testStudent.id);
  });

  it('triggers temporary account lockout after 5 consecutive failed login attempts', async () => {
    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login({ identifier: studentId, password: 'wrongPassword' })
      ).rejects.toThrow();
    }

    // 5th failed attempt -> locks account
    await expect(
      authService.login({ identifier: studentId, password: 'wrongPassword' })
    ).rejects.toThrow();

    const userLocked = await prisma.user.findUnique({ where: { id: testStudent.id } });
    expect(userLocked!.failedLoginAttempts).toBe(5);
    expect(userLocked!.lockedUntil).not.toBeNull();
    expect(userLocked!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // 6th attempt with correct password still rejects while locked
    await expect(
      authService.login({ identifier: studentId, password: rawPassword })
    ).rejects.toThrow(/temporarily locked/i);

    // Reset lock for subsequent tests
    await prisma.user.update({
      where: { id: testStudent.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  it('forgot password generates secure hashed single-use token and returns enumeration-safe message', async () => {
    const res = await authService.forgotPassword(email);
    expect(res.message).toMatch(/If an account matches/i);

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: { userId: testStudent.id, type: 'PASSWORD_RESET' },
      orderBy: { createdAt: 'desc' },
    });

    expect(tokenRecord).toBeDefined();
    expect(tokenRecord!.usedAt).toBeNull();
  });

  it('resets password using token, invalidates token for reuse, and updates mustChangePassword to false', async () => {
    // Generate a fresh token for this user
    const { generateVerificationToken } = await import('../src/lib/student-id.js');
    const { plainToken, tokenHash } = generateVerificationToken();

    await prisma.verificationToken.create({
      data: {
        tokenHash,
        userId: testStudent.id,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const newPassword = 'NewPermanentPassword@2026';
    const resetRes = await authService.resetPassword(plainToken, newPassword);
    expect(resetRes.message).toMatch(/Password reset successfully/i);

    // Token is now used
    const usedToken = await prisma.verificationToken.findUnique({ where: { tokenHash } });
    expect(usedToken!.usedAt).not.toBeNull();

    // Reusing the token must fail
    await expect(
      authService.resetPassword(plainToken, 'AnotherPassword@123')
    ).rejects.toThrow(/Invalid or expired/i);

    // Can now log in with new password
    const loginRes = await authService.login({ identifier: studentId, password: newPassword });
    expect(loginRes.user.id).toBe(testStudent.id);
    expect(loginRes.user.mustChangePassword).toBe(false);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
