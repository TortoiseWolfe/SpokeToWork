import { describe, it, expect } from 'vitest';
import {
  buildCompanyMarkers,
  buildRouteEndpointMarkers,
  buildUserLocationMarker,
  buildWorkspaceCompanyMarkers,
} from './marker-builders';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mkRouteCompany = (
  overrides: Partial<RouteCompanyWithDetails> = {}
): RouteCompanyWithDetails => ({
  id: 'rc-1',
  route_id: 'route-1',
  user_id: 'user-1',
  shared_company_id: null,
  private_company_id: 'priv-1',
  tracking_id: null,
  sequence_order: 0,
  visit_on_next_ride: false,
  distance_from_start_miles: null,
  created_at: '2026-01-01T00:00:00Z',
  company: {
    id: 'priv-1',
    name: 'Acme Corp',
    address: '123 Main St',
    latitude: 35.1,
    longitude: -84.8,
    source: 'private',
  },
  ...overrides,
});

const mkRoute = (overrides: Partial<BicycleRoute> = {}): BicycleRoute => ({
  id: 'route-1',
  user_id: 'user-1',
  metro_area_id: null,
  name: 'My Route',
  description: null,
  color: '#3B82F6',
  start_address: null,
  start_latitude: null,
  start_longitude: null,
  end_address: null,
  end_latitude: null,
  end_longitude: null,
  route_geometry: null,
  distance_miles: null,
  estimated_time_minutes: null,
  is_system_route: false,
  source_name: null,
  is_active: true,
  start_type: 'home',
  end_type: 'home',
  is_round_trip: true,
  last_optimized_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// buildCompanyMarkers
// ---------------------------------------------------------------------------

describe('buildCompanyMarkers', () => {
  it('returns empty array when activeRouteId is null', () => {
    const rc = [mkRouteCompany()];
    expect(buildCompanyMarkers(rc, null)).toEqual([]);
  });

  it('filters to only the active route', () => {
    const rc = [
      mkRouteCompany({ id: 'rc-1', route_id: 'route-1' }),
      mkRouteCompany({ id: 'rc-2', route_id: 'route-2' }),
    ];
    const result = buildCompanyMarkers(rc, 'route-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('company-rc-1');
  });

  it('skips companies without coordinates', () => {
    const rc = [
      mkRouteCompany({
        id: 'rc-1',
        company: {
          id: 'c1',
          name: 'No Coords',
          address: null,
          latitude: null,
          longitude: null,
          source: 'private',
        },
      }),
      mkRouteCompany({ id: 'rc-2' }),
    ];
    const result = buildCompanyMarkers(rc, 'route-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('company-rc-2');
  });

  it('applies next-ride variant when visit_on_next_ride is true', () => {
    const rc = [
      mkRouteCompany({ id: 'rc-1', visit_on_next_ride: true }),
      mkRouteCompany({ id: 'rc-2', visit_on_next_ride: false }),
    ];
    const result = buildCompanyMarkers(rc, 'route-1');
    expect(result[0].variant).toBe('next-ride');
    expect(result[0].popup).toContain('🚴 Next Ride');
    expect(result[1].variant).toBe('active-route');
  });

  it('builds correct position tuple [lat, lng]', () => {
    const rc = [mkRouteCompany()];
    const result = buildCompanyMarkers(rc, 'route-1');
    expect(result[0].position).toEqual([35.1, -84.8]);
  });
});

// ---------------------------------------------------------------------------
// buildRouteEndpointMarkers
// ---------------------------------------------------------------------------

describe('buildRouteEndpointMarkers', () => {
  it('returns empty array when activeRoute is null', () => {
    expect(buildRouteEndpointMarkers(null, null)).toEqual([]);
    expect(buildRouteEndpointMarkers(undefined, null)).toEqual([]);
  });

  it('creates home marker for user route with home coords', () => {
    const route = mkRoute({ is_system_route: false });
    const home = { latitude: 35.2, longitude: -84.9, address: '42 Home Rd' };
    const result = buildRouteEndpointMarkers(route, home);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('home-route-1');
    expect(result[0].position).toEqual([35.2, -84.9]);
    expect(result[0].popup).toBe('42 Home Rd');
    expect(result[0].variant).toBe('start-point');
  });

  it('falls back to "Home" popup when no address', () => {
    const route = mkRoute({ is_system_route: false });
    const home = { latitude: 35.2, longitude: -84.9 };
    const result = buildRouteEndpointMarkers(route, home);
    expect(result[0].popup).toBe('Home');
  });

  it('returns empty for user route without home coords', () => {
    const route = mkRoute({ is_system_route: false });
    expect(buildRouteEndpointMarkers(route, null)).toEqual([]);
  });

  it('creates start + end markers for system route', () => {
    const route = mkRoute({
      is_system_route: true,
      start_latitude: 35.0,
      start_longitude: -84.0,
      start_address: 'Trail Head',
      end_latitude: 35.5,
      end_longitude: -84.5,
      end_address: 'Trail End',
    });
    const result = buildRouteEndpointMarkers(route, null);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('start-route-1');
    expect(result[0].variant).toBe('start-point');
    expect(result[1].id).toBe('end-route-1');
    expect(result[1].variant).toBe('end-point');
  });

  it('skips end marker when same coords as start', () => {
    const route = mkRoute({
      is_system_route: true,
      start_latitude: 35.0,
      start_longitude: -84.0,
      end_latitude: 35.0,
      end_longitude: -84.0,
    });
    const result = buildRouteEndpointMarkers(route, null);
    expect(result).toHaveLength(1);
    expect(result[0].variant).toBe('start-point');
  });
});

// ---------------------------------------------------------------------------
// buildUserLocationMarker
// ---------------------------------------------------------------------------

describe('buildUserLocationMarker', () => {
  it('returns null when location is null', () => {
    expect(buildUserLocationMarker(null)).toBeNull();
  });

  it('builds marker with accuracy in popup', () => {
    const result = buildUserLocationMarker([35.1, -84.8], 12.7);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('user-location');
    expect(result!.position).toEqual([35.1, -84.8]);
    expect(result!.popup).toBe('You are here (Accuracy: ±13m)');
  });

  it('defaults accuracy to 0 when undefined', () => {
    const result = buildUserLocationMarker([35.1, -84.8]);
    expect(result!.popup).toBe('You are here (Accuracy: ±0m)');
  });
});

// ---------------------------------------------------------------------------
// buildWorkspaceCompanyMarkers
// ---------------------------------------------------------------------------

describe('buildWorkspaceCompanyMarkers', () => {
  const companies = [
    { id: 'c1', name: 'Alpha', latitude: 35.1, longitude: -84.8 },
    { id: 'c2', name: 'Beta', latitude: null, longitude: null },
    { id: 'c3', name: 'Gamma', latitude: 35.2, longitude: -84.9 },
  ];

  it('filters companies without coordinates', () => {
    const result = buildWorkspaceCompanyMarkers(companies);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(['company-c1', 'company-c3']);
  });

  it('applies active-route variant for companies in the set', () => {
    const result = buildWorkspaceCompanyMarkers(companies, new Set(['c1']));
    expect(result[0].variant).toBe('active-route');
    expect(result[1].variant).toBe('default');
  });

  it('uses company name as popup', () => {
    const result = buildWorkspaceCompanyMarkers(companies);
    expect(result[0].popup).toBe('Alpha');
  });
});
