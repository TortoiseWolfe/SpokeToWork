# Implementation Plan: Route Sidebar UX Improvements

**Branch**: `047-route-sidebar-ux` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/047-route-sidebar-ux/spec.md`

## Summary

Improve the route management sidebar UX by: (1) auto-opening the detail drawer when clicking a route, (2) enabling independent scrolling for the route list, (3) removing the cluttered inline company preview, (4) showing full route names on hover, and (5) allowing resizable sidebar width. This is a frontend-only refactoring of existing React components with localStorage for preference persistence.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 15
**Primary Dependencies**: React, DaisyUI, Tailwind CSS 4, @dnd-kit (existing)
**Storage**: localStorage (sidebar width preference only)
**Testing**: Vitest (unit), Playwright (E2E), jest-axe (a11y)
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: 60fps scrolling, <100ms UI response for route selection
**Constraints**: Static hosting (GitHub Pages), no server-side API routes
**Scale/Scope**: 50+ routes per user without UI degradation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status  | Notes                                                |
| ------------------------------------ | ------- | ---------------------------------------------------- |
| I. Proper Solutions Over Quick Fixes | ✅ PASS | Comprehensive refactoring, not a workaround          |
| II. Root Cause Analysis              | ✅ PASS | Addresses root UX issues (scrolling, space, clicks)  |
| III. Stability Over Speed            | ✅ PASS | Full test coverage planned                           |
| IV. Clean Architecture               | ✅ PASS | 5-file component pattern for new/modified components |
| V. No Technical Debt                 | ✅ PASS | No TODOs, complete implementation                    |
| Docker-First Development             | ✅ PASS | All commands via Docker                              |
| Static Hosting Constraint            | ✅ PASS | Frontend-only, localStorage for persistence          |
| Component Structure                  | ✅ PASS | 5-file pattern for ResizableSidebar                  |
| Database Migrations                  | ✅ N/A  | No database changes                                  |

**Gate Result**: PASS - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/047-route-sidebar-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── companies/
│       └── page.tsx              # MODIFY: Auto-open drawer, remove inline preview
├── components/
│   ├── organisms/
│   │   ├── RouteSidebar/
│   │   │   ├── index.tsx                    # Existing barrel export
│   │   │   ├── RouteSidebar.tsx             # MODIFY: Independent scrolling, tooltips
│   │   │   ├── RouteSidebar.test.tsx        # MODIFY: Add new test cases
│   │   │   ├── RouteSidebar.stories.tsx     # MODIFY: Add stories for new states
│   │   │   └── RouteSidebar.accessibility.test.tsx  # MODIFY: Tooltip a11y
│   │   └── RouteDetailDrawer/               # Existing, no changes needed
│   └── molecular/
│       └── ResizablePanel/                  # NEW: Reusable resizable container
│           ├── index.tsx
│           ├── ResizablePanel.tsx
│           ├── ResizablePanel.test.tsx
│           ├── ResizablePanel.stories.tsx
│           └── ResizablePanel.accessibility.test.tsx
├── hooks/
│   └── useLocalStorage.ts                   # EXISTING: Use for width preference
└── lib/
    └── storage/
        └── sidebar-preferences.ts           # NEW: Sidebar width preference helpers

tests/
├── unit/                                    # Component tests run via Vitest
├── e2e/
│   └── route-sidebar-ux.spec.ts             # NEW: E2E for sidebar interactions
└── integration/
```

**Structure Decision**: Web application using Next.js App Router pattern. New ResizablePanel component follows 5-file structure. Modifications to existing RouteSidebar and companies/page.tsx.

## Complexity Tracking

No constitution violations to justify.

## Implementation Phases

_Note: Detailed task breakdown with execution order is in [tasks.md](./tasks.md). This section provides architectural guidance._

### Setup Phase

- Create localStorage helper (`sidebar-preferences.ts`) for width persistence
- Unit tests for storage helper

### User Story Phases (by Priority)

**US1+US3 (P1): Auto-Open Drawer + Remove Inline Preview** 🎯 MVP

1. Modify `companies/page.tsx` handleSelectRoute to set `showRouteDetailDrawer(true)`
2. Remove inline company preview rendering block
3. Remove "View All" button (no longer needed)
4. Add visual indicator for selected route

**US2 (P1): Independent Route List Scrolling**

1. Add `overflow-y-auto` with fixed height to route list container
2. Keep sidebar header fixed outside scroll container
3. CSS performance optimizations (`will-change: transform`)

**US4 (P2): Tooltip Enhancement**

1. Add `title` attribute to truncated route names
2. DaisyUI tooltip component for styled display
3. Touch devices: long-press gesture support

**US5 (P3): Resizable Sidebar**

1. Create ResizablePanel component (5-file structure)
2. Drag handle on right edge with pointer events
3. Min/max width constraints (200px-400px)
4. Persist width to localStorage
5. Disable on mobile (media query)

### Polish Phase

- E2E tests for all user stories
- Quickstart validation

## Risk Assessment

| Risk                              | Impact | Mitigation                          |
| --------------------------------- | ------ | ----------------------------------- |
| Breaking existing route selection | High   | Comprehensive E2E tests             |
| Performance with many routes      | Medium | Virtual scrolling if needed (defer) |
| Mobile UX regression              | Medium | Test on actual devices              |
| localStorage quota issues         | Low    | Graceful fallback to default width  |

## Dependencies

- No new npm packages required
- Uses existing hooks (useLocalStorage)
- Uses existing components (RouteDetailDrawer, RouteSidebar)
