# Implementation Plan: Simplify Next Ride Feature

**Branch**: `044-simplify-next-ride` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/044-simplify-next-ride/spec.md`

## Summary

Simplify the "Next Ride" feature by replacing the complex cross-route cherry-picking logic with a straightforward "show companies on active route" filter. The existing `CompanyFilters` component already has a "Next Ride" checkbox that will be renamed to "On Active Route" and rewired to filter by active route membership instead of the unused `visit_on_next_ride` flag.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 15
**Primary Dependencies**: React, DaisyUI, Tailwind CSS 4, Supabase JS client
**Storage**: Supabase PostgreSQL (existing `active_route_planning` and `route_companies` tables)
**Testing**: Vitest (unit), Playwright (E2E), Pa11y (a11y)
**Target Platform**: Web (GitHub Pages static export), PWA
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: <2 second identification time (SC-001), no page load increase (SC-004)
**Constraints**: No new panels/drawers (FR-005), WCAG AA accessibility (SC-005)
**Scale/Scope**: Single-user context, typical route has 5-20 companies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                                         |
| ------------------------------------ | ------ | ------------------------------------------------------------- |
| I. Proper Solutions Over Quick Fixes | PASS   | Simplification removes complexity, not a hack                 |
| II. Root Cause Analysis              | PASS   | Fixing fundamental design misalignment with user mental model |
| III. Stability Over Speed            | PASS   | Modifying existing components, not adding new complexity      |
| IV. Clean Architecture               | PASS   | Following existing patterns (atomic design, hooks)            |
| V. No Technical Debt                 | PASS   | Deprecating unused code, not leaving TODOs                    |
| Docker-First Development             | PASS   | No changes to Docker configuration                            |
| Static Hosting Constraint            | PASS   | No server-side changes, client-side filtering                 |
| Component Structure                  | PASS   | Modifying existing 5-file components                          |
| Database Migrations                  | PASS   | No database changes needed                                    |

**Gate Result**: PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/044-simplify-next-ride/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Phase 2 output
```

### Source Code (files to modify)

```text
src/
├── components/
│   ├── molecular/
│   │   ├── CompanyFilters/
│   │   │   └── CompanyFilters.tsx     # Rename "Next Ride" → "On Active Route"
│   │   └── CompanyRow/
│   │       └── CompanyRow.tsx         # Add visual indicator for active route
│   └── organisms/
│       ├── CompanyTable/
│       │   └── CompanyTable.tsx       # Rename prop, update filter logic
│       └── NextRidePanel/             # Mark as deprecated
│           └── NextRidePanel.tsx
├── app/
│   └── companies/
│       └── page.tsx                   # Wire up active route filtering
├── types/
│   └── company.ts                     # Rename filter property
└── hooks/
    └── useRoutes.ts                   # Add getActiveRouteCompanyIds helper

tests/
├── unit/
│   └── components/
│       ├── CompanyFilters.test.tsx    # Update tests
│       └── CompanyTable.test.tsx      # Update tests
└── e2e/
    └── companies/
        └── active-route-filter.spec.ts # New E2E test
```

**Structure Decision**: Modifying existing web application structure. No new directories needed.

## Complexity Tracking

No violations to justify - all gates passed.

## Key Implementation Decisions

### 1. Filter Rename Strategy

**Current**: `next_ride_only` filter with `nextRideCompanyIds` prop
**New**: `on_active_route` filter with `activeRouteCompanyIds` prop

The filter logic changes from:

```typescript
// OLD: Cherry-pick across routes using visit_on_next_ride flag
if (filters.next_ride_only && nextRideCompanyIds) {
  return nextRideCompanyIds.has(companyId);
}

// NEW: Filter by active route membership
if (filters.on_active_route && activeRouteCompanyIds) {
  return activeRouteCompanyIds.has(companyId);
}
```

### 2. Visual Indicator

Add a bicycle icon (existing in DaisyUI/Heroicons) to CompanyRow when company is on active route:

- Desktop: Icon + "On route" text tooltip
- Mobile: Icon only (compact per edge case requirement)
- Accessible: `aria-label="On active route"` for screen readers

### 3. Deprecation Approach

Mark `NextRidePanel` as deprecated with JSDoc comment rather than deleting:

```typescript
/**
 * @deprecated Feature 044 simplified Next Ride to use active route.
 * This component is no longer rendered. Will be removed in future cleanup.
 */
```

This follows the constitution's "No Technical Debt" principle while allowing staged cleanup.

### 4. Active Route Company IDs

Add helper to `useRoutes` hook:

```typescript
getActiveRouteCompanyIds: () => Promise<Set<string>>;
```

This fetches route_companies for the active route and returns a Set of company IDs (both shared and private).
