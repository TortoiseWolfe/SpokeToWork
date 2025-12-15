/**
 * Unit Tests for useRoutes
 * Feature 052 - Test Coverage Expansion (T019)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock route data
const mockRoutes = [
  {
    id: 'route-1',
    user_id: 'user-123',
    name: 'Test Route',
    description: 'A test route',
    metro_area_id: 'metro-1',
    route_geometry: null,
    distance_miles: null,
    estimated_time_minutes: null,
    is_system_route: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Mock service methods
const mockGetRoutes = vi.fn();
const mockCreateRoute = vi.fn();
const mockUpdateRoute = vi.fn();
const mockDeleteRoute = vi.fn();
const mockGetRouteById = vi.fn();
const mockGetRouteWithCompanies = vi.fn();
const mockGetSystemRoutes = vi.fn();
const mockAddCompanyToRoute = vi.fn();
const mockRemoveCompanyFromRoute = vi.fn();
const mockReorderCompanies = vi.fn();
const mockGetRouteCompanies = vi.fn();
const mockToggleNextRide = vi.fn();
const mockGetNextRideCompanies = vi.fn();
const mockClearAllNextRide = vi.fn();
const mockSetActiveRoute = vi.fn();
const mockClearActiveRoute = vi.fn();
const mockGetActiveRoute = vi.fn();
const mockCheckRouteLimits = vi.fn();
const mockCheckRouteCompanyLimits = vi.fn();
const mockGetRouteSummaries = vi.fn();

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

// Mock OSRM service
vi.mock('@/lib/routing/osrm-service', () => ({
  getBicycleRoute: vi.fn().mockResolvedValue({
    geometry: 'mock-geometry',
    distanceMiles: 5.5,
    durationMinutes: 30,
  }),
}));

// Mock RouteService
vi.mock('@/lib/routes/route-service', () => ({
  createRouteService: vi.fn(() => ({
    getRoutes: () => mockGetRoutes(),
    createRoute: (data: unknown) => mockCreateRoute(data),
    updateRoute: (data: unknown) => mockUpdateRoute(data),
    deleteRoute: (id: string) => mockDeleteRoute(id),
    getRouteById: (id: string) => mockGetRouteById(id),
    getRouteWithCompanies: (id: string) => mockGetRouteWithCompanies(id),
    getSystemRoutes: (metroAreaId?: string) => mockGetSystemRoutes(metroAreaId),
    addCompanyToRoute: (data: unknown) => mockAddCompanyToRoute(data),
    removeCompanyFromRoute: (id: string) => mockRemoveCompanyFromRoute(id),
    reorderCompanies: (data: unknown) => mockReorderCompanies(data),
    getRouteCompanies: (routeId: string) => mockGetRouteCompanies(routeId),
    toggleNextRide: (id: string) => mockToggleNextRide(id),
    getNextRideCompanies: () => mockGetNextRideCompanies(),
    clearAllNextRide: () => mockClearAllNextRide(),
    setActiveRoute: (id: string) => mockSetActiveRoute(id),
    clearActiveRoute: () => mockClearActiveRoute(),
    getActiveRoute: () => mockGetActiveRoute(),
    checkRouteLimits: () => mockCheckRouteLimits(),
    checkRouteCompanyLimits: (id: string) => mockCheckRouteCompanyLimits(id),
    getRouteSummaries: () => mockGetRouteSummaries(),
  })),
}));

// Import after mocks
import { useRoutes, __resetCacheForTesting } from '../useRoutes';

describe('useRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCacheForTesting();

    mockGetRoutes.mockResolvedValue(mockRoutes);
    mockGetActiveRoute.mockResolvedValue(null);
    mockCreateRoute.mockResolvedValue(mockRoutes[0]);
    mockUpdateRoute.mockResolvedValue(mockRoutes[0]);
    mockDeleteRoute.mockResolvedValue(undefined);
    mockCheckRouteLimits.mockResolvedValue({
      canCreate: true,
      current: 1,
      limit: 10,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useRoutes());

      expect(result.current.isLoading).toBe(true);
    });

    it('should fetch routes on mount', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRoutes).toHaveBeenCalled();
    });

    it('should set routes after fetch', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.routes).toEqual(mockRoutes);
    });

    it('should skip initial fetch when skip option is true', async () => {
      renderHook(() => useRoutes({ skip: true }));

      // Wait a bit to ensure no fetch happened
      await new Promise((r) => setTimeout(r, 100));

      expect(mockGetRoutes).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      mockGetRoutes.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('createRoute', () => {
    it('should create a route', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createRoute({
          name: 'New Route',
          metro_area_id: 'metro-1',
          start_latitude: 33.7,
          start_longitude: -84.4,
          end_latitude: 33.8,
          end_longitude: -84.3,
        });
      });

      expect(mockCreateRoute).toHaveBeenCalled();
    });
  });

  describe('updateRoute', () => {
    it('should update a route', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateRoute({
          id: 'route-1',
          name: 'Updated Route',
        });
      });

      expect(mockUpdateRoute).toHaveBeenCalled();
    });
  });

  describe('deleteRoute', () => {
    it('should delete a route', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteRoute('route-1');
      });

      expect(mockDeleteRoute).toHaveBeenCalledWith('route-1');
    });
  });

  describe('active route', () => {
    it('should set active route', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setActiveRoute('route-1');
      });

      expect(mockSetActiveRoute).toHaveBeenCalledWith('route-1');
      expect(result.current.activeRouteId).toBe('route-1');
    });

    it('should clear active route', async () => {
      mockGetActiveRoute.mockResolvedValue({ route_id: 'route-1' });

      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearActiveRoute();
      });

      expect(mockClearActiveRoute).toHaveBeenCalled();
      expect(result.current.activeRouteId).toBeNull();
    });
  });

  describe('refetch', () => {
    it('should refetch routes', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockGetRoutes.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetRoutes.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('invalidateCache', () => {
    it('should be callable', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.invalidateCache()).not.toThrow();
    });
  });

  describe('route company operations', () => {
    it('should add company to route', async () => {
      mockAddCompanyToRoute.mockResolvedValue({
        id: 'rc-1',
        route_id: 'route-1',
        company_id: 'company-1',
      });

      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addCompanyToRoute({
          route_id: 'route-1',
          private_company_id: 'company-1',
        });
      });

      expect(mockAddCompanyToRoute).toHaveBeenCalled();
    });

    it('should remove company from route', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeCompanyFromRoute('rc-1');
      });

      expect(mockRemoveCompanyFromRoute).toHaveBeenCalledWith('rc-1');
    });
  });

  describe('checkRouteLimits', () => {
    it('should check route limits', async () => {
      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let limitResult;
      await act(async () => {
        limitResult = await result.current.checkRouteLimits();
      });

      expect(mockCheckRouteLimits).toHaveBeenCalled();
      expect(limitResult).toEqual({
        canCreate: true,
        current: 1,
        limit: 10,
      });
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useRoutes());

      expect(result.current).toHaveProperty('routes');
      expect(result.current).toHaveProperty('activeRouteId');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('createRoute');
      expect(result.current).toHaveProperty('updateRoute');
      expect(result.current).toHaveProperty('deleteRoute');
      expect(result.current).toHaveProperty('getRouteById');
      expect(result.current).toHaveProperty('getRouteWithCompanies');
      expect(result.current).toHaveProperty('getSystemRoutes');
      expect(result.current).toHaveProperty('addCompanyToRoute');
      expect(result.current).toHaveProperty('removeCompanyFromRoute');
      expect(result.current).toHaveProperty('reorderCompanies');
      expect(result.current).toHaveProperty('getRouteCompanies');
      expect(result.current).toHaveProperty('toggleNextRide');
      expect(result.current).toHaveProperty('getNextRideCompanies');
      expect(result.current).toHaveProperty('clearAllNextRide');
      expect(result.current).toHaveProperty('setActiveRoute');
      expect(result.current).toHaveProperty('clearActiveRoute');
      expect(result.current).toHaveProperty('checkRouteLimits');
      expect(result.current).toHaveProperty('checkRouteCompanyLimits');
      expect(result.current).toHaveProperty('getRouteSummaries');
      expect(result.current).toHaveProperty('generateRouteGeometry');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('invalidateCache');
    });
  });
});
