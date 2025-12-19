# Tasks: Map Font Legibility & Cycling Data

**Branch**: `045-map-font-legibility`
**Generated**: 2025-12-19

## Phase 1: Setup

- [x] T001 [P] Install maplibre-gl and react-map-gl dependencies via Docker
- [x] T002 [P] Install @types for TypeScript support
- [x] T003 Create light map style JSON at src/styles/map-style-light.json
- [x] T004 Create dark map style JSON at src/styles/map-style-dark.json
- [x] T005 Create useMapTheme hook at src/hooks/useMapTheme.ts

## Phase 2: Core Migration - MapContainer

- [x] T006 Create new MapContainerInner using react-map-gl at src/components/map/MapContainer/MapContainerInner.tsx
- [x] T007 Update MapContainer.tsx to use new MapContainerInner with lazy loading
- [ ] T008 Update MapContainer.test.tsx for MapLibre APIs
- [ ] T009 Update MapContainer.stories.tsx for new implementation
- [ ] T010 Update MapContainer.accessibility.test.tsx

## Phase 3: Core Migration - RoutePolyline

- [x] T011 Migrate RoutePolyline to MapLibre Source/Layer API at src/components/map/RoutePolyline/RoutePolyline.tsx
- [ ] T012 Update RoutePolyline.test.tsx for MapLibre
- [ ] T013 Update RoutePolyline.stories.tsx
- [ ] T014 Update RoutePolyline.accessibility.test.tsx

## Phase 4: Core Migration - LocationMarker

- [ ] T015 Migrate LocationMarker to MapLibre Marker API at src/components/map/LocationMarker/LocationMarker.tsx
- [ ] T016 Update LocationMarker.test.tsx for MapLibre
- [ ] T017 Update LocationMarker.stories.tsx
- [ ] T018 Update LocationMarker.accessibility.test.tsx

## Phase 5: Core Migration - RouteDrawingTool

- [ ] T019 Migrate RouteDrawingTool to MapLibre draw controls at src/components/map/RouteDrawingTool/RouteDrawingTool.tsx
- [ ] T020 Update RouteDrawingTool.test.tsx for MapLibre
- [ ] T021 Update RouteDrawingTool.stories.tsx
- [ ] T022 Update RouteDrawingTool.accessibility.test.tsx

## Phase 6: Features

- [x] T023 Implement dark mode style switching in useMapTheme hook
- [ ] T024 Create tile cache service at src/lib/map/tile-cache.ts using Dexie
- [ ] T025 Integrate tile caching with MapContainer transformRequest
- [ ] T026 Create MapError component for error + retry UI at src/components/map/MapError/
- [ ] T027 [P] Create MapError.tsx with retry button
- [ ] T028 [P] Create MapError.test.tsx
- [ ] T029 [P] Create MapError.stories.tsx
- [ ] T030 [P] Create MapError.accessibility.test.tsx
- [ ] T031 [P] Create MapError/index.tsx barrel export

## Phase 7: Integration

- [x] T032 Update src/app/map/page.tsx to use migrated components
- [x] T033 Verify route overlays display correctly from database
- [x] T034 Verify company markers display on routes
- [x] T035 Verify geolocation "you are here" marker works (via GeolocateControl)
- [x] T036 Test dark mode switching with DaisyUI themes
- [x] T050 Verify LocationButton component still works with MapLibre
- [x] T051 Verify GeolocationConsent component still works with MapLibre

## Phase 8: Cleanup

**Note**: Leaflet dependencies must remain until CoordinateMap, LocationMarker, and RouteDrawingTool are migrated to MapLibre.

- [ ] T037 Remove TileLayerSelector component (no longer needed)
- [ ] T038 Migrate CoordinateMap to MapLibre (used in CompanyForm, HomeLocationSettings)
- [ ] T039 Migrate LocationMarker to MapLibre (currently unused but part of component library)
- [ ] T040 Migrate RouteDrawingTool to MapLibre (currently unused but part of component library)
- [ ] T041 Remove react-leaflet/leaflet dependencies AFTER all components migrated
- [ ] T042 Update map-utils.ts to remove Leaflet-specific code

## Phase 9: Testing & Verification

- [x] T043 Run full test suite and fix any failures (E2E tests updated for MapLibre)
- [ ] T044 Add E2E test for font legibility at tests/e2e/map-legibility.spec.ts
- [x] T045 Verify 16px minimum font size at zoom 13-16 (configured in map styles)
- [x] T046 Verify bike lanes visible with distinct styling (configured in map styles)
- [ ] T047 Test offline tile viewing
- [ ] T048 Run Storybook and verify all map stories work
- [ ] T049 Run bundle analyzer to verify code-splitting works
- [ ] T052 Manually verify map loads in <2s on throttled 3G connection (DevTools)

## Summary

- **Total Tasks**: 52
- **Phases**: 9
- **Parallel Tasks** [P]: 8
- **New Components**: 1 (MapError)
- **Migrated Components**: 4 (MapContainer, RoutePolyline, LocationMarker, RouteDrawingTool)
- **Unchanged Components**: 2 (LocationButton, GeolocationConsent)
- **Removed Components**: 1 (TileLayerSelector)

## Out of Scope

The following "Nice to Have" items from the spec are explicitly deferred to future work:

- **3D terrain/buildings** - Requires additional tile source and complexity
- **Turn-by-turn route display** - Separate feature, see `enhanced-bike-routing` spec
