/**
 * Mock useRoutes hook for testing
 *
 * This mock is loaded during Vitest's module resolution phase,
 * preventing the real useRoutes and its heavy dependencies
 * (Supabase, RouteService, OSRM) from being loaded.
 *
 * IMPORTANT: Uses stable object references to prevent infinite re-renders.
 * React compares object references - returning new objects causes re-renders.
 *
 * @see docs/specs/051-ci-test-memory/spec.md - OOM investigation
 */

import { vi } from 'vitest';

// Stable mock route data
const mockRoute = {
  id: 'mock-route-id',
  name: 'Mock Route',
  color: '#3B82F6',
  user_id: 'mock-user-id',
  metro_area_id: null,
  description: null,
  start_address: null,
  start_latitude: 35.1667,
  start_longitude: -84.8667,
  end_address: null,
  end_latitude: 35.2,
  end_longitude: -84.9,
  route_geometry: null,
  distance_miles: null,
  estimated_time_minutes: null,
  is_system_route: false,
  source_name: null,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

const mockRouteCompany = {
  id: 'mock-route-company-id',
  route_id: 'mock-route-id',
  user_id: 'mock-user-id',
  shared_company_id: null,
  private_company_id: null,
  tracking_id: null,
  sequence_order: 1,
  visit_on_next_ride: true,
  distance_from_start_miles: null,
  created_at: '2025-01-01T00:00:00.000Z',
};

// Stable mock functions
const mockCreateRoute = vi.fn().mockResolvedValue(mockRoute);
const mockUpdateRoute = vi
  .fn()
  .mockResolvedValue({
    ...mockRoute,
    name: 'Updated Mock Route',
    description: 'Updated description',
  });
const mockDeleteRoute = vi.fn().mockResolvedValue(undefined);
const mockAddCompanyToRoute = vi.fn().mockResolvedValue(mockRouteCompany);
const mockRemoveCompanyFromRoute = vi.fn().mockResolvedValue(undefined);
const mockReorderRouteCompanies = vi.fn().mockResolvedValue(undefined);
const mockToggleVisitOnNextRide = vi.fn().mockResolvedValue(undefined);
const mockGetRouteById = vi.fn().mockResolvedValue(null);
const mockGetRouteWithCompanies = vi.fn().mockResolvedValue(null);
const mockGetRouteSummaries = vi.fn().mockResolvedValue([]);
const mockGenerateRouteGeometry = vi.fn().mockResolvedValue(null);
const mockStartRoutePlanning = vi.fn().mockResolvedValue(undefined);
const mockEndRoutePlanning = vi.fn().mockResolvedValue(undefined);
const mockRefreshRoutes = vi.fn().mockResolvedValue(undefined);
const mockCheckRoutesLimit = vi.fn().mockReturnValue({
  withinSoftLimit: true,
  withinHardLimit: true,
  current: 0,
  softLimit: 20,
  hardLimit: 50,
});
const mockCheckRouteCompaniesLimit = vi.fn().mockReturnValue({
  withinSoftLimit: true,
  withinHardLimit: true,
  current: 0,
  softLimit: 50,
  hardLimit: 100,
});

// Stable routes array (empty by default)
const mockRoutes: (typeof mockRoute)[] = [];

// Stable return object (same reference across calls)
const mockReturnValue = {
  routes: mockRoutes,
  activeRouteId: null,
  activeRoutePlanning: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  createRoute: mockCreateRoute,
  updateRoute: mockUpdateRoute,
  deleteRoute: mockDeleteRoute,
  addCompanyToRoute: mockAddCompanyToRoute,
  removeCompanyFromRoute: mockRemoveCompanyFromRoute,
  reorderRouteCompanies: mockReorderRouteCompanies,
  toggleVisitOnNextRide: mockToggleVisitOnNextRide,
  getRouteById: mockGetRouteById,
  getRouteWithCompanies: mockGetRouteWithCompanies,
  getRouteSummaries: mockGetRouteSummaries,
  generateRouteGeometry: mockGenerateRouteGeometry,
  startRoutePlanning: mockStartRoutePlanning,
  endRoutePlanning: mockEndRoutePlanning,
  refreshRoutes: mockRefreshRoutes,
  checkRoutesLimit: mockCheckRoutesLimit,
  checkRouteCompaniesLimit: mockCheckRouteCompaniesLimit,
};

export const useRoutes = vi.fn(() => mockReturnValue);

// Export for cache reset testing (matches real module API)
export const __resetCacheForTesting = vi.fn();
