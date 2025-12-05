# Quickstart: Company Management Implementation

**Branch**: `011-company-management` | **Date**: 2025-12-04

## Prerequisites

- Docker environment running (`docker compose up`)
- Supabase project configured with `SUPABASE_ACCESS_TOKEN`
- Current branch: `011-company-management`

## Implementation Order

### Phase 1: Database Schema

1. **Add companies table to monolithic migration**

   ```bash
   # Edit the migration file
   docker compose exec spoketowork cat supabase/migrations/20251006_complete_monolithic_setup.sql
   # Add PART 11 from data-model.md before COMMIT;
   ```

2. **Execute schema via Supabase Management API**
   ```bash
   # Use the access token from .env
   source .env
   curl -X POST "https://api.supabase.com/v1/projects/${NEXT_PUBLIC_SUPABASE_PROJECT_REF}/database/query" \
     -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"query": "<SQL from data-model.md>"}'
   ```

### Phase 2: Type Definitions

1. **Create company types**

   ```bash
   docker compose exec spoketowork touch src/types/company.ts
   # Copy TypeScript types from data-model.md
   ```

2. **Update Supabase types**
   ```bash
   # Regenerate if using Supabase CLI locally
   # Or manually add Company type to src/lib/supabase/types.ts
   ```

### Phase 3: Service Layer

1. **Create geocoding service**

   ```bash
   docker compose exec spoketowork mkdir -p src/lib/companies
   docker compose exec spoketowork touch src/lib/companies/geocoding.ts
   # Implement per contracts/geocoding.md
   ```

2. **Create offline sync service**

   ```bash
   docker compose exec spoketowork touch src/lib/companies/offline-sync.ts
   # Implement per contracts/offline-sync.md
   ```

3. **Create company service**
   ```bash
   docker compose exec spoketowork touch src/lib/companies/company-service.ts
   # Implement per contracts/company-service.md
   ```

### Phase 4: Components (Use Generator)

```bash
# Generate each component with 5-file structure
docker compose exec spoketowork pnpm run generate:component

# Components to generate:
# 1. CompanyTable - organisms
# 2. CompanyForm - organisms
# 3. CompanyFilters - molecular
# 4. CompanyRow - molecular
# 5. CompanyImport - organisms
# 6. CompanyExport - molecular
# 7. ConflictResolver - organisms
```

### Phase 5: Page Integration

1. **Create companies page**

   ```bash
   docker compose exec spoketowork mkdir -p src/app/companies
   docker compose exec spoketowork touch src/app/companies/page.tsx
   ```

2. **Add to navigation**
   - Update sidebar/nav component with companies link
   - Ensure protected route (requires auth)

### Phase 6: Testing

```bash
# Run unit tests
docker compose exec spoketowork pnpm test

# Run specific company tests
docker compose exec spoketowork pnpm test companies

# Run E2E tests
docker compose exec spoketowork pnpm exec playwright test tests/e2e/companies
```

## Key Files to Create

```
src/
├── types/
│   └── company.ts                    # Type definitions
├── lib/
│   └── companies/
│       ├── index.ts                  # Barrel export
│       ├── geocoding.ts              # Nominatim integration
│       ├── geocoding.test.ts         # Geocoding tests
│       ├── offline-sync.ts           # IndexedDB sync
│       ├── offline-sync.test.ts      # Sync tests
│       ├── company-service.ts        # Main service
│       └── company-service.test.ts   # Service tests
├── components/
│   ├── organisms/
│   │   ├── CompanyTable/            # 5-file pattern
│   │   ├── CompanyForm/             # 5-file pattern
│   │   ├── CompanyImport/           # 5-file pattern
│   │   └── ConflictResolver/        # 5-file pattern
│   └── molecular/
│       ├── CompanyRow/              # 5-file pattern
│       ├── CompanyFilters/          # 5-file pattern
│       └── CompanyExport/           # 5-file pattern
└── app/
    └── companies/
        ├── page.tsx                  # Main page
        └── layout.tsx                # Optional layout
```

## Environment Variables

No new environment variables required. Nominatim is free and keyless.

## OSM Attribution

Add to Footer component:

```tsx
<a
  href="https://www.openstreetmap.org/copyright"
  target="_blank"
  rel="noopener noreferrer"
  className="link-hover link text-xs"
>
  Geocoding by OpenStreetMap
</a>
```

## Testing Checklist

- [ ] Company CRUD operations work online
- [ ] Company data persists in IndexedDB
- [ ] Offline edits queue correctly
- [ ] Sync conflicts detected and resolvable
- [ ] Geocoding works with rate limiting
- [ ] CSV import handles errors gracefully
- [ ] Export produces valid, re-importable files
- [ ] Distance validation shows extended range warning
- [ ] All components pass accessibility tests
- [ ] Storybook stories render correctly

## Common Issues

### Geocoding Rate Limit

If geocoding fails with 429, ensure rate limiter is working:

```typescript
// Check queue is processing at 1 req/sec
console.log('Queue length:', geocodingService.getQueueLength());
```

### IndexedDB Permissions

If IndexedDB fails in tests, mock it:

```typescript
import 'fake-indexeddb/auto';
```

### Supabase RLS Errors

Ensure auth context is available:

```typescript
const { user } = useAuth();
if (!user) return <Redirect to="/sign-in" />;
```
