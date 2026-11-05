import { describe, it, expect } from 'vitest';
import { streamService } from '../src/services/stream.service.js';
import { config } from '../src/config/env.js';

const req = (headers: Record<string, string>) => ({ headers } as any);

describe('Protected video links', () => {
  it('accepts a valid signed link and rejects tampering or the wrong lesson', () => {
    const token = streamService.issueToken({ u: 'user1', l: 'lesson1', s: 'dev1', v: 'view1' });
    expect(streamService.readToken(token, 'lesson1').u).toBe('user1');
    expect(() => streamService.readToken(token, 'lesson2')).toThrow(/Invalid video link/);
    const [payload, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'user2', l: 'lesson1', s: 'dev1', v: 'v', e: 9999999999 })).toString('base64url');
    expect(() => streamService.readToken(`${forged}.${sig}`, 'lesson1')).toThrow(/Invalid video link/);
    expect(() => streamService.readToken(`${payload}.x${sig.slice(1)}`, 'lesson1')).toThrow(/Invalid video link/);
  });

  it('only serves video to the academy site', () => {
    const site = config.clientUrl.replace(/\/$/, '');
    expect(() => streamService.assertAllowedOrigin(req({ referer: `${site}/student/courses` }))).not.toThrow();
    expect(() => streamService.assertAllowedOrigin(req({ origin: site }))).not.toThrow();
    expect(() => streamService.assertAllowedOrigin(req({}))).toThrow(/academy website/);
    expect(() => streamService.assertAllowedOrigin(req({ referer: 'https://pirate.example/watch' }))).toThrow(/academy website/);
  });
});
