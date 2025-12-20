# Implementation Plan: Route Optimization with Home Start/End

**Branch**: `046-route-optimization` | **Date**: 2025-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/046-route-optimization/spec.md`

## Summary

Implement TSP-based route optimization for bicycle routes, allowing users to automatically optimize company visit order. Routes default to starting/ending at home location with option for custom start/end points. Uses `@peerless/tsp` library for client-side optimization with OSRM integration for actual bike path generation. Provides both manual "Optimize Order" button and auto-suggest on company add.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 15
**Primary Dependencies**: @peerless/tsp (TSP solver), react-map-gl, maplibre-gl, @tanstack/react-query
**Storage**: Supabase PostgreSQL (bicycle_routes, route_companies tables)
**Testing**: Vitest (unit), Playwright (E2E), Pa11y (a11y)
**Target Platform**: Browser (static export to GitHub Pages)
**Project Type**: Web application (Next.js PWA)
**Performance Goals**: <3 seconds for 10-company optimization, <5 seconds for 20 companies
**Constraints**: Client-side only (no server API), offline-capable, static hosting
**Scale/Scope**: Routes with up to 50 companies, typical use 5-15 companies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Status  | Notes                                      |
| --------------------------------- | ------- | ------------------------------------------ |
| Proper Solutions Over Quick Fixes | ✅ PASS | Full TSP solver, not heuristic-only        |
| Root Cause Analysis               | ✅ PASS | Addresses missing optimization feature     |
| Stability Over Speed              | ✅ PASS | Uses proven library, comprehensive testing |
| Clean Architecture                | ✅ PASS | New service follows existing patterns      |
| No Technical Debt                 | ✅ PASS | Complete implementation, no TODOs          |
| Docker-First Development          | ✅ PASS | All commands via Docker                    |
| Static Hosting Constraint         | ✅ PASS | Client-side TSP, no server API             |
| Component Structure               | ✅ PASS | 5-file pattern for new components          |
| Database Migrations               | ✅ PASS | Monolithic migration file                  |

## Project Structure

### Documentation (this feature)

```text
specs/046-route-optimization/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # TSP library research
├── data-model.md        # Entity definitions
├── quickstart.md        # Integration scenarios
├── contracts/           # API specifications (N/A - client-side)
├── checklists/          # Requirements validation
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── routes/
│       ├── route-service.ts        # MODIFY: Add optimization methods
│       ├── tsp-solver.ts           # NEW: TSP optimization service
│       └── optimization-types.ts   # NEW: Optimization type definitions
├── hooks/
│   ├── useRoutes.ts                # MODIFY: Add optimization hooks
│   └── useRouteOptimization.ts     # NEW: Optimization-specific hook
├── components/
│   └── organisms/
│       ├── RouteCompanyList/       # MODIFY: Add optimize button
│       ├── RouteOptimizationModal/ # NEW: Before/after comparison modal
│       └── RouteStartEndEditor/    # NEW: Start/end point configuration
├── types/
│   └── route.ts                    # MODIFY: Add optimization types

tests/
├── unit/
│   └── lib/routes/
│       └── tsp-solver.test.ts      # NEW: TSP algorithm tests
└── e2e/
    └── route-optimization.spec.ts  # NEW: E2E optimization tests

supabase/
└── migrations/
    └── 20251006_complete_monolithic_setup.sql  # MODIFY: Add start_type/end_type
