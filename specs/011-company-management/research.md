# Research: Company Management Feature

**Branch**: `011-company-management` | **Date**: 2025-12-04

## Existing Codebase Analysis

### Technology Stack Confirmed

- **Framework**: Next.js 15 with App Router, static export to GitHub Pages
- **React**: 19 with TypeScript strict mode
- **Styling**: Tailwind CSS 4 + DaisyUI (32 themes)
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Storage**: IndexedDB for offline support (PWA)
- **Testing**: Vitest (unit), Playwright (E2E), Pa11y (accessibility)

### Existing Patterns to Follow

#### 1. Component Structure (5-file pattern)

All components follow:

```
ComponentName/
├── index.tsx
├── ComponentName.tsx
├── ComponentName.test.tsx
├── ComponentName.stories.tsx
└── ComponentName.accessibility.test.tsx
```

#### 2. Database Schema Pattern (from monolithic migration)

- Tables use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Row Level Security (RLS) enabled on all tables
- Policies reference `auth.uid()` for user isolation

#### 3. Service Layer Pattern

Services in `src/lib/` handle business logic:

- `src/lib/messaging/` - E2E encryption, realtime, validation
- `src/lib/auth/` - Rate limiting, OAuth, validation
- `src/lib/supabase/` - Client, types, messaging client

#### 4. Context Pattern

Contexts in `src/contexts/` provide global state:

- `AuthContext.tsx` - User authentication state
- `ConsentContext.tsx` - Privacy consent management
- `AccessibilityContext.tsx` - Accessibility settings

### Static Hosting Constraints (Critical)

From CLAUDE.md:

> This app is deployed to GitHub Pages (static hosting). This means:
>
> - NO server-side API routes (`src/app/api/` won't work in production)
> - All server-side logic must be in Supabase (database, Edge Functions, or triggers)

**Implication for Company Management**: All CRUD operations must go through Supabase client, with RLS policies enforcing user isolation. Geocoding must happen client-side or via external API.

### Offline Support Requirements (Constitution)

From Principle XII (Field Operations Support):

> Core route execution MUST NOT require network connectivity.

**Implication**: Company data must be cached in IndexedDB for offline access. Sync queue for offline edits.

## Research Findings

### 1. Geocoding Options

**Option A: Browser Geolocation + Manual Entry (Recommended)**

- No API key required
- User can enter coordinates manually
- Works offline once coordinates are entered
- Constitution-compliant (manual override when geocoding fails)

**Option B: Nominatim (OpenStreetMap) - Client-side**

- Free, no API key
- Rate limited (1 request/second)
- Good for address → coordinates
- Terms of Service: Must attribute OpenStreetMap

**Decision**: Use Nominatim for automatic geocoding with manual fallback. Cache results in IndexedDB.

### 2. Local Storage Strategy

**IndexedDB Schema for Companies**:

```typescript
interface CompanyRecord {
  id: string;
  user_id: string;
  name: string;
  contact_name?: string;
  contact_title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address: string;
  latitude: number;
  longitude: number;
  status:
    | 'not_contacted'
    | 'contacted'
    | 'follow_up'
    | 'meeting'
    | 'outcome_positive'
    | 'outcome_negative';
  priority: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  follow_up_date?: string;
  route_id?: string;
  is_active: boolean;
  extended_range: boolean;
  created_at: string;
  updated_at: string;
  synced_at?: string; // Last sync with Supabase
}
```

### 3. Sync Strategy

1. **Online**: Write to Supabase, mirror to IndexedDB
2. **Offline**: Write to IndexedDB with `synced_at = null`
3. **Reconnect**: Sync queue processes pending changes
4. **Conflict resolution**: Last-write-wins based on `updated_at`

### 4. CSV Import/Export Format

**CSV Columns**:

```
name,contact_name,contact_title,phone,email,website,address,latitude,longitude,status,priority,notes,follow_up_date,route_id
```

**JSON Export**: Full CompanyRecord objects with ISO date strings

### 5. Component Breakdown

1. **CompanyTable** - Main data grid with sorting/filtering
2. **CompanyForm** - Add/Edit form with validation
3. **CompanyFilters** - Status, priority, route filters
4. **CompanyImport** - CSV upload and mapping
5. **CompanyExport** - CSV/JSON download
6. **CompanyMap** - Map view for coordinate verification

### 6. Geographic Validation

From Constitution Principle VIII:

> Coordinates MUST be validated within reasonable geographic bounds (~20 mile radius from home).

**Implementation**:

- Store user's home location in user_profiles or separate settings table
- Calculate distance using Haversine formula
- Flag companies > 20 miles as `extended_range = true`
- Warn user but allow (they may have legitimate reasons)

## Constitution Compliance Check

| Principle                      | Compliance Status                    |
| ------------------------------ | ------------------------------------ |
| VII. Company Tracking          | Implementing full entity per spec    |
| VIII. Geographic Data Accuracy | Manual coordinate entry + validation |
| IX. Route Cluster Organization | `route_id` field for future feature  |
| X. Bicycle-Optimized Routing   | Deferred to route feature            |
| XI. Multi-Format Export        | CSV + JSON export included           |
| XII. Field Operations Support  | IndexedDB offline storage            |
| I. Component Structure         | Generator will be used               |
| II. Test-First                 | Tests before implementation          |
| IV. Docker-First               | All commands via Docker              |
| V. Progressive Enhancement     | PWA offline support                  |
| VI. Privacy & Compliance       | RLS user isolation                   |

## Risks & Mitigations

| Risk                              | Mitigation                        |
| --------------------------------- | --------------------------------- |
| Geocoding rate limits             | Cache results, manual fallback    |
| Large data sets (1000+ companies) | Pagination, virtual scrolling     |
| Sync conflicts                    | Last-write-wins with timestamp    |
| Offline data loss                 | IndexedDB persistence, sync queue |
| Address parsing failures          | Manual coordinate entry           |

## Dependencies Identified

- No new npm packages required
- Supabase schema addition (companies table)
- IndexedDB wrapper (can use idb or raw API)
- Nominatim API (free, no key)

## Next Steps (SpecKit Workflow)

Per CLAUDE.md, the full SpecKit workflow is:

```
/specify → /clarify → /plan → /checklist → /tasks → /analyze → /implement
```

Current progress:

1. [x] `/specify` - Created spec.md
2. [ ] `/clarify` - Refine spec with clarifying questions
3. [ ] `/plan` - Generate this research.md + data-model.md + contracts/ + quickstart.md + plan.md
4. [ ] `/checklist` - Generate requirements quality checklist
5. [ ] `/tasks` - Generate dependency-ordered implementation tasks
6. [ ] `/analyze` - Cross-artifact consistency check
7. [ ] `/implement` - Execute the implementation
