# Data Model: Multi-Tenant Company Data Model

**Feature**: 012-multi-tenant-companies
**Date**: 2025-12-06

## Entity Relationship Diagram

```
┌─────────────────────┐
│    metro_areas      │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ state               │
│ center_lat          │
│ center_lng          │
│ radius_miles        │
│ created_at          │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│  shared_companies   │         │  private_companies  │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │         │ id (PK)             │
│ metro_area_id (FK)  │         │ user_id (FK)        │
│ name (UNIQUE)       │         │ metro_area_id (FK)  │ ← auto-inferred
│ website             │         │ name                │
│ careers_url         │         │ website             │
│ is_verified         │         │ careers_url         │
│ created_at          │         │ address             │
│ updated_at          │         │ latitude            │
└──────────┬──────────┘         │ longitude           │
           │                    │ phone               │
           │ 1:N                │ email               │
           ▼                    │ contact_name        │
┌─────────────────────┐         │ contact_title       │
│ company_locations   │         │ notes               │
├─────────────────────┤         │ status              │
│ id (PK)             │         │ priority            │
│ shared_company_id   │         │ follow_up_date      │
│ address             │         │ is_active           │
│ latitude            │         │ submit_to_shared    │
│ longitude           │         │ created_at          │
│ phone               │         │ updated_at          │
│ email               │         └─────────────────────┘
│ is_headquarters     │
│ created_at          │
└──────────┬──────────┘
           │
           │ 1:N (optional)
           ▼
┌─────────────────────┐
│user_company_tracking│
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ shared_company_id   │
│ location_id (FK)    │ ← optional, for multi-location
│ status              │
│ priority            │
│ notes               │
│ contact_name        │ ← user's personal override
│ contact_title       │
│ follow_up_date      │
│ is_active           │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

## Table Definitions

### metro_areas

Geographic regions organizing company data.

| Column       | Type          | Constraints                   | Description           |
| ------------ | ------------- | ----------------------------- | --------------------- |
| id           | UUID          | PK, DEFAULT gen_random_uuid() |                       |
| name         | VARCHAR(100)  | NOT NULL, UNIQUE              | e.g., "Cleveland, TN" |
| state        | VARCHAR(2)    | NOT NULL                      | State abbreviation    |
| center_lat   | DECIMAL(10,7) | NOT NULL                      | Center latitude       |
| center_lng   | DECIMAL(10,7) | NOT NULL                      | Center longitude      |
| radius_miles | INTEGER       | NOT NULL, DEFAULT 30          | Coverage radius       |
| created_at   | TIMESTAMPTZ   | DEFAULT NOW()                 |                       |

**RLS**: Public read

### shared_companies

Deduplicated company registry, admin-managed.

| Column        | Type         | Constraints                   | Description        |
| ------------- | ------------ | ----------------------------- | ------------------ |
| id            | UUID         | PK, DEFAULT gen_random_uuid() |                    |
| metro_area_id | UUID         | FK metro_areas(id)            | Primary metro area |
| name          | VARCHAR(255) | NOT NULL                      | Company name       |
| website       | VARCHAR(500) |                               | Company website    |
| careers_url   | VARCHAR(500) |                               | Careers page URL   |
| is_verified   | BOOLEAN      | DEFAULT false                 | Admin verified     |
| created_at    | TIMESTAMPTZ  | DEFAULT NOW()                 |                    |
| updated_at    | TIMESTAMPTZ  | DEFAULT NOW()                 |                    |

**RLS**: Public read, admin write
**Indexes**: GIN on name (pg_trgm), BTREE on metro_area_id
**Unique**: (metro_area_id, name) - same name allowed in different metros

### company_locations

Physical addresses for shared companies (supports multi-location).

| Column            | Type          | Constraints                               | Description    |
| ----------------- | ------------- | ----------------------------------------- | -------------- |
| id                | UUID          | PK, DEFAULT gen_random_uuid()             |                |
| shared_company_id | UUID          | FK shared_companies(id) ON DELETE CASCADE |                |
| address           | VARCHAR(500)  | NOT NULL                                  | Full address   |
| latitude          | DECIMAL(10,7) | NOT NULL                                  |                |
| longitude         | DECIMAL(10,7) | NOT NULL                                  |                |
| phone             | VARCHAR(20)   |                                           | Location phone |
| email             | VARCHAR(255)  |                                           | Location email |
| is_headquarters   | BOOLEAN       | DEFAULT false                             |                |
| created_at        | TIMESTAMPTZ   | DEFAULT NOW()                             |                |

**RLS**: Public read, admin write
**Indexes**: GIST on geography point, BTREE on shared_company_id

### user_company_tracking

User's relationship to a shared company.

| Column            | Type           | Constraints                               | Description                |
| ----------------- | -------------- | ----------------------------------------- | -------------------------- |
| id                | UUID           | PK, DEFAULT gen_random_uuid()             |                            |
| user_id           | UUID           | FK auth.users(id) ON DELETE CASCADE       |                            |
| shared_company_id | UUID           | FK shared_companies(id) ON DELETE CASCADE |                            |
| location_id       | UUID           | FK company_locations(id), NULLABLE        | Specific location if multi |
| status            | company_status | NOT NULL, DEFAULT 'not_contacted'         |                            |
| priority          | INTEGER        | NOT NULL, DEFAULT 3, CHECK 1-5            |                            |
| notes             | TEXT           |                                           | Personal notes             |
| contact_name      | VARCHAR(100)   |                                           | User's contact override    |
| contact_title     | VARCHAR(100)   |                                           |                            |
| follow_up_date    | DATE           |                                           |                            |
| is_active         | BOOLEAN        | DEFAULT true                              |                            |
| created_at        | TIMESTAMPTZ    | DEFAULT NOW()                             |                            |
| updated_at        | TIMESTAMPTZ    | DEFAULT NOW()                             |                            |

**RLS**: User owns their own rows
**Unique**: (user_id, shared_company_id, location_id)
**Indexes**: BTREE on user_id, shared_company_id

### private_companies

User-owned companies not yet in shared registry.

| Column           | Type           | Constraints                         | Description         |
| ---------------- | -------------- | ----------------------------------- | ------------------- |
| id               | UUID           | PK, DEFAULT gen_random_uuid()       |                     |
| user_id          | UUID           | FK auth.users(id) ON DELETE CASCADE |                     |
| metro_area_id    | UUID           | FK metro_areas(id), NULLABLE        | Auto-inferred       |
| name             | VARCHAR(255)   | NOT NULL                            |                     |
| website          | VARCHAR(500)   |                                     |                     |
| careers_url      | VARCHAR(500)   |                                     |                     |
| address          | VARCHAR(500)   |                                     |                     |
| latitude         | DECIMAL(10,7)  |                                     |                     |
| longitude        | DECIMAL(10,7)  |                                     |                     |
| phone            | VARCHAR(20)    |                                     |                     |
| email            | VARCHAR(255)   |                                     |                     |
| contact_name     | VARCHAR(100)   |                                     |                     |
| contact_title    | VARCHAR(100)   |                                     |                     |
| notes            | TEXT           |                                     |                     |
| status           | company_status | DEFAULT 'not_contacted'             |                     |
| priority         | INTEGER        | DEFAULT 3, CHECK 1-5                |                     |
| follow_up_date   | DATE           |                                     |                     |
| is_active        | BOOLEAN        | DEFAULT true                        |                     |
| submit_to_shared | BOOLEAN        | DEFAULT false                       | Flag for submission |
| created_at       | TIMESTAMPTZ    | DEFAULT NOW()                       |                     |
| updated_at       | TIMESTAMPTZ    | DEFAULT NOW()                       |                     |

**RLS**: User owns their own rows
**Indexes**: BTREE on user_id, GIN on name (pg_trgm)

### company_contributions

Pending submissions of private companies to shared registry.

| Column             | Type                | Constraints                   | Description    |
| ------------------ | ------------------- | ----------------------------- | -------------- |
| id                 | UUID                | PK, DEFAULT gen_random_uuid() |                |
| user_id            | UUID                | FK auth.users(id)             | Contributor    |
| private_company_id | UUID                | FK private_companies(id)      | Source company |
| status             | contribution_status | DEFAULT 'pending'             |                |
| admin_notes        | TEXT                |                               | Review notes   |
| reviewed_by        | UUID                | FK auth.users(id), NULLABLE   |                |
| reviewed_at        | TIMESTAMPTZ         |                               |                |
| created_at         | TIMESTAMPTZ         | DEFAULT NOW()                 |                |

**RLS**: User can insert/view own, admin can read/update all
**Enum**: contribution_status = ('pending', 'approved', 'rejected', 'merged')

### company_edit_suggestions

Pending data corrections for shared companies.

| Column            | Type                | Constraints                        | Description                   |
| ----------------- | ------------------- | ---------------------------------- | ----------------------------- |
| id                | UUID                | PK, DEFAULT gen_random_uuid()      |                               |
| user_id           | UUID                | FK auth.users(id)                  | Suggester                     |
| shared_company_id | UUID                | FK shared_companies(id)            | Target company                |
| location_id       | UUID                | FK company_locations(id), NULLABLE |                               |
| field_name        | VARCHAR(50)         | NOT NULL                           | e.g., 'phone', 'contact_name' |
| old_value         | TEXT                |                                    | Current value                 |
| new_value         | TEXT                | NOT NULL                           | Suggested value               |
| status            | contribution_status | DEFAULT 'pending'                  |                               |
| admin_notes       | TEXT                |                                    |                               |
| reviewed_by       | UUID                | FK auth.users(id), NULLABLE        |                               |
| reviewed_at       | TIMESTAMPTZ         |                                    |                               |
| created_at        | TIMESTAMPTZ         | DEFAULT NOW()                      |                               |

**RLS**: User can insert/view own, admin can read/update all

## Enums

```sql
CREATE TYPE company_status AS ENUM (
  'not_contacted',
  'contacted',
  'follow_up',
  'meeting',
  'applied',
  'interviewing',
  'offer',
  'closed'
);

