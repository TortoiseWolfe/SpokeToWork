# Data Model: Route Sidebar UX Improvements

**Feature**: 047-route-sidebar-ux
**Date**: 2025-12-20
**Status**: Complete

## Overview

This feature is frontend-only with no database changes. The only persistent data is the user's preferred sidebar width, stored in localStorage.

## Entities

### SidebarPreferences (localStorage)

**Storage Key**: `spoketowork:sidebar-preferences`

| Field | Type   | Default | Description                       |
| ----- | ------ | ------- | --------------------------------- |
| width | number | 280     | Sidebar width in pixels (200-400) |

**JSON Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "width": {
      "type": "number",
      "minimum": 200,
      "maximum": 400,
      "default": 280
    }
  },
  "additionalProperties": false
}
```

**Validation Rules**:

- `width` must be between 200 and 400 (inclusive)
- If localStorage unavailable or value invalid, use default (280)
- Values outside range are clamped to nearest valid value

## Existing Entities (No Changes)

The following entities are used but not modified:

### BicycleRoute

Already defined in `src/types/route.ts`. Used for:

- Route selection in sidebar
- Route name display (with truncation/tooltip)
- Auto-open drawer integration

### RouteCompanyWithDetails

Already defined in `src/types/route.ts`. Used for:

- Company list in RouteDetailDrawer (displayed when route selected)
- Removed from inline sidebar preview

## State Management

### Component State (React)

| Component          | State                 | Type           | Purpose                   |
| ------------------ | --------------------- | -------------- | ------------------------- |
| companies/page.tsx | selectedRouteId       | string \| null | Currently selected route  |
| companies/page.tsx | showRouteDetailDrawer | boolean        | Drawer visibility         |
| RouteSidebar       | -                     | -              | Stateless, receives props |
| ResizablePanel     | isResizing            | boolean        | Resize drag state         |
| ResizablePanel     | currentWidth          | number         | Live width during resize  |

### Props Flow

```
companies/page.tsx
  ├── selectedRouteId (state)
  ├── showRouteDetailDrawer (state)
  │
  ├── ResizablePanel (wraps RouteSidebar)
  │   ├── initialWidth (from localStorage)
  │   ├── onWidthChange (save to localStorage)
  │   └── RouteSidebar
  │       ├── routes (data)
  │       ├── selectedRouteId (from parent)
  │       └── onSelectRoute (→ sets selectedRouteId + opens drawer)
  │
  └── RouteDetailDrawer
      ├── route (selected route data)
      ├── companies (route companies)
      ├── isOpen (from showRouteDetailDrawer)
      └── onClose (→ sets showRouteDetailDrawer false)
```

## localStorage Helper

**File**: `src/lib/storage/sidebar-preferences.ts`

```typescript
interface SidebarPreferences {
  width: number;
}

const STORAGE_KEY = 'spoketowork:sidebar-preferences';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export function getSidebarWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WIDTH;
    const prefs = JSON.parse(stored) as SidebarPreferences;
    return clamp(prefs.width, MIN_WIDTH, MAX_WIDTH);
  } catch {
    return DEFAULT_WIDTH;
  }
}

export function setSidebarWidth(width: number): void {
  try {
    const clamped = clamp(width, MIN_WIDTH, MAX_WIDTH);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ width: clamped }));
  } catch {
    // localStorage unavailable, silently fail
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

## No Database Migrations

This feature requires no changes to the Supabase database schema. All persistence is client-side via localStorage.
