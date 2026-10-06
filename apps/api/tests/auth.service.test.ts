import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authService } from '../src/services/auth.service.js';
import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';
import http from 'http';
import { Role } from '@academy/shared';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../src/lib/errors.js';

describe('Authentication Flow & Service Test Suite', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let adminAccessToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  describe('1. AuthService Direct Unit Operations', () => {
    it('should successfully log in admin with valid demo credentials', async () => {
      const res = await authService.login({
        email: 'admin@creativeit.academy',
        password: 'Admin@123',
      });

      expect(res.user).toBeDefined();
      expect(res.user.email).toBe('admin@creativeit.academy');
      expect(res.user.role).toBe(Role.ADMIN);
      expect(res.tokens.accessToken).toBeDefined();
      expect(res.tokens.refreshToken).toBeDefined();

      adminAccessToken = res.tokens.accessToken;
      adminUserId = res.user.id;
    });

    it('should throw UnauthorizedError (401) on invalid password', async () => {
      await expect(
        authService.login({
          email: 'admin@creativeit.academy',
          password: 'WrongPassword!123',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError (401) on non-existent user email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent_user_999@test.com',
          password: 'SomePassword123!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should fetch authenticated user identity with getMe(userId)', async () => {
      const user = await authService.getMe(adminUserId);
      expect(user).toBeDefined();
      expect(user.id).toBe(adminUserId);
      expect(user.role).toBe(Role.ADMIN);
    });

    it('should throw NotFoundError (404) for unknown userId in getMe', async () => {
      await expect(authService.getMe('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });
  });

  describe('2. End-to-End HTTP Production-Simulated Endpoints', () => {
    it('GET /api/v1/auth/me without token should return 401 UNAUTHORIZED (NOT 500)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('Authentication required');
    });

    it('GET /api/v1/auth/me with invalid token should return 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer invalid_garbage_jwt_token' },
      });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/auth/login with valid credentials returns 200 OK and sets cookies', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@creativeit.academy',
          password: 'Admin@123',
        }),
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('admin@creativeit.academy');
      expect(body.data.accessToken).toBeDefined();

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeDefined();
    });

    it('GET /api/v1/auth/me with valid Bearer token returns 200 and user profile', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('admin@creativeit.academy');
      expect(body.data.role).toBe('ADMIN');
    });

    it('GET /api/health and /api/v1/health return 200 healthy status', async () => {
      const res1 = await fetch(`${baseUrl}/api/health`);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.status).toBe('healthy');

      const res2 = await fetch(`${baseUrl}/api/v1/health`);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.status).toBe('healthy');
    });
  });
});
