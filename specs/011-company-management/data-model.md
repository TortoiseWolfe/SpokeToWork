# Data Model: Company Management

**Branch**: `011-company-management` | **Date**: 2025-12-04

## Supabase Schema

### Table: `companies`

```sql
-- Add to supabase/migrations/20251006_complete_monolithic_setup.sql

-- ============================================================================
-- PART 11: COMPANY MANAGEMENT (Feature 011)
-- ============================================================================
-- Job seeker company tracking with offline support
-- Features: CRUD, geocoding, status tracking, import/export
-- ============================================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Company identity
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 200),

  -- Contact information
  contact_name TEXT CHECK (length(contact_name) <= 100),
  contact_title TEXT CHECK (length(contact_title) <= 100),
  phone TEXT CHECK (length(phone) <= 30),
  email TEXT CHECK (length(email) <= 254),
  website TEXT CHECK (length(website) <= 500),

  -- Location
  address TEXT NOT NULL CHECK (length(address) >= 1 AND length(address) <= 500),
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  extended_range BOOLEAN NOT NULL DEFAULT FALSE,

  -- Tracking
  status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (status IN (
    'not_contacted', 'contacted', 'follow_up', 'meeting', 'outcome_positive', 'outcome_negative'
  )),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  notes TEXT CHECK (length(notes) <= 5000),
  follow_up_date DATE,

  -- Route assignment (nullable, references future route feature)
  route_id UUID,

  -- State
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uniqueness constraint: name + address per user
  CONSTRAINT unique_company_per_user UNIQUE (user_id, name, address)
);

-- Indexes for common queries
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_status ON companies(user_id, status);
CREATE INDEX idx_companies_priority ON companies(user_id, priority DESC);
CREATE INDEX idx_companies_follow_up ON companies(user_id, follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_companies_active ON companies(user_id, is_active);
CREATE INDEX idx_companies_route ON companies(route_id) WHERE route_id IS NOT NULL;
CREATE INDEX idx_companies_name_search ON companies USING gin(to_tsvector('english', name));

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User isolation
CREATE POLICY "Users can view own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;

COMMENT ON TABLE companies IS 'Job seeker company tracking for route planning (Feature 011)';
```

### Table: `user_settings` (Extension to user_profiles)

```sql
-- Add home location columns to user_profiles for distance validation
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS home_address TEXT CHECK (length(home_address) <= 500),
  ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 8) CHECK (home_latitude >= -90 AND home_latitude <= 90),
  ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11, 8) CHECK (home_longitude >= -180 AND home_longitude <= 180),
  ADD COLUMN IF NOT EXISTS distance_radius_miles INTEGER NOT NULL DEFAULT 20 CHECK (distance_radius_miles >= 1 AND distance_radius_miles <= 100);

COMMENT ON COLUMN user_profiles.home_address IS 'User home address for distance calculations';
COMMENT ON COLUMN user_profiles.home_latitude IS 'User home latitude for distance calculations';
COMMENT ON COLUMN user_profiles.home_longitude IS 'User home longitude for distance calculations';
COMMENT ON COLUMN user_profiles.distance_radius_miles IS 'Configurable radius for extended_range warning (default 20)';
```

## TypeScript Types

### `src/types/company.ts`

