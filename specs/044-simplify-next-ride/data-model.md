# Data Model: Simplify Next Ride Feature

**Feature**: 044-simplify-next-ride
**Date**: 2025-12-18

## Overview

This feature does not introduce new entities or modify the database schema. It changes how existing entities are queried and displayed in the UI.

## Existing Entities (No Changes)

### Active Route Planning

Stores the user's currently active route for planning.

| Field      | Type      | Description                   |
| ---------- | --------- | ----------------------------- |
| id         | UUID      | Primary key                   |
| user_id    | UUID      | Foreign key to auth.users     |
| route_id   | UUID      | Foreign key to bicycle_routes |
| created_at | TIMESTAMP | When activated                |
| updated_at | TIMESTAMP | Last update                   |

**Constraint**: One active route per user (unique on user_id)

### Route Companies

Junction table linking routes to companies.

| Field              | Type    | Description                                         |
| ------------------ | ------- | --------------------------------------------------- |
| id                 | UUID    | Primary key                                         |
| route_id           | UUID    | Foreign key to bicycle_routes                       |
| user_id            | UUID    | Foreign key to auth.users                           |
| shared_company_id  | UUID    | FK to companies (nullable)                          |
| private_company_id | UUID    | FK to private_companies (nullable)                  |
| tracking_id        | UUID    | FK to user_company_tracking (nullable)              |
| sequence_order     | INTEGER | Visit order on route                                |
| visit_on_next_ride | BOOLEAN | **DEPRECATED** - Was for cross-route cherry-picking |

**Constraint**: Either shared_company_id OR private_company_id must be set (CHECK constraint)

### Bicycle Routes

User's saved bicycle routes.

| Field                  | Type         | Description               |
| ---------------------- | ------------ | ------------------------- |
| id                     | UUID         | Primary key               |
| user_id                | UUID         | Foreign key to auth.users |
| name                   | VARCHAR(100) | Route name                |
| color                  | VARCHAR(7)   | Hex color code            |
| route_geometry         | JSONB        | GeoJSON LineString        |
| distance_miles         | DECIMAL      | Total distance            |
| estimated_time_minutes | INTEGER      | Estimated ride time       |

## Type Changes (Frontend Only)

### CompanyFilters Type

**Before**:

```typescript
interface CompanyFilters {
  search?: string;
  status?: CompanyStatus;
  priority?: Priority | Priority[];
  is_active?: boolean;
  extended_range?: boolean;
  next_ride_only?: boolean; // REMOVE
}
```

**After**:

```typescript
interface CompanyFilters {
  search?: string;
  status?: CompanyStatus;
  priority?: Priority | Priority[];
  is_active?: boolean;
  extended_range?: boolean;
  on_active_route?: boolean; // ADD
}
```

### CompanyTableProps Type

**Before**:

```typescript
interface CompanyTableProps {
  // ...
  nextRideCompanyIds?: Set<string>; // REMOVE
}
```

**After**:

```typescript
interface CompanyTableProps {
  // ...
  activeRouteCompanyIds?: Set<string>; // ADD
}
```

## Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ useRoutes Hook  │────▶│ activeRouteId    │────▶│ getRouteCompanies│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ companies/page  │◀────│ Set<companyId>   │◀────│ Extract IDs     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│ CompanyTable    │────▶│ Filter + Display │
└─────────────────┘     └──────────────────┘
```

## Deprecation Notes

The `visit_on_next_ride` column in `route_companies` table will no longer be used by the application. It can remain in the database for potential future use or be removed in a future cleanup migration.

The `toggleNextRide`, `getNextRideCompanies`, and `clearAllNextRide` functions in `useRoutes` hook are no longer needed and will be marked as deprecated.
