import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { config } from '../src/config/env.js';

const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1';

describe('OTP, one account per mobile and device limits', () => {
  let server: http.Server;
  let base = '';
  const stamp = Date.now();
  const mobile = '9' + String(stamp).slice(-9);
  const email = `otp${stamp}@example.com`;

  async function call(method: string, path: string, body?: any, opts: { token?: string; device?: string; ua?: string } = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'user-agent': opts.ua || DESKTOP };
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    if (opts.device) headers['x-device-id'] = opts.device;
    const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const j: any = await r.json().catch(() => ({}));
    return { status: r.status, data: j.data, error: j.error };
  }

  beforeAll(async () => {
    config.security.requireOtpNewDevice = true;
    config.security.requireOtpRegistration = true;
    config.security.otpDemoMode = true;
    server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  });

  afterAll(async () => {
    server.close();
    await prisma.user.deleteMany({ where: { email } });
    await prisma.otpChallenge.deleteMany({ where: { target: { in: [`+91${mobile}`, email] } } });
  });

  it('registers only after the mobile OTP is verified, and blocks a second account on the same mobile', async () => {
    const refused = await call('POST', '/auth/register', { name: 'Otp Tester', email, password: 'Secret@123', phone: mobile }, { device: 'devAAAAAAAA' });
    expect(refused.status).toBe(400);
    expect(refused.error.details.reason).toBe('OTP_REQUIRED');

    const otp = await call('POST', '/auth/register/request-otp', { email, phone: mobile });
    expect(otp.data.devCode).toMatch(/^\d{6}$/);
    const wrong = await call('POST', '/auth/register', { name: 'Otp Tester', email, password: 'Secret@123', phone: mobile, challengeId: otp.data.challengeId, otpCode: otp.data.devCode === '123456' ? '654321' : '123456' }, { device: 'devAAAAAAAA' });
    expect(wrong.error.message).toMatch(/attempts? left/);
    const ok = await call('POST', '/auth/register', { name: 'Otp Tester', email, password: 'Secret@123', phone: mobile, challengeId: otp.data.challengeId, otpCode: otp.data.devCode }, { device: 'devAAAAAAAA' });
    expect(ok.status).toBe(201);
    expect(ok.data.user.phone).toBe(`+91${mobile}`);

    const dup = await call('POST', '/auth/register/request-otp', { email: `other${stamp}@example.com`, phone: `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` });
    expect(dup.status).toBe(400);
    expect(dup.error.message).toMatch(/already registered/);
  });

  it('asks for an OTP on a new device and signs out the older computer beyond the limit', async () => {
    const first = await call('POST', '/auth/login', { identifier: email, password: 'Secret@123' }, { device: 'devAAAAAAAA' });
    expect(first.error).toBeUndefined();
    expect(first.data.otpRequired).toBeFalsy();
    expect(first.data.accessToken).toBeTruthy();
    const oldToken = first.data.accessToken;

    const second = await call('POST', '/auth/login', { identifier: mobile, password: 'Secret@123' }, { device: 'devBBBBBBBB' });
    expect(second.data.otpRequired).toBe(true);
    const verified = await call('POST', '/auth/login/verify-otp', { challengeId: second.data.challengeId, code: second.data.devCode }, { device: 'devBBBBBBBB' });
    expect(verified.data.accessToken).toBeTruthy();
    expect(verified.data.signedOut).toHaveLength(1);

    const revoked = await call('GET', '/auth/me', undefined, { token: oldToken, device: 'devAAAAAAAA' });
    expect(revoked.status).toBe(401);
    expect(revoked.error.code).toBe('SESSION_REVOKED');

    // A phone is a separate slot, so the computer stays signed in
    await prisma.otpChallenge.updateMany({ where: { target: `+91${mobile}` }, data: { createdAt: new Date(Date.now() - 60_000) } });
    const phone = await call('POST', '/auth/login', { identifier: email, password: 'Secret@123' }, { device: 'devCCCCCCCC', ua: PHONE });
    const phoneOk = await call('POST', '/auth/login/verify-otp', { challengeId: phone.data.challengeId, code: phone.data.devCode }, { device: 'devCCCCCCCC', ua: PHONE });
    expect(phoneOk.data.signedOut).toHaveLength(0);
    const stillIn = await call('GET', '/auth/me', undefined, { token: verified.data.accessToken, device: 'devBBBBBBBB' });
    expect(stillIn.status).toBe(200);
  });

  it('resets a password with a single-use OTP', async () => {
    await prisma.otpChallenge.updateMany({ where: { target: `+91${mobile}` }, data: { createdAt: new Date(Date.now() - 60_000) } });
    const f = await call('POST', '/auth/forgot-password/otp', { identifier: `0${mobile}` });
    expect(f.data.devCode).toMatch(/^\d{6}$/);
    const reset = await call('POST', '/auth/reset-password/otp', { challengeId: f.data.challengeId, code: f.data.devCode, password: 'Changed@1234' });
    expect(reset.status).toBe(200);
    const again = await call('POST', '/auth/reset-password/otp', { challengeId: f.data.challengeId, code: f.data.devCode, password: 'Changed@5678' });
    expect(again.status).toBe(400);
  });
});
