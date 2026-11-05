const KEY = 'adsign.deviceId';

/**
 * A random id for this browser, kept in localStorage. The API uses it to recognise devices
 * the account has already verified (new devices need an OTP; students have a device limit).
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,128}$/.test(id)) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}