```

**Structure Decision**: Extends existing route management architecture. New TSP solver service in `src/lib/routes/`, new optimization hook, new modal component following 5-file pattern.

## Complexity Tracking

No constitution violations requiring justification.

## Phase 0: Research

### TSP Library Selection

**Decision**: Custom implementation (nearest neighbor + 2-opt)

**Rationale**:

- No suitable npm packages available (all either outdated, native C++, or non-existent)
- Existing Haversine distance calculation in codebase
- Simple algorithm sufficient for <50 stops
- Zero external dependencies = more maintainable
- Full control over implementation

**Algorithm**:

1. Nearest Neighbor: Greedy construction starting from home
2. 2-opt Improvement: Iteratively swap edges to reduce distance
3. Expected performance: <100ms for 20 stops

**Alternatives Rejected**:

- `@nikbelikov/tsp-solver`: Not on npm registry
- `node-tspsolver`: Native C++ addon, not browser-compatible
- OR-Tools: No JavaScript/browser support

### Integration Pattern

1. Extract coordinates from companies + start/end points
2. Build distance matrix using Haversine (existing util)
3. Run TSP solver to get optimal order
4. Reorder companies by result
5. Call OSRM for actual bike path
6. Display comparison modal
7. Persist on user confirmation

## Phase 1: Design

### Data Model Changes

**bicycle_routes table additions**:

```sql
ALTER TABLE bicycle_routes
ADD COLUMN IF NOT EXISTS start_type TEXT DEFAULT 'home' CHECK (start_type IN ('home', 'custom')),
ADD COLUMN IF NOT EXISTS end_type TEXT DEFAULT 'home' CHECK (end_type IN ('home', 'custom')),
ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_optimized_at TIMESTAMPTZ;
```

### Type Definitions

```typescript
// src/lib/routes/optimization-types.ts

export type LocationType = 'home' | 'custom';

export interface RouteOptimizationInput {
  routeId: string;
  startPoint: { lat: number; lng: number; type: LocationType };
  endPoint: { lat: number; lng: number; type: LocationType };
  companies: Array<{ id: string; lat: number; lng: number }>;
  isRoundTrip: boolean;
}

export interface RouteOptimizationResult {
  optimizedOrder: string[]; // Company IDs in optimal order
  totalDistanceMiles: number;
  estimatedTimeMinutes: number;
  distanceSavingsMiles: number;
  distanceSavingsPercent: number;
  originalDistanceMiles: number;
}

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
```

### Component Architecture

1. **RouteOptimizationModal** (new)
   - Displays before/after comparison with map
   - Shows distance/time savings
   - Apply/Cancel buttons
   - Loading state during OSRM generation

2. **RouteStartEndEditor** (new)
   - Toggle between home/custom
   - Address search for custom locations
   - Map click to set location
   - Geocoding integration

3. **RouteCompanyList** (modify)
   - Add "Optimize Order" button
   - Show optimization suggestion on company add
   - Update sequence display after optimization

### Service Layer

**tsp-solver.ts** functions:

- `buildDistanceMatrix(points)`: Haversine distances
- `solveRouteOptimization(input)`: Main optimization
- `calculateRouteStats(order, points)`: Distance/time calc

**route-service.ts** additions:

- `optimizeRoute(routeId, options)`: Orchestrates optimization
- `setRouteStartEnd(routeId, start, end)`: Update start/end
- `toggleRoundTrip(routeId, isRoundTrip)`: Toggle mode

## Implementation Phases

### Phase 1: Foundation (Setup)

- Install @peerless/tsp dependency
- Add schema changes to monolithic migration
- Create optimization type definitions

### Phase 2: Core Algorithm (P1 - Optimize Route Order)

- Implement tsp-solver.ts service
- Add distance matrix builder
- Integrate with route-service
- Unit tests for TSP algorithm

### Phase 3: Start/End Configuration (P1 - Configure Start/End)

- Create RouteStartEndEditor component (5-file)
- Integrate with RouteBuilder
- Update route creation flow
- Home location auto-population

### Phase 4: UI Integration (P1 - continued)

- Add optimize button to RouteCompanyList
- Create RouteOptimizationModal component (5-file)
- Implement before/after comparison
- OSRM path generation

### Phase 5: Auto-Suggest (P2)

- Add optimization suggestion on company add
- Implement suggestion dismissal logic
- Session-based frequency limiting

### Phase 6: Round-Trip Mode (P3)

- Add round-trip toggle UI
- Modify TSP solver for one-way mode
- Update route display

### Phase 7: Polish & Testing

- E2E tests for optimization flow
- Accessibility tests for new components
- Performance optimization
- Edge case handling

## Dependencies

```json
{
  "@peerless/tsp": "^1.0.0"
}
```

## Risk Mitigation

| Risk                             | Mitigation                                   |
| -------------------------------- | -------------------------------------------- |
| TSP performance for large routes | Cap at 50 companies, show warning for larger |
| OSRM API availability            | Graceful fallback to Haversine distances     |
| Browser compatibility            | Test in major browsers, polyfills if needed  |
| Memory usage                     | Process in chunks, use Web Workers if needed |
