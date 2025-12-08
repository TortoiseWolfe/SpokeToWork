# Implementation Plan: Job Applications and Data Quality Fix

**Branch**: `014-job-applications-fix` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-job-applications-fix/spec.md`

## Summary

Fix the broken job applications feature from Feature 012 multi-tenant migration by:

1. Updating `job_applications` table to reference `shared_companies`/`private_companies` instead of deleted `companies` table
2. Adding missing `contact_name` and `contact_title` columns to `company_locations`
3. Updating `application-service.ts` for multi-tenant architecture
4. Wiring up application handlers in the companies page UI
5. Importing contact info and priorities from backup data

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15, React 19
**Primary Dependencies**: Supabase (Auth, Database), TanStack Query, DaisyUI
**Storage**: Supabase PostgreSQL (cloud) with multi-tenant schema
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (PWA), static export to GitHub Pages
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: 3 seconds per CRUD operation (from spec SC-001)
**Constraints**: Docker-first development, static hosting (no server-side API routes)
**Scale/Scope**: 83 shared companies, 415 user tracking records, 5 users

## Constitution Check

_GATE: Based on CLAUDE.md Core Development Principles_

| Principle                            | Status  | Notes                                               |
| ------------------------------------ | ------- | --------------------------------------------------- |
| 1. Proper Solutions Over Quick Fixes | ✅ PASS | Full schema migration, not workarounds              |
| 2. Root Cause Analysis               | ✅ PASS | Fixing broken FK, missing columns, unwired handlers |
| 3. Stability Over Speed              | ✅ PASS | Comprehensive fix with tests                        |
| 4. Clean Architecture                | ✅ PASS | Following existing multi-tenant patterns            |
| 5. No Technical Debt                 | ✅ PASS | Removing deprecated code, not adding TODOs          |

**Additional Constraints:**

- Docker-first: All commands via `docker compose exec`
- Monolithic migration: Edit `supabase/migrations/20251006_complete_monolithic_setup.sql`
- Static hosting: No server-side API routes

## Project Structure

### Documentation (this feature)

```text
specs/014-job-applications-fix/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── companies/
│       └── page.tsx                    # Wire up application handlers
├── components/
│   └── organisms/
│       └── CompanyDetailDrawer/
│           └── CompanyDetailDrawer.tsx # Display contact info
├── lib/
│   └── companies/
│       ├── application-service.ts      # Update for multi-tenant
│       ├── multi-tenant-service.ts     # May need updates
│       └── index.ts                    # Update exports

supabase/
└── migrations/
    └── 20251006_complete_monolithic_setup.sql  # Schema changes

data/
└── companies_backup.json               # Source for contact/priority data
```

**Structure Decision**: Existing Next.js App Router structure. Changes touch:

- Database schema (monolithic migration)
- Service layer (application-service.ts)
- UI layer (companies page, detail drawer)

## Complexity Tracking

> No constitution violations requiring justification.

## Implementation Phases

> **Note**: See [data-model.md](./data-model.md) for complete migration SQL and type definitions. SQL snippets below are summaries for planning purposes.

### Phase 1: Database Schema Fixes

**1.1 Add contact fields to company_locations**

```sql
ALTER TABLE company_locations
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_title TEXT;
```

**1.2 Fix job_applications foreign keys**

```sql
-- Drop old FK to deleted companies table
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_company_id_fkey;
ALTER TABLE job_applications
  DROP COLUMN IF EXISTS company_id;

-- Add new FKs for multi-tenant
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS shared_company_id UUID REFERENCES shared_companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS private_company_id UUID REFERENCES private_companies(id) ON DELETE CASCADE;

-- Exactly one must be set
ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_company_ref_check
  CHECK (
    (shared_company_id IS NOT NULL AND private_company_id IS NULL) OR
    (shared_company_id IS NULL AND private_company_id IS NOT NULL)
  );
```

**1.3 Update RLS policies for job_applications**

- Users can only see/modify their own applications
- Applications are isolated per user

### Phase 2: Data Migration

**2.1 Import contact info from backup**

- Parse `data/companies_backup.json`
- Match by company name to `shared_companies`
- Update `company_locations` with contact_name, contact_title

**2.2 Fix priorities in user_company_tracking**

- Parse backup file priorities
- Update tracking records to match original priorities (1-5, not all 3)

### Phase 3: Service Layer Updates

**3.1 Update application-service.ts**

- Replace `companies` table references with `shared_companies`/`private_companies`
- Update create/read/update/delete queries for new FKs
- Handle both company types (shared vs private)

**3.2 Update types/company.ts**

- Add `shared_company_id` and `private_company_id` to JobApplication type
- Remove `company_id` reference

### Phase 4: UI Wiring

**4.1 Wire application handlers in companies page**

- `onAddApplication`: Create application via service
- `onEditApplication`: Update application via service
- `onDeleteApplication`: Delete application via service

**4.2 Display contact info in CompanyDetailDrawer**

- Fetch contact_name, contact_title, phone, email from company_locations
- Display only available fields (no empty labels)

### Phase 5: Cleanup & Testing

**5.1 Remove deprecated references**

- Remove any remaining `companies` table references
- Clean up old company-service.ts if deprecated

**5.2 Update/add tests**

- Unit tests for application-service multi-tenant
- E2E test for job application flow
- Verify seed data integrity

## Risk Mitigation

| Risk                       | Mitigation                                               |
| -------------------------- | -------------------------------------------------------- |
| Data loss during migration | Backup data exists in `companies_backup.json`            |
| Breaking existing features | RLS policies ensure isolation; comprehensive tests       |
| FK constraint violations   | Migration order: add columns → drop old FK → add new FKs |
