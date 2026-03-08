/**
 * Unit Tests for useTileProviders
 * Feature 052 - Test Coverage Expansion (T027)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTileProviders } from '../useTileProviders';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}));

// Mock TileProviderService
const mockService = {
  initialize: vi.fn(),
  getProviders: vi.fn(),
  getSelectedProvider: vi.fn(),
  hasApiKey: vi.fn(),
  selectProvider: vi.fn(),
  setApiKey: vi.fn(),
  isProviderAvailable: vi.fn(),
  resetToDefault: vi.fn(),
  getTileUrl: vi.fn(),
};

vi.mock('@/lib/map/tile-provider-service', () => ({
  createTileProviderService: vi.fn(() => mockService),
  DEFAULT_TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  DEFAULT_ATTRIBUTION: '© OpenStreetMap contributors',
}));

describe('useTileProviders', () => {
  const mockProvider = {
    id: 'provider-1',
    name: 'OpenStreetMap',
    display_name: 'OpenStreetMap',
    tile_url_template: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    max_zoom: 19,
    requires_api_key: false,
    is_cycling_optimized: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockService.initialize.mockResolvedValue(undefined);
    mockService.getProviders.mockReturnValue([mockProvider]);
    mockService.getSelectedProvider.mockReturnValue(mockProvider);
    mockService.hasApiKey.mockReturnValue(false);
    mockService.getTileUrl.mockReturnValue(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    );
    mockService.isProviderAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useTileProviders());

      expect(result.current.isLoading).toBe(true);
    });

    it('should call service initialize on mount', async () => {
      renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(mockService.initialize).toHaveBeenCalled();
      });
    });

    it('should set isLoading to false after initialization', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should load providers from service', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.providers).toEqual([mockProvider]);
      });
    });

    it('should set selected provider from service', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.selected).toEqual(mockProvider);
      });
    });

    it('should handle initialization error', async () => {
      mockService.initialize.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toContain('Init failed');
      });
    });
  });

  describe('selectProvider', () => {
    it('should call service selectProvider', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectProvider('CyclOSM');
      });

      expect(mockService.selectProvider).toHaveBeenCalledWith('CyclOSM');
    });

    it('should update selected after selection', async () => {
      const newProvider = { ...mockProvider, name: 'CyclOSM' };
      mockService.getSelectedProvider.mockReturnValue(newProvider);

      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectProvider('CyclOSM');
      });

      expect(mockService.getSelectedProvider).toHaveBeenCalled();
    });
  });

  describe('setApiKey', () => {
    it('should call service setApiKey', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setApiKey('test-api-key');
      });

      expect(mockService.setApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('should update hasApiKey state', async () => {
      mockService.hasApiKey.mockReturnValue(true);

      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setApiKey('test-api-key');
      });

      expect(mockService.hasApiKey).toHaveBeenCalled();
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for available provider', async () => {
      mockService.isProviderAvailable.mockReturnValue(true);

      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const available = result.current.isProviderAvailable('OpenStreetMap');

      expect(available).toBe(true);
    });

    it('should return false for unavailable provider', async () => {
      mockService.isProviderAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const available = result.current.isProviderAvailable('PremiumProvider');

      expect(available).toBe(false);
    });
  });

  describe('resetToDefault', () => {
    it('should call service resetToDefault', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.resetToDefault();
      });

      expect(mockService.resetToDefault).toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('should re-initialize when refetch is called', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      // initialize called twice: once on mount, once on refetch
      expect(mockService.initialize).toHaveBeenCalledTimes(2);
    });
  });

  describe('computed values', () => {
    it('should return tileUrl from service', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tileUrl).toBe(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      );
    });

    it('should return attribution from selected provider', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.attribution).toBe('© OpenStreetMap contributors');
    });

    it('should return maxZoom from selected provider', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.maxZoom).toBe(19);
    });

    it('should return isCyclingOptimized from selected provider', async () => {
      const { result } = renderHook(() => useTileProviders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isCyclingOptimized).toBe(false);
    });
  });
});
