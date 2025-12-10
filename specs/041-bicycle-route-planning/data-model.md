# Data Model: Bicycle Route Planning

**Feature**: 041-bicycle-route-planning
**Date**: 2025-12-08

## Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────┐
│    auth.users       │         │    metro_areas      │
│─────────────────────│         │─────────────────────│
│ id (PK)             │◄────────┤ id (PK)             │
│ email               │         │ name                │
│ ...                 │         │ ...                 │
└─────────────────────┘         └─────────────────────┘
         │                               │
         │                               │
         ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   bicycle_routes    │         │  map_tile_providers │
│─────────────────────│         │─────────────────────│
│ id (PK)             │         │ id (PK)             │
│ user_id (FK)        │         │ name (unique)       │
│ metro_area_id (FK)  │         │ display_name        │
│ name                │         │ url_template        │
│ color               │         │ attribution         │
│ start_address       │         │ max_zoom            │
│ start_latitude      │         │ is_cycling_optimized│
│ start_longitude     │         │ requires_api_key    │
│ end_address         │         │ is_enabled          │
│ end_latitude        │         │ priority            │
│ end_longitude       │         └─────────────────────┘
│ route_geometry      │
│ distance_miles      │
│ is_system_route     │
│ source_name         │
│ is_active           │
│ created_at          │
│ updated_at          │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐
│   route_companies   │
│─────────────────────│
│ id (PK)             │
│ route_id (FK)       │──────► bicycle_routes
│ user_id (FK)        │──────► auth.users
│ shared_company_id   │──────► shared_companies (nullable)
│ private_company_id  │──────► private_companies (nullable)
│ tracking_id         │──────► user_company_tracking (nullable)
│ sequence_order      │
│ visit_on_next_ride  │
│ distance_from_start │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐
│active_route_planning│
│─────────────────────│
│ id (PK)             │
│ user_id (FK, unique)│──────► auth.users (1:1)
│ route_id (FK)       │──────► bicycle_routes
│ started_at          │
│ last_modified_at    │
└─────────────────────┘
```

## Table Definitions

### bicycle_routes

Stores user-defined and system bicycle routes.

| Column                 | Type          | Constraints                         | Description            |
| ---------------------- | ------------- | ----------------------------------- | ---------------------- |
| id                     | UUID          | PK, DEFAULT gen_random_uuid()       | Primary key            |
| user_id                | UUID          | FK auth.users, NOT NULL             | Route owner            |
| metro_area_id          | UUID          | FK metro_areas, NULL                | Geographic region      |
| name                   | VARCHAR(100)  | NOT NULL, CHECK len >= 1            | Route name             |
| description            | TEXT          | CHECK len <= 1000                   | Optional description   |
| color                  | VARCHAR(7)    | DEFAULT '#3B82F6', CHECK hex format | Display color          |
| start_address          | TEXT          | NULL                                | Start point address    |
| start_latitude         | DECIMAL(10,8) | CHECK -90 to 90                     | Start latitude         |
| start_longitude        | DECIMAL(11,8) | CHECK -180 to 180                   | Start longitude        |
| end_address            | TEXT          | NULL                                | End point address      |
| end_latitude           | DECIMAL(10,8) | CHECK -90 to 90                     | End latitude           |
| end_longitude          | DECIMAL(11,8) | CHECK -180 to 180                   | End longitude          |
| route_geometry         | JSONB         | NULL                                | GeoJSON LineString     |
| distance_miles         | DECIMAL(8,2)  | NULL                                | Calculated distance    |
| estimated_time_minutes | INTEGER       | NULL                                | Estimated cycling time |
| is_system_route        | BOOLEAN       | NOT NULL DEFAULT FALSE              | Admin-created route    |
| source_name            | VARCHAR(100)  | NULL                                | System route source    |
| is_active              | BOOLEAN       | NOT NULL DEFAULT TRUE               | Soft delete flag       |
| created_at             | TIMESTAMPTZ   | NOT NULL DEFAULT NOW()              | Creation timestamp     |
| updated_at             | TIMESTAMPTZ   | NOT NULL DEFAULT NOW()              | Last update            |

**Indexes**:

- `idx_bicycle_routes_user` ON (user_id)
- `idx_bicycle_routes_metro` ON (metro_area_id)
- `idx_bicycle_routes_system` ON (is_system_route) WHERE is_system_route = TRUE
- `idx_bicycle_routes_active` ON (user_id, is_active)

**RLS Policies**:

- SELECT: user_id = auth.uid() OR is_system_route = TRUE
- INSERT: auth.uid() = user_id AND is_system_route = FALSE
- UPDATE: auth.uid() = user_id AND is_system_route = FALSE
- DELETE: auth.uid() = user_id AND is_system_route = FALSE
- Admin policy for system routes management

### route_companies

Junction table linking routes to companies with ordering.

| Column                    | Type         | Constraints                                    | Description               |
| ------------------------- | ------------ | ---------------------------------------------- | ------------------------- |
| id                        | UUID         | PK, DEFAULT gen_random_uuid()                  | Primary key               |
| route_id                  | UUID         | FK bicycle_routes, NOT NULL, ON DELETE CASCADE | Parent route              |
| user_id                   | UUID         | FK auth.users, NOT NULL, ON DELETE CASCADE     | Route owner               |
| shared_company_id         | UUID         | FK shared_companies, ON DELETE CASCADE         | Shared company ref        |
| private_company_id        | UUID         | FK private_companies, ON DELETE CASCADE        | Private company ref       |
| tracking_id               | UUID         | FK user_company_tracking, ON DELETE CASCADE    | Tracking record ref       |
| sequence_order            | INTEGER      | NOT NULL DEFAULT 0                             | Order in route            |
| visit_on_next_ride        | BOOLEAN      | NOT NULL DEFAULT FALSE                         | Next ride flag            |
| distance_from_start_miles | DECIMAL(8,2) | NULL                                           | Distance from route start |
| created_at                | TIMESTAMPTZ  | NOT NULL DEFAULT NOW()                         | Creation timestamp        |

**Constraints**:

- CHECK: exactly one of shared_company_id or private_company_id must be NOT NULL
- UNIQUE: (route_id, shared_company_id, private_company_id)

**Indexes**:

- `idx_route_companies_route` ON (route_id, sequence_order)
- `idx_route_companies_user` ON (user_id)
- `idx_route_companies_shared` ON (shared_company_id) WHERE shared_company_id IS NOT NULL
- `idx_route_companies_private` ON (private_company_id) WHERE private_company_id IS NOT NULL
- `idx_route_companies_next_ride` ON (user_id, visit_on_next_ride) WHERE visit_on_next_ride = TRUE

**RLS Policies**:

- ALL: auth.uid() = user_id

### active_route_planning

Tracks user's current route being planned (one per user).

| Column           | Type        | Constraints                                        | Description    |
| ---------------- | ----------- | -------------------------------------------------- | -------------- |
| id               | UUID        | PK, DEFAULT gen_random_uuid()                      | Primary key    |
| user_id          | UUID        | FK auth.users, NOT NULL, UNIQUE, ON DELETE CASCADE | User (1:1)     |
| route_id         | UUID        | FK bicycle_routes, NOT NULL, ON DELETE CASCADE     | Active route   |
| started_at       | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                             | Planning start |
| last_modified_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                             | Last activity  |

**RLS Policies**:

- ALL: auth.uid() = user_id

### map_tile_providers

Configuration for available map tile sources.

| Column               | Type         | Constraints                   | Description        |
| -------------------- | ------------ | ----------------------------- | ------------------ |
| id                   | UUID         | PK, DEFAULT gen_random_uuid() | Primary key        |
| name                 | VARCHAR(50)  | NOT NULL, UNIQUE              | Provider key       |
| display_name         | VARCHAR(100) | NOT NULL                      | User-facing name   |
| url_template         | TEXT         | NOT NULL                      | Tile URL pattern   |
| attribution          | TEXT         | NOT NULL                      | Copyright notice   |
| max_zoom             | INTEGER      | NOT NULL DEFAULT 18           | Max zoom level     |
| is_cycling_optimized | BOOLEAN      | NOT NULL DEFAULT FALSE        | Cycling tiles flag |
| requires_api_key     | BOOLEAN      | NOT NULL DEFAULT FALSE        | API key needed     |
| is_enabled           | BOOLEAN      | NOT NULL DEFAULT TRUE         | Availability       |
| priority             | INTEGER      | NOT NULL DEFAULT 0            | Sort order         |
| created_at           | TIMESTAMPTZ  | NOT NULL DEFAULT NOW()        | Creation timestamp |

**RLS Policies**:

- SELECT: true (public read)
- INSERT/UPDATE/DELETE: admin only

**Seed Data**:

```sql
INSERT INTO map_tile_providers (name, display_name, url_template, attribution, max_zoom, is_cycling_optimized, requires_api_key, priority) VALUES
  ('osm', 'OpenStreetMap', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap contributors', 19, FALSE, FALSE, 0),
  ('opencyclemap', 'OpenCycleMap', 'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apikey}', '© Thunderforest, OpenStreetMap contributors', 22, TRUE, TRUE, 10),
  ('thunderforest_outdoors', 'Outdoors', 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}', '© Thunderforest, OpenStreetMap contributors', 22, TRUE, TRUE, 5);
```

## GeoJSON Schema

### Route Geometry (route_geometry column)

```json
{
  "type": "LineString",
  "coordinates": [
    [-84.8667, 35.1667],
    [-84.87, 35.16],
    [-84.875, 35.15],
    [-84.8833, 35.1333]
  ]
}
```

**Validation**:

- type MUST be "LineString"
- coordinates MUST be array of [longitude, latitude] pairs
- Each coordinate MUST have exactly 2 numbers
- Longitude range: -180 to 180
- Latitude range: -90 to 90
- Minimum 2 coordinates (start and end)
- Maximum 1000 coordinates (performance limit)

## State Transitions

### Route Lifecycle

```
Created → Active → [Soft Deleted]
    │         │
    ▼         ▼
Planning ← ─ ─ ┘
```

1. **Created**: Route saved with name and start/end points
2. **Active**: Normal state, visible in route list
3. **Planning**: One route at a time can be in planning mode (tracked in active_route_planning)
4. **Soft Deleted**: is_active = FALSE, hidden from UI but data preserved

### Route-Company Association

```
Company Added → Ordered → [Next Ride Marked] → [Removed]
```

1. **Added**: Company associated with route, assigned next sequence_order
2. **Ordered**: User can reorder via drag-and-drop
3. **Next Ride**: Optional flag for quick filtering
4. **Removed**: Association deleted (company remains, route remains)

## Limits

| Resource            | Soft Limit | Hard Limit | Enforcement          |
| ------------------- | ---------- | ---------- | -------------------- |
| Routes per user     | 20         | 50         | Service + DB CHECK   |
| Companies per route | 50         | 100        | Service + DB trigger |
| Waypoints per route | N/A        | 1000       | Service validation   |
| Route name length   | N/A        | 100        | DB CHECK             |
| Description length  | N/A        | 1000       | DB CHECK             |

## Migration Strategy

All schema changes will be added to the monolithic migration file:
`/supabase/migrations/20251006_complete_monolithic_setup.sql`

Changes will be applied via Supabase Management API using:

```bash
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "<SQL>"}'
```
