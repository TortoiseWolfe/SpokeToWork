/**
 * Route Optimization Type Definitions
 * Feature: 046-route-optimization
 *
 * Types for TSP-based route optimization with home start/end configuration.
 */

// =============================================================================
// LOCATION TYPES
// =============================================================================

/**
 * Location type for route start/end points
 */
export type LocationType = 'home' | 'custom';

/**
 * Geographic point with type indicator
 */
export interface RouteEndpoint {
  latitude: number;
  longitude: number;
  address?: string;
  type: LocationType;
}

// =============================================================================
// OPTIMIZATION INPUT/OUTPUT
// =============================================================================

/**
 * Company location for optimization algorithm
 */
export interface OptimizationCompany {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Input for route optimization algorithm
 */
export interface RouteOptimizationInput {
  routeId: string;
  startPoint: RouteEndpoint;
  endPoint: RouteEndpoint;
  companies: OptimizationCompany[];
  isRoundTrip: boolean;
}

/**
 * Result from TSP optimization
 */
export interface RouteOptimizationResult {
  /** Company IDs in optimized order */
  optimizedOrder: string[];
  /** Total route distance in miles */
  totalDistanceMiles: number;
  /** Estimated cycling time in minutes (at 12 mph average) */
  estimatedTimeMinutes: number;
  /** Distance saved compared to original order */
  distanceSavingsMiles: number;
  /** Percentage distance saved */
  distanceSavingsPercent: number;
  /** Original distance before optimization */
  originalDistanceMiles: number;
  /** Distance from start for each company (by company ID) */
  distancesFromStart: Record<string, number>;
}

// =============================================================================
// COMPARISON DATA
// =============================================================================

/**
 * Route state for comparison (before or after optimization)
 */
export interface RouteState {
  /** Company IDs in order */
  order: string[];
  /** Total distance in miles */
  distanceMiles: number;
  /** Estimated time in minutes */
  timeMinutes: number;
  /** Optional GeoJSON geometry for map display */
  geometry?: GeoJSON.LineString;
  /** Distance from start for each company (by company ID) - only in 'after' state */
  distancesFromStart?: Record<string, number>;
}

/**
 * Data for optimization comparison modal
 */
export interface OptimizationComparisonData {
  before: RouteState;
  after: RouteState;
  savings: {
    distanceMiles: number;
    percent: number;
  };
  /** Companies excluded from optimization (missing coordinates) */
  excludedCompanies: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
}

// =============================================================================
// OPTIONS & CONFIGURATION
// =============================================================================

/**
 * Options for optimization behavior
 */
export interface OptimizationOptions {
  /** Skip OSRM call (use Haversine only) */
  skipOsrm?: boolean;
  /** Show preview without applying */
  previewOnly?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum companies to optimize (default: 50) */
  maxCompanies?: number;
}

/**
 * Auto-suggest configuration
 */
export interface AutoSuggestConfig {
  /** Minimum companies to trigger suggestion */
  minCompanies: number;
  /** Dismissal count thresholds for backoff */
  backoffThresholds: {
    /** At this many dismissals, use 50% probability */
    halfProbability: number;
    /** At this many dismissals, use 25% probability */
    quarterProbability: number;
    /** At this many dismissals, disable suggestions */
    disabled: number;
  };
}

/**
 * Default auto-suggest configuration per FR-018
 */
export const DEFAULT_AUTO_SUGGEST_CONFIG: AutoSuggestConfig = {
  minCompanies: 3,
  backoffThresholds: {
    halfProbability: 3,
    quarterProbability: 6,
    disabled: 10,
  },
};

// =============================================================================
// ALGORITHM INTERNALS
// =============================================================================

/**
 * Point in distance matrix
 */
export interface MatrixPoint {
  id: string;
  lat: number;
  lng: number;
  isStart?: boolean;
  isEnd?: boolean;
}

/**
 * Distance matrix result
 */
export interface DistanceMatrix {
  points: MatrixPoint[];
  distances: number[][]; // [i][j] = distance from point i to point j in miles
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Optimization limits
 */
export const OPTIMIZATION_LIMITS = {
  /** Maximum companies for optimization */
  MAX_COMPANIES: 50,
  /** Warning threshold for slow optimization */
  SLOW_WARNING_THRESHOLD: 30,
  /** Timeout for optimization in milliseconds */
  TIMEOUT_MS: 10000,
  /** Average cycling speed in mph */
  AVG_CYCLING_SPEED_MPH: 12,
} as const;
