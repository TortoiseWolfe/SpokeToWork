import { describe, it, expect } from 'vitest';
import { extendRoutesToHome } from './route-geometry';
import type {
  BicycleRoute,
  LineStringGeometry,
  MultiLineStringGeometry,
} from '@/types/route';

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

describe('extendRoutesToHome', () => {
  it('returns routes unchanged when homeCoords is null', () => {
    const routes = [mkRoute()];
    const result = extendRoutesToHome(routes, null);
    expect(result).toBe(routes); // Same reference
  });

  it('passes through system routes unchanged', () => {
    const geom: LineStringGeometry = {
      type: 'LineString',
      coordinates: [
        [-84.0, 35.0],
        [-84.1, 35.1],
      ],
    };
    const route = mkRoute({ is_system_route: true, route_geometry: geom });
    const result = extendRoutesToHome([route], {
      latitude: 35.5,
      longitude: -84.5,
    });
    expect(result[0]).toBe(route); // Same reference
  });

  it('passes through routes without geometry', () => {
    const route = mkRoute({ route_geometry: null });
    const result = extendRoutesToHome([route], {
      latitude: 35.5,
      longitude: -84.5,
    });
    expect(result[0]).toBe(route);
  });

  it('prepends home coord to user route geometry', () => {
    const geom: LineStringGeometry = {
      type: 'LineString',
      coordinates: [
        [-84.0, 35.0],
        [-84.1, 35.1],
      ],
    };
    const route = mkRoute({ route_geometry: geom });
    const result = extendRoutesToHome([route], {
      latitude: 35.5,
      longitude: -84.5,
    });
    // GeoJSON is [lng, lat] — home coord prepended
    expect(result[0].route_geometry).toEqual({
      type: 'LineString',
      coordinates: [
        [-84.5, 35.5], // home prepended
        [-84.0, 35.0],
        [-84.1, 35.1],
      ],
    });
    // Original not mutated
    expect(route.route_geometry!.coordinates).toHaveLength(2);
  });

  it('skips prepend when route already starts within ~10m of home', () => {
    const geom: LineStringGeometry = {
      type: 'LineString',
      // First coord within 0.0001 deg of home [-84.5, 35.5]
      coordinates: [
        [-84.50005, 35.50005],
        [-84.1, 35.1],
      ],
    };
    const route = mkRoute({ route_geometry: geom });
    const result = extendRoutesToHome([route], {
      latitude: 35.5,
      longitude: -84.5,
    });
    // Unchanged — same reference
    expect(result[0]).toBe(route);
  });

  it('passes through MultiLineString routes unchanged', () => {
    const geom: MultiLineStringGeometry = {
      type: 'MultiLineString',
      coordinates: [
        [
          [-84.0, 35.0],
          [-84.1, 35.1],
        ],
      ],
    };
    const route = mkRoute({ route_geometry: geom });
    const result = extendRoutesToHome([route], {
      latitude: 35.5,
      longitude: -84.5,
    });
    expect(result[0]).toBe(route);
  });
});
