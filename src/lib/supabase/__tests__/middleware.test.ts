/**
 * Unit Tests for supabase/middleware.ts
 * Feature 052 - Test Coverage Expansion
 *
 * Tests session handling and cookie management in Next.js middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase SSR client
const mockGetUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('supabase/middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('updateSession()', () => {
    it('should return NextResponse', async () => {
      const { updateSession } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/');
      const response = await updateSession(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle missing environment variables gracefully', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      vi.resetModules();

      const { updateSession } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/');
      const response = await updateSession(request);

      // Should return response without throwing
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should call getUser to refresh session', async () => {
      const { updateSession } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/test');
      await updateSession(request);

      expect(mockGetUser).toHaveBeenCalled();
    });

    it('should redirect authenticated users from /sign-in', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@test.com' } },
        error: null,
      });

      const { updateSession } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/sign-in');
      const response = await updateSession(request);

      // Check for redirect (status 307 or 308)
      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
    });

    it('should redirect authenticated users from /sign-up', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@test.com' } },
        error: null,
      });

      const { updateSession } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/sign-up');
      const response = await updateSession(request);

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
    });

    it('should allow unauthenticated users to access /sign-in', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { updateSession } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/sign-in');
      const response = await updateSession(request);

      // Status 200 means no redirect
      expect(response.status).toBe(200);
    });

    it('should pass through requests for public pages', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { updateSession } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/about');
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });
  });
});
