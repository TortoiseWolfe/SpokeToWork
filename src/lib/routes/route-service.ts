/**
 * Route Service - Feature 041: Bicycle Route Planning
 *
 * CRUD operations for bicycle routes and route-company associations.
 * All queries are RLS-compatible and respect user ownership.
 *
 * @see specs/041-bicycle-route-planning/contracts/route-types.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
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
  ROUTE_LIMITS,
} from '@/types/route';
import type {
  RouteOptimizationInput,
  RouteOptimizationResult,
  OptimizationComparisonData,
} from './optimization-types';
import { solveRouteOptimization, calculateRouteStats } from './tsp-solver';

// Re-export limits for convenience
export { ROUTE_LIMITS } from '@/types/route';

/**
 * Error types for route operations
 */
export class RouteNotFoundError extends Error {
  constructor(id: string) {
    super(`Route with id "${id}" not found`);
    this.name = 'RouteNotFoundError';
  }
}

export class RouteLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteLimitError';
  }
}

export class RouteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteValidationError';
  }
}

export class RouteCompanyDuplicateError extends Error {
  constructor() {
    super('Company is already associated with this route');
    this.name = 'RouteCompanyDuplicateError';
  }
}

/**
 * Helper to wrap Supabase errors (which are plain objects) into proper Error instances
 */
function throwSupabaseError(error: unknown): never {
  if (error instanceof Error) {
    throw error;
  }
  // Supabase errors have message, code, details properties
  const supabaseError = error as {
    message?: string;
    code?: string;
    details?: string;
  };
  const message =
    supabaseError.message ||
    supabaseError.details ||
    'Database operation failed';
  throw new Error(message);
}

/**
 * Route Service class
 */
