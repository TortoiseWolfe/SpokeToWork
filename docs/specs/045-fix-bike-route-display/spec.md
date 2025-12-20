# Feature Specification: Fix Bike Route Map Display

**Feature Branch**: `045-fix-bike-route-display`
**Created**: 2025-12-19
**Status**: Implemented
**Input**: User description: "Fix bike route map display with two issues: theme persistence and data quality"

## Overview

The bike route display on the MapLibre map has two critical issues:

1. **Theme persistence bug**: Bike routes disappear when switching between light/dark mode
2. **Data quality issue**: OSM query includes state highways and motorways which are illegal for non-motorized vehicles

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Theme Persistence (Priority: P1)

As a user viewing bike routes on the map, I want the routes to remain visible when I switch between light and dark mode, so I can use my preferred theme without losing route information.

**Why this priority**: This is a regression bug that breaks core functionality. Users currently lose all 6879 bike routes when toggling theme.

**Independent Test**: Can be fully tested by loading the map, verifying routes appear, switching theme via DaisyUI toggle, and confirming routes still display.

**Acceptance Scenarios**:

1. **Given** the map is loaded with bike routes visible in light mode, **When** I switch to dark mode, **Then** all bike routes remain visible with appropriate dark-mode styling
2. **Given** the map is loaded with bike routes visible in dark mode, **When** I switch to light mode, **Then** all bike routes remain visible with appropriate light-mode styling
3. **Given** I rapidly toggle between themes multiple times, **When** toggling stops, **Then** bike routes are visible and correctly styled

---

### User Story 2 - Data Quality Filter (Priority: P2)

As a cyclist using the map for route planning, I want only legal cycling routes shown, so I don't accidentally plan to ride on highways where non-motorized vehicles are prohibited.

**Why this priority**: Safety concern - showing highways as bike routes could lead users to dangerous illegal cycling on motorways.

**Independent Test**: Can be fully tested by examining the GeoJSON data to confirm no `highway=motorway`, `highway=trunk`, or similar non-bikeable road types are included.

**Acceptance Scenarios**:

1. **Given** the bike routes GeoJSON is regenerated, **When** I inspect the data, **Then** no features have `highway=motorway` or `highway=trunk` properties
2. **Given** I view the map in the Cleveland TN / Chattanooga area, **When** I zoom to state highway locations, **Then** highways like I-75 and US-64 are NOT rendered as bike routes

---

### Edge Cases

- What happens when the map style fails to load? (Routes should not crash the app)
- How does the system handle rapid theme toggles during route data loading?
- What happens if the GeoJSON file is missing or corrupted?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST preserve dynamically-added GeoJSON layers when map style changes (theme switch)
- **FR-002**: System MUST re-add bike route layers after each `style.load` event or equivalent MapLibre lifecycle event
- **FR-003**: System MUST use consistent layer IDs (`all-bike-routes`, `all-bike-routes-casing`) across theme changes
- **FR-004**: The OSM Overpass query MUST exclude `highway=motorway`, `highway=trunk`, and `highway=motorway_link` from results
- **FR-005**: System MUST NOT include road types where `bicycle=no` or `bicycle=prohibited`
- **FR-006**: Bike route line styling MUST be visible against both light (#f8f9fa) and dark (#1a1a2e) map backgrounds

### Key Entities

- **GeoJSON Source**: `all-bike-routes` - Contains all bike route geometries from OSM
- **Layer**: `all-bike-routes-casing` - White outline for visibility
- **Layer**: `all-bike-routes` - Green fill for the route line

### Technical Context (for implementation planning)

**Root Cause - Theme Bug**:

- `onLoad` callback only fires on initial mount, NOT when `mapStyle` prop changes
- When `mapStyle` changes, react-map-gl calls `map.setStyle()` which clears all dynamically added layers
- Need to listen for MapLibre's `style.load` event OR use a useEffect with mapStyle dependency

**Files Involved**:

- `src/components/map/MapContainer/MapContainerInner.tsx` - lines 140-212 (handleLoad function)
- `public/data/all-bike-routes.geojson` - 6879 features, ~3.8MB

**Current OSM Query** (needs filtering):
The GeoJSON was generated with an Overpass query that includes all highways - needs to exclude motorways.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Bike routes remain visible after 10 consecutive light/dark mode toggles
- **SC-002**: Zero state highways (motorway, trunk, motorway_link) present in regenerated GeoJSON
- **SC-003**: All 6879+ bike route features continue to render (minus filtered highways)
- **SC-004**: Map load time remains under 5 seconds with filtered GeoJSON
- **SC-005**: No console errors during theme switching

## Clarifications

### Session 2025-12-19

1. **Route Color by Theme**: Theme-adaptive colors
   - Light mode: `#22c55e` (green-500)
   - Dark mode: `#4ade80` (green-400) for better visibility

2. **Geographic Boundary**: Cleveland TN / Chattanooga metro area only
   - Bounding box: `34.85,-85.45,35.25,-84.75`
   - Reduced from multi-state regional dataset to local metro area

3. **Data Source**: Regenerate GeoJSON with proper Overpass query
   - Query documented in `docs/specs/045-fix-bike-route-display/overpass-query.overpass`
   - Excludes: motorway, motorway_link, trunk, trunk_link
   - Excludes: bicycle=no, bicycle=prohibited

## Implementation Summary

### Solution: Declarative react-map-gl Components

Instead of manually adding layers in `handleLoad` callback, we created a new `BikeRoutesLayer` component using react-map-gl's declarative `<Source>` and `<Layer>` components which automatically persist across MapLibre style changes.

### Files Changed

| File                                                            | Change                                              |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `src/components/map/BikeRoutesLayer/`                           | NEW - 5-file component structure                    |
| `src/components/map/MapContainer/MapContainerInner.tsx`         | MODIFIED - Use BikeRoutesLayer                      |
| `public/data/all-bike-routes.geojson`                           | REGENERATED - 2314 features                         |
| `docs/specs/045-fix-bike-route-display/overpass-query.overpass` | NEW - Documented query                              |
| `tests/e2e/map.spec.ts`                                         | MODIFIED - Theme persistence tests                  |
| `src/styles/map-style-light.json`                               | MODIFIED - Larger fonts, POI labels, layer ordering |
| `src/styles/map-style-dark.json`                                | MODIFIED - Larger fonts, POI labels, layer ordering |

### Verification Results

| Criteria | Status | Details                                   |
| -------- | ------ | ----------------------------------------- |
| SC-001   | PASS   | E2E test for 10 consecutive theme toggles |
| SC-002   | PASS   | 0 trunk roads, 0 motorways in GeoJSON     |
| SC-003   | PASS   | 2314 features render correctly            |
| SC-004   | PASS   | 3.5MB file, loads quickly                 |
| SC-005   | PASS   | No console errors in E2E tests            |
