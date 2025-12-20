# Tasks: Route Optimization with Home Start/End

**Feature**: 046-route-optimization
**Generated**: 2025-12-19
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Foundation)

- [x] T001 [P] ~~Install TSP package~~ Using custom implementation (no suitable npm packages available)
- [x] T002 [P] Add schema changes to monolithic migration (start_type, end_type, is_round_trip, last_optimized_at)
- [x] T003 [P] Create src/lib/routes/optimization-types.ts with LocationType, RouteOptimizationInput, RouteOptimizationResult, OptimizationComparisonData types
- [x] T004 Update src/types/route.ts to add start_type, end_type, is_round_trip to BicycleRoute interface

---

## Phase 2: Core Algorithm (US1 - Optimize Route Order)

- [x] T005 Create src/lib/routes/tsp-solver.ts with buildDistanceMatrix function using Haversine
- [x] T006 Implement solveRouteOptimization function in tsp-solver.ts (custom nearest neighbor + 2-opt)
- [x] T007 Implement calculateRouteStats function for distance/time calculation
- [x] T008 Add unit tests for tsp-solver.ts in tests/unit/lib/routes/tsp-solver.test.ts
- [x] T009 [P] Add optimizeRoute method to src/lib/routes/route-service.ts
- [x] T010 [P] Add applyRouteOptimization method to persist sequence_order and distance_from_start_miles

---

## Phase 3: Start/End Configuration (US2 - Configure Start/End Points)

- [x] T011 Create RouteStartEndEditor component directory with 5-file structure
- [x] T012 Implement RouteStartEndEditor.tsx with home/custom toggle and address search
- [x] T013 Write RouteStartEndEditor.test.tsx unit tests
- [x] T014 Write RouteStartEndEditor.stories.tsx Storybook stories
- [x] T015 Write RouteStartEndEditor.accessibility.test.tsx a11y tests
- [x] T016 Add setRouteStartEnd method to route-service.ts
- [x] T017 Integrate RouteStartEndEditor into RouteBuilder component
- [x] T018 Auto-populate home location from user profile on new route creation

---

## Phase 4: UI Integration (US1 continued - Optimization Modal)

- [x] T019 Create RouteOptimizationModal component directory with 5-file structure
- [x] T020 Implement RouteOptimizationModal.tsx with before/after map comparison
- [x] T021 Write RouteOptimizationModal.test.tsx unit tests
- [x] T022 Write RouteOptimizationModal.stories.tsx Storybook stories
- [x] T023 Write RouteOptimizationModal.accessibility.test.tsx a11y tests
- [x] T024 Add "Optimize Order" button to RouteDetailDrawer component (moved from RouteCompanyList)
- [x] T025 Create useRouteOptimization hook in src/hooks/useRouteOptimization.ts
- [x] T026 Integrate OSRM path generation after optimization (call generateRouteGeometry)
- [x] T027 Handle empty route case (0 companies) - disable button, show info message (FR-017)
- [x] T028 Handle companies with missing coordinates - warning toast, exclude, show edit link (FR-012)

---

## Phase 5: Auto-Suggest (US3 - Auto-Suggest Optimization)

- [ ] T029 Add optimization suggestion banner to RouteCompanyList
- [ ] T030 Implement suggestion trigger on company add (3+ companies)
- [ ] T031 Implement exponential backoff for dismissals (50% at 3, 25% at 6, disabled at 10+) (FR-018)
- [ ] T032 Add session storage for dismissal count
- [ ] T033 Show distance savings preview in suggestion banner

---

## Phase 6: Round-Trip Mode (US4 - Round-Trip vs One-Way)

- [ ] T034 Add is_round_trip toggle to RouteDetailDrawer
- [x] T035 Implement toggleRoundTrip method in route-service.ts
- [ ] T036 Modify TSP solver to handle one-way routes (no return to start)
- [ ] T037 Trigger re-optimization prompt when round-trip mode changes

---

## Phase 7: Polish & Testing

- [ ] T038 Create E2E test for full optimization flow (tests/e2e/route-optimization.spec.ts)
- [ ] T039 Add E2E test for start/end configuration
- [ ] T040 Add E2E test for auto-suggest behavior
- [ ] T041 Performance testing - verify <3s for 10 companies, <5s for 20 (SC-001, NFR-001)
- [ ] T042 Edge case testing - 50+ companies warning
- [ ] T043 Offline testing - verify optimization works without network
- [ ] T044 Final documentation review - verify spec/plan/data-model consistency

---

## Summary

| Phase     | Tasks  | Parallel | Description        |
| --------- | ------ | -------- | ------------------ |
| 1         | 4      | 3        | Setup & schema     |
| 2         | 6      | 2        | TSP algorithm      |
| 3         | 8      | 0        | Start/end UI       |
| 4         | 10     | 0        | Optimization modal |
| 5         | 5      | 0        | Auto-suggest       |
| 6         | 4      | 0        | Round-trip mode    |
| 7         | 7      | 3        | Testing & polish   |
| **Total** | **44** | **8**    |                    |

### Task Legend

- `[P]` = Can run in parallel with other [P] tasks in same phase
- User Story mapping:
  - US1 (P1): T005-T010, T019-T028
  - US2 (P1): T011-T018
  - US3 (P2): T029-T033
  - US4 (P3): T034-T037

### Dependencies

- T005-T010 depend on T001-T004 (setup)
- T011-T018 depend on T004 (types)
- T019-T028 depend on T005-T010 (algorithm)
- T029-T033 depend on T024-T025 (button + hook)
- T034-T037 depend on T005-T010 (algorithm)
- T038-T044 depend on all implementation tasks
