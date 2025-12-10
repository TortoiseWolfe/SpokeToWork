# Tasks: Bicycle Route Planning

**Input**: Design documents from `/specs/041-bicycle-route-planning/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/route-types.ts (complete)

**Tests**: Include test tasks as specified in spec.md success criteria and project 5-file component pattern requirements.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (Next.js App Router)
- 5-file component pattern: `index.tsx`, `Component.tsx`, `Component.test.tsx`, `Component.stories.tsx`, `Component.accessibility.test.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, types, and core services that all user stories depend on

- [x] T001 Add bicycle_routes, route_companies, active_route_planning, map_tile_providers tables to `/supabase/migrations/20251006_complete_monolithic_setup.sql`
- [x] T002 Execute schema migration via Supabase Management API
- [x] T003 [P] Copy type contracts from `/specs/041-bicycle-route-planning/contracts/route-types.ts` to `/src/types/route.ts`
- [x] T004 [P] Seed map_tile_providers with OSM, OpenCycleMap, Thunderforest Outdoors in migration file
- [x] T005 [P] Seed Cleveland GreenWay system route with GeoJSON geometry in migration file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services and hooks that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create route service at `/src/lib/routes/route-service.ts` with CRUD operations, limit checks, and RLS-compatible queries
- [x] T007 Create tile provider service at `/src/lib/map/tile-provider-service.ts` with provider fetching, preference storage, and CYCLING_TILE_URL constant
- [x] T008 Create useRoutes hook at `/src/hooks/useRoutes.ts` with React Query integration for route data, mutations, and caching
- [x] T009 [P] Create useTileProviders hook at `/src/hooks/useTileProviders.ts` for tile provider selection and persistence
- [x] T010 [P] Create route export utilities at `/src/lib/routes/route-export.ts` for GPX, CSV, JSON, HTML generation

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create and Save a Bicycle Route (Priority: P1) MVP

**Goal**: Users can create named routes with start/end points (defaulting to home address), save them, and see them persist across sessions

**Independent Test**: Create a new route with custom name, modify start/end points, save, refresh page, verify route persists with correct data

### Implementation for User Story 1

- [x] T012 [P] [US1] Create RouteSidebar component structure at `/src/components/organisms/RouteSidebar/` (5-file pattern: index.tsx, RouteSidebar.tsx, RouteSidebar.test.tsx, RouteSidebar.stories.tsx, RouteSidebar.accessibility.test.tsx)
- [x] T013 [P] [US1] Create RouteBuilder component structure at `/src/components/organisms/RouteBuilder/` (5-file pattern)
- [x] T014 [US1] Implement RouteSidebar.tsx with route list display, create button, and active route indicator
- [x] T014.5 [US1] Add active planning mode indicator (highlight/badge) to RouteSidebar for currently active route via `activeRouteId` from useRoutes hook
- [x] T015 [US1] Implement RouteBuilder.tsx with name input, color picker, start/end point inputs (pre-filled from home address)
- [x] T015.5 [US1] Implement home address prompt in RouteBuilder when user has no home_latitude/home_longitude set (show link to HomeLocationSettings or embedded input)
- [x] T016 [US1] Implement route creation flow: validate inputs, call createRoute mutation, close builder on success
- [x] T017 [US1] Implement route edit flow: load existing route data, save changes via updateRoute mutation
- [x] T018 [US1] Implement route delete flow with confirmation dialog and deleteRoute mutation
- [x] T019 [US1] Add route list sorting (by name, updated_at) and filtering (active only, with companies)
- [x] T020 [US1] Write unit tests for RouteSidebar and RouteBuilder components
- [x] T021 [US1] Write Storybook stories for RouteSidebar and RouteBuilder with various states
- [x] T022 [US1] Write accessibility tests for RouteSidebar and RouteBuilder

**Checkpoint**: User Story 1 complete - users can create, edit, delete, and list bicycle routes

---

## Phase 4: User Story 2 - Add Companies to Routes (Priority: P2)

**Goal**: Users can associate companies with routes, view companies on a route, reorder them via drag-and-drop, and remove associations

**Independent Test**: Select existing route, add 3 companies from company list, reorder via drag-and-drop, remove one company, verify all changes persist

### Implementation for User Story 2

