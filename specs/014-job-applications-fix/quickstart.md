# Quickstart: Job Applications and Data Quality Fix

**Feature**: 014-job-applications-fix
**Date**: 2025-12-07

## Overview

This feature fixes broken job applications functionality from the Feature 012 multi-tenant migration. After implementation, users will be able to:

- Create and track job applications for shared and private companies
- View contact information (name, title, phone, email) in company details
- See accurate company priorities (1-5) instead of all defaulting to 3

## Prerequisites

- Docker running (`docker compose up`)
- Supabase project accessible
- `SUPABASE_ACCESS_TOKEN` in `.env` for Management API

## Implementation Order

### 1. Database Schema (via Supabase Management API)

Execute schema changes in this order:

```bash
# 1. Add contact fields to company_locations
# 2. Fix job_applications foreign keys
# 3. Update RLS policies
```

See `data-model.md` for full SQL.

### 2. Data Migration

```bash
# Import contact info and priorities from backup
# Uses data/companies_backup.json
```

### 3. Service Layer

Update `src/lib/companies/application-service.ts`:

- Replace `companies` → `shared_companies`/`private_companies`
- Update all queries for new FK structure

### 4. Type Definitions

Update `src/types/company.ts`:

- Add `shared_company_id`, `private_company_id` to `JobApplication`
- Remove deprecated `company_id`

### 5. UI Wiring

Update `src/app/companies/page.tsx`:

- Wire `onAddApplication`, `onEditApplication`, `onDeleteApplication` handlers

Update `CompanyDetailDrawer`:

- Display contact_name, contact_title from company_locations

### 6. Testing

```bash
# Run tests
docker compose exec spoketowork pnpm test

# Verify manually
# - Create application for shared company
# - View contact info in drawer
# - Check priorities are varied (not all 3)
```

## Key Files

| File                                                         | Change               |
| ------------------------------------------------------------ | -------------------- |
| `supabase/migrations/20251006_complete_monolithic_setup.sql` | Schema fixes         |
| `src/lib/companies/application-service.ts`                   | Multi-tenant queries |
| `src/types/company.ts`                                       | Type updates         |
| `src/app/companies/page.tsx`                                 | Wire handlers        |
| `src/components/organisms/CompanyDetailDrawer/`              | Contact display      |

## Success Verification

After implementation, verify:

- [ ] Can create job application for shared company
- [ ] Can create job application for private company
- [ ] Contact info displays in company drawer
- [ ] Priorities show varied values (1-5)
- [ ] All tests pass
- [ ] No console errors related to `companies` table

## Rollback

If issues occur:

1. Schema changes are additive (columns added, not removed from live data)
2. Old `company_id` column dropped only after verification
3. Backup data preserved in `data/companies_backup.json`
