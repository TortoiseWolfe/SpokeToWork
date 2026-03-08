/**
 * Route Geometry Helpers — Pure Functions
 *
 * Extracted from src/app/map/page.tsx displayRoutes useMemo (Phase 2).
 * Transforms route geometries for display (e.g., prepending home coordinate).
 */

import type { BicycleRoute } from '@/types/route';

/**
 * Home coordinates slice. Matches UserProfile/HomeLocation shape.
 */
export interface GeometryHomeCoords {
  latitude: number;
  longitude: number;
}

/**
 * Degree-delta threshold ≈ 10 meters at mid-latitudes.
 * Used to detect whether a route already starts at home.
 */
const NEAR_HOME_DEG_THRESHOLD = 0.0001;

/**
 * For user routes with a home location set, prepend the home coordinate to
 * the route's LineString geometry so the polyline visually connects to the
 * home marker.
 *
 * Skips:
 * - System routes (they have their own trail start/end points)
 * - Routes without geometry
 * - Routes that already start within ~10m of home
 *
 * @param routes - Routes to transform (unmodified entries are returned by ref)
 * @param homeCoords - User's home location (null → passthrough)
 */
export function extendRoutesToHome(
  routes: BicycleRoute[],
  homeCoords: GeometryHomeCoords | null
): BicycleRoute[] {
  if (!homeCoords) return routes;

  // GeoJSON uses [lng, lat] ordering
  const homeCoord: [number, number] = [
    homeCoords.longitude,
    homeCoords.latitude,
  ];

  return routes.map((route) => {
    // Only modify user routes (not system routes) with existing geometry
    if (route.is_system_route || !route.route_geometry) {
      return route;
    }

    const geometry = route.route_geometry;

    // Only LineString is extendable; MultiLineString passes through
    if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
      return route;
    }

    if (geometry.coordinates.length === 0) {
      return route;
    }

    const firstCoord = geometry.coordinates[0] as [number, number];

    // Check if already starts at home (within ~10 meters)
    const alreadyAtHome =
      Math.abs(firstCoord[0] - homeCoord[0]) < NEAR_HOME_DEG_THRESHOLD &&
      Math.abs(firstCoord[1] - homeCoord[1]) < NEAR_HOME_DEG_THRESHOLD;

    if (alreadyAtHome) {
      return route;
    }

    return {
      ...route,
      route_geometry: {
        ...geometry,
        coordinates: [
          homeCoord,
          ...(geometry.coordinates as [number, number][]),
        ],
      },
    } as BicycleRoute;
  });
}