- [x] T023 [P] [US2] Create RouteCompanyList component structure at `/src/components/organisms/RouteCompanyList/` (5-file pattern)
- [x] T024 [P] [US2] Create RouteFilter component structure at `/src/components/molecular/RouteFilter/` (5-file pattern)
- [x] T025 [US2] Implement RouteCompanyList.tsx with @dnd-kit sortable list, company display, remove button
- [x] T026 [US2] Implement addCompanyToRoute and removeCompanyFromRoute mutations in useRoutes hook
- [x] T027 [US2] Implement reorderCompanies mutation with optimistic updates and rollback
- [x] T028 [US2] Implement RouteFilter.tsx dropdown in CompanyFilters for filtering companies by route membership
- [x] T029 [US2] Add "Add to Route" action to CompanyTable row menu at `/src/components/organisms/CompanyTable/CompanyTable.tsx`
- [x] T030 [US2] Add "Routes" section to CompanyDetailDrawer at `/src/components/organisms/CompanyDetailDrawer/`
- [x] T031 [US2] Write unit tests for RouteCompanyList and RouteFilter components
- [x] T032 [US2] Write Storybook stories for RouteCompanyList with drag-and-drop states
- [x] T033 [US2] Write accessibility tests for RouteCompanyList (keyboard navigation: Tab to focus, Arrow keys to select, Ctrl+Arrow to move item, announce position changes)

**Checkpoint**: User Story 2 complete - users can manage company-route associations with drag-and-drop ordering

---

## Phase 5: User Story 3 - Mark Companies for Next Ride (Priority: P2)

**Goal**: Users can toggle "visit on next ride" for companies and filter to show only next-ride companies on list and map

**Independent Test**: Mark 5 companies as "next ride", activate filter, verify only those 5 companies appear in list and on map

### Implementation for User Story 3

- [x] T034 [P] [US3] Create NextRidePanel component structure at `/src/components/organisms/NextRidePanel/` (5-file pattern)
- [x] T035 [US3] Implement toggleNextRide mutation in useRoutes hook
- [x] T036 [US3] Implement NextRidePanel.tsx with aggregated next-ride company list, quick clear all button
- [x] T037 [US3] Add "Next Ride" checkbox column to RouteCompanyList
- [x] T038 [US3] Implement next-ride filter in CompanyFilters component
- [x] T039 [US3] Implement map marker highlighting for next-ride companies (different color/size)
- [x] T040 [US3] Write unit tests for NextRidePanel and next-ride toggle functionality
- [x] T041 [US3] Write Storybook stories for NextRidePanel with various company counts
- [x] T042 [US3] Write accessibility tests for NextRidePanel

**Checkpoint**: User Story 3 complete - users can quickly mark and filter companies for their next cycling trip

---

## Phase 6: User Story 4 - View Cycling-Optimized Map (Priority: P3)

**Goal**: Users can switch between map tile providers, including cycling-optimized tiles with larger street labels

**Independent Test**: Load map, select "OpenCycleMap" from tile selector, verify map tiles change to cycling style, refresh page, verify preference persists

### Implementation for User Story 4

- [x] T043 [P] [US4] Create TileLayerSelector component structure at `/src/components/map/TileLayerSelector/` (5-file pattern)
- [x] T044 [US4] Implement TileLayerSelector.tsx with dropdown showing available providers, cycling-optimized indicator
- [x] T045 [US4] Integrate TileLayerSelector with MapContainerInner at `/src/components/map/MapContainer/MapContainerInner.tsx`
- [x] T046 [US4] Implement tile preference persistence in localStorage via useTileProviders hook
- [x] T047 [US4] Add graceful fallback to OSM when selected provider unavailable (API key missing, rate limited)
- [x] T048 [US4] Write unit tests for TileLayerSelector and tile switching logic
- [x] T049 [US4] Write Storybook stories for TileLayerSelector with various provider states
- [x] T050 [US4] Write accessibility tests for TileLayerSelector

**Checkpoint**: User Story 4 complete - users can view map with cycling-optimized tiles

---

## Phase 7: User Story 5 - View GreenWay and Trail Overlays (Priority: P3)

**Goal**: Users can see system trails (Cleveland GreenWay) displayed on the map with info popups

**Independent Test**: Enable trail overlay toggle, verify GreenWay appears as colored polyline, click on trail to see info popup

### Implementation for User Story 5

