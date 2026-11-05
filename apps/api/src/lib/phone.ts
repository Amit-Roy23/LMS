/**
 * Normalises an Indian (or international) mobile number to a canonical E.164-style string
 * such as "+919876543210", so "98765 43210", "+91-98765-43210" and "09876543210" all match.
 * Returns null when the input does not look like a phone number.
 */
export function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (!hasPlus) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

/** True when the identifier looks like a phone number rather than an email or student ID. */
export function looksLikePhone(input: string): boolean {
  return /^[+\d][\d\s()-]{8,}$/.test(input.trim());
}

/** "+919876543210" -> "+91 ••••• •3210" for display in OTP prompts. */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return `+${d.slice(0, d.length - 10)} ••••• •${d.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}${'•'.repeat(Math.max(1, user.length - head.length))}@${domain}`;
}
