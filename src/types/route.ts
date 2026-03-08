/**
 * Bicycle Route Planning - TypeScript Type Contracts
 * Feature: 041-bicycle-route-planning
 *
 * These types define the contract between components, services, and database.
 */

// =============================================================================
// ROUTE GEOMETRY
// =============================================================================

/**
 * GeoJSON LineString for simple route path
 */
export interface LineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [longitude, latitude] pairs
}

/**
 * GeoJSON MultiLineString for complex paths with branches/disconnected segments
 */
export interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: [number, number][][]; // Array of line segments
}

/**
 * GeoJSON geometry for route path (supports both LineString and MultiLineString)
 */
export type RouteGeometry = LineStringGeometry | MultiLineStringGeometry;

/**
 * Location point (start or end)
 */
export interface RoutePoint {
  address: string | null;
  latitude: number;
  longitude: number;
}

// =============================================================================
// BICYCLE ROUTE
// =============================================================================

/**
 * Bicycle route entity (database row)
 */
export interface BicycleRoute {
  id: string;
  user_id: string;
  metro_area_id: string | null;

  // Identity
  name: string;
  description: string | null;
  color: string;

  // Start point
  start_address: string | null;
  start_latitude: number | null;
  start_longitude: number | null;

  // End point
  end_address: string | null;
  end_latitude: number | null;
  end_longitude: number | null;

  // Path
  route_geometry: RouteGeometry | null;

  // Metrics
  distance_miles: number | null;
  estimated_time_minutes: number | null;

  // Flags
  is_system_route: boolean;
  source_name: string | null;
  is_active: boolean;

  // Route optimization (Feature 046)
  start_type: 'home' | 'custom';
  end_type: 'home' | 'custom';
  is_round_trip: boolean;
  last_optimized_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Create route payload
 */
export interface BicycleRouteCreate {
  name: string;
  description?: string;
  color?: string;
  start_address?: string;
  start_latitude: number;
  start_longitude: number;
  end_address?: string;
  end_latitude: number;
  end_longitude: number;
  route_geometry?: RouteGeometry;
  metro_area_id?: string;
  // Route optimization (Feature 046)
  start_type?: 'home' | 'custom';
  end_type?: 'home' | 'custom';
  is_round_trip?: boolean;
}

/**
 * Update route payload
 */
export interface BicycleRouteUpdate {
  id: string;
  name?: string;
  description?: string | null;
  color?: string;
  start_address?: string | null;
  start_latitude?: number;
  start_longitude?: number;
  end_address?: string | null;
  end_latitude?: number;
  end_longitude?: number;
  route_geometry?: RouteGeometry | null;
  distance_miles?: number | null;
  estimated_time_minutes?: number | null;
  is_active?: boolean;
  // Route optimization (Feature 046)
  start_type?: 'home' | 'custom';
  end_type?: 'home' | 'custom';
  is_round_trip?: boolean;
  last_optimized_at?: string | null;
}

// =============================================================================
// ROUTE-COMPANY ASSOCIATION
// =============================================================================

/**
 * Route-company junction entity
 */
export interface RouteCompany {
  id: string;
  route_id: string;
  user_id: string;

  // Company reference (exactly one must be set)
  shared_company_id: string | null;
  private_company_id: string | null;
  tracking_id: string | null;

  // Ordering and flags
  sequence_order: number;
  visit_on_next_ride: boolean;
  distance_from_start_miles: number | null;

  created_at: string;
}

/**
 * Route company with expanded company details
 */
export interface RouteCompanyWithDetails extends RouteCompany {
  company: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    source: 'shared' | 'private';
  };
}

/**
 * Add company to route payload
 */
export interface RouteCompanyCreate {
  route_id: string;
  shared_company_id?: string;
  private_company_id?: string;
  tracking_id?: string;
  sequence_order?: number;
  visit_on_next_ride?: boolean;
}

/**
 * Reorder companies payload
 */
export interface RouteCompanyReorder {
  route_id: string;
  ordered_ids: string[]; // RouteCompany IDs in new order
}

// =============================================================================
// ACTIVE ROUTE PLANNING
// =============================================================================

/**
 * Active planning state
 */
export interface ActiveRoutePlanning {
  id: string;
  user_id: string;
  route_id: string;
  started_at: string;
  last_modified_at: string;
}

// =============================================================================
// MAP TILE PROVIDERS
// =============================================================================

/**
 * Tile provider configuration
 */
export interface MapTileProvider {
  id: string;
  name: string;
  display_name: string;
  url_template: string;
  attribution: string;
  max_zoom: number;
  is_cycling_optimized: boolean;
  requires_api_key: boolean;
  is_enabled: boolean;
  priority: number;
}

// =============================================================================
// AGGREGATES & VIEWS
// =============================================================================

/**
 * Route with all associated companies
 */
export interface RouteWithCompanies extends BicycleRoute {
  companies: RouteCompanyWithDetails[];
  company_count: number;
}

/**
 * Route summary for list views
 */
export interface RouteSummary {
  id: string;
  name: string;
  color: string;
  distance_miles: number | null;
  company_count: number;
  next_ride_count: number;
  is_system_route: boolean;
  updated_at: string;
}

// =============================================================================
// FILTERS & SORTING
// =============================================================================

/**
 * Route filter options
 */
export interface RouteFilters {
  is_system_route?: boolean;
  is_active?: boolean;
  metro_area_id?: string;
  search?: string;
}

/**
 * Route sort options
 */
export interface RouteSort {
  field:
    | 'name'
    | 'distance_miles'
    | 'company_count'
    | 'created_at'
    | 'updated_at';
  direction: 'asc' | 'desc';
}

// =============================================================================
// EXPORT FORMATS
// =============================================================================

/**
 * Export format options
 */
export type ExportFormat = 'gpx' | 'csv' | 'json' | 'html';

/**
 * Export result
 */
export interface ExportResult {
  format: ExportFormat;
  filename: string;
  content: string;
  mimeType: string;
}

// =============================================================================
// LIMITS & VALIDATION
// =============================================================================

/**
 * Route limits configuration
 */
export const ROUTE_LIMITS = {
  ROUTES_SOFT_LIMIT: 20,
  ROUTES_HARD_LIMIT: 50,
  COMPANIES_PER_ROUTE_SOFT_LIMIT: 50,
  COMPANIES_PER_ROUTE_HARD_LIMIT: 100,
  WAYPOINTS_MAX: 1000,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
} as const;

/**
 * Limit check result
 */
export interface LimitCheckResult {
  withinSoftLimit: boolean;
  withinHardLimit: boolean;
  current: number;
  softLimit: number;
  hardLimit: number;
  message?: string;
}

// =============================================================================
// DISPLAY CONSTANTS
// =============================================================================

/**
 * Default route colors
 */
export const ROUTE_COLORS = [
  '#3B82F6', // Blue (default)
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
] as const;

/**
 * System route identifiers
 */
export const SYSTEM_ROUTES = {
  CLEVELAND_GREENWAY: 'cleveland-greenway',
} as const;