- [x] T051 [P] [US5] Create RoutePolyline component structure at `/src/components/map/RoutePolyline/` (5-file pattern)
- [x] T052 [US5] Implement RoutePolyline.tsx rendering GeoJSON LineString as Leaflet polyline with configurable color/weight
- [x] T053 [US5] Add getSystemRoutes query to route-service.ts filtering by metro_area_id
- [x] T054 [US5] Implement trail overlay toggle in map controls
- [x] T055 [US5] Implement trail info popup on polyline click (name, length, surface, access points)
- [x] T056 [US5] Display user routes and system routes as distinct polyline layers with different styling
- [x] T057 [US5] Write unit tests for RoutePolyline and system route display
- [x] T058 [US5] Write Storybook stories for RoutePolyline with various route geometries
- [x] T059 [US5] Write accessibility tests for RoutePolyline (alternative text descriptions)

**Checkpoint**: User Story 5 complete - users can view system trails and their own routes on the map

---

## Phase 8: User Story 6 - Draw Custom Route Path (Priority: P4)

**Goal**: Users can draw detailed route paths on the map by clicking waypoints

**Independent Test**: Enter drawing mode, click 5+ points on map forming a path, save route, verify path geometry persists and displays correctly

### Implementation for User Story 6

- [x] T060 [P] [US6] Create RouteDrawingTool component structure at `/src/components/map/RouteDrawingTool/` (5-file pattern)
- [x] T061 [US6] Implement RouteDrawingTool.tsx with drawing mode toggle, click handler for adding waypoints
- [x] T062 [US6] Implement live polyline preview connecting waypoints during drawing
- [x] T063 [US6] Implement waypoint editing (drag to move, click to delete)
- [x] T064 [US6] Convert waypoints to GeoJSON LineString on save, store in route_geometry column
- [x] T065 [US6] Add distance calculation as user draws (sum of segment distances)
- [x] T066 [US6] Add "Clear Path" and "Undo Last Point" controls during drawing
- [x] T067 [US6] Write unit tests for RouteDrawingTool waypoint management
- [x] T068 [US6] Write Storybook stories for RouteDrawingTool in various drawing states
- [x] T069 [US6] Write accessibility tests for RouteDrawingTool (keyboard drawing alternative)

**Checkpoint**: User Story 6 complete - users can draw detailed custom route paths

---

## Phase 9: Integration (Companies Page)

**Purpose**: Connect all route components to the main companies page

- [x] T070 Integrate RouteSidebar into companies page layout at `/src/app/companies/page.tsx`
- [x] T071 Add RoutePolyline rendering for active route and system routes to companies map
- [x] T072 Add company markers with route association indicators
- [x] T073 Integrate NextRidePanel as collapsible panel on companies page
- [x] T074 Add route-based map bounds fitting (zoom to show all companies on selected route)
- [x] T075 Test end-to-end flow: create route, add companies, mark next ride, view on map

**Checkpoint**: All user stories integrated into companies page

---

## Phase 10: Export & Polish

**Purpose**: Route export functionality and cross-cutting improvements

- [x] T076 [P] Implement GPX export in route-export.ts following GPX 1.1 schema
- [x] T077 [P] Implement CSV export with columns: route_name, company_name, address, lat, lng, sequence, next_ride
- [x] T078 [P] Implement JSON export with full route and company data
- [x] T079 [P] Implement printable HTML export with route summary, company list, and static map thumbnail
- [x] T080 Add export menu to RouteBuilder with format selection
- [x] T081 Add export button to RouteSidebar route list items
- [x] T082 Write contract tests for all export formats at `/tests/contract/route-export.test.ts`
- [x] T083 Implement soft limit warnings at 80% threshold (16 routes, 40 companies) with toast notification, blocking UI at hard limit (50 routes, 100 companies)
- [x] T084 Add loading states and error boundaries to all route components
- [x] T085 Run accessibility audit on all new components (jest-axe, keyboard navigation)
- [x] T086 Write E2E test for full route planning workflow at `/tests/e2e/routes.spec.ts`
- [x] T086.5 Write integration test: change home address, verify existing routes retain original start/end coordinates at `/tests/integration/routes-home-address.test.ts`
- [x] T087 Update companies page documentation with route planning features
- [x] T088 Run quickstart.md validation - verify all code examples work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Phase 2 completion
  - US1 (P1) must complete before US2 (P2) can integrate
  - US2 and US3 can proceed in parallel after US1
  - US4 and US5 can proceed in parallel (no story dependencies)
  - US6 can start after US1 (builds on route model)
