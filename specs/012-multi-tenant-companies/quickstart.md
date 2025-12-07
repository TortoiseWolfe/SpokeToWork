# Quickstart: Multi-Tenant Company Data Model

**Feature**: 012-multi-tenant-companies
**Branch**: `012-multi-tenant-companies`
**Date**: 2025-12-06

## Prerequisites

- Docker and Docker Compose running
- Supabase project configured (free tier works)
- Access to Supabase Management API (`SUPABASE_ACCESS_TOKEN` in `.env`)

## Quick Setup

### 1. Switch to Feature Branch

```bash
git checkout 012-multi-tenant-companies
```

### 2. Verify Docker Environment

```bash
docker compose up -d
docker compose exec spoketowork pnpm run type-check
```

### 3. Run Migration

The migration adds tables to the existing monolithic SQL file. Execute via Supabase Management API:

```bash
# Load credentials from .env
source .env

# Execute migration
curl -X POST "https://api.supabase.com/v1/projects/${NEXT_PUBLIC_SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "query": "-- See supabase/migrations/20251006_complete_monolithic_setup.sql for full SQL"
}
EOF
```

### 4. Seed Initial Metro Area

```sql
INSERT INTO metro_areas (name, state, center_lat, center_lng, radius_miles)
VALUES ('Cleveland, TN', 'TN', 35.1595, -84.8707, 30);
```

### 5. Run Tests

```bash
# Unit tests
docker compose exec spoketowork pnpm test

# E2E tests
docker compose exec spoketowork pnpm run test:e2e

# Type checking
docker compose exec spoketowork pnpm run type-check
```

## Key Files

| File                                                         | Purpose                                              |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| `specs/012-multi-tenant-companies/spec.md`                   | Feature specification                                |
| `specs/012-multi-tenant-companies/plan.md`                   | Implementation plan                                  |
| `specs/012-multi-tenant-companies/data-model.md`             | Database schema                                      |
| `supabase/migrations/20251006_complete_monolithic_setup.sql` | Database migration                                   |
| `src/types/company.ts`                                       | TypeScript interfaces                                |
| `src/lib/companies/company-service.ts`                       | Data access layer                                    |
| `src/lib/companies/multi-tenant-service.ts`                  | Multi-tenant service (unified view, match detection) |
| `src/lib/companies/seed-service.ts`                          | Seed data service (US4)                              |
| `src/lib/companies/admin-moderation-service.ts`              | Admin moderation queue (US7)                         |
| `src/lib/companies/index.ts`                                 | Barrel exports                                       |
| `src/components/organisms/CompanyDetailDrawer/`              | Company detail UI                                    |
| `src/components/organisms/AdminModerationQueue/`             | Admin moderation UI                                  |
| `src/app/admin/moderation/page.tsx`                          | Admin moderation page                                |
| `tests/unit/multi-tenant-service.test.ts`                    | Multi-tenant service tests                           |
| `tests/unit/contribution-service.test.ts`                    | Contribution service tests                           |
| `tests/unit/edit-suggestion-service.test.ts`                 | Edit suggestion tests                                |
| `tests/unit/admin-moderation-service.test.ts`                | Admin moderation tests                               |
| `tests/unit/coordinate-validation.test.ts`                   | Coordinate validation tests                          |

## New TypeScript Interfaces

```typescript
// src/types/company.ts

interface SharedCompany {
  id: string;
  metro_area_id: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  is_verified: boolean;
}

interface CompanyLocation {
  id: string;
  shared_company_id: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  is_headquarters: boolean;
}

interface UserCompanyTracking {
  id: string;
  user_id: string;
  shared_company_id: string;
  location_id: string | null;
  status: CompanyStatus;
  priority: number;
  notes: string | null;
  contact_name: string | null;
  contact_title: string | null;
  follow_up_date: string | null;
  is_active: boolean;
}

interface PrivateCompany {
  id: string;
  user_id: string;
  metro_area_id: string | null;
  name: string;
  // ... full company fields
  submit_to_shared: boolean;
}

interface UnifiedCompany {
  source: 'shared' | 'private';
  company_id: string | null;
  private_company_id: string | null;
  tracking_id: string | null;
  name: string;
  // ... common fields
}

interface MatchResult {
  company: SharedCompany;
  locations: (CompanyLocation & { distance_miles: number })[];
  confidence: 'high' | 'medium' | 'low';
  name_similarity: number;
  domain_match: boolean;
  reasons: string[];
}
```

## Common Operations

### Fetch User's Companies (Unified View)

```typescript
const { data: companies } = await supabase
  .from('user_companies_unified')
  .select('*')
  .eq('is_active', true)
  .order('name');
```

### Search for Similar Companies (Match Detection)

```typescript
const { data: matches } = await supabase.rpc('find_similar_companies', {
  company_name: 'Amazon',
  latitude: 35.1595,
  longitude: -84.8707,
  website_domain: 'amazon.com',
});
```

### Track a Shared Company

```typescript
const { error } = await supabase.from('user_company_tracking').insert({
  shared_company_id: 'uuid',
  location_id: 'uuid', // optional
  status: 'not_contacted',
  priority: 3,
});
```

### Create Private Company

```typescript
const { data, error } = await supabase
  .from('private_companies')
  .insert({
    name: 'New Local Company',
    address: '123 Main St, Cleveland, TN',
    latitude: 35.1595,
    longitude: -84.8707,
    // metro_area_id auto-inferred by trigger
  })
  .select()
  .single();
```

### Submit to Community

```typescript
// 1. Flag private company
await supabase
  .from('private_companies')
  .update({ submit_to_shared: true })
  .eq('id', privateCompanyId);

// 2. Create contribution record
await supabase.from('company_contributions').insert({
  private_company_id: privateCompanyId,
});
```

## Testing

### RLS Policy Testing

```typescript
// Test as regular user - should only see own data
const user1 = await signIn('user1@test.com');
const { data: user1Companies } = await supabase
  .from('user_company_tracking')
  .select('*');

// Test as admin - should see all pending contributions
const admin = await signIn('admin@test.com');
const { data: contributions } = await supabase
  .from('company_contributions')
  .select('*');
```

### Match Detection Testing

```typescript
// Test fuzzy match
expect(await findSimilarCompanies('Amazn')).toContainEqual(
  expect.objectContaining({ name: 'Amazon', confidence: 'medium' })
);

// Test domain match
expect(
  await findSimilarCompanies('Some Name', { domain: 'amazon.com' })
).toContainEqual(
  expect.objectContaining({ name: 'Amazon', confidence: 'high' })
);
```

## Troubleshooting

### PostGIS Extension Not Found

```sql
-- Enable in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS postgis;
```

### pg_trgm Extension Not Found

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### RLS Policy Blocking Access

1. Check user is authenticated
2. Verify `is_admin` flag for admin operations
3. Check `user_id` matches for user-owned tables

### Migration Rollback

```sql
-- Restore from backup
-- 1. Re-create old companies table from monolithic SQL
-- 2. Import data from data/companies_backup.json
-- 3. Revert job_applications foreign keys
```

## Next Steps

1. Run `/tasks` to generate implementation tasks
2. Implement Phase 1 (Database Schema) first
3. Run migration on Supabase
4. Implement TypeScript types and services
5. Update UI components
6. Write tests
