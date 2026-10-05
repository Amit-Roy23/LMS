import { ApiResponse } from '@academy/shared';

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

  // On the server (SSR)
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

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Check if token exists in localStorage for SSR fallback
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  });

  const data: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      code: 'PARSE_ERROR',
      message: 'Failed to parse response from server',
    },
  }));

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || response.statusText || 'An unexpected error occurred';
    const errorCode = data.error?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, response.status, errorCode, data.error?.details);
  }

  return data.data as T;
}
