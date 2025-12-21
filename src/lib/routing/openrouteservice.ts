/**
 * OpenRouteService Bicycle Routing Module
 *
 * Uses OpenRouteService API for bicycle routing with multiple profile support.
 * Provides more accurate routing than OSRM for residential roads.
 *
 * @see https://openrouteservice.org/dev/#/api-docs/v2/directions
 * @see specs/048-openrouteservice-routing/spec.md
 */

import { createLogger } from '@/lib/logger';
import type { RouteGeometry } from '@/types/route';

const logger = createLogger('lib:routing:ors');

// ORS API endpoint
const ORS_API_URL = 'https://api.openrouteservice.org/v2/directions';

// Request timeout (NFR-001: 10 seconds)
const REQUEST_TIMEOUT_MS = 10000;

// Rate limiting configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Available ORS cycling profiles
 */
export type ORSProfile =
  | 'cycling-regular' // General purpose cycling
  | 'cycling-road' // Prefers paved roads (DEFAULT)
  | 'cycling-mountain' // Allows trails
  | 'cycling-electric'; // E-bike assumptions

/**
 * ORS API response types
 */
export interface ORSResponse {
  type: 'FeatureCollection';
  features: ORSFeature[];
  metadata?: ORSMetadata;
}

export interface ORSFeature {
  type: 'Feature';
  geometry: RouteGeometry;
  properties: ORSProperties;
}

export interface ORSProperties {
  segments: ORSSegment[];
  summary: ORSSummary;
  way_points: number[];
}

export interface ORSSegment {
  distance: number; // meters
  duration: number; // seconds
  steps: ORSStep[];
}

export interface ORSStep {
  distance: number;
  duration: number;
  name: string;
  instruction: string;
  type: number;
  way_points: number[];
}

export interface ORSSummary {
  distance: number; // total meters
  duration: number; // total seconds
}

export interface ORSMetadata {
  attribution: string;
  service: string;
  timestamp: number;
  query: {
    coordinates: [number, number][];
    profile: string;
  };
}

export interface ORSError {
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Result from ORS bicycle route calculation
 */
export interface ORSBicycleRouteResult {
  geometry: RouteGeometry;
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
}

/**
 * Get the ORS API key from environment
 */
function getORSApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_ORS_API_KEY;
}

/**
 * Check if ORS is available (API key is configured)
 */
export function isORSAvailable(): boolean {
  const key = getORSApiKey();
  return !!key && key.length > 0;
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get bicycle route using OpenRouteService
 *
 * @param waypoints Array of [latitude, longitude] pairs in visit order
 * @param profile ORS cycling profile (defaults to 'cycling-road')
 * @returns Route result or null if routing fails
 */
export async function getORSBicycleRoute(
  waypoints: [number, number][],
  profile: ORSProfile = 'cycling-road'
): Promise<ORSBicycleRouteResult | null> {
  const apiKey = getORSApiKey();

  if (!apiKey) {
    logger.debug('ORS API key not configured');
    return null;
  }

  if (waypoints.length < 2) {
    logger.warn('Need at least 2 waypoints for routing');
    return null;
  }

  // ORS limit: max 50 waypoints
  if (waypoints.length > 50) {
    logger.warn('ORS limit exceeded: max 50 waypoints', {
      count: waypoints.length,
    });
    return null;
  }

  // Validate coordinates
  for (const [lat, lng] of waypoints) {
    if (!isValidCoordinate(lat, lng)) {
      logger.error('Invalid coordinates in waypoints', { lat, lng });
      return null;
    }
  }

  // Convert to ORS format: [lng, lat] (GeoJSON order, opposite of Leaflet)
  const coordinates = waypoints.map(
    ([lat, lng]) => [lng, lat] as [number, number]
  );

  const url = `${ORS_API_URL}/${profile}/geojson`;

  logger.info('Fetching bicycle route from ORS', {
    waypointCount: waypoints.length,
    profile,
  });

  // Retry with exponential backoff for rate limiting
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ coordinates }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429) with backoff
      if (response.status === 429) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        logger.warn('ORS rate limited, backing off', {
          attempt: attempt + 1,
          backoffMs,
        });
        await sleep(backoffMs);
        continue;
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody: ORSError = await response.json().catch(() => ({}));
        logger.error('ORS request failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorBody.error?.message,
        });
        return null;
      }

      const data: ORSResponse = await response.json();

      if (!data.features?.length) {
        logger.warn('ORS returned no features');
        return null;
      }

      const feature = data.features[0];
      const summary = feature.properties.summary;

      const result: ORSBicycleRouteResult = {
        geometry: feature.geometry,
        distanceMeters: summary.distance,
        distanceMiles: summary.distance / 1609.34,
        durationSeconds: summary.duration,
        durationMinutes: Math.round(summary.duration / 60),
      };

      logger.info('ORS bicycle route calculated', {
        distanceMiles: result.distanceMiles.toFixed(2),
        durationMinutes: result.durationMinutes,
        coordinateCount: feature.geometry.coordinates.length,
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Handle timeout specifically
      if (lastError.name === 'AbortError') {
        logger.error('ORS request timed out', { timeout: REQUEST_TIMEOUT_MS });
        return null;
      }

      // For other errors, continue retry loop
      logger.warn('ORS request error, retrying', {
        attempt: attempt + 1,
        error: lastError.message,
      });
    }
  }

  logger.error('ORS request failed after retries', {
    error: lastError?.message,
  });
  return null;
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
