/**
 * Unit Tests for useCompanies
 * Feature 052 - Test Coverage Expansion (T015)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock data
const mockCompanies = [
  {
    source: 'private',
    tracking_id: null,
    company_id: null,
    private_company_id: 'priv-1',
    user_id: 'user-123',
    metro_area_id: 'metro-1',
    name: 'Test Company',
    website: 'https://test.com',
    careers_url: null,
    address: '123 Test St',
    latitude: 33.7,
    longitude: -84.4,
    phone: null,
    email: null,
    contact_name: null,
    contact_title: null,
    notes: null,
    status: 'researching',
    priority: 'medium',
    follow_up_date: null,
    is_active: true,
    is_verified: false,
    submit_to_shared: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Mock service methods
const mockGetUnifiedCompanies = vi.fn();
const mockCreatePrivateCompany = vi.fn();
const mockUpdatePrivateCompany = vi.fn();
const mockDeletePrivateCompany = vi.fn();
const mockTrackSharedCompany = vi.fn();
const mockUpdateTracking = vi.fn();
const mockStopTrackingCompany = vi.fn();
const mockInitialize = vi.fn();

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  })),
}));

// Mock MultiTenantCompanyService with proper class
vi.mock('@/lib/companies/multi-tenant-service', () => ({
  MultiTenantCompanyService: class MockMultiTenantCompanyService {
    initialize() {
      return mockInitialize();
    }
    getUnifiedCompanies() {
      return mockGetUnifiedCompanies();
    }
    createPrivateCompany(data: unknown) {
      return mockCreatePrivateCompany(data);
    }
    updatePrivateCompany(data: unknown) {
      return mockUpdatePrivateCompany(data);
    }
    deletePrivateCompany(id: string) {
      return mockDeletePrivateCompany(id);
    }
    trackSharedCompany(data: unknown) {
      return mockTrackSharedCompany(data);
    }
    updateTracking(data: unknown) {
      return mockUpdateTracking(data);
    }
    stopTrackingCompany(trackingId: string) {
      return mockStopTrackingCompany(trackingId);
    }
  },
}));

// Import after mocks
import { useCompanies } from '../useCompanies';

describe('useCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockInitialize.mockResolvedValue(undefined);
    mockGetUnifiedCompanies.mockResolvedValue(mockCompanies);
    mockCreatePrivateCompany.mockResolvedValue({
      id: 'priv-new',
      user_id: 'user-123',
      metro_area_id: 'metro-1',
      name: 'New Company',
      website: null,
      careers_url: null,
      address: null,
      latitude: null,
      longitude: null,
      phone: null,
      email: null,
      contact_name: null,
      contact_title: null,
      notes: null,
      status: 'researching',
      priority: 'medium',
      follow_up_date: null,
      is_active: true,
      submit_to_shared: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with isLoading true', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should fetch companies on mount', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetUnifiedCompanies).toHaveBeenCalled();
    });

    it('should set companies after fetch', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.companies).toEqual(mockCompanies);
    });

    it('should skip initial fetch when skip option is true', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      renderHook(() => freshHook({ skip: true }));

      // Wait a bit to ensure no fetch happened
      await new Promise((r) => setTimeout(r, 100));

      expect(mockGetUnifiedCompanies).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      mockGetUnifiedCompanies.mockRejectedValue(new Error('Network error'));

      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle unauthenticated user', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as never);

      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Not authenticated');
    });
  });

  describe('createPrivate', () => {
    it('should be a callable function', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify createPrivate is a function
      expect(typeof result.current.createPrivate).toBe('function');
    });
  });

  describe('refetch', () => {
    it('should be a callable function', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify refetch is callable
      expect(typeof result.current.refetch).toBe('function');

      // Call refetch - should not throw
      await act(async () => {
        await result.current.refetch();
      });

      // Companies should still be available after refetch
      expect(result.current.companies).toBeDefined();
    });
  });

  describe('invalidateCache', () => {
    it('should be callable', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.invalidateCache()).not.toThrow();
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', async () => {
      const { useCompanies: freshHook } = await import('../useCompanies');
      const { result } = renderHook(() => freshHook());

      expect(result.current).toHaveProperty('companies');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isFromCache');
      expect(result.current).toHaveProperty('isRefreshing');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('createPrivate');
      expect(result.current).toHaveProperty('updatePrivate');
      expect(result.current).toHaveProperty('deletePrivate');
      expect(result.current).toHaveProperty('trackShared');
      expect(result.current).toHaveProperty('updateTracking');
      expect(result.current).toHaveProperty('stopTracking');
      expect(result.current).toHaveProperty('invalidateCache');
    });
  });
});