- **Integration (Phase 9)**: Depends on US1, US2, US3, US5 minimum
- **Polish (Phase 10)**: Depends on Phase 9 completion

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ──────────────────────────────────────┐
    │                                                         │
    ├──────────────────────────────────────────────────────┐  │
    │                                                      │  │
    ▼                                                      │  │
Phase 3: US1 (Create Routes) ─────────────────────┬────────┼──┼───┐
    │                                             │        │  │   │
    ├─────────────┬───────────────────────────────┤        │  │   │
    │             │                               │        │  │   │
    ▼             ▼                               ▼        ▼  ▼   │
Phase 4: US2  Phase 5: US3      Phase 6: US4  Phase 7: US5       │
(Companies)   (Next Ride)       (Tiles)       (Overlays)         │
    │             │                                              │
    │             │                                              │
    ├─────────────┴──────────────────────────────────────────────┤
    │                                                            │
    ▼                                                            ▼
Phase 9: Integration ◄────────────────────────────────── Phase 8: US6
    │                                                    (Draw Path)
    ▼
Phase 10: Polish
```

### Within Each User Story

- Component structure (5-file scaffolding) before implementation
- Core component logic before integration with page
- Unit tests, stories, accessibility tests after component implementation
- All story tasks complete before marking checkpoint

### Parallel Opportunities

**Phase 1 Parallel**: T003, T004, T005 can run in parallel (different files)

**Phase 2 Parallel**: T009, T010 can run in parallel

**User Story Parallel (after Phase 2)**:

- US4 (tiles) and US5 (overlays) have no cross-dependencies
- US2 and US3 can parallelize after US1 completes
- Component scaffolding tasks (T012/T013, T023/T024, etc.) can parallelize within each story

**Phase 10 Parallel**: T076, T077, T078, T079 can all run in parallel (different export formats)

---

## Parallel Example: User Story 1

```bash
# Launch component scaffolding in parallel:
Task: "Create RouteSidebar component structure at /src/components/organisms/RouteSidebar/"
Task: "Create RouteBuilder component structure at /src/components/organisms/RouteBuilder/"

# After scaffolding, implement sequentially:
Task: "Implement RouteSidebar.tsx..."
Task: "Implement RouteBuilder.tsx..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema + types)
2. Complete Phase 2: Foundational (services + hooks)
3. Complete Phase 3: User Story 1 (create/save routes)
4. **STOP and VALIDATE**: Test route creation/editing independently
5. Deploy/demo basic route management

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Create Routes) → Test → Deploy (MVP!)
3. Add US2 (Add Companies) → Test → Deploy
4. Add US3 (Next Ride) → Test → Deploy
5. Add US4+US5 (Map Tiles + Trails) → Test → Deploy
6. Add US6 (Draw Path) → Test → Deploy (Complete!)

### Suggested MVP Scope

**Minimum**: Phases 1-3 (Setup + Foundational + US1)

- Users can create, edit, delete, and list bicycle routes
- ~22 tasks, estimated complexity: medium

**Recommended MVP**: Phases 1-5 (through US3)

- Adds company associations and next-ride planning
- Full core workflow functional
- ~42 tasks, estimated complexity: medium-high

---

## Summary

| Phase | User Story          | Priority | Task Count | Dependencies |
| ----- | ------------------- | -------- | ---------- | ------------ |
| 1     | Setup               | -        | 5          | None         |
| 2     | Foundational        | -        | 5          | Phase 1      |
| 3     | US1: Create Routes  | P1       | 13         | Phase 2      |
| 4     | US2: Add Companies  | P2       | 11         | US1          |
| 5     | US3: Next Ride      | P2       | 9          | US1          |
| 6     | US4: Cycling Tiles  | P3       | 8          | Phase 2      |
| 7     | US5: Trail Overlays | P3       | 9          | Phase 2      |
| 8     | US6: Draw Path      | P4       | 10         | US1          |
| 9     | Integration         | -        | 6          | US1-3, US5   |
| 10    | Polish              | -        | 14         | Phase 9      |

**Total Tasks**: 90
**Parallel Opportunities**: 21 tasks marked [P]
**MVP Scope**: 23 tasks (Phases 1-3)
**Full Scope**: 90 tasks (all phases)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- 5-file component pattern mandatory per project constitution
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
