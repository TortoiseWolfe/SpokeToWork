# Research: Simplify Next Ride Feature

**Feature**: 044-simplify-next-ride
**Date**: 2025-12-18

## Overview

This research documents the investigation into simplifying the "Next Ride" feature from a complex cross-route cherry-picking system to a simple "show companies on active route" filter.

## Research Tasks

### 1. Existing Filter Implementation

**Question**: How does the current "Next Ride" filter work?

**Findings**:

- `CompanyFilters.tsx` has a "Next Ride" checkbox (lines 233-245)
- Filter uses `next_ride_only` boolean in `CompanyFiltersType`
- `CompanyTable` receives `nextRideCompanyIds: Set<string>` prop
- Current implementation relies on `visit_on_next_ride` flag in `route_companies` table

**Decision**: Rename filter to "On Active Route" and change logic to filter by active route membership
**Rationale**: Aligns with user's mental model that "next ride" = "active route"
**Alternatives Considered**:

1. Keep "Next Ride" terminology - rejected because it caused confusion
2. Add separate "Active Route" filter - rejected because it duplicates functionality

### 2. Active Route Data Source

**Question**: How is the active route determined and how to get its companies?

**Findings**:

- `active_route_planning` table stores one active route per user
- `useRoutes` hook exposes `activeRouteId: string | null`
- `getRouteCompanies(routeId)` returns `RouteCompanyWithDetails[]`
- Route companies can reference `shared_company_id` OR `private_company_id`

**Decision**: Add `getActiveRouteCompanyIds()` helper that returns `Set<string>` of company IDs
**Rationale**: Encapsulates the logic to get both shared and private company IDs from active route
**Alternatives Considered**:

1. Inline the logic in companies/page.tsx - rejected for code reuse
2. Create separate hook - rejected as overkill for one function

### 3. Visual Indicator Options

**Question**: What visual indicator pattern matches existing UI?

**Findings**:

- App uses DaisyUI components with Heroicons
- Existing badges: `badge badge-primary`, `badge badge-success`
- Existing route indicators use colored dots matching route colors
- Mobile design uses icon-only approach for space constraints

**Decision**: Use bicycle icon with tooltip, badge style on desktop, icon-only on mobile
**Rationale**: Consistent with existing patterns, meets accessibility requirements
**Alternatives Considered**:

1. Checkbox column - rejected because it implies toggling, not display-only
2. Background highlight - rejected because it's color-dependent (a11y concern)
3. Route color dot - considered but bicycle icon is more meaningful

### 4. Deprecation Strategy

**Question**: How to handle unused NextRidePanel component?

**Findings**:

- `NextRidePanel` component exists at `src/components/organisms/NextRidePanel/`
- Component is complete but never rendered anywhere
- Constitution says "No Technical Debt" but also "Proper Solutions"

**Decision**: Mark as `@deprecated` with JSDoc, do not delete immediately
**Rationale**: Allows staged cleanup, documents why it's unused, prevents accidental use
**Alternatives Considered**:

1. Delete entirely - rejected because it's a more invasive change
2. Keep without deprecation - rejected because it violates "No Technical Debt"

### 5. Type Changes

**Question**: How to rename the filter property without breaking existing code?

**Findings**:

- `CompanyFiltersType` in `src/types/company.ts` has `next_ride_only?: boolean`
- Filter is used in CompanyFilters, CompanyTable, and companies/page.tsx
- No external consumers (app is not a library)

**Decision**: Rename `next_ride_only` to `on_active_route` with find-and-replace
**Rationale**: Clean rename is simple since all usages are internal
**Alternatives Considered**:

1. Keep old name - rejected because it's confusing
2. Add alias/union type - rejected as unnecessary complexity

## Summary

All research questions resolved. No external dependencies or complex integrations. Implementation is straightforward refactoring of existing components with well-understood patterns.

| Topic            | Decision                                                         |
| ---------------- | ---------------------------------------------------------------- |
| Filter logic     | Change from `visit_on_next_ride` flag to active route membership |
| UI label         | Rename "Next Ride" → "On Active Route"                           |
| Visual indicator | Bicycle icon with tooltip, responsive (icon-only on mobile)      |
| Deprecation      | JSDoc `@deprecated` on NextRidePanel                             |
| Type changes     | Rename `next_ride_only` → `on_active_route`                      |
