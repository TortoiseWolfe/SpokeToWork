# Tasks: Route Sidebar UX Improvements

**Feature**: 047-route-sidebar-ux
**Generated**: 2025-12-20
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create localStorage helper for sidebar preferences (used by US5)

- [x] T001 Create src/lib/storage/sidebar-preferences.ts with getSidebarWidth, setSidebarWidth, clamp functions
- [x] T002 [P] Add unit tests for sidebar-preferences in tests/unit/lib/storage/sidebar-preferences.test.ts

---

## Phase 2: User Story 1+3 - Auto-Open Drawer + Remove Inline Preview (Priority: P1) 🎯 MVP

**Goal**: Clicking a route immediately opens the detail drawer; inline company preview removed from sidebar

**Independent Test**: Click any route in sidebar → drawer opens automatically with route details; no inline company list appears in sidebar

**Note**: US1 and US3 are implemented together as they are tightly coupled (removing preview requires auto-open drawer as the new way to view companies)

### Implementation for User Story 1+3

- [x] T003 [US1] Modify handleSelectRoute in src/app/companies/page.tsx to set showRouteDetailDrawer(true) and update drawer content (FR-001, FR-002)
- [x] T004 [US3] Remove inline company preview rendering block from src/app/companies/page.tsx
- [x] T005 [US3] Remove "View All" button from src/app/companies/page.tsx (no longer needed)
- [x] T006 [US1] Add visual indicator for selected route in RouteSidebar (highlight styling)
- [x] T007 [US1] Update RouteSidebar.test.tsx with tests for auto-open drawer callback
- [x] T008 [US3] Update RouteSidebar.test.tsx with tests verifying no inline preview rendered

**Checkpoint**: Route selection opens drawer automatically; sidebar is clean without inline preview

---

## Phase 3: User Story 2 - Independent Route List Scrolling (Priority: P1)

**Goal**: Route list scrolls independently while sidebar header remains fixed

**Independent Test**: Add 10+ routes → scroll within route list → header stays fixed, only routes scroll

### Implementation for User Story 2

- [x] T009 [US2] Add scroll container with overflow-y-auto to route list in src/components/organisms/RouteSidebar/RouteSidebar.tsx
- [x] T010 [US2] Add max-height calc(100vh - header-height) to route list container
- [x] T011 [US2] Extract sidebar header outside scroll container to keep it fixed
- [x] T012 [US2] Add will-change: transform CSS for smooth scrolling performance
- [x] T013 [US2] Update RouteSidebar.test.tsx with scroll container tests
- [x] T014 [US2] Update RouteSidebar.accessibility.test.tsx with keyboard scroll navigation tests

**Checkpoint**: Route list scrolls independently; header stays fixed; 60fps performance maintained

---

## Phase 4: User Story 4 - Full Route Names on Hover (Priority: P2)

**Goal**: Truncated route names show full name in tooltip on hover (or long-press on touch)

**Independent Test**: Create route with 40+ character name → hover over truncated name → tooltip shows full name

### Implementation for User Story 4

- [x] T015 [US4] Add title attribute with full route name to route items in src/components/organisms/RouteSidebar/RouteSidebar.tsx
- [x] T016 [US4] Add DaisyUI tooltip component wrapper for styled tooltip display (includes touch long-press per FR-006)
- [x] T017 [US4] Add CSS text-overflow: ellipsis for route name truncation
- [x] T018 [US4] Add 300ms tooltip delay per NFR-003 specification
- [x] T019 [US4] Update RouteSidebar.test.tsx with tooltip visibility tests
- [x] T020 [US4] Update RouteSidebar.accessibility.test.tsx with tooltip a11y tests
- [x] T021 [US4] Update RouteSidebar.stories.tsx with long route name story

**Checkpoint**: Truncated names show tooltips; touch devices support long-press reveal

---

## Phase 5: User Story 5 - Resizable Sidebar Width (Priority: P3)

**Goal**: Users can drag sidebar edge to resize; width persists in localStorage

**Independent Test**: Drag sidebar right edge → width changes → refresh page → width persists

### Implementation for User Story 5

