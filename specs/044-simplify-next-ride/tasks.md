# Tasks: Simplify Next Ride Feature

**Input**: Design documents from `/specs/044-simplify-next-ride/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Component tests will be updated as part of implementation (existing test files).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Type Changes)

**Purpose**: Update type definitions that all components depend on

- [x] T001 Rename `next_ride_only` to `on_active_route` in CompanyFilters type in src/types/company.ts
- [x] T002 Verify CompanyTableProps location and rename `nextRideCompanyIds` to `activeRouteCompanyIds` (type may be in component file src/components/organisms/CompanyTable/CompanyTable.tsx)

**Checkpoint**: Type definitions updated - components can now be modified

---

## Phase 2: Foundational (Active Route Helper)

**Purpose**: Core infrastructure that ALL user stories depend on

**CRITICAL**: US1, US2, and US3 all need the active route company IDs - this helper must be complete first

- [x] T003 Add `getActiveRouteCompanyIds(): Promise<Set<string>>` helper function to src/hooks/useRoutes.ts
- [x] T004 Export the new helper from useRoutes hook return type in src/hooks/useRoutes.ts
- [x] T005 Update useRoutes.ts unit tests for new helper in src/hooks/**tests**/useRoutes.test.ts (if exists)

**Checkpoint**: Foundation ready - active route company IDs can now be retrieved

---

## Phase 3: User Story 1 - Filter Companies to Active Route (Priority: P1)

**Goal**: Users can filter company list to show only companies on their active route

**Independent Test**: Set an active route with companies, check "On Active Route" filter, verify only those companies appear

### Implementation for User Story 1

- [x] T006 [US1] Update filter label from "Next Ride" to "On Active Route" in src/components/molecular/CompanyFilters/CompanyFilters.tsx
- [x] T007 [US1] Rename `handleNextRideOnlyChange` to `handleOnActiveRouteChange` in src/components/molecular/CompanyFilters/CompanyFilters.tsx
- [x] T008 [US1] Update aria-label to "Show only companies on active route" in src/components/molecular/CompanyFilters/CompanyFilters.tsx
- [x] T009 [US1] Rename `nextRideCompanyIds` prop to `activeRouteCompanyIds` in src/components/organisms/CompanyTable/CompanyTable.tsx
- [x] T010 [US1] Update filter logic to use `on_active_route` filter property in src/components/organisms/CompanyTable/CompanyTable.tsx
- [x] T011 [US1] Wire up `getActiveRouteCompanyIds` and pass to CompanyTable in src/app/companies/page.tsx
- [x] T012 [US1] Add empty state message "No companies on this route yet" when filter active but no results in src/components/organisms/CompanyTable/CompanyTable.tsx
- [x] T013 [US1] Update CompanyFilters unit tests for renamed properties in src/components/molecular/CompanyFilters/CompanyFilters.test.tsx
- [x] T014 [US1] Update CompanyTable unit tests for renamed props in src/components/organisms/CompanyTable/CompanyTable.test.tsx
- [x] T015 [US1] Create E2E test for active route filter in tests/e2e/companies/active-route-filter.spec.ts

**Checkpoint**: User Story 1 complete - filter functionality works independently

---

## Phase 4: User Story 2 - Visual Indicator for Active Route Companies (Priority: P2)

**Goal**: Users can see at a glance which companies are on their active route without toggling filter

**Independent Test**: Set an active route, view full company list (filter off), verify companies on route have bicycle icon indicator

### Implementation for User Story 2

- [x] T016 [P] [US2] Add `isOnActiveRoute?: boolean` prop to CompanyRow in src/components/molecular/CompanyRow/CompanyRow.tsx
- [x] T017 [US2] Add bicycle icon indicator with tooltip "On active route" in src/components/molecular/CompanyRow/CompanyRow.tsx
- [x] T018 [US2] Make indicator responsive: icon-only on mobile, icon+tooltip on desktop in src/components/molecular/CompanyRow/CompanyRow.tsx
- [x] T019 [US2] Add aria-label="On active route" for screen reader accessibility in src/components/molecular/CompanyRow/CompanyRow.tsx
- [x] T020 [US2] Pass `isOnActiveRoute` prop from CompanyTable to CompanyRow based on activeRouteCompanyIds in src/components/organisms/CompanyTable/CompanyTable.tsx
- [x] T021 [US2] Update CompanyRow unit tests for new indicator in src/components/molecular/CompanyRow/CompanyRow.test.tsx
- [x] T022 [US2] Update CompanyRow accessibility tests for aria-label in src/components/molecular/CompanyRow/CompanyRow.accessibility.test.tsx

**Checkpoint**: User Story 2 complete - visual indicators show independently of filter

---

## Phase 5: User Story 3 - Deprecate Unused Complexity (Priority: P3)

**Goal**: Clean up unused NextRidePanel and mark deprecated functions

**Independent Test**: Verify NextRidePanel is marked deprecated, app runs without new panels

### Implementation for User Story 3

- [x] T023 [P] [US3] Add @deprecated JSDoc comment to NextRidePanel component in src/components/organisms/NextRidePanel/NextRidePanel.tsx
- [x] T024 [P] [US3] Add @deprecated JSDoc to toggleNextRide function in src/hooks/useRoutes.ts
- [x] T025 [P] [US3] Add @deprecated JSDoc to getNextRideCompanies function in src/hooks/useRoutes.ts
- [x] T026 [P] [US3] Add @deprecated JSDoc to clearAllNextRide function in src/hooks/useRoutes.ts
- [x] T027 [US3] Remove any imports of NextRidePanel from companies page (if any) in src/app/companies/page.tsx
- [x] T028 [US3] Verify no new panels/drawers are rendered by running the app

**Checkpoint**: User Story 3 complete - codebase cleaned up

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [x] T029 Run full test suite: `docker compose exec spoketowork pnpm test`
- [x] T030 Run accessibility tests: `docker compose exec spoketowork pnpm run test:a11y`
- [x] T031 Run type-check: `docker compose exec spoketowork pnpm run type-check`
- [x] T032 Run lint: `docker compose exec spoketowork pnpm run lint`
- [x] T033 Manual test per quickstart.md scenarios (verified via Playwright E2E - 52 passed)
- [x] T034 Update Storybook story for CompanyFilters if needed in src/components/molecular/CompanyFilters/CompanyFilters.stories.tsx
- [x] T035 Update Storybook story for CompanyRow if needed in src/components/molecular/CompanyRow/CompanyRow.stories.tsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational (can run parallel to US1)
- **User Story 3 (Phase 5)**: No dependencies on other stories (can run parallel)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

| Story    | Depends On          | Can Parallel With |
| -------- | ------------------- | ----------------- |
| US1 (P1) | Foundational        | US2, US3          |
| US2 (P2) | Foundational        | US1, US3          |
| US3 (P3) | None (cleanup only) | US1, US2          |

### Within Each User Story

1. Component prop/type changes first
2. Component implementation second
3. Page wiring third
4. Tests last

### Parallel Opportunities

**Phase 1**: T001, T002 can run in parallel (different sections of same file)
**Phase 2**: T003-T005 are sequential (same file)
**Phase 3**: T006-T008 parallel (CompanyFilters), then T009-T012 (CompanyTable), then T013-T015 (tests)
**Phase 4**: T016-T019 parallel (CompanyRow), then T020 (CompanyTable), then T021-T022 (tests)
**Phase 5**: T023-T026 all parallel (different files)
**Phase 6**: T029-T032 sequential (test suite), T034-T035 parallel (different stories)

---

## Parallel Example: User Story 2

```bash
# Launch all CompanyRow tasks together:
Task: "Add isOnActiveRoute prop to CompanyRow in src/components/molecular/CompanyRow/CompanyRow.tsx"
Task: "Add bicycle icon indicator with tooltip in src/components/molecular/CompanyRow/CompanyRow.tsx"
Task: "Make indicator responsive in src/components/molecular/CompanyRow/CompanyRow.tsx"
Task: "Add aria-label for accessibility in src/components/molecular/CompanyRow/CompanyRow.tsx"