```typescript
/**
 * Application status for job hunting workflow
 */
export type ApplicationStatus =
  | 'not_contacted'
  | 'contacted'
  | 'follow_up'
  | 'meeting'
  | 'outcome_positive'
  | 'outcome_negative';

/**
 * Priority levels (1 = highest, 5 = lowest)
 */
export type Priority = 1 | 2 | 3 | 4 | 5;

/**
 * Company entity - core data model for Feature 011
 */
export interface Company {
  id: string;
  user_id: string;

  // Identity
  name: string;

  // Contact
  contact_name: string | null;
  contact_title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;

  // Location
  address: string;
  latitude: number;
  longitude: number;
  extended_range: boolean;

  // Tracking
  status: ApplicationStatus;
  priority: Priority;
  notes: string | null;
  follow_up_date: string | null; // ISO date string

  // Route (nullable until route feature implemented)
  route_id: string | null;

  // State
  is_active: boolean;

  // Timestamps
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * Company creation payload (subset of Company)
 */
export interface CompanyCreate {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_name?: string;
  contact_title?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: ApplicationStatus;
  priority?: Priority;
  notes?: string;
  follow_up_date?: string;
  extended_range?: boolean;
}

/**
 * Company update payload (all fields optional except id)
 */
export interface CompanyUpdate {
  id: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contact_name?: string | null;
  contact_title?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status?: ApplicationStatus;
  priority?: Priority;
  notes?: string | null;
  follow_up_date?: string | null;
  route_id?: string | null;
  is_active?: boolean;
  extended_range?: boolean;
}

/**
 * Filter options for company list
 */
export interface CompanyFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  priority?: Priority | Priority[];
  route_id?: string | null;
  is_active?: boolean;
  extended_range?: boolean;
  search?: string; // Free-text search
}

/**
 * Sort options for company list
 */
export interface CompanySort {
  field: 'name' | 'status' | 'priority' | 'created_at' | 'follow_up_date';
  direction: 'asc' | 'desc';
}

/**
 * Home location settings for distance calculations
 */
export interface HomeLocation {
  address: string;
  latitude: number;
  longitude: number;
  radius_miles: number;
}
```

## IndexedDB Schema (Offline Support)

### `src/lib/companies/offline-store.ts`

```typescript
/**
 * IndexedDB store for offline company data
 *
 * Database: spoketowork-companies
 * Version: 1
 *
 * Object Stores:
 * - companies: Company records with sync metadata
 * - sync_queue: Pending changes to sync when online
 */

export interface OfflineCompany extends Company {
  synced_at: string | null; // null = pending sync
  local_version: number; // Increment on each local edit
  server_version: number; // Last known server version
}

export interface SyncQueueItem {
  id: string;
  company_id: string;
  action: 'create' | 'update' | 'delete';
  payload: CompanyCreate | CompanyUpdate | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

export interface SyncConflict {
  company_id: string;
  local_version: OfflineCompany;
  server_version: Company;
  detected_at: string;
}
```

## Entity Relationships

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │  user_profiles  │
│─────────────────│       │─────────────────│
│ id (PK)         │◄──────│ id (PK, FK)     │
│ email           │       │ home_address    │
│ ...             │       │ home_latitude   │
└────────┬────────┘       │ home_longitude  │
         │                │ distance_radius │
         │                └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│    companies    │
│─────────────────│
│ id (PK)         │
│ user_id (FK)    │
│ name            │
│ address         │
│ latitude        │
│ longitude       │
│ status          │
│ priority        │
│ route_id (FK?)  │──────► (Future: routes table)
│ ...             │
└─────────────────┘
         │
         │ Mirrored to
         ▼
┌─────────────────┐
│ IndexedDB       │
│─────────────────│
│ companies store │
│ sync_queue      │
└─────────────────┘
```

## Validation Rules

| Field          | Validation                                  |
| -------------- | ------------------------------------------- |
| name           | Required, 1-200 chars                       |
| address        | Required, 1-500 chars                       |
| latitude       | Required, -90 to 90                         |
| longitude      | Required, -180 to 180                       |
| contact_name   | Optional, max 100 chars                     |
| contact_title  | Optional, max 100 chars                     |
| phone          | Optional, max 30 chars                      |
| email          | Optional, max 254 chars, valid email format |
| website        | Optional, max 500 chars, valid URL format   |
| notes          | Optional, max 5000 chars                    |
| priority       | 1-5, default 3                              |
| status         | Enum value, default 'not_contacted'         |
| follow_up_date | Optional, valid date                        |
| unique         | (user_id, name, address) combination        |
