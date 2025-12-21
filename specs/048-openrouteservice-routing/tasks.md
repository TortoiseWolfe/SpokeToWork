# Tasks: OpenRouteService Bicycle Routing

**Feature**: 048-openrouteservice-routing
**Date**: 2025-12-21
**Generated from**: spec.md, plan.md

## Phase 1: Setup

- [x] T001 [P] Setup: Add ORS API key to .env.example with documentation
- [x] T002 [P] Setup: Verify ORS API key works by testing endpoint

## Phase 2: Core Implementation

- [x] T003 [P] [US1] Create src/lib/routing/openrouteservice.ts with ORS API integration
- [x] T004 [P] [US1] Implement getORSBicycleRoute() function with cycling-road profile
- [x] T005 [P] [US1] Add coordinate conversion (lat/lng → lng/lat for GeoJSON)
- [x] T006 [P] [US1] Parse ORS response to BicycleRouteResult format

## Phase 3: Fallback & Integration

- [x] T007 [P] [US3] Create src/lib/routing/routing-service.ts unified facade
- [x] T008 [P] [US3] Implement ORS primary → OSRM fallback logic
- [x] T009 [P] [US3] Add error handling for: unavailable, invalid key, rate limit
- [x] T010 [P] [US3] Implement exponential backoff for rate limiting (429)
- [x] T010a [P] [US1] Add 10-second timeout to routing requests (NFR-001, SC-004)

## Phase 4: Migration

- [x] T011 [US1] Update src/hooks/useRoutes.ts import to use routing-service.ts
- [x] T012 [US1] Add logging for which service generated the route

## Phase 5: Testing

- [x] T013 [P] Create src/lib/routing/**tests**/openrouteservice.test.ts
- [x] T014 [P] Test ORS response parsing with mocked fetch
- [x] T015 [P] Create src/lib/routing/**tests**/routing-service.test.ts
- [x] T016 [P] Test fallback: ORS fails → OSRM succeeds
- [x] T017 [P] Test fallback: ORS unavailable → OSRM used
- [x] T018 [P] Test fallback: No API key → OSRM only

## Phase 6: Polish

- [x] T019 Verify route to Bradley/Polk uses Whitewater Drive (< 2km)
- [x] T020 Update docs/TECHNICAL-DEBT.md to remove OSRM routing limitation note (N/A - no limitation note exists)
- [x] T021 Run full test suite and fix any failures

## Task Dependencies

```
T001, T002 (parallel setup)
    ↓
T003 → T004 → T005 → T006 (ORS module sequential)
    ↓
T007 → T008 → T009 → T010 (routing service sequential)
    ↓
T011, T012 (parallel migration)
    ↓
T013-T018 (parallel tests)
    ↓
T019 → T020 → T021 (sequential verification)
```

## Summary

| Phase     | Tasks  | Parallel         |
| --------- | ------ | ---------------- |
| Setup     | 2      | Yes (T001, T002) |
| Core      | 4      | No (sequential)  |
| Fallback  | 5      | No (sequential)  |
| Migration | 2      | Yes (T011, T012) |
| Testing   | 6      | Yes (T013-T018)  |
| Polish    | 3      | No (sequential)  |
| **Total** | **22** |                  |

## User Story Mapping

| User Story                    | Tasks                      | Priority |
| ----------------------------- | -------------------------- | -------- |
| US1 - Direct Route Generation | T003-T006, T011-T012, T019 | P1       |
| US2 - Multiple Bike Profiles  | (Future enhancement)       | P2       |
| US3 - API Key Configuration   | T001, T007-T010, T016-T018 | P3       |
