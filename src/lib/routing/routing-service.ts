/**
 * Unified Bicycle Routing Service
 *
 * Provides a single interface for bicycle routing with automatic fallback:
 * 1. OpenRouteService (primary) - Better residential road support
 * 2. OSRM (fallback) - Free, always available
 *
 * @see specs/048-openrouteservice-routing/spec.md
 */

import { createLogger } from '@/lib/logger';
import {
  getORSBicycleRoute,
  isORSAvailable,
  type ORSProfile,
} from './openrouteservice';
import {
  getBicycleRoute as getOSRMBicycleRoute,
  type BicycleRouteResult,
} from './osrm-service';

const logger = createLogger('lib:routing:service');

/**
 * Which routing service generated the route
 */
export type RoutingService = 'ors' | 'osrm';

/**
 * Extended route result with service info
 */
export interface RoutingResult extends BicycleRouteResult {
  /** Which service generated this route */
  service: RoutingService;
}

/**
 * Options for route generation
 */
export interface RoutingOptions {
  /** Try ORS first (default: true) */
  preferORS?: boolean;
  /** ORS profile to use (default: 'cycling-road') */
  profile?: ORSProfile;
}

/**
 * Get bicycle route with automatic fallback
 *
 * Tries OpenRouteService first (if configured), falls back to OSRM.
 *
 * @param waypoints Array of [latitude, longitude] pairs in visit order
 * @param options Routing options
 * @returns Route result with service info, or null if both fail
 */
export async function getBicycleRoute(
  waypoints: [number, number][],
  options: RoutingOptions = {}
): Promise<RoutingResult | null> {
  const { preferORS = true, profile = 'cycling-road' } = options;

  // Try ORS first if preferred and available
  if (preferORS && isORSAvailable()) {
    logger.info('Attempting route with OpenRouteService', { profile });

    const orsResult = await getORSBicycleRoute(waypoints, profile);

    if (orsResult) {
      logger.info('Route generated via ORS', {
        distanceMiles: orsResult.distanceMiles.toFixed(2),
      });

      return {
        ...orsResult,
        service: 'ors',
      };
    }

    logger.warn('ORS routing failed, falling back to OSRM');
  } else if (preferORS && !isORSAvailable()) {
    logger.debug('ORS not available (no API key), using OSRM');
  }

  // Fallback to OSRM
  logger.info('Attempting route with OSRM');

  const osrmResult = await getOSRMBicycleRoute(waypoints);

  if (osrmResult) {
    logger.info('Route generated via OSRM', {
      distanceMiles: osrmResult.distanceMiles.toFixed(2),
    });

    return {
      ...osrmResult,
      service: 'osrm',
    };
  }

  logger.error('Both ORS and OSRM routing failed');
  return null;
}

/**
 * Re-export types for convenience
 */
export type { BicycleRouteResult } from './osrm-service';
export type { ORSProfile, ORSBicycleRouteResult } from './openrouteservice';
