# Implementation Plan: Bicycle Route Planning

**Branch**: `041-bicycle-route-planning` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-bicycle-route-planning/spec.md`

## Summary

Add bicycle route planning capabilities enabling users to create, save, and manage cycling routes with start/end points (defaulting to home address), associate companies with routes for job-hunting trips, mark companies for "next ride" quick-filtering, display cycling-optimized map tiles with GreenWay trail overlays, and export route data in multiple formats (GPX, CSV, JSON, printable HTML).

## Technical Context

**Language/Version**: TypeScript 5.x with React 19, Next.js 15
**Primary Dependencies**: react-leaflet 5.x, Leaflet 1.9.x, @tanstack/react-query, Supabase JS client, DaisyUI
**Storage**: Supabase PostgreSQL (cloud) with Row-Level Security
**Testing**: Vitest (unit), Playwright (E2E), jest-axe (accessibility)
**Target Platform**: Progressive Web App (static export to GitHub Pages)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Map loads <2s, route operations <500ms, tile switch without reload
**Constraints**: Static hosting (no server-side API routes), Supabase free tier, 5-file component pattern mandatory
**Scale/Scope**: Single user routes (private), soft limit 20 routes / 50 companies per route, hard limit 50 routes / 100 companies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                | Status | Notes                                                                                              |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------- |
| Docker-First Development | PASS   | All commands via `docker compose exec`                                                             |
| 5-File Component Pattern | PASS   | All new components follow: index.tsx, Component.tsx, test.tsx, stories.tsx, accessibility.test.tsx |
| Monolithic Migrations    | PASS   | Schema changes added to single migration file                                                      |
| No Local Package Install | PASS   | Using existing dependencies (Leaflet, react-leaflet already installed)                             |
| Static Export Compatible | PASS   | No server-side API routes; all logic client-side + Supabase                                        |
| Test Coverage            | PASS   | Unit tests for services, E2E for user flows, a11y for components                                   |

## Project Structure

### Documentation (this feature)

```text
specs/041-bicycle-route-planning/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
├── checklists/          # Quality checklists
│   └── requirements.md  # Spec validation checklist
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── route.ts                    # Route-related TypeScript types
├── lib/
│   ├── routes/
│   │   └── route-service.ts        # Route CRUD operations
│   └── map/
│       └── tile-provider-service.ts # Tile provider management
├── hooks/
│   └── useRoutes.ts                # React Query hook for routes
├── components/
│   ├── map/
│   │   ├── TileLayerSelector/      # 5-file component
│   │   ├── RoutePolyline/          # 5-file component
│   │   └── RouteDrawingTool/       # 5-file component
│   ├── molecular/
│   │   └── RouteFilter/            # 5-file component
│   └── organisms/
│       ├── RouteSidebar/           # 5-file component
│       ├── RouteBuilder/           # 5-file component
│       ├── RouteCompanyList/       # 5-file component
│       └── NextRidePanel/          # 5-file component
└── app/
    └── companies/
        └── page.tsx                # Integration point

supabase/migrations/
└── 20251006_complete_monolithic_setup.sql  # Add route tables

tests/
├── unit/
│   └── routes/                     # Route service unit tests
├── e2e/
│   └── routes.spec.ts              # Route planning E2E tests
└── contract/
    └── route-export.test.ts        # Export format tests
```

**Structure Decision**: Follows existing project structure with new route-related modules added to appropriate directories. All components use mandatory 5-file pattern.

## Complexity Tracking

No constitution violations requiring justification.
