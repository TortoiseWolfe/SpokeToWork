/**
 * OSRM Bicycle Routing Service
 *
 * Uses the free OSRM bicycle routing server to generate actual bike paths
 * between waypoints. No API key required.
 */

import { createLogger } from '@/lib/logger';
import type { RouteGeometry } from '@/types/route';

const logger = createLogger('lib:routing:osrm');

// Free OSRM bicycle routing server (maintained by OpenStreetMap Germany)
const OSRM_BIKE_URL =
  'https://routing.openstreetmap.de/routed-bike/route/v1/bike';

export interface OSRMRouteResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: OSRMWaypoint[];
}

export interface OSRMRoute {
  geometry: RouteGeometry; // GeoJSON LineString
  distance: number; // meters
  duration: number; // seconds
  legs: OSRMRouteLeg[];
}

export interface OSRMRouteLeg {
  distance: number;
  duration: number;
  summary: string;
  steps: OSRMRouteStep[];
}

export interface OSRMRouteStep {
  distance: number;
  duration: number;
  name: string;
  mode: string;
}

export interface OSRMWaypoint {
  name: string;
  location: [number, number]; // [lng, lat]
  distance: number; // distance from input to snapped location
}

export interface BicycleRouteResult {
  geometry: RouteGeometry;
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
}

// Threshold for extending route to actual waypoint (meters)
// When OSRM snaps further than this, add a spur to reach the actual location
const SNAP_THRESHOLD_METERS = 50;

/**
 * Get bicycle route between multiple waypoints using OSRM
 *
 * @param waypoints Array of [latitude, longitude] pairs in visit order
 * @returns Route geometry, distance, and duration or null if routing fails
 */
export async function getBicycleRoute(
  waypoints: [number, number][]
): Promise<BicycleRouteResult | null> {
  if (waypoints.length < 2) {
    logger.warn('Need at least 2 waypoints for routing');
    return null;
  }

  // Validate coordinates
  for (const [lat, lng] of waypoints) {
    if (!isValidCoordinate(lat, lng)) {
      logger.error('Invalid coordinates in waypoints', { lat, lng });
      return null;
    }
  }

  // Convert to OSRM format: lng,lat;lng,lat;...
  // OSRM uses longitude,latitude order (opposite of Leaflet)
  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');

  const url = `${OSRM_BIKE_URL}/${coords}?overview=full&geometries=geojson&steps=false`;

  logger.info('Fetching bicycle route from OSRM', {
    waypointCount: waypoints.length,
    url: url.substring(0, 100) + '...',
  });

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.error('OSRM request failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data: OSRMRouteResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      logger.warn('OSRM returned no routes', { code: data.code });
      return null;
    }

    const route = data.routes[0];

    // Extend geometry to reach actual waypoints when OSRM snaps too far
    const extendedGeometry = extendGeometryToWaypoints(
      route.geometry,
      waypoints,
      data.waypoints
    );

    const result: BicycleRouteResult = {
      geometry: extendedGeometry,
      distanceMeters: route.distance,
      distanceMiles: route.distance / 1609.34,
      durationSeconds: route.duration,
      durationMinutes: Math.round(route.duration / 60),
    };

    logger.info('Bicycle route calculated', {
      distanceMiles: result.distanceMiles.toFixed(2),
      durationMinutes: result.durationMinutes,
      coordinateCount: extendedGeometry.coordinates.length,
    });

    return result;
  } catch (error) {
    logger.error('Failed to fetch bicycle route', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Extend route geometry to include actual waypoint locations when OSRM
 * snaps to roads too far from the requested coordinates.
 *
 * For each waypoint where OSRM snapped > SNAP_THRESHOLD_METERS away,
 * insert the actual waypoint coordinates into the geometry.
 */
function extendGeometryToWaypoints(
  geometry: RouteGeometry,
  inputWaypoints: [number, number][],
  osrmWaypoints: OSRMWaypoint[]
): RouteGeometry {
  if (inputWaypoints.length !== osrmWaypoints.length) {
    logger.warn('Waypoint count mismatch, skipping extension');
    return geometry;
  }

  // Cast coordinates - LineString always has [number, number][] format
  const coordinates: [number, number][] = [
    ...(geometry.coordinates as [number, number][]),
  ];
  let insertOffset = 0;

  for (let i = 0; i < osrmWaypoints.length; i++) {
    const osrmWp = osrmWaypoints[i];
    const inputWp = inputWaypoints[i];
    const [inputLat, inputLng] = inputWp;
    const inputCoord: [number, number] = [inputLng, inputLat]; // GeoJSON is [lng, lat]

    // Check if OSRM snapped too far from input
    if (osrmWp.distance > SNAP_THRESHOLD_METERS) {
      logger.info('Extending route to reach waypoint', {
        waypointIndex: i,
        snapDistance: osrmWp.distance.toFixed(1),
        inputCoord,
        snappedCoord: osrmWp.location,
      });

      // Find where in the geometry the snapped point is (approximate)
      const snappedIdx = findClosestCoordinateIndex(
        coordinates,
        osrmWp.location,
        insertOffset
      );

      if (snappedIdx >= 0) {
        // Insert a spur: road -> business -> back to road
        // This creates a proper detour that returns to the route
        const snappedCoord = coordinates[snappedIdx];
        coordinates.splice(snappedIdx + 1, 0, inputCoord, snappedCoord);
        insertOffset += 2; // Account for 2 inserted coordinates
      }
    }
  }

  return {
    type: 'LineString',
    coordinates,
  };
}

/**
 * Find the index of the coordinate closest to a target point
 */
function findClosestCoordinateIndex(
  coordinates: [number, number][],
  target: [number, number],
  startIdx: number = 0
): number {
  let closestIdx = -1;
  let closestDist = Infinity;

  for (let i = startIdx; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const dist = Math.sqrt(
      Math.pow(coord[0] - target[0], 2) + Math.pow(coord[1] - target[1], 2)
    );
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  return closestIdx;
}

/**
 * Validate latitude/longitude coordinate pair
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculate estimated cycling time based on distance
 * Assumes average cycling speed of 12 mph (moderate pace)
 */
export function estimateCyclingTime(distanceMiles: number): number {
  const AVG_CYCLING_SPEED_MPH = 12;
  return Math.round((distanceMiles / AVG_CYCLING_SPEED_MPH) * 60);
}
