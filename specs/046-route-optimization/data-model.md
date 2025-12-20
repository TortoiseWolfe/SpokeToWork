# Data Model: Route Optimization

**Feature**: 046-route-optimization
**Date**: 2025-12-19

## Database Schema Changes

### bicycle_routes Table (MODIFY)

Add columns to existing table in monolithic migration:

```sql
-- Add to supabase/migrations/20251006_complete_monolithic_setup.sql
-- In the bicycle_routes section

ALTER TABLE bicycle_routes
ADD COLUMN IF NOT EXISTS start_type TEXT DEFAULT 'home'
  CHECK (start_type IN ('home', 'custom')),
ADD COLUMN IF NOT EXISTS end_type TEXT DEFAULT 'home'
  CHECK (end_type IN ('home', 'custom')),
ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_optimized_at TIMESTAMPTZ;

COMMENT ON COLUMN bicycle_routes.start_type IS 'Whether start uses home location or custom coordinates';
COMMENT ON COLUMN bicycle_routes.end_type IS 'Whether end uses home location or custom coordinates';
COMMENT ON COLUMN bicycle_routes.is_round_trip IS 'True if route returns to start point';
COMMENT ON COLUMN bicycle_routes.last_optimized_at IS 'Timestamp of last TSP optimization';
```

### Existing Fields (Already Present)

These fields exist but are currently unused - this feature will populate them:

```sql
-- Already in bicycle_routes:
start_address VARCHAR(500),
start_latitude DECIMAL(10, 7),
start_longitude DECIMAL(10, 7),
end_address VARCHAR(500),
end_latitude DECIMAL(10, 7),
end_longitude DECIMAL(10, 7),
distance_miles DECIMAL(10, 2),
estimated_time_minutes INTEGER

-- Already in route_companies:
sequence_order INTEGER,
distance_from_start_miles DECIMAL(10, 2)
```

## TypeScript Type Definitions

### New Types (src/lib/routes/optimization-types.ts)

```typescript
/**
 * Location type for route start/end points
 */
export type LocationType = 'home' | 'custom';

/**
 * Geographic point with type indicator
 */
export interface RoutePoint {
  latitude: number;
  longitude: number;
  address?: string;
  type: LocationType;
}

/**
 * Input for route optimization algorithm
 */
export interface RouteOptimizationInput {
  routeId: string;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  companies: Array<{
    id: string;
    latitude: number;
    longitude: number;
    name: string;
  }>;
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
  /** Estimated cycling time in minutes */
  estimatedTimeMinutes: number;
  /** Distance saved compared to original order */
  distanceSavingsMiles: number;
  /** Percentage distance saved */
  distanceSavingsPercent: number;
  /** Original distance before optimization */
  originalDistanceMiles: number;
  /** Distance from start for each company */
  distancesFromStart: Map<string, number>;
}

/**
 * Data for optimization comparison modal
 */
export interface OptimizationComparisonData {
  before: {
    order: string[];
    distanceMiles: number;
    timeMinutes: number;
    geometry?: GeoJSON.LineString;
  };
  after: {
    order: string[];
    distanceMiles: number;
    timeMinutes: number;
    geometry?: GeoJSON.LineString;
  };
  savings: {
    distanceMiles: number;
    percent: number;
  };
}

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
}
```

### Modified Types (src/types/route.ts)

```typescript
// Add to existing BicycleRoute interface:
export interface BicycleRoute {
  // ... existing fields ...

  // NEW: Start/end point configuration
  start_type: 'home' | 'custom';
  end_type: 'home' | 'custom';
  is_round_trip: boolean;
  last_optimized_at: string | null;
}

// Add to BicycleRouteCreate:
export interface BicycleRouteCreate {
  // ... existing fields ...

  start_type?: 'home' | 'custom';
  end_type?: 'home' | 'custom';
  is_round_trip?: boolean;
}

// Add to BicycleRouteUpdate:
export interface BicycleRouteUpdate {
  // ... existing fields ...

  start_type?: 'home' | 'custom';
  end_type?: 'home' | 'custom';
  is_round_trip?: boolean;
  last_optimized_at?: string;
}
```

## Entity Relationships

```
┌─────────────────┐     1:N     ┌──────────────────┐
│  user_profiles  │◄───────────►│  bicycle_routes  │
│                 │             │                  │
│ home_address    │             │ start_type       │
│ home_latitude   │             │ end_type         │
│ home_longitude  │             │ start_address    │
│                 │             │ start_latitude   │
└─────────────────┘             │ end_latitude     │
                                │ is_round_trip    │
                                └────────┬─────────┘
                                         │
                                         │ 1:N
                                         ▼
                                ┌──────────────────┐
                                │ route_companies  │
                                │                  │
                                │ sequence_order   │
                                │ distance_from_   │
                                │   start_miles    │
                                └──────────────────┘
```

## Data Flow

### Route Creation

1. User creates route
2. If home location set → auto-populate start/end from user_profiles
3. Set start_type='home', end_type='home'
4. User can override with custom locations

### Route Optimization

1. Fetch route with companies
2. Get start/end coordinates (home or custom)
3. Run TSP optimization
4. Update route_companies.sequence_order
5. Calculate and store distance_from_start_miles
6. Update bicycle_routes.last_optimized_at
7. Generate OSRM path and update geometry

## Validation Rules

| Field                     | Validation                     |
| ------------------------- | ------------------------------ |
| start_type                | 'home' or 'custom' only        |
| end_type                  | 'home' or 'custom' only        |
| is_round_trip             | boolean, default true          |
| sequence_order            | integer >= 0, unique per route |
| distance_from_start_miles | >= 0, nullable                 |
| start_latitude            | -90 to 90                      |
| start_longitude           | -180 to 180                    |

## Migration Safety

All schema changes use `IF NOT EXISTS` and are idempotent:

- Safe to run multiple times
- No data loss on re-run
- Backward compatible (new columns have defaults)
