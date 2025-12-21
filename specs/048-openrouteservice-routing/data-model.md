# Data Model: OpenRouteService Routing

**Feature**: 048-openrouteservice-routing
**Date**: 2025-12-21

## Existing Types (No Changes)

### RouteGeometry

```typescript
// src/types/route.ts (existing)
export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat] pairs (GeoJSON format)
}
```

### BicycleRouteResult

```typescript
// src/lib/routing/osrm-service.ts (existing)
export interface BicycleRouteResult {
  geometry: RouteGeometry;
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
}
```

## New Types

### ORS Profile Enum

```typescript
// src/lib/routing/openrouteservice.ts
export type ORSProfile =
  | 'cycling-regular' // General purpose
  | 'cycling-road' // Prefers paved roads (DEFAULT)
  | 'cycling-mountain' // Allows trails
  | 'cycling-electric'; // E-bike assumptions
```

### ORS API Response Types

```typescript
// src/lib/routing/openrouteservice.ts

export interface ORSResponse {
  type: 'FeatureCollection';
  features: ORSFeature[];
}

export interface ORSFeature {
  type: 'Feature';
  geometry: RouteGeometry;
  properties: ORSProperties;
}

export interface ORSProperties {
  segments: ORSSegment[];
  summary: ORSSummary;
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
}

export interface ORSSummary {
  distance: number; // total meters
  duration: number; // total seconds
}
```

### Routing Service Types

```typescript
// src/lib/routing/routing-service.ts

export interface RoutingOptions {
  preferORS?: boolean; // Try ORS first (default: true)
  profile?: ORSProfile; // ORS profile (default: 'cycling-road')
  timeout?: number; // Request timeout ms (default: 10000)
}

export type RoutingService = 'ors' | 'osrm';

export interface RoutingResult extends BicycleRouteResult {
  service: RoutingService; // Which service generated this route
}
```

## Type Relationships

```
┌────────────────────┐
│  RoutingOptions    │
│  - preferORS       │
│  - profile         │
│  - timeout         │
└────────────────────┘
         │
         ▼
┌────────────────────┐     ┌──────────────────┐
│  Unified Router    │────▶│  ORSService      │
│  getBicycleRoute() │     │  getORSRoute()   │
└────────────────────┘     └──────────────────┘
         │                          │
         │                          ▼
         │                 ┌──────────────────┐
         │                 │  ORSResponse     │
         │                 │  - features[]    │
         │                 │  - geometry      │
         │                 └──────────────────┘
         │
         ▼ (fallback)
┌────────────────────┐
│  OSRMService       │
│  getOSRMRoute()    │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  BicycleRouteResult│
│  - geometry        │
│  - distanceMeters  │
│  - distanceMiles   │
│  - durationSeconds │
│  - durationMinutes │
└────────────────────┘
```

## Database Schema

No database changes required. Route geometry stored in existing `bicycle_routes.route_geometry` JSONB column.

## Environment Variables

| Variable                  | Type   | Required | Default   | Description                             |
| ------------------------- | ------ | -------- | --------- | --------------------------------------- |
| `NEXT_PUBLIC_ORS_API_KEY` | string | No       | undefined | ORS API key. If missing, uses OSRM only |
