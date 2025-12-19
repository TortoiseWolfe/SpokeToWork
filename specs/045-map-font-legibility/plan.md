# Implementation Plan: Map Font Legibility & Cycling Data

**Branch**: `045-map-font-legibility` | **Date**: 2025-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/045-map-font-legibility/spec.md`

## Summary

Migrate from Leaflet (raster tiles) to MapLibre GL (vector tiles) to solve the font legibility problem on the `/map` page. Vector tiles render text client-side, allowing customizable 16px minimum font sizes. Uses OpenFreeMap as the free vector tile source with no API key required.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 15
**Primary Dependencies**: `maplibre-gl`, `react-map-gl` (replacing `react-leaflet`, `leaflet`)
**Storage**: Existing Supabase PostgreSQL for route data; IndexedDB (Dexie) for tile caching
**Testing**: Vitest (unit), Playwright (E2E), Pa11y (a11y)
**Target Platform**: Web (PWA), static export to GitHub Pages
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Map interactive within 2s on 3G, smooth 60fps pan/zoom
**Constraints**: Code-split map to avoid 200KB impact on initial bundle; offline tile caching required
**Scale/Scope**: Single map page, ~7 map components to migrate

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Status | Notes                                            |
| --------------------------------- | ------ | ------------------------------------------------ |
| Proper Solutions Over Quick Fixes | PASS   | Complete library migration, not CSS hacks        |
| Root Cause Analysis               | PASS   | Addresses root cause (raster fonts) not symptoms |
| Stability Over Speed              | PASS   | Thorough migration with tests                    |
| Clean Architecture                | PASS   | 5-file component structure maintained            |
| No Technical Debt                 | PASS   | No TODOs, complete implementation                |
| Docker-First Development          | PASS   | All commands via Docker                          |
| Static Hosting Constraint         | PASS   | Client-side only, no API routes                  |
| Component Structure               | PASS   | New components follow 5-file pattern             |

## Project Structure

### Documentation (this feature)

```text
specs/045-map-font-legibility/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # N/A (no new data models)
├── quickstart.md        # Integration guide
└── tasks.md             # Implementation tasks
```

### Source Code (affected paths)

```text
src/
├── components/
│   └── map/
│       ├── MapContainer/          # REPLACE: Leaflet -> MapLibre
│       │   ├── MapContainer.tsx
│       │   ├── MapContainerInner.tsx  # REPLACE: react-leaflet -> react-map-gl
│       │   └── [5-file pattern]
│       ├── RoutePolyline/         # ADAPT: Use MapLibre Source/Layer API
│       ├── LocationMarker/        # ADAPT: Use MapLibre Marker API
│       ├── LocationButton/        # KEEP: UI unchanged
│       ├── TileLayerSelector/     # REMOVE: Vector tiles don't need selector
│       ├── RouteDrawingTool/      # ADAPT: MapLibre draw controls
│       └── GeolocationConsent/    # KEEP: Logic unchanged
├── styles/
│   └── map-style.json            # NEW: MapLibre style spec (light)
│   └── map-style-dark.json       # NEW: MapLibre style spec (dark)
├── lib/
│   └── map/
│       └── tile-cache.ts         # NEW: IndexedDB tile caching
└── hooks/
    └── useMapTheme.ts            # NEW: Theme-aware map style

tests/
├── unit/
│   └── map/                      # Update tests for MapLibre
└── e2e/
    └── map-legibility.spec.ts    # NEW: Font size verification
```

**Structure Decision**: Modify existing `src/components/map/` components in-place. Add new style files and caching service.

## Complexity Tracking

No constitution violations requiring justification.

## Implementation Phases

### Phase 1: Setup & Dependencies

1. Add MapLibre GL and react-map-gl dependencies
2. Create map style JSON files (light/dark)
3. Set up tile caching infrastructure

### Phase 2: Core Migration

1. Replace MapContainerInner with react-map-gl implementation
2. Migrate RoutePolyline to MapLibre Layer API
3. Migrate LocationMarker to MapLibre Marker API
4. Update MapContainer wrapper for lazy loading

### Phase 3: Features

1. Implement dark mode style switching
2. Implement offline tile caching with Dexie
3. Add error handling with retry UI

### Phase 4: Cleanup & Testing

1. Remove Leaflet dependencies
2. Update all component tests
3. Add E2E tests for font legibility
4. Update Storybook stories

## Risk Mitigation

| Risk                     | Mitigation                                                  |
| ------------------------ | ----------------------------------------------------------- |
| OpenFreeMap downtime     | Error UI with retry; route overlays still visible from DB   |
| Bundle size regression   | Lazy-load entire map component; verify with bundle analyzer |
| Breaking existing routes | Keep same GeoJSON format; adapter layer if needed           |
| Dark mode style missing  | Create custom dark style from OpenFreeMap base              |

## Dependencies

- `maplibre-gl`: ^4.x (vector tile renderer)
- `react-map-gl`: ^7.x (React bindings)
- Remove: `react-leaflet`, `leaflet`, `@types/leaflet`

## Success Metrics

1. Street names readable (16px+) at zoom levels 13-16
2. Bike lanes visible with distinct styling
3. Map loads in <2s on 3G connection
4. Offline viewing works for cached areas
5. Dark mode matches app theme automatically