CREATE TYPE contribution_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'merged'
);
```

## Views

### user_companies_unified

Combines tracked shared companies and private companies into single interface.

```sql
CREATE OR REPLACE VIEW user_companies_unified AS
SELECT
  'shared'::text as source,
  sc.id as company_id,
  NULL::uuid as private_company_id,
  uct.id as tracking_id,
  sc.name,
  sc.website,
  sc.careers_url,
  COALESCE(cl.address, '') as address,
  COALESCE(cl.latitude, 0) as latitude,
  COALESCE(cl.longitude, 0) as longitude,
  COALESCE(cl.phone, '') as phone,
  COALESCE(cl.email, '') as email,
  COALESCE(uct.contact_name, '') as contact_name,
  COALESCE(uct.contact_title, '') as contact_title,
  uct.notes,
  uct.status,
  uct.priority,
  uct.follow_up_date,
  uct.is_active,
  sc.is_verified,
  uct.user_id,
  uct.created_at,
  uct.updated_at
FROM user_company_tracking uct
JOIN shared_companies sc ON uct.shared_company_id = sc.id
LEFT JOIN company_locations cl ON uct.location_id = cl.id

UNION ALL

SELECT
  'private'::text as source,
  NULL::uuid as company_id,
  pc.id as private_company_id,
  NULL::uuid as tracking_id,
  pc.name,
  pc.website,
  pc.careers_url,
  COALESCE(pc.address, '') as address,
  COALESCE(pc.latitude, 0) as latitude,
  COALESCE(pc.longitude, 0) as longitude,
  COALESCE(pc.phone, '') as phone,
  COALESCE(pc.email, '') as email,
  COALESCE(pc.contact_name, '') as contact_name,
  COALESCE(pc.contact_title, '') as contact_title,
  pc.notes,
  pc.status,
  pc.priority,
  pc.follow_up_date,
  pc.is_active,
  false as is_verified,
  pc.user_id,
  pc.created_at,
  pc.updated_at