# Then: Wire up in CompanyTable
Task: "Pass isOnActiveRoute prop from CompanyTable to CompanyRow"

# Then: Tests
Task: "Update CompanyRow unit tests"
Task: "Update CompanyRow accessibility tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 1 (T006-T014)
4. **STOP and VALIDATE**: Test filter functionality independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test filter → Deploy (MVP!)
3. Add User Story 2 → Test indicators → Deploy
4. Add User Story 3 → Verify cleanup → Deploy
5. Polish phase → Final validation

### Single Developer Strategy

Execute in order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Each phase checkpoint validates the feature incrementally.

---

## Summary

| Phase        | Tasks | Parallel | Files Modified                                    |
| ------------ | ----- | -------- | ------------------------------------------------- |
| Setup        | 2     | Yes      | types/company.ts                                  |
| Foundational | 3     | No       | hooks/useRoutes.ts                                |
| US1 (P1)     | 10    | Partial  | CompanyFilters, CompanyTable, companies/page, E2E |
| US2 (P2)     | 7     | Partial  | CompanyRow, CompanyTable                          |
| US3 (P3)     | 6     | Yes      | NextRidePanel, useRoutes, companies/page          |
| Polish       | 7     | Partial  | Tests, Storybook                                  |

**Total Tasks**: 35
**MVP Scope**: Phase 1-3 (15 tasks)
**Estimated Parallel Savings**: ~40% with optimal parallelization

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: No new files, modifying existing 5-file components
