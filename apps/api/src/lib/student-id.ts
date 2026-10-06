import crypto from 'crypto';
import { prisma } from './prisma.js';

/**
 * Generates a race-safe, sequential, human-friendly Student ID (e.g., OCA-2026-000123).
 * Uses atomic sequence counter table with database row-level locking / atomic upsert.
 */
export async function generateStudentId(tx: any = prisma): Promise<string> {
  const currentYear = new Date().getFullYear();
  const sequenceName = `student_id_${currentYear}`;

  // Atomic increment in database transaction
  const counter = await tx.sequenceCounter.upsert({
    where: { name: sequenceName },
    create: { name: sequenceName, value: 1 },
    update: { value: { increment: 1 } },
  });

  const formattedNumber = String(counter.value).padStart(6, '0');
  return `OCA-${currentYear}-${formattedNumber}`;
}

/**
 * Generates a strong random temporary password without ambiguous characters (l, 1, I, O, 0).
 * Min length: 12 characters.
 */
export function generateTemporaryPassword(length: number = 14): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*()-_=+';

  const allChars = uppercase + lowercase + digits + special;
  const bytes = crypto.randomBytes(length);

  const passwordChars: string[] = [
    uppercase[crypto.randomInt(0, uppercase.length)],
    lowercase[crypto.randomInt(0, lowercase.length)],
    digits[crypto.randomInt(0, digits.length)],
    special[crypto.randomInt(0, special.length)],
  ];

  for (let i = 4; i < length; i++) {
    passwordChars.push(allChars[bytes[i] % allChars.length]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

/**
 * Generates a cryptographic single-use token and returns both the plain token (to send via email/SMS)
 * and the SHA-256 hash (to store in the database).
 */
export function generateVerificationToken(): { plainToken: string; tokenHash: string } {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(plainToken);
  return { plainToken, tokenHash };
}

/**
 * Hashes a token using SHA-256 for secure constant-time comparison in DB.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Masks sensitive recipient strings (email / phone number) for audit logs & admin displays.
 */
export function maskRecipient(recipient: string): string {
  if (!recipient) return '';
  const trimmed = recipient.trim();
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    if (local.length <= 2) {
      return `*@${domain}`;
    }
    const maskedLocal = `${local[0]}${'*'.repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}`;
    return `${maskedLocal}@${domain}`;
  }
  // Phone mask (e.g. +91 98765 43210 -> +91 98****3210)
  if (trimmed.length > 4) {
    const prefix = trimmed.slice(0, 3);
    const suffix = trimmed.slice(-2);
    return `${prefix}${'*'.repeat(Math.max(2, trimmed.length - 5))}${suffix}`;
  }
  return '***';
}
