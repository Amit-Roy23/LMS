import { Request } from 'express';

export type DeviceKind = 'MOBILE' | 'DESKTOP';

/** Client-generated device id (stored in the browser) sent with sign-in and every request. */
export function getDeviceId(req: Request): string | null {
  const id = (req.headers['x-device-id'] as string) || (req.body && req.body.deviceId) || '';
  const clean = String(id).trim();
  return /^[A-Za-z0-9_-]{8,128}$/.test(clean) ? clean : null;
}

export function getIp(req: Request): string | null {
  return (req.ip || (req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || null;
}

export function getUserAgent(req: Request): string {
  return String(req.headers['user-agent'] || '').slice(0, 300);
}

/** Phones and tablets count as "mobile"; everything else is a computer. */
export function detectDeviceKind(userAgent: string): DeviceKind {
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(userAgent) ? 'MOBILE' : 'DESKTOP';
}

/** Short human label such as "Chrome on Windows" or "Safari on iPhone". */
export function describeDevice(userAgent: string): string {
  const ua = userAgent || '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Firefox\//.test(ua)
            ? 'Firefox'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Browser';
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'device';
  return `${browser} on ${os}`;
}
