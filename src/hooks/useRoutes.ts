'use client';

/**
 * useRoutes Hook - Feature 041: Bicycle Route Planning
 *
 * React hook for managing bicycle routes with caching and optimistic updates.
 *
 * @see src/lib/routes/route-service.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RouteService, createRouteService } from '@/lib/routes/route-service';
import { getBicycleRoute } from '@/lib/routing/routing-service';
import { createLogger } from '@/lib/logger';
import { useActiveRoute } from '@/contexts/ActiveRouteContext';
import type {
  BicycleRoute,
  BicycleRouteCreate,
  BicycleRouteUpdate,
  RouteCompany,
  RouteCompanyCreate,
  RouteCompanyReorder,
  RouteCompanyWithDetails,
  RouteWithCompanies,
  RouteSummary,
  RouteFilters,
  RouteSort,
  LimitCheckResult,
  ActiveRoutePlanning,
} from '@/types/route';

const logger = createLogger('hooks:useRoutes');

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_TTL_MS = 30 * 1000; // 30 seconds before background refresh

// Module-level cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

let routesCache: CacheEntry<BicycleRoute[]> | null = null;
let activeRouteCache: CacheEntry<ActiveRoutePlanning | null> | null = null;

/**
 * Reset module-level cache for testing purposes.
 * This prevents memory accumulation when running multiple tests.
 * @internal Only use in test files
 */
export function __resetCacheForTesting(): void {
  routesCache = null;
  activeRouteCache = null;
}

