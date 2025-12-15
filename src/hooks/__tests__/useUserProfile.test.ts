/**
 * Unit Tests for useUserProfile
 * Feature 052 - Test Coverage Expansion (T020)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock profile data
const mockProfile = {
  id: 'user-123',
  username: 'testuser',
  display_name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
  bio: 'Test bio',
  home_address: '123 Test St',
  home_latitude: 33.7,
  home_longitude: -84.4,
  distance_radius_miles: 10,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Create mock response holder
let mockSupabaseResponse: {
  data: typeof mockProfile | null;
  error: object | null;
} = { data: mockProfile, error: null };

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(mockSupabaseResponse)),
        })),
      })),
    })),
  })),
}));

// Mock useAuth
const mockUser = { id: 'user-123' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    session: { user: mockUser },
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
  })),
}));

// Import after mocks
import { useUserProfile } from '../useUserProfile';

describe('useUserProfile', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset to default successful response
    mockSupabaseResponse = { data: mockProfile, error: null };

    // Reset useAuth mock to return a valid user
    const { useAuth } = await import('@/contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { user: mockUser },
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useUserProfile());

      expect(result.current.loading).toBe(true);
    });

    it('should fetch profile on mount', async () => {
      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should set profile after fetch', async () => {
      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
    });
  });

  describe('when user is not authenticated', () => {
    it('should return null profile when no user', async () => {
      const { useAuth } = await import('@/contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      } as never);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      // Set error response before rendering
      mockSupabaseResponse = {
        data: null,
        error: { code: 'UNKNOWN', message: 'Database error' },
      };

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load profile');
    });

    it('should handle PGRST116 (no rows found) gracefully', async () => {
      // Set PGRST116 error response
      mockSupabaseResponse = {
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      };

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('refetch', () => {
    it('should be a callable function', async () => {
      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify refetch is a function that can be called
      expect(typeof result.current.refetch).toBe('function');

      // Call refetch - should not throw
      await act(async () => {
        await result.current.refetch();
      });

      // Profile should still be available
      expect(result.current.profile).toEqual(mockProfile);
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useUserProfile());

      expect(result.current).toHaveProperty('profile');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
    });
  });
});