FROM private_companies pc;
```

## Triggers

### Auto-infer metro_area for private_companies

```sql
CREATE OR REPLACE FUNCTION assign_metro_area()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    SELECT id INTO NEW.metro_area_id
    FROM metro_areas
    WHERE ST_DWithin(
      ST_Point(NEW.longitude, NEW.latitude)::geography,
      ST_Point(center_lng, center_lat)::geography,
      radius_miles * 1609.34
    )
    ORDER BY ST_Distance(
      ST_Point(NEW.longitude, NEW.latitude)::geography,
      ST_Point(center_lng, center_lat)::geography
    )
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_private_company_metro_area
  BEFORE INSERT OR UPDATE ON private_companies
  FOR EACH ROW
  EXECUTE FUNCTION assign_metro_area();
```

### Update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER trg_shared_companies_updated_at
  BEFORE UPDATE ON shared_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_company_tracking_updated_at
  BEFORE UPDATE ON user_company_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_private_companies_updated_at
  BEFORE UPDATE ON private_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## State Transitions

### Company Status

```
not_contacted → contacted → follow_up → meeting → applied → interviewing → offer → closed
                    ↓           ↓          ↓         ↓           ↓          ↓
                  closed     closed     closed    closed      closed     closed
```

### Contribution Status

```
pending → approved → (shared_companies record created)
    ↓
pending → rejected → (stays in private_companies)
    ↓
pending → merged → (tracking linked to existing shared)
```

## Migration Data Mapping

| Old companies column | New table                            | New column                         |
| -------------------- | ------------------------------------ | ---------------------------------- |
| id                   | shared_companies                     | id                                 |
| name                 | shared_companies                     | name                               |
| website              | shared_companies                     | website                            |
| careers_url          | shared_companies                     | careers_url                        |
| address              | company_locations                    | address                            |
| latitude             | company_locations                    | latitude                           |
| longitude            | company_locations                    | longitude                          |
| phone                | company_locations                    | phone                              |
| email                | company_locations                    | email                              |
| contact_name         | user_company_tracking                | contact_name                       |
| contact_title        | user_company_tracking                | contact_title                      |
| notes                | user_company_tracking                | notes                              |
| status               | user_company_tracking                | status                             |
| priority             | user_company_tracking                | priority                           |
| follow_up_date       | user_company_tracking                | follow_up_date                     |
| is_active            | user_company_tracking                | is_active                          |
| route_id             | user_company_tracking                | (dropped - routes redesign needed) |
| extended_range       | (dropped - metro areas replace this) |                                    |
