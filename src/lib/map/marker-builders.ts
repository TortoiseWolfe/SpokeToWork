/**
 * Map Marker Builders — Pure Functions
 *
 * Extracted from src/app/map/page.tsx (Phase 2 companies+map unification).
 * These builders convert domain entities (routes, companies, profile) into
 * MapMarker objects consumable by MapContainerInner.
 *
 * All functions are pure: no side effects, same inputs → same outputs.
 * Callers compose the markers array they need and pass it to MapView.
 */

import type { MapMarker } from '@/components/map/MapContainer/MapContainerInner';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

type Position = [number, number];

/**
 * Home coordinates shape used by several builders.
 * Matches the relevant slice of UserProfile / HomeLocation.
 */
export interface HomeCoords {
  latitude: number;
  longitude: number;
  /** Optional address label for marker popup. */
  address?: string | null;
}

/**
 * Build markers for companies on the active route.
 *
 * Variant: 'next-ride' if flagged for next ride, else 'active-route'.
 * Companies without coordinates are silently skipped.
 *
 * @param routeCompanies - All route-company associations (across all routes)
 * @param activeRouteId - Only companies on this route produce markers; null → []
 */
export function buildCompanyMarkers(
  routeCompanies: RouteCompanyWithDetails[],
  activeRouteId: string | null
): MapMarker[] {
  if (!activeRouteId) return [];

  return routeCompanies
    .filter(
      (rc) =>
        rc.route_id === activeRouteId &&
        rc.company.latitude != null &&
        rc.company.longitude != null
    )
    .map((rc) => ({
      id: `company-${rc.id}`,
      position: [rc.company.latitude!, rc.company.longitude!] as Position,
      popup: `${rc.company.name}${rc.visit_on_next_ride ? ' 🚴 Next Ride' : ''}`,
      variant: rc.visit_on_next_ride
        ? ('next-ride' as const)
        : ('active-route' as const),
    }));
}

/**
 * Build start/end markers for the active route.
 *
 * - User routes (is_system_route=false): single 'start-point' marker at home
 *   location (if provided). No end marker — user routes are round trips.
 * - System routes (trails): 'start-point' at trail start, 'end-point' at
 *   trail end (end skipped if same coords as start).
 *
 * @param activeRoute - The currently-active route (undefined/null → [])
 * @param homeCoords - User's home location for user-route start marker
 */
export function buildRouteEndpointMarkers(
  activeRoute: BicycleRoute | null | undefined,
  homeCoords: HomeCoords | null
): MapMarker[] {
  if (!activeRoute) return [];

  const markers: MapMarker[] = [];

  // User route: home location is the start/end point
  if (!activeRoute.is_system_route && homeCoords) {
    markers.push({
      id: `home-${activeRoute.id}`,
      position: [homeCoords.latitude, homeCoords.longitude] as Position,
      popup: homeCoords.address || 'Home',
      variant: 'start-point' as const,
    });
    return markers;
  }

  // System route (trail): use the route's own start/end coordinates
  if (activeRoute.is_system_route) {
    if (
      activeRoute.start_latitude != null &&
      activeRoute.start_longitude != null
    ) {
      markers.push({
        id: `start-${activeRoute.id}`,
        position: [
          activeRoute.start_latitude,
          activeRoute.start_longitude,
        ] as Position,
        popup: activeRoute.start_address || 'Trail Start',
        variant: 'start-point' as const,
      });
    }

    if (activeRoute.end_latitude != null && activeRoute.end_longitude != null) {
      const isSameAsStart =
        activeRoute.start_latitude === activeRoute.end_latitude &&
        activeRoute.start_longitude === activeRoute.end_longitude;

      if (!isSameAsStart) {
        markers.push({
          id: `end-${activeRoute.id}`,
          position: [
            activeRoute.end_latitude,
            activeRoute.end_longitude,
          ] as Position,
          popup: activeRoute.end_address || 'Trail End',
          variant: 'end-point' as const,
        });
      }
    }
  }

  return markers;
}

/**
 * Build a single marker representing the user's current geolocation.
 *
 * @param userLocation - [lat, lng] tuple or null
 * @param accuracy - Position accuracy in meters (shown in popup)
 * @returns Single MapMarker or null if no location
 */
export function buildUserLocationMarker(
  userLocation: Position | null,
  accuracy?: number | null
): MapMarker | null {
  if (!userLocation) return null;
  return {
    id: 'user-location',
    position: userLocation,
    popup: `You are here (Accuracy: ±${accuracy?.toFixed(0) || 0}m)`,
  };
}

/**
 * Build markers for a flat list of companies with coordinates.
 *
 * Used by the companies page split-view: every company with lat/lng gets a
 * marker. Companies on the active route get 'active-route' variant; others
 * get 'default'.
 *
 * Marker IDs use the pattern `company-<companyId>` so the parent can derive
 * selectedMarkerId from the selected company's ID.
 *
 * @param companies - Any list of objects with id/name/latitude/longitude
 * @param activeRouteCompanyIds - Set of company IDs that are on the active route
 */
export function buildWorkspaceCompanyMarkers<
  T extends {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
  },
>(companies: T[], activeRouteCompanyIds: Set<string> = new Set()): MapMarker[] {
  return companies
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      id: `company-${c.id}`,
      position: [c.latitude!, c.longitude!] as Position,
      popup: c.name,
      variant: activeRouteCompanyIds.has(c.id)
        ? ('active-route' as const)
        : ('default' as const),
    }));
}
