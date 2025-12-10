# Quickstart: Bicycle Route Planning

**Feature**: 041-bicycle-route-planning
**Date**: 2025-12-08

## Overview

This guide shows how to integrate with the Bicycle Route Planning feature after implementation.

---

## 1. Create a New Route

```typescript
import { useRoutes } from '@/hooks/useRoutes';
import { useAuth } from '@/contexts/AuthContext';

function CreateRouteExample() {
  const { user } = useAuth();
  const { createRoute, isCreating } = useRoutes();

  const handleCreateRoute = async () => {
    // Home location is fetched from user profile automatically
    const route = await createRoute({
      name: 'Morning Loop',
      color: '#3B82F6',
      // Start/end default to home if not provided
      start_latitude: user.home_latitude,
      start_longitude: user.home_longitude,
      end_latitude: user.home_latitude,
      end_longitude: user.home_longitude,
    });

    console.log('Created route:', route.id);
  };

  return (
    <button onClick={handleCreateRoute} disabled={isCreating}>
      Create Route
    </button>
  );
}
```

---

## 2. Add Company to Route

```typescript
import { useRoutes } from '@/hooks/useRoutes';

function AddCompanyToRouteExample({ companyId, routeId }: Props) {
  const { addCompanyToRoute } = useRoutes();

  const handleAdd = async () => {
    await addCompanyToRoute({
      route_id: routeId,
      private_company_id: companyId, // or shared_company_id
      visit_on_next_ride: true,
    });
  };

  return <button onClick={handleAdd}>Add to Route</button>;
}
```

---

## 3. Toggle "Visit on Next Ride"

```typescript
import { useRoutes } from '@/hooks/useRoutes';

function NextRideToggle({ routeCompanyId, isMarked }: Props) {
  const { toggleNextRide } = useRoutes();

  return (
    <input
      type="checkbox"
      checked={isMarked}
      onChange={() => toggleNextRide(routeCompanyId)}
      aria-label="Visit on next ride"
    />
  );
}
```

---

## 4. Filter Companies by "Next Ride"

```typescript
import { useRoutes } from '@/hooks/useRoutes';

function NextRideCompanies() {
  const { nextRideCompanies, isLoading } = useRoutes();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {nextRideCompanies.map((rc) => (
        <li key={rc.id}>
          {rc.company.name} - {rc.company.address}
        </li>
      ))}
    </ul>
  );
}
```

---

## 5. Display Route on Map

```tsx
import { MapContainer, TileLayer } from 'react-leaflet';
import { RoutePolyline } from '@/components/map/RoutePolyline';

function RouteMapExample({ route }: { route: BicycleRoute }) {
  return (
    <MapContainer
      center={[route.start_latitude, route.start_longitude]}
      zoom={13}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {route.route_geometry && (
        <RoutePolyline
          route={route}
          color={route.color}
          weight={4}
          opacity={0.8}
        />
      )}
    </MapContainer>
  );
}
```

---

## 6. Switch Map Tile Provider

```tsx
import { useTileProviders } from '@/hooks/useTileProviders';
import { TileLayerSelector } from '@/components/map/TileLayerSelector';

function MapWithTileSelector() {
  const { providers, selected, setSelected } = useTileProviders();

  return (
    <div>
      <TileLayerSelector
        providers={providers}
        selected={selected}
        onSelect={setSelected}
      />
      <MapContainer>
        <TileLayer
          url={selected.url_template}
          attribution={selected.attribution}
          maxZoom={selected.max_zoom}
        />
      </MapContainer>
    </div>
  );
}
```

---

## 7. Export Route Data

```typescript
import { useRoutes } from '@/hooks/useRoutes';
import type { ExportFormat } from '@/types/route';

function ExportRouteExample({ routeId }: Props) {
  const { exportRoute } = useRoutes();

  const handleExport = async (format: ExportFormat) => {
    const result = await exportRoute(routeId, format);

    // Trigger download
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button onClick={() => handleExport('gpx')}>Export GPX</button>
      <button onClick={() => handleExport('csv')}>Export CSV</button>
      <button onClick={() => handleExport('json')}>Export JSON</button>
      <button onClick={() => handleExport('html')}>Print Version</button>
    </div>
  );
}
```

---

## 8. Drag-and-Drop Reorder Companies

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useRoutes } from '@/hooks/useRoutes';

