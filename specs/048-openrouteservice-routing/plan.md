# Implementation Plan: OpenRouteService Bicycle Routing

**Branch**: `048-openrouteservice-routing` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-openrouteservice-routing/spec.md`

## Summary

Replace OSRM as the primary bicycle routing service with OpenRouteService (ORS) to fix routing issues where OSRM's bike profile excludes residential roads, causing 24km detours instead of 1km direct routes. ORS's `cycling-road` profile includes all rideable roads while preferring paved surfaces. OSRM will be retained as a fallback when ORS fails.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 15
**Primary Dependencies**: Native fetch API, existing routing service pattern
**Storage**: N/A (external API calls)
**Testing**: Vitest for unit tests, existing test patterns
**Target Platform**: Static web app (GitHub Pages via Docker)
**Project Type**: Web application (Next.js)
**Performance Goals**: Route requests complete within 10 seconds
**Constraints**: ORS free tier (2000 req/day), must work without ORS key (OSRM fallback)
**Scale/Scope**: Single routing module replacement

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Status | Notes                                                               |
| --------------------------------- | ------ | ------------------------------------------------------------------- |
| Proper Solutions Over Quick Fixes | PASS   | Creating proper ORS module with fallback, not a hack                |
| Root Cause Analysis               | PASS   | Root cause identified: OSRM bike profile excludes residential roads |
| Stability Over Speed              | PASS   | Fallback to OSRM ensures routing always works                       |
| Clean Architecture                | PASS   | Following existing routing service patterns                         |
| No Technical Debt                 | PASS   | Complete implementation with tests                                  |
| Docker-First Development          | PASS   | All testing via Docker                                              |
| Static Hosting Constraint         | PASS   | Client-side API calls only                                          |

## Project Structure

### Documentation (this feature)

```text
specs/048-openrouteservice-routing/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # ORS API documentation research
├── data-model.md        # Route data types
├── quickstart.md        # Integration guide
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── routing/
│       ├── osrm-service.ts           # EXISTING - Will be modified for fallback
│       ├── openrouteservice.ts       # NEW - Primary ORS routing module
│       ├── routing-service.ts        # NEW - Unified routing facade
│       └── __tests__/
│           ├── osrm-service.test.ts  # EXISTING
│           ├── openrouteservice.test.ts  # NEW
│           └── routing-service.test.ts   # NEW

tests/
└── unit/
    └── routing/                       # Test coverage for routing modules
```

**Structure Decision**: Extend existing `src/lib/routing/` directory with new ORS module and unified routing facade. Minimal changes to existing code.

## Integration Points

### Current State

- `useRoutes.ts:14` imports `getBicycleRoute` from `@/lib/routing/osrm-service`
- `useRoutes.ts:477` calls `getBicycleRoute(waypoints)` in `generateRouteGeometry`
- Result provides: `geometry`, `distanceMeters`, `distanceMiles`, `durationSeconds`, `durationMinutes`

### Target State

- Change import to use unified `routing-service.ts`
- Same `getBicycleRoute` function signature
- Internally: ORS primary → OSRM fallback

## API Design

### OpenRouteService Module

```typescript
// src/lib/routing/openrouteservice.ts

export type ORSProfile =
  | 'cycling-regular'
  | 'cycling-road'
  | 'cycling-mountain'
  | 'cycling-electric';

export interface ORSRouteResult {
  geometry: RouteGeometry;
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
}

export async function getORSBicycleRoute(
  waypoints: [number, number][], // [lat, lng] pairs
  profile?: ORSProfile // defaults to 'cycling-road'
): Promise<ORSRouteResult | null>;
```

### Unified Routing Service

```typescript
// src/lib/routing/routing-service.ts

export async function getBicycleRoute(
  waypoints: [number, number][]
): Promise<BicycleRouteResult | null>;
// Tries ORS first, falls back to OSRM if ORS fails
```

## Environment Variables

```env
# .env.example
NEXT_PUBLIC_ORS_API_KEY=your_api_key_here  # Get at https://openrouteservice.org/dev/#/signup
```

**Note**: If key is missing or invalid, system falls back to OSRM only.

## Error Handling Strategy

1. **ORS API unavailable**: Log warning, use OSRM
2. **Invalid API key**: Log error, use OSRM
3. **Rate limited (429)**: Exponential backoff (3 retries), then OSRM
4. **Route exceeds 6000km limit**: Log warning, use OSRM
5. **Waypoints exceed 50 limit**: Log warning, use OSRM
6. **Both services fail**: Return null, caller handles gracefully

## Testing Strategy

1. **Unit Tests**
   - ORS module: Mock fetch, test response parsing
   - Unified service: Test ORS → OSRM fallback logic
   - Error handling: Test all failure scenarios

2. **Integration Tests**
   - Verify route to Bradley/Polk uses direct path
   - Verify fallback works when ORS unavailable

## Complexity Tracking

> No constitution violations requiring justification.

## Phase Summary

1. **Setup**: Add ORS API key to env files
2. **Core**: Create ORS module with API integration
3. **Integration**: Create unified routing service with fallback
4. **Migration**: Update useRoutes.ts import
5. **Testing**: Add unit tests for new modules
6. **Documentation**: Update .env.example with API key instructions