export class RouteService {
  private supabase: SupabaseClient;
  private userId: string | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Initialize the service with user context
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
  }

  /**
   * Check route limits for user
   */
  async checkRouteLimits(): Promise<LimitCheckResult> {
    const { count, error } = await this.supabase
      .from('bicycle_routes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_system_route', false);

    if (error) throwSupabaseError(error);

    const current = count ?? 0;
    const { ROUTES_SOFT_LIMIT, ROUTES_HARD_LIMIT } = await import(
      '@/types/route'
    ).then((m) => m.ROUTE_LIMITS);

    return {
      withinSoftLimit: current < ROUTES_SOFT_LIMIT,
      withinHardLimit: current < ROUTES_HARD_LIMIT,
      current,
      softLimit: ROUTES_SOFT_LIMIT,
      hardLimit: ROUTES_HARD_LIMIT,
      message:
        current >= ROUTES_HARD_LIMIT
          ? 'Route limit reached. Delete existing routes to create new ones.'
          : current >= ROUTES_SOFT_LIMIT * 0.8
            ? `You have ${current} routes. Consider organizing or deleting unused routes.`
            : undefined,
    };
  }

  /**
   * Check company-per-route limits
   */
  async checkRouteCompanyLimits(routeId: string): Promise<LimitCheckResult> {
    const { count, error } = await this.supabase
      .from('route_companies')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', routeId);

    if (error) throwSupabaseError(error);

    const current = count ?? 0;
    const { COMPANIES_PER_ROUTE_SOFT_LIMIT, COMPANIES_PER_ROUTE_HARD_LIMIT } =
      await import('@/types/route').then((m) => m.ROUTE_LIMITS);

    return {
      withinSoftLimit: current < COMPANIES_PER_ROUTE_SOFT_LIMIT,
      withinHardLimit: current < COMPANIES_PER_ROUTE_HARD_LIMIT,
      current,
      softLimit: COMPANIES_PER_ROUTE_SOFT_LIMIT,
      hardLimit: COMPANIES_PER_ROUTE_HARD_LIMIT,
      message:
        current >= COMPANIES_PER_ROUTE_HARD_LIMIT
          ? 'Company limit reached for this route.'
          : current >= COMPANIES_PER_ROUTE_SOFT_LIMIT * 0.8
            ? `This route has ${current} companies. Consider splitting into multiple routes.`
            : undefined,
    };
  }

  // ==========================================================================
  // ROUTE CRUD
  // ==========================================================================

  /**
   * Create a new route
   */
  async createRoute(data: BicycleRouteCreate): Promise<BicycleRoute> {
    // Check limits first
    const limits = await this.checkRouteLimits();
    if (!limits.withinHardLimit) {
      throw new RouteLimitError(limits.message ?? 'Route limit reached');
    }

    // Validate name length
    const { NAME_MAX_LENGTH } = await import('@/types/route').then(
      (m) => m.ROUTE_LIMITS
    );
    if (data.name.length > NAME_MAX_LENGTH) {
      throw new RouteValidationError(
        `Route name must be ${NAME_MAX_LENGTH} characters or less`
      );
    }

    // Get the current user's ID from Supabase auth
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      throw new RouteValidationError(
        'User must be authenticated to create routes'
      );
    }

    const { data: route, error } = await this.supabase
      .from('bicycle_routes')
      .insert({
        user_id: user.id,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? '#3B82F6',
        start_address: data.start_address ?? null,
        start_latitude: data.start_latitude,
        start_longitude: data.start_longitude,
        end_address: data.end_address ?? null,
        end_latitude: data.end_latitude,
        end_longitude: data.end_longitude,
        route_geometry: data.route_geometry ?? null,
        metro_area_id: data.metro_area_id ?? null,
        is_system_route: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) throwSupabaseError(error);
    return route;
  }

  /**
   * Get all routes for the current user
   */
  async getRoutes(
    filters?: RouteFilters,
    sort?: RouteSort
  ): Promise<BicycleRoute[]> {
    let query = this.supabase
      .from('bicycle_routes')
      .select('*')
      .eq('is_active', true);

    // Apply filters
    if (filters?.is_system_route !== undefined) {
      query = query.eq('is_system_route', filters.is_system_route);
    }
    if (filters?.metro_area_id) {
      query = query.eq('metro_area_id', filters.metro_area_id);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('updated_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throwSupabaseError(error);
    return data ?? [];
  }

  /**
   * Get system routes (trails, greenways)
   */
  async getSystemRoutes(metroAreaId?: string): Promise<BicycleRoute[]> {
    let query = this.supabase
      .from('bicycle_routes')
      .select('*')
      .eq('is_system_route', true)
      .eq('is_active', true);

    if (metroAreaId) {
      query = query.eq('metro_area_id', metroAreaId);
    }

    const { data, error } = await query;
    if (error) throwSupabaseError(error);
    return data ?? [];
  }

  /**
   * Get a single route by ID
   */
  async getRouteById(id: string): Promise<BicycleRoute | null> {
    const { data, error } = await this.supabase
      .from('bicycle_routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throwSupabaseError(error);
    return data;
  }

  /**
   * Get route with all associated companies
   */
  async getRouteWithCompanies(id: string): Promise<RouteWithCompanies | null> {
    const route = await this.getRouteById(id);
    if (!route) return null;

    const companies = await this.getRouteCompanies(id);

    return {
      ...route,
      companies,
      company_count: companies.length,
    };
  }

  /**
   * Update a route
   */
  async updateRoute(data: BicycleRouteUpdate): Promise<BicycleRoute> {
    const { id, ...updateData } = data;

    // Validate name length if provided
    if (updateData.name) {
      const { NAME_MAX_LENGTH } = await import('@/types/route').then(
        (m) => m.ROUTE_LIMITS
      );
      if (updateData.name.length > NAME_MAX_LENGTH) {
        throw new RouteValidationError(
          `Route name must be ${NAME_MAX_LENGTH} characters or less`
        );
      }
    }

    const { data: route, error } = await this.supabase
      .from('bicycle_routes')
      .update(updateData)
      .eq('id', id)
      .eq('is_system_route', false) // Can't update system routes
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      throw new RouteNotFoundError(id);
    }
    if (error) throwSupabaseError(error);
    return route;
  }

  /**
   * Soft delete a route
   */
  async deleteRoute(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('bicycle_routes')
      .update({ is_active: false })
      .eq('id', id)
      .eq('is_system_route', false); // Can't delete system routes

    if (error) throwSupabaseError(error);
  }

  // ==========================================================================
  // ROUTE-COMPANY ASSOCIATIONS
  // ==========================================================================

  /**
   * Get companies on a route with details
   */
  async getRouteCompanies(routeId: string): Promise<RouteCompanyWithDetails[]> {
    // Get route_companies with company details via separate queries
    // (avoiding complex joins that RLS might block)
    const { data: associations, error } = await this.supabase
      .from('route_companies')
      .select('*')
      .eq('route_id', routeId)
      .order('sequence_order', { ascending: true });

    if (error) throwSupabaseError(error);
    if (!associations?.length) return [];

    // Fetch company details for each association
    const result: RouteCompanyWithDetails[] = [];

    for (const assoc of associations) {
      let company: RouteCompanyWithDetails['company'] | null = null;

      if (assoc.shared_company_id) {
        // Shared companies: get company name from shared_companies, location from company_locations
        const { data: companyData, error: companyError } = await this.supabase
          .from('shared_companies')
          .select('id, name')
          .eq('id', assoc.shared_company_id)
          .single();

        if (companyError) {
          // Silently skip companies that can't be loaded
          continue;
        }

        if (companyData) {
          // Get location from company_locations (may not exist)
          const { data: locationData } = await this.supabase
            .from('company_locations')
            .select('address, latitude, longitude')
            .eq('shared_company_id', assoc.shared_company_id)
            .limit(1)
            .maybeSingle();

          company = {
            id: companyData.id,
            name: companyData.name,
            address: locationData?.address ?? null,
            latitude: locationData?.latitude ?? null,
            longitude: locationData?.longitude ?? null,
            source: 'shared' as const,
          };
        }
      } else if (assoc.private_company_id) {
        const { data, error: companyError } = await this.supabase
          .from('private_companies')
          .select('id, name, address, latitude, longitude')
          .eq('id', assoc.private_company_id)
          .single();

        if (companyError) {
          // Silently skip companies that can't be loaded
          continue;
        }

        if (data) {
          company = { ...data, source: 'private' as const };
        }
      }

      if (company) {
        result.push({
          ...assoc,
          company,
        });
      }
    }

    return result;
  }

  /**
   * Add a company to a route
   */
  async addCompanyToRoute(data: RouteCompanyCreate): Promise<RouteCompany> {
    // Get current user for RLS compliance
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to add company to route');
    }

    // Check limits
    const limits = await this.checkRouteCompanyLimits(data.route_id);
    if (!limits.withinHardLimit) {
      throw new RouteLimitError(
        limits.message ?? 'Company limit reached for this route'
      );
    }

    // Get next sequence order (may be empty for new routes)
    const { data: existing } = await this.supabase
      .from('route_companies')
      .select('sequence_order')
      .eq('route_id', data.route_id)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (existing?.sequence_order ?? -1) + 1;

    const { data: association, error } = await this.supabase
      .from('route_companies')
      .insert({
        route_id: data.route_id,
        user_id: user.id, // Required for RLS
        shared_company_id: data.shared_company_id ?? null,
        private_company_id: data.private_company_id ?? null,
        tracking_id: data.tracking_id ?? null,
        sequence_order: data.sequence_order ?? nextOrder,
        visit_on_next_ride: data.visit_on_next_ride ?? false,
      })
      .select()
      .single();

    if (error?.code === '23505') {
      throw new RouteCompanyDuplicateError();
    }
    if (error) throwSupabaseError(error);
    return association;
  }

  /**
   * Remove a company from a route
   */
  async removeCompanyFromRoute(routeCompanyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('route_companies')
      .delete()
      .eq('id', routeCompanyId);

    if (error) throwSupabaseError(error);
  }

  /**
   * Reorder companies on a route
   */
  async reorderCompanies(data: RouteCompanyReorder): Promise<void> {
    // Update each association with new sequence order
    const updates = data.ordered_ids.map((id, index) =>
      this.supabase
        .from('route_companies')
        .update({ sequence_order: index })
        .eq('id', id)
        .eq('route_id', data.route_id)
    );

    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error).map((r) => r.error);
    if (errors.length) throwSupabaseError(errors[0]);
  }

  /**
   * Toggle "visit on next ride" flag
   */
  async toggleNextRide(routeCompanyId: string): Promise<RouteCompany> {
    // First get current value
    const { data: current, error: fetchError } = await this.supabase
      .from('route_companies')
      .select('visit_on_next_ride')
      .eq('id', routeCompanyId)
      .single();

    if (fetchError) throwSupabaseError(fetchError);

    // Toggle it
    const { data, error } = await this.supabase
      .from('route_companies')
      .update({ visit_on_next_ride: !current.visit_on_next_ride })
      .eq('id', routeCompanyId)
      .select()
      .single();

    if (error) throwSupabaseError(error);
    return data;
  }

  /**
   * Get all companies marked for "next ride" across all routes
   */
  async getNextRideCompanies(): Promise<RouteCompanyWithDetails[]> {
    const { data: associations, error } = await this.supabase
      .from('route_companies')
      .select('*')
      .eq('visit_on_next_ride', true)
      .order('sequence_order', { ascending: true });

    if (error) throwSupabaseError(error);
    if (!associations?.length) return [];

    // Fetch company details (same pattern as getRouteCompanies)
    const result: RouteCompanyWithDetails[] = [];

    for (const assoc of associations) {
      let company: RouteCompanyWithDetails['company'] | null = null;

      if (assoc.shared_company_id) {
        const { data } = await this.supabase
          .from('shared_companies')
          .select('id, name, address, latitude, longitude')
          .eq('id', assoc.shared_company_id)
          .single();

        if (data) {
          company = { ...data, source: 'shared' as const };
        }
      } else if (assoc.private_company_id) {
        const { data } = await this.supabase
          .from('private_companies')
          .select('id, name, address, latitude, longitude')
          .eq('id', assoc.private_company_id)
          .single();

        if (data) {
          company = { ...data, source: 'private' as const };
        }
      }

      if (company) {
        result.push({
          ...assoc,
          company,
        });
      }
    }

    return result;
  }

  /**
   * Clear all "next ride" flags for user
   */
  async clearAllNextRide(): Promise<void> {
    const { error } = await this.supabase
      .from('route_companies')
      .update({ visit_on_next_ride: false })
      .eq('visit_on_next_ride', true);

    if (error) throwSupabaseError(error);
  }

  // ==========================================================================
  // ACTIVE ROUTE PLANNING
  // ==========================================================================

  /**
   * Get the user's currently active planning route
   */
  async getActiveRoute(): Promise<ActiveRoutePlanning | null> {
    const { data, error } = await this.supabase
      .from('active_route_planning')
      .select('*')
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throwSupabaseError(error);
    return data;
  }

  /**
   * Set a route as the active planning route
   */
  async setActiveRoute(routeId: string): Promise<ActiveRoutePlanning> {
    // Get current user for RLS compliance
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to set active route');
    }

    // Upsert - replace existing or create new (must include user_id for RLS)
    const { data, error } = await this.supabase
      .from('active_route_planning')
      .upsert(
        { user_id: user.id, route_id: routeId },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throwSupabaseError(error);
    return data;
  }

  /**
   * Clear the active planning route
   */
  async clearActiveRoute(): Promise<void> {
    const { error } = await this.supabase
      .from('active_route_planning')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete any row

    if (error) throwSupabaseError(error);
  }

  // ==========================================================================
  // ROUTE SUMMARIES
  // ==========================================================================

  /**
   * Get route summaries for list views
   */
  async getRouteSummaries(): Promise<RouteSummary[]> {
    const routes = await this.getRoutes({ is_system_route: false });

    const summaries: RouteSummary[] = [];

    for (const route of routes) {
      // Count companies and next-ride for each route
      const { count: companyCount } = await this.supabase
        .from('route_companies')
        .select('*', { count: 'exact', head: true })
        .eq('route_id', route.id);

      const { count: nextRideCount } = await this.supabase
        .from('route_companies')
        .select('*', { count: 'exact', head: true })
        .eq('route_id', route.id)
        .eq('visit_on_next_ride', true);

      summaries.push({
        id: route.id,
        name: route.name,
        color: route.color,
        distance_miles: route.distance_miles,
        company_count: companyCount ?? 0,
        next_ride_count: nextRideCount ?? 0,
        is_system_route: route.is_system_route,
        updated_at: route.updated_at,
      });
    }

    return summaries;
  }

  // ==========================================================================
  // ROUTE OPTIMIZATION (Feature 046)
  // ==========================================================================

  /**
   * Optimize company visit order for a route using TSP solver
   * Returns comparison data without persisting changes
   */
  async optimizeRoute(routeId: string): Promise<OptimizationComparisonData> {
    // Get route and companies
    const route = await this.getRouteById(routeId);
    if (!route) {
      throw new RouteNotFoundError(routeId);
    }

    const companies = await this.getRouteCompanies(routeId);

    // Filter companies with valid coordinates
    const validCompanies = companies.filter(
      (c) => c.company.latitude !== null && c.company.longitude !== null
    );
    const excludedCompanies = companies
      .filter(
        (c) => c.company.latitude === null || c.company.longitude === null
      )
      .map((c) => ({
        id: c.id,
        name: c.company.name,
        reason: 'Missing coordinates',
      }));

    // Build optimization input
    const input: RouteOptimizationInput = {
      routeId,
      startPoint: {
        latitude: route.start_latitude ?? 0,
        longitude: route.start_longitude ?? 0,
        type: route.start_type,
      },
      endPoint: {
        latitude: route.end_latitude ?? route.start_latitude ?? 0,
        longitude: route.end_longitude ?? route.start_longitude ?? 0,
        type: route.end_type,
      },
      companies: validCompanies.map((c) => ({
        id: c.id, // Use route_company id for ordering
        name: c.company.name,
        latitude: c.company.latitude!,
        longitude: c.company.longitude!,
      })),
      isRoundTrip: route.is_round_trip,
    };

    // Run optimization
    const result = solveRouteOptimization(input);

    // Calculate before stats (current order)
    const currentOrder = validCompanies.map((c) => c.id);
    const beforeStats = calculateRouteStats(
      currentOrder,
      validCompanies.map((c) => ({
        id: c.id,
        latitude: c.company.latitude!,
        longitude: c.company.longitude!,
      })),
      {
        latitude: input.startPoint.latitude,
        longitude: input.startPoint.longitude,
      },
      {
        latitude: input.endPoint.latitude,
        longitude: input.endPoint.longitude,
      },
      route.is_round_trip
    );

    return {
      before: {
        order: currentOrder,
        distanceMiles: beforeStats.distanceMiles,
        timeMinutes: beforeStats.timeMinutes,
      },
      after: {
        order: result.optimizedOrder,
        distanceMiles: result.totalDistanceMiles,
        timeMinutes: result.estimatedTimeMinutes,
        distancesFromStart: result.distancesFromStart,
      },
      savings: {
        distanceMiles: result.distanceSavingsMiles,
        percent: result.distanceSavingsPercent,
      },
      excludedCompanies,
    };
  }

  /**
   * Apply optimized order to route (persist changes)
   */
  async applyRouteOptimization(
    routeId: string,
    optimizedOrder: string[],
    distancesFromStart: Record<string, number>
  ): Promise<void> {
    // Update each route_company with new sequence_order and distance_from_start_miles
    const updates = optimizedOrder.map((routeCompanyId, index) =>
      this.supabase
        .from('route_companies')
        .update({
          sequence_order: index,
          distance_from_start_miles: distancesFromStart[routeCompanyId] ?? null,
        })
        .eq('id', routeCompanyId)
        .eq('route_id', routeId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error).map((r) => r.error);
    if (errors.length) throwSupabaseError(errors[0]);

    // Update route's last_optimized_at timestamp
    await this.supabase
      .from('bicycle_routes')
      .update({ last_optimized_at: new Date().toISOString() })
      .eq('id', routeId);
  }

  /**
   * Set route start/end point types
   */
  async setRouteStartEnd(
    routeId: string,
    options: {
      startType?: 'home' | 'custom';
      endType?: 'home' | 'custom';
      startLatitude?: number;
      startLongitude?: number;
      startAddress?: string;
      endLatitude?: number;
      endLongitude?: number;
      endAddress?: string;
      isRoundTrip?: boolean;
    }
  ): Promise<BicycleRoute> {
    const updateData: Partial<BicycleRoute> = {};

    if (options.startType !== undefined)
      updateData.start_type = options.startType;
    if (options.endType !== undefined) updateData.end_type = options.endType;
    if (options.startLatitude !== undefined)
      updateData.start_latitude = options.startLatitude;
    if (options.startLongitude !== undefined)
      updateData.start_longitude = options.startLongitude;
    if (options.startAddress !== undefined)
      updateData.start_address = options.startAddress;
    if (options.endLatitude !== undefined)
      updateData.end_latitude = options.endLatitude;
    if (options.endLongitude !== undefined)
      updateData.end_longitude = options.endLongitude;
    if (options.endAddress !== undefined)
      updateData.end_address = options.endAddress;
    if (options.isRoundTrip !== undefined)
      updateData.is_round_trip = options.isRoundTrip;

    const { data: route, error } = await this.supabase
      .from('bicycle_routes')
      .update(updateData)
      .eq('id', routeId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      throw new RouteNotFoundError(routeId);
    }
    if (error) throwSupabaseError(error);
    return route;
  }

  /**
   * Toggle round-trip mode for a route
   */
  async toggleRoundTrip(routeId: string): Promise<BicycleRoute> {
    // Get current value
    const route = await this.getRouteById(routeId);
    if (!route) {
      throw new RouteNotFoundError(routeId);
    }

    const { data: updated, error } = await this.supabase
      .from('bicycle_routes')
      .update({ is_round_trip: !route.is_round_trip })
      .eq('id', routeId)
      .select()
      .single();

    if (error) throwSupabaseError(error);
    return updated;
  }
}

/**
 * Create a RouteService instance with Supabase client
 */
export function createRouteService(supabase: SupabaseClient): RouteService {
  return new RouteService(supabase);
}
