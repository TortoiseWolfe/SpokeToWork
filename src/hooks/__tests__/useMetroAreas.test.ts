/**
 * Unit Tests for useMetroAreas
 * Feature 052 - Test Coverage Expansion (T018)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock metro areas data
const mockMetroAreas = [
  { id: 'metro-1', name: 'Atlanta', state: 'GA', country: 'US' },
  { id: 'metro-2', name: 'New York', state: 'NY', country: 'US' },
];

// Mock getMetroAreas function
const mockGetMetroAreas = vi.fn();

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: mockMetroAreas,
            error: null,
          })
        ),
      })),
    })),
  })),
}));

// Mock MultiTenantCompanyService with a proper class
vi.mock('@/lib/companies/multi-tenant-service', () => ({
  MultiTenantCompanyService: class MockMultiTenantCompanyService {
    getMetroAreas() {
      return mockGetMetroAreas();
    }
  },
}));

// Import after mocks
import { useMetroAreas } from '../useMetroAreas';

describe('useMetroAreas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetroAreas.mockResolvedValue(mockMetroAreas);

    // Reset module cache to clear the module-level metroAreasCache
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with isLoading true when cache is empty', async () => {
      // Re-import to get fresh module state
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should fetch metro areas on mount', async () => {
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetMetroAreas).toHaveBeenCalled();
    });

    it('should set metroAreas after fetch', async () => {
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metroAreas).toEqual(mockMetroAreas);
    });
  });

  describe('getById', () => {
    it('should return undefined for unknown id', async () => {
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const metro = result.current.getById('unknown-id');
      expect(metro).toBeUndefined();
    });

    it('should return metro area by id', async () => {
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const metro = result.current.getById('metro-1');
      expect(metro).toEqual(mockMetroAreas[0]);
    });
  });

  describe('invalidateCache', () => {
    it('should be callable', async () => {
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.invalidateCache()).not.toThrow();
    });
  });

  describe('refetch', () => {
    it('should refetch metro areas', async () => {
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockGetMetroAreas.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      // Should have been called at least one more time
      expect(mockGetMetroAreas.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      mockGetMetroAreas.mockRejectedValue(new Error('Network error'));

      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', async () => {
      const { useMetroAreas: freshHook } = await import('../useMetroAreas');
      const { result } = renderHook(() => freshHook());

      expect(result.current).toHaveProperty('metroAreas');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isFromCache');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('getById');
      expect(result.current).toHaveProperty('invalidateCache');
    });
  });
});
