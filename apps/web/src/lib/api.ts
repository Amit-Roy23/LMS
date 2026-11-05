import { ApiResponse } from '@academy/shared';
import { getDeviceId } from './device';

export function getApiBase(): string {
  // In the browser, always use relative path unless an explicit external API host is configured
  if (typeof window !== 'undefined') {
    if (
      process.env.NEXT_PUBLIC_API_URL &&
      !process.env.NEXT_PUBLIC_API_URL.includes('localhost') &&
      !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')
    ) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return '/api/v1';
  }

  // On the server (SSR): an internal API address wins (local dev or a VPS behind Nginx)
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/v1`;
  }
  return 'http://localhost:3000/api/v1';
}


export class ApiError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(message: string, status: number, code = 'ERROR', details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Fired on window when the API says this device was signed out (device limit, remote sign-out). */
export const SESSION_REVOKED_EVENT = 'adsign:session-revoked';

let refreshing: Promise<boolean> | null = null;

/** Exchanges the httpOnly refresh cookie for a new access token (one request at a time). */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${getApiBase()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId() },
    })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok || !body?.success || !body.data?.accessToken) return false;
        localStorage.setItem('accessToken', body.data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshing = null), 0);
      });
  }
  return refreshing;
}

const STEP_UP_KEY = 'adsign.stepUp';
type StepUpHandler = (code: 'STEP_UP_REQUIRED' | 'PIN_NOT_SET', message: string) => Promise<string | null>;
let stepUpHandler: StepUpHandler | null = null;

/** The admin console registers a PIN + OTP dialog here; protected requests wait for it and retry. */
export function setStepUpHandler(handler: StepUpHandler | null) {
  stepUpHandler = handler;
}

export function storeStepUpToken(token: string, expiresAt: string) {
  try {
    sessionStorage.setItem(STEP_UP_KEY, JSON.stringify({ token, expiresAt }));
  } catch {
    /* ignore */
  }
}

function currentStepUpToken(): string | null {
  try {
    const raw = sessionStorage.getItem(STEP_UP_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    return new Date(expiresAt).getTime() - Date.now() > 15_000 ? token : null;
  } catch {
    return null;
  }
}

/** Headers every API call carries: JSON content type, bearer token and this browser's device id. */
export function authHeaders(init?: HeadersInit, body?: BodyInit | null): Headers {
  const headers = new Headers(init || {});
  if (!headers.has('Content-Type') && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const deviceId = getDeviceId();
    if (deviceId) headers.set('X-Device-Id', deviceId);
    const stepUp = currentStepUpToken();
    if (stepUp && !headers.has('X-Step-Up-Token')) headers.set('X-Step-Up-Token', stepUp);
  }
  return headers;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const baseUrl = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const headers = authHeaders(options.headers, options.body);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  });

  if (response.status === 401 && typeof window !== 'undefined' && !endpoint.startsWith('/auth/refresh')) {
    const peek = await response.clone().json().catch(() => null);
    const code = peek?.error?.code;
    if (code === 'SESSION_REVOKED') {
      localStorage.removeItem('accessToken');
      window.dispatchEvent(new CustomEvent(SESSION_REVOKED_EVENT, { detail: peek?.error?.message }));
    } else if (!retried && (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED') && localStorage.getItem('accessToken')) {
      // Access tokens are short-lived; renew silently once and retry the request
      if (await refreshAccessToken()) return apiClient<T>(endpoint, options, true);
    }
  }

  const data: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      code: 'PARSE_ERROR',
      message: `Unexpected response from API (HTTP ${response.status}) at ${url}`,
    },
  }));

  // Sensitive admin action: ask for PIN + OTP once, then retry with the step-up token
  const code = data.error?.code;
  if (response.status === 403 && (code === 'STEP_UP_REQUIRED' || code === 'PIN_NOT_SET') && stepUpHandler && !retried) {
    const token = await stepUpHandler(code, data.error?.message || '');
    if (token) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('X-Step-Up-Token', token);
      return apiClient<T>(endpoint, { ...options, headers: retryHeaders }, true);
    }
  }

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || response.statusText || 'An unexpected error occurred';
    const errorCode = data.error?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, response.status, errorCode, data.error?.details);
  }

  return data.data as T;
}

/** Fetch a plain-text response (e.g. a CSV download) with the same auth as apiClient. */
export async function apiText(endpoint: string): Promise<string> {
  const url = endpoint.startsWith('http') ? endpoint : `${getApiBase()}${endpoint}`;
  const headers = authHeaders();
  headers.delete('Content-Type');

  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.error?.message || response.statusText || 'Download failed',
      response.status,
      body?.error?.code || `HTTP_${response.status}`
    );
  }
  return response.text();
}

/** Opens an authenticated PDF/file response (e.g. a GST invoice) in a new tab. */
export async function openAuthenticatedFile(endpoint: string): Promise<void> {
  const url = endpoint.startsWith('http') ? endpoint : `${getApiBase()}${endpoint}`;
  const headers = authHeaders();
  headers.delete('Content-Type');
  // Open the tab first so popup blockers allow it
  const tab = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) {
    tab?.close();
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error?.message || 'Download failed', response.status, body?.error?.code || `HTTP_${response.status}`);
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  if (tab) tab.location.href = blobUrl;
  else window.location.href = blobUrl;
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/** Server-side fetch for public pages (SEO): cached, never throws, returns null on failure. */
export async function fetchPublic<T>(endpoint: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBase()}${endpoint}`, { next: { revalidate } } as any);
    if (!res.ok) return null;
    const body = await res.json();
    return body?.success ? (body.data as T) : null;
  } catch {
    return null;
  }
}