- [x] T022 [US5] Create src/components/molecular/ResizablePanel/index.tsx barrel export
- [x] T023 [US5] Create src/components/molecular/ResizablePanel/ResizablePanel.tsx with pointer event handlers
- [x] T024 [US5] Implement min/max width constraints (200px-400px) in ResizablePanel
- [x] T025 [US5] Integrate localStorage persistence using sidebar-preferences helper
- [x] T026 [US5] Add resize cursor and drag handle visual on right edge
- [x] T027 [US5] Add requestAnimationFrame for smooth resize updates
- [x] T028 [US5] Disable resize on mobile via media query (< 768px)
- [x] T029 [US5] Create src/components/molecular/ResizablePanel/ResizablePanel.test.tsx with unit tests
- [x] T030 [US5] Create src/components/molecular/ResizablePanel/ResizablePanel.stories.tsx with Storybook stories
- [x] T031 [US5] Create src/components/molecular/ResizablePanel/ResizablePanel.accessibility.test.tsx with a11y tests
- [x] T032 [US5] Wrap RouteSidebar with ResizablePanel in src/app/companies/page.tsx

**Checkpoint**: Sidebar is resizable within bounds; width persists; mobile uses fixed width

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests and final validation

- [x] T033 [P] Create tests/e2e/route-sidebar-ux.spec.ts with E2E test for auto-open drawer flow
- [x] T034 [P] Add E2E test for independent scrolling in route-sidebar-ux.spec.ts
- [x] T035 [P] Add E2E test for tooltip display in route-sidebar-ux.spec.ts
- [x] T036 [P] Add E2E test for resize functionality in route-sidebar-ux.spec.ts
- [x] T037 [P] Add E2E test for mobile behavior (no resize, touch scroll) in route-sidebar-ux.spec.ts
- [x] T038 Run quickstart.md validation scenarios
- [x] T039 Verify all acceptance scenarios from spec.md pass

---

## Summary

| Phase     | Tasks  | Parallel | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| 1         | 2      | 1        | Setup (localStorage helper)                |
| 2         | 6      | 0        | US1+US3: Auto-open drawer + Remove preview |
| 3         | 6      | 0        | US2: Independent scrolling                 |
| 4         | 7      | 0        | US4: Tooltip for truncated names           |
| 5         | 11     | 0        | US5: Resizable sidebar                     |
| 6         | 7      | 5        | E2E tests & validation                     |
| **Total** | **39** | **6**    |                                            |

### Task Legend

- `[P]` = Can run in parallel with other [P] tasks in same phase
- User Story mapping:
  - US1 (P1): T003, T006-T007 (Auto-open drawer)
  - US3 (P1): T004-T005, T008 (Remove inline preview)
  - US2 (P1): T009-T014 (Independent scrolling)
  - US4 (P2): T015-T021 (Tooltips)
  - US5 (P3): T022-T032 (Resizable sidebar)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **US1+US3 (Phase 2)**: No dependencies - can start immediately (MVP!)
- **US2 (Phase 3)**: No dependencies on Phase 2 - could run in parallel
- **US4 (Phase 4)**: No dependencies on earlier phases - could run in parallel
- **US5 (Phase 5)**: Depends on Phase 1 (localStorage helper)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) ─────────────────────────────┐
                                             ▼
                                         Phase 5 (US5)
                                             │
Phase 2 (US1+US3) ───┬──────────────────────►│
                     │                        │
Phase 3 (US2) ───────┤──────────────────────►│
                     │                        │
Phase 4 (US4) ───────┘──────────────────────►│
                                             ▼
                                         Phase 6 (Polish)
```

### Parallel Opportunities

**Within Phase 1:**

- T001 and T002 can run in parallel (different files)

**Across Phases (with multiple developers):**

- After Phase 1, US1+US3, US2, US4 can all proceed in parallel
- US5 depends only on Phase 1 (localStorage helper)

**Within Phase 6:**

- All E2E test tasks (T033-T037) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1+3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: US1+US3 (Auto-open + Remove preview)
3. **STOP and VALIDATE**: Test route selection opens drawer
4. Deploy/demo if ready - this alone solves the main UX pain point!

### Incremental Delivery

1. Phase 1 + Phase 2 → **MVP**: 1-click route management
2. Add Phase 3 (US2) → Scrollable route list
3. Add Phase 4 (US4) → Readable long names
4. Add Phase 5 (US5) → Personalized sidebar width
5. Phase 6 → Full E2E validation

### Suggested MVP Scope

**Minimum viable: Phase 1 + Phase 2 (8 tasks)**

This delivers:

- ✅ Auto-open drawer on route click (SC-001: 1-click access)
- ✅ Clean sidebar without clutter (SC-002 partial)
- ✅ Immediate UX improvement for all users

Remaining stories add polish but core UX problem is solved with MVP.

---

## Notes

- All component changes follow 5-file structure pattern
- No npm dependencies required
- All persistence is localStorage (no database changes)
- Mobile behavior: drawer pattern (no resize)
- Performance targets: 60fps scroll, <100ms UI response
