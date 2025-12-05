# Contract: Company Service

**Module**: `src/lib/companies/company-service.ts`

## Overview

Client-side service for company CRUD operations with Supabase backend and IndexedDB offline support.

## Interface

```typescript
import type {
  Company,
  CompanyCreate,
  CompanyUpdate,
  CompanyFilters,
  CompanySort,
  HomeLocation,
} from '@/types/company';

export interface CompanyService {
  // CRUD Operations
  create(data: CompanyCreate): Promise<Company>;
  getById(id: string): Promise<Company | null>;
  getAll(filters?: CompanyFilters, sort?: CompanySort): Promise<Company[]>;
  update(data: CompanyUpdate): Promise<Company>;
  delete(id: string): Promise<void>;

  // Bulk Operations
  importFromCSV(file: File): Promise<ImportResult>;
  exportToCSV(): Promise<Blob>;
  exportToJSON(): Promise<Blob>;

  // Sync Operations
  syncOfflineChanges(): Promise<SyncResult>;
  getConflicts(): Promise<SyncConflict[]>;
  resolveConflict(
    companyId: string,
    resolution: 'local' | 'server'
  ): Promise<void>;

  // Utility
  geocodeAddress(address: string): Promise<GeocodeResult>;
  validateCoordinates(
    lat: number,
    lng: number,
    home: HomeLocation
  ): DistanceResult;
}

// Result Types
export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

export interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
}

export interface GeocodeResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  display_name?: string;
  error?: string;
}

export interface DistanceResult {
  distance_miles: number;
  within_radius: boolean;
  extended_range: boolean;
}
```

## Method Specifications

### `create(data: CompanyCreate): Promise<Company>`

Creates a new company record.

**Preconditions:**

- User is authenticated
- `name` and `address` are non-empty
- `latitude` and `longitude` are valid coordinates
- No existing company with same (name, address) for this user

**Postconditions:**

- Company saved to Supabase
- Company mirrored to IndexedDB
- Returns complete Company object with generated `id` and timestamps

**Error Cases:**

- `DuplicateCompanyError`: Name + address already exists
- `ValidationError`: Required fields missing or invalid
- `NetworkError`: Offline - queued for sync

---

### `getById(id: string): Promise<Company | null>`

Retrieves a single company by ID.

**Behavior:**

- Online: Fetch from Supabase, update IndexedDB cache
- Offline: Return from IndexedDB

**Error Cases:**

- Returns `null` if not found (not an error)

---

### `getAll(filters?, sort?): Promise<Company[]>`

Retrieves all companies for the current user with optional filtering and sorting.

**Filters:**

- `status`: Single or array of status values
- `priority`: Single or array of priority values
- `route_id`: Filter by route (null = unassigned)
- `is_active`: Filter by active/inactive
- `search`: Free-text search across name, contact_name, notes

**Sort:**

- Default: `created_at` DESC
- Supported fields: name, status, priority, created_at, follow_up_date

**Behavior:**

- Online: Fetch from Supabase with RLS, update IndexedDB
- Offline: Query IndexedDB with client-side filtering

---

### `update(data: CompanyUpdate): Promise<Company>`

Updates an existing company.

**Preconditions:**

- `id` is required and valid
- User owns the company
- If `address` changed, `latitude` and `longitude` should also be updated

**Postconditions:**

- `updated_at` timestamp refreshed
- Supabase and IndexedDB updated

**Error Cases:**

- `NotFoundError`: Company doesn't exist
- `ConflictError`: Server version differs (offline conflict)
- `ValidationError`: Invalid field values

---

### `delete(id: string): Promise<void>`

Permanently deletes a company.

**Preconditions:**

- User owns the company

**Postconditions:**

- Removed from Supabase and IndexedDB

**Note:** Consider soft delete via `is_active = false` for recovery

---

### `importFromCSV(file: File): Promise<ImportResult>`

Bulk imports companies from CSV file.

**Expected CSV Columns:**

```
name,contact_name,contact_title,phone,email,website,address,latitude,longitude,status,priority,notes,follow_up_date
```

**Behavior:**

1. Parse CSV with column header mapping
2. Validate each row
3. Geocode addresses without coordinates
4. Skip/warn on duplicates
5. Insert valid records
6. Return summary with row-level errors

**Rate Limiting:** Geocoding limited to 1 req/sec via queue

---

### `exportToCSV(): Promise<Blob>`

Exports all companies to CSV format.

**Output:** CSV file with all company fields, UTF-8 encoded with BOM

---

### `exportToJSON(): Promise<Blob>`

Exports all companies to JSON format.

**Output:** JSON array of Company objects

---

### `syncOfflineChanges(): Promise<SyncResult>`

Syncs pending offline changes with server.

**Behavior:**

1. Process sync queue (create/update/delete)
2. Detect conflicts (server modified since last sync)
3. Queue conflicts for user resolution
4. Clear synced items from queue

**Called:** On network reconnection, manual refresh

---

### `getConflicts(): Promise<SyncConflict[]>`

Returns unresolved sync conflicts.

---

### `resolveConflict(companyId, resolution): Promise<void>`

Resolves a sync conflict by choosing local or server version.

**Resolution:**

- `local`: Overwrite server with local changes
- `server`: Discard local changes, accept server version

---

### `geocodeAddress(address: string): Promise<GeocodeResult>`

Geocodes an address using Nominatim API.

**Rate Limit:** 1 request per second (queued)

**Behavior:**

1. Check cache for recent geocode of same address
2. Call Nominatim API
3. Cache result
4. Return coordinates or error

---

### `validateCoordinates(lat, lng, home): DistanceResult`

Calculates distance from home and checks radius.

**Algorithm:** Haversine formula

**Returns:**

- `distance_miles`: Actual distance
- `within_radius`: Distance <= home.radius_miles
- `extended_range`: Distance > home.radius_miles
