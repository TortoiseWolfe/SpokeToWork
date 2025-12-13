/**
 * Mock useUserProfile hook for testing
 *
 * This mock is loaded during Vitest's module resolution phase,
 * preventing the real useUserProfile and its heavy dependencies
 * (Supabase, AuthContext) from being loaded.
 *
 * IMPORTANT: Uses stable object references to prevent infinite re-renders.
 * React compares object references - returning new objects causes re-renders.
 *
 * @see docs/specs/051-ci-test-memory/spec.md - OOM investigation
 */

import { vi } from 'vitest';

// Stable profile object (same reference across calls)
const mockProfile = {
  id: 'mock-user-id',
  email: 'test@example.com',
  display_name: 'Test User',
  avatar_url: null,
  home_address: '123 Test St, Test City, TS 12345',
  home_latitude: 35.1667,
  home_longitude: -84.8667,
  preferred_theme: 'light',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

// Stable mock functions
const mockUpdateProfile = vi.fn().mockResolvedValue({
  ...mockProfile,
  display_name: 'Updated User',
});
const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);

// Stable return object (same reference across calls)
const mockReturnValue = {
  profile: mockProfile,
  loading: false,
  isLoading: false,
  error: null,
  updateProfile: mockUpdateProfile,
  refreshProfile: mockRefreshProfile,
};

export const useUserProfile = vi.fn(() => mockReturnValue);