function isCacheValid<T>(cache: CacheEntry<T> | null, key: string): boolean {
  if (!cache) return false;
  if (cache.key !== key) return false;
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

function isCacheStale<T>(cache: CacheEntry<T> | null, key: string): boolean {
  if (!cache) return true;
  if (cache.key !== key) return true;
  return Date.now() - cache.timestamp > STALE_TTL_MS;
}

export interface UseRoutesOptions {
  filters?: RouteFilters;
  sort?: RouteSort;
  skip?: boolean;
  refetchOnFocus?: boolean;
}

export interface UseRoutesReturn {
  // Data
  routes: BicycleRoute[];
  activeRouteId: string | null;
  isLoading: boolean;
  error: Error | null;

  // Route CRUD
  createRoute: (data: BicycleRouteCreate) => Promise<BicycleRoute>;
  updateRoute: (data: BicycleRouteUpdate) => Promise<BicycleRoute>;
  deleteRoute: (id: string) => Promise<void>;
  getRouteById: (id: string) => Promise<BicycleRoute | null>;
  getRouteWithCompanies: (id: string) => Promise<RouteWithCompanies | null>;
  getSystemRoutes: (metroAreaId?: string) => Promise<BicycleRoute[]>;

  // Route-Company associations
  addCompanyToRoute: (data: RouteCompanyCreate) => Promise<RouteCompany>;
  removeCompanyFromRoute: (routeCompanyId: string) => Promise<void>;
  reorderCompanies: (data: RouteCompanyReorder) => Promise<void>;
  getRouteCompanies: (routeId: string) => Promise<RouteCompanyWithDetails[]>;

  // Next Ride
  toggleNextRide: (routeCompanyId: string) => Promise<RouteCompany>;
  getNextRideCompanies: () => Promise<RouteCompanyWithDetails[]>;
  clearAllNextRide: () => Promise<void>;

  // Active Route Planning
  setActiveRoute: (routeId: string) => Promise<void>;
  clearActiveRoute: () => Promise<void>;

  // Limits
  checkRouteLimits: () => Promise<LimitCheckResult>;
  checkRouteCompanyLimits: (routeId: string) => Promise<LimitCheckResult>;

  // Summaries
  getRouteSummaries: () => Promise<RouteSummary[]>;

  // Route Geometry
  generateRouteGeometry: (routeId: string) => Promise<void>;

  // Active Route Companies (Feature 044)
  getActiveRouteCompanyIds: () => Promise<Set<string>>;

  // Utilities
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

export function useRoutes(options: UseRoutesOptions = {}): UseRoutesReturn {
  const { filters, sort, skip = false, refetchOnFocus = true } = options;

  const [routes, setRoutes] = useState<BicycleRoute[]>([]);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);

  // Use shared context for active route (fixes cross-page state isolation)
  const {
    activeRouteId,
    setActiveRoute: contextSetActiveRoute,
    clearActiveRoute: contextClearActiveRoute,
  } = useActiveRoute();

  const serviceRef = useRef<RouteService | null>(null);
  const fetchingRef = useRef(false);

  // Cache key based on filters and sort
  const cacheKey = JSON.stringify({ filters, sort });

  // Get or create service
  const getService = useCallback(() => {
    if (!serviceRef.current) {
      const supabase = createClient();
      serviceRef.current = createRouteService(supabase);
    }
    return serviceRef.current;
  }, []);

  // Fetch routes
  const fetchRoutes = useCallback(
    async (force = false) => {
      if (fetchingRef.current && !force) return;
      if (!force && isCacheValid(routesCache, cacheKey)) {
        setRoutes(routesCache!.data);
        setIsLoading(false);
        return;
      }

      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const service = getService();
        const data = await service.getRoutes(filters, sort);

        routesCache = {
          data,
          timestamp: Date.now(),
          key: cacheKey,
        };

        setRoutes(data);
        setError(null); // Clear any previous error on success
      } catch (err) {
        logger.warn('useRoutes: Routes unavailable', {
          error: err instanceof Error ? err.message : String(err),
        });
        setError(
          err instanceof Error ? err : new Error('Failed to fetch routes')
        );
        setRoutes([]); // Safe fallback - never leave stale data on error
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    },
    [cacheKey, filters, sort, getService]
  );

  // Initial fetch (active route is now managed by ActiveRouteContext)
  useEffect(() => {
    if (skip) return;
    fetchRoutes();
  }, [skip, fetchRoutes]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus || skip) return;

    const handleFocus = () => {
      if (isCacheStale(routesCache, cacheKey)) {
        fetchRoutes();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, skip, cacheKey, fetchRoutes]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    routesCache = null;
    activeRouteCache = null;
  }, []);

  // Refetch (active route is managed by ActiveRouteContext)
  const refetch = useCallback(async () => {
    invalidateCache();
    await fetchRoutes(true);
  }, [invalidateCache, fetchRoutes]);

  // Route CRUD operations
  const createRoute = useCallback(
    async (data: BicycleRouteCreate): Promise<BicycleRoute> => {
      const service = getService();
      const route = await service.createRoute(data);
      invalidateCache();
      await fetchRoutes(true);
      return route;
    },
    [getService, invalidateCache, fetchRoutes]
  );

  const updateRoute = useCallback(
    async (data: BicycleRouteUpdate): Promise<BicycleRoute> => {
      const service = getService();
      const route = await service.updateRoute(data);
      invalidateCache();
      await fetchRoutes(true);
      return route;
    },
    [getService, invalidateCache, fetchRoutes]
  );

  const deleteRoute = useCallback(
    async (id: string): Promise<void> => {
      const service = getService();
      await service.deleteRoute(id);
      invalidateCache();
      await fetchRoutes(true);
    },
    [getService, invalidateCache, fetchRoutes]
  );

  const getRouteById = useCallback(
    async (id: string): Promise<BicycleRoute | null> => {
      const service = getService();
      return service.getRouteById(id);
    },
    [getService]
  );

  const getRouteWithCompanies = useCallback(
    async (id: string): Promise<RouteWithCompanies | null> => {
      const service = getService();
      return service.getRouteWithCompanies(id);
    },
    [getService]
  );

  const getSystemRoutes = useCallback(
    async (metroAreaId?: string): Promise<BicycleRoute[]> => {
      const service = getService();
      return service.getSystemRoutes(metroAreaId);
    },
    [getService]
  );

  // Route-Company operations
  const addCompanyToRoute = useCallback(
    async (data: RouteCompanyCreate): Promise<RouteCompany> => {
      const service = getService();
      const result = await service.addCompanyToRoute(data);
      invalidateCache(); // Refresh sidebar counts after adding company
      return result;
    },
    [getService, invalidateCache]
  );

  const removeCompanyFromRoute = useCallback(
    async (routeCompanyId: string): Promise<void> => {
      const service = getService();
      await service.removeCompanyFromRoute(routeCompanyId);
      invalidateCache(); // Refresh sidebar counts after removing company
    },
    [getService, invalidateCache]
  );

  const reorderCompanies = useCallback(
    async (data: RouteCompanyReorder): Promise<void> => {
      const service = getService();
      await service.reorderCompanies(data);
      invalidateCache(); // Refresh after reordering
    },
    [getService, invalidateCache]
  );

  const getRouteCompanies = useCallback(
    async (routeId: string): Promise<RouteCompanyWithDetails[]> => {
      const service = getService();
      return service.getRouteCompanies(routeId);
    },
    [getService]
  );

  /**
   * Toggle "next ride" status for a company on a route.
   * @deprecated Feature 044 simplified "Next Ride" to use active route filter.
   * Use getActiveRouteCompanyIds() instead to filter companies by active route.
   */
  const toggleNextRide = useCallback(
    async (routeCompanyId: string): Promise<RouteCompany> => {
      const service = getService();
      const result = await service.toggleNextRide(routeCompanyId);
      invalidateCache(); // Refresh sidebar counts after toggling next ride
      return result;
    },
    [getService, invalidateCache]
  );

  /**
   * Get all companies marked for "next ride" across all routes.
   * @deprecated Feature 044 simplified "Next Ride" to use active route filter.
   * Use getActiveRouteCompanyIds() instead to get companies on the active route.
   */
  const getNextRideCompanies = useCallback(async (): Promise<
    RouteCompanyWithDetails[]
  > => {
    const service = getService();
    return service.getNextRideCompanies();
  }, [getService]);

  /**
   * Clear all "next ride" markers across all routes.
   * @deprecated Feature 044 simplified "Next Ride" to use active route filter.
   * This function is no longer needed with the new active route-based filtering.
   */
  const clearAllNextRide = useCallback(async (): Promise<void> => {
    const service = getService();
    await service.clearAllNextRide();
  }, [getService]);

  // Active Route operations (delegated to ActiveRouteContext for shared state)
  const setActiveRoute = useCallback(
    async (routeId: string): Promise<void> => {
      await contextSetActiveRoute(routeId);
      activeRouteCache = null;
    },
    [contextSetActiveRoute]
  );

  const clearActiveRoute = useCallback(async (): Promise<void> => {
    await contextClearActiveRoute();
    activeRouteCache = null;
  }, [contextClearActiveRoute]);

  // Limits
  const checkRouteLimits = useCallback(async (): Promise<LimitCheckResult> => {
    const service = getService();
    return service.checkRouteLimits();
  }, [getService]);

  const checkRouteCompanyLimits = useCallback(
    async (routeId: string): Promise<LimitCheckResult> => {
      const service = getService();
      return service.checkRouteCompanyLimits(routeId);
    },
    [getService]
  );

  // Summaries
  const getRouteSummaries = useCallback(async (): Promise<RouteSummary[]> => {
    const service = getService();
    return service.getRouteSummaries();
  }, [getService]);

  // Generate route geometry using OSRM
  const generateRouteGeometry = useCallback(
    async (routeId: string): Promise<void> => {
      try {
        const service = getService();

        // Fetch route to get start/end coordinates
        const route = await service.getRouteById(routeId);
        if (!route) {
          logger.error('Route not found for geometry generation', { routeId });
          return;
        }

        const companies = await service.getRouteCompanies(routeId);

        // Build waypoints: [start] + [companies] + [end]
        const waypoints: [number, number][] = [];

        // Add start point if exists (home location)
        if (route.start_latitude && route.start_longitude) {
          waypoints.push([route.start_latitude, route.start_longitude]);
          logger.debug('Added start point to waypoints', {
            lat: route.start_latitude,
            lng: route.start_longitude,
          });
        }

        // Add company waypoints in sequence order
        const companyWaypoints = companies
          .sort((a, b) => a.sequence_order - b.sequence_order)
          .filter((c) => c.company.latitude && c.company.longitude)
          .map(
            (c) =>
              [c.company.latitude!, c.company.longitude!] as [number, number]
          );
        waypoints.push(...companyWaypoints);

        // Add end point if exists and is different from start (or for non-round-trip routes)
        if (route.end_latitude && route.end_longitude) {
          const endSameAsStart =
            route.end_latitude === route.start_latitude &&
            route.end_longitude === route.start_longitude;

          // For round-trip routes, only add end if different from start
          // For non-round-trip, always add end
          if (!route.is_round_trip || !endSameAsStart) {
            waypoints.push([route.end_latitude, route.end_longitude]);
            logger.debug('Added end point to waypoints', {
              lat: route.end_latitude,
              lng: route.end_longitude,
            });
          } else if (route.is_round_trip && endSameAsStart) {
            // Round-trip back to start - add start point again at end
            waypoints.push([route.start_latitude!, route.start_longitude!]);
            logger.debug('Added return to start for round-trip');
          }
        } else if (
          route.is_round_trip &&
          route.start_latitude &&
          route.start_longitude
        ) {
          // Round-trip with no explicit end - return to start
          waypoints.push([route.start_latitude, route.start_longitude]);
          logger.debug(
            'Added return to start for round-trip (no explicit end)'
          );
        }

        // Need at least 2 waypoints to generate a route
        if (waypoints.length < 2) {
          logger.info('Not enough waypoints to generate route', {
            routeId,
            count: waypoints.length,
            hasStart: !!(route.start_latitude && route.start_longitude),
            companiesWithCoords: companyWaypoints.length,
          });
          return;
        }

        logger.info('Generating bicycle route', {
          routeId,
          waypointCount: waypoints.length,
        });

        // Call routing service (ORS primary, OSRM fallback)
        const result = await getBicycleRoute(waypoints);

        if (!result) {
          logger.error('Failed to get bicycle route', { routeId });
          return;
        }

        logger.info('Route generated', {
          routeId,
          service: result.service,
          distanceMiles: result.distanceMiles.toFixed(2),
        });

        // Update route with new geometry
        await service.updateRoute({
          id: routeId,
          route_geometry: result.geometry,
          distance_miles: result.distanceMiles,
          estimated_time_minutes: result.durationMinutes,
        });

        logger.info('Route geometry updated', {
          routeId,
          distanceMiles: result.distanceMiles.toFixed(2),
          durationMinutes: result.durationMinutes,
        });

        // Refresh routes to get updated data
        invalidateCache();
        await fetchRoutes(true);
      } catch (err) {
        logger.error('Failed to generate route geometry', {
          routeId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [getService, invalidateCache, fetchRoutes]
  );

  // Feature 044: Get company IDs on the active route
  const getActiveRouteCompanyIds = useCallback(async (): Promise<
    Set<string>
  > => {
    logger.debug('getActiveRouteCompanyIds called', { activeRouteId });
    if (!activeRouteId) {
      logger.debug('No active route, returning empty set');
      return new Set<string>();
    }

    try {
      const service = getService();
      const companies = await service.getRouteCompanies(activeRouteId);
      logger.debug('Got route companies', { count: companies.length });

      // Build a Set of all company IDs (tracking_id, shared, and private)
      // tracking_id is the primary identifier for unified companies
      const ids = new Set<string>();
      companies.forEach((rc) => {
        // Add tracking_id first - this is the primary ID for unified companies
        if (rc.tracking_id) {
          ids.add(rc.tracking_id);
        }
        // Add the company's canonical ID from the joined table
        if (rc.company.id) {
          ids.add(rc.company.id);
        }
        // Also add shared_company_id if present
        if (rc.shared_company_id) {
          ids.add(rc.shared_company_id);
        }
        // And private_company_id if present
        if (rc.private_company_id) {
          ids.add(rc.private_company_id);
        }
      });

      logger.debug('Built ID set', { size: ids.size });
      return ids;
    } catch (err) {
      logger.error('Failed to get active route company IDs', {
        activeRouteId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return new Set<string>();
    }
  }, [activeRouteId, getService]);

  return {
    routes,
    activeRouteId,
    isLoading,
    error,
    createRoute,
    updateRoute,
    deleteRoute,
    getRouteById,
    getRouteWithCompanies,
    getSystemRoutes,
    addCompanyToRoute,
    removeCompanyFromRoute,
    reorderCompanies,
    getRouteCompanies,
    toggleNextRide,
    getNextRideCompanies,
    clearAllNextRide,
    setActiveRoute,
    clearActiveRoute,
    checkRouteLimits,
    checkRouteCompanyLimits,
    getRouteSummaries,
    generateRouteGeometry,
    getActiveRouteCompanyIds,
    refetch,
    invalidateCache,
  };
}