function ReorderableCompanyList({ route }: Props) {
  const { reorderCompanies } = useRoutes();

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = route.companies.findIndex((c) => c.id === active.id);
      const newIndex = route.companies.findIndex((c) => c.id === over.id);

      const newOrder = arrayMove(route.companies, oldIndex, newIndex);
      await reorderCompanies({
        route_id: route.id,
        ordered_ids: newOrder.map((c) => c.id),
      });
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={route.companies}
        strategy={verticalListSortingStrategy}
      >
        {route.companies.map((company) => (
          <SortableCompanyItem key={company.id} company={company} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

## 9. Check Route Limits

```typescript
import { useRoutes } from '@/hooks/useRoutes';
import { ROUTE_LIMITS } from '@/types/route';

function RouteLimitIndicator() {
  const { routes } = useRoutes();
  const count = routes.length;

  const isNearSoftLimit = count >= ROUTE_LIMITS.ROUTES_SOFT_LIMIT * 0.8;
  const isAtSoftLimit = count >= ROUTE_LIMITS.ROUTES_SOFT_LIMIT;
  const isAtHardLimit = count >= ROUTE_LIMITS.ROUTES_HARD_LIMIT;

  return (
    <div className={isNearSoftLimit ? 'text-warning' : ''}>
      {count} / {ROUTE_LIMITS.ROUTES_HARD_LIMIT} routes
      {isAtSoftLimit && !isAtHardLimit && (
        <span className="text-warning"> (Consider organizing routes)</span>
      )}
      {isAtHardLimit && (
        <span className="text-error"> (Limit reached)</span>
      )}
    </div>
  );
}
```

---

## Component Integration Points

### Companies Page (`/companies`)

```tsx
// src/app/companies/page.tsx
import { RouteSidebar } from '@/components/organisms/RouteSidebar';
import { RouteFilter } from '@/components/molecular/RouteFilter';

export default function CompaniesPage() {
  return (
    <div className="flex">
      <RouteSidebar />
      <main>
        <RouteFilter />
        {/* Existing company table/list */}
      </main>
    </div>
  );
}
```

### Company Detail Drawer

```tsx
// Add to CompanyDetailDrawer
<section>
  <h3>Routes</h3>
  <RouteAssociationList companyId={company.id} />
  <AddToRouteDropdown companyId={company.id} />
</section>
```

---

## Service API Reference

### RouteService Methods

| Method                   | Parameters                    | Returns                     | Description              |
| ------------------------ | ----------------------------- | --------------------------- | ------------------------ |
| `createRoute`            | `BicycleRouteCreate`          | `BicycleRoute`              | Create new route         |
| `getRoutes`              | `RouteFilters?`, `RouteSort?` | `BicycleRoute[]`            | List user routes         |
| `getRouteById`           | `id: string`                  | `RouteWithCompanies`        | Get route with companies |
| `updateRoute`            | `BicycleRouteUpdate`          | `BicycleRoute`              | Update route             |
| `deleteRoute`            | `id: string`                  | `void`                      | Soft delete route        |
| `addCompanyToRoute`      | `RouteCompanyCreate`          | `RouteCompany`              | Associate company        |
| `removeCompanyFromRoute` | `id: string`                  | `void`                      | Remove association       |
| `reorderCompanies`       | `RouteCompanyReorder`         | `void`                      | Update order             |
| `toggleNextRide`         | `id: string`                  | `RouteCompany`              | Toggle flag              |
| `getNextRideCompanies`   | -                             | `RouteCompanyWithDetails[]` | All next-ride            |
| `exportRoute`            | `id: string`, `ExportFormat`  | `ExportResult`              | Generate export          |
| `setActiveRoute`         | `id: string`                  | `void`                      | Start planning           |
| `clearActiveRoute`       | -                             | `void`                      | End planning             |

---

## Testing

### Unit Test Example

```typescript
// tests/unit/routes/route-service.test.ts
import { RouteService } from '@/lib/routes/route-service';

describe('RouteService', () => {
  it('creates route with home address defaults', async () => {
    const service = new RouteService(mockSupabase);

    const route = await service.createRoute({
      name: 'Test Route',
      start_latitude: 35.1667,
      start_longitude: -84.8667,
      end_latitude: 35.1667,
      end_longitude: -84.8667,
    });

    expect(route.name).toBe('Test Route');
    expect(route.color).toBe('#3B82F6'); // default
    expect(route.is_active).toBe(true);
  });

  it('enforces hard limit on routes', async () => {
    const service = new RouteService(mockSupabase);
    mockUserRouteCount(50);

    await expect(service.createRoute({ ... }))
      .rejects.toThrow('Route limit reached');
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/routes.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and manage routes', async ({ page }) => {
  await page.goto('/companies');

  // Open route sidebar
  await page.click('[data-testid="route-sidebar-toggle"]');

  // Create new route
  await page.click('[data-testid="new-route-button"]');
  await page.fill('[data-testid="route-name-input"]', 'Morning Loop');
  await page.click('[data-testid="save-route-button"]');

  // Verify route appears
  await expect(page.locator('text=Morning Loop')).toBeVisible();
});
```
