# Job Applications and Data Quality Fix PRP

**Feature:** 014-job-applications-fix
**Priority:** Critical
**Estimated Scope:** Large (database schema, services, UI wiring)

---

## Problem Statement

The Feature 012 multi-tenant migration left several critical issues:

1. **Job Applications Broken**: The `job_applications` table references the now-deleted `companies` table. The feature was built but never wired up to the UI.

2. **Contact Information Missing**: The multi-tenant schema split contact info across tables but the UI doesn't display it properly. Users can't see the contact details they worked to collect.

3. **Seed Data Quality**: All seeded companies defaulted to priority 3 instead of using the actual priorities from the backup data.

4. **Deprecated Code Remains**: Old `company-service.ts` and migration code for deleted `companies` table still exist.

---

## Goals

1. Fix `job_applications` to work with multi-tenant architecture (`shared_companies`/`private_companies`)
2. Ensure contact information (phone, email, contact_name, contact_title) displays correctly in UI
3. Fix seed data to use proper priorities from backup
4. Wire up job application handlers in the companies page
5. Remove all deprecated code and migration statements
6. Ensure multiple users can have multiple applications at the same company

---

## Non-Goals

- New features beyond fixing what's broken
- UI redesign
- Performance optimization

---

## Current State Analysis

### Database Schema

**shared_companies** (83 rows):

- id, metro_area_id, name, website, careers_url, is_verified, created_at, updated_at, is_seed
- Missing: contact_name, contact_title (these are location-specific)

**company_locations** (83 rows):

- id, shared_company_id, address, latitude, longitude, phone, email, is_headquarters, created_at
- Has phone, email but NOT contact_name, contact_title

**user_company_tracking** (415 rows):

- Links users to shared_companies with user-specific data
- Has: status, priority, notes, follow_up_date
- Missing: contact_name, contact_title per-user overrides

**private_companies** (0 rows):

- User-created companies not in shared registry

**job_applications** (0 rows):

- Has company_id FK to deleted companies table
- Needs: shared_company_id OR private_company_id

### Missing Data

From backup file `data/companies_backup.json`:

- contact_name: 92% coverage (76/83)
- contact_title: varies
- priority: varied 1-5 (currently all 3)

---

## Implementation Plan

### Phase 1: Database Schema Fixes

#### T001: Add contact fields to company_locations

```sql
ALTER TABLE company_locations
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_title TEXT;
```

#### T002: Fix job_applications foreign keys

```sql
-- Drop old FK
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_company_id_fkey;
ALTER TABLE job_applications
  DROP COLUMN IF EXISTS company_id;

-- Add new FKs
ALTER TABLE job_applications
  ADD COLUMN shared_company_id UUID REFERENCES shared_companies(id) ON DELETE CASCADE,
  ADD COLUMN private_company_id UUID REFERENCES private_companies(id) ON DELETE CASCADE;

-- Exactly one must be set
ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_company_ref_check
  CHECK (
    (shared_company_id IS NOT NULL AND private_company_id IS NULL) OR
    (shared_company_id IS NULL AND private_company_id IS NOT NULL)
  );
```

#### T003: Update RLS policies for job_applications

### Phase 2: Data Migration

#### T004: Import contact info from backup

- Parse `data/companies_backup.json`
- Match by company name
- Update `company_locations` with contact_name, contact_title

#### T005: Fix priorities in user_company_tracking

- Parse backup file priorities
- Update tracking records to match

### Phase 3: Service Updates

#### T006: Update application-service.ts for multi-tenant

- Replace `companies` table references with `shared_companies`/`private_companies`
- Handle both company types
- Update all queries

#### T007: Remove deprecated company-service.ts

- Delete old service
- Update exports in index.ts
- Fix any imports

### Phase 4: Migration File Cleanup

#### T008: Remove old companies table from migration

- Comment out or remove CREATE TABLE companies
- Remove related indexes, RLS policies, triggers
- Keep only multi-tenant tables

### Phase 5: UI Wiring

#### T009: Wire up application handlers in companies page

- Add onAddApplication handler
- Add onEditApplication handler
- Add onDeleteApplication handler
- Connect to application-service

#### T010: Ensure contact info displays in CompanyDetailDrawer

- Fetch from company_locations
- Display contact_name, contact_title, phone, email

### Phase 6: Testing

#### T011: Update/add tests for multi-tenant applications

#### T012: E2E test for job application flow

#### T013: Verify seed data integrity

---

## Success Criteria

- [ ] Job applications can be created for shared_companies
- [ ] Job applications can be created for private_companies
- [ ] Multiple users can have applications at same company
- [ ] Contact info displays in company detail drawer
- [ ] Priorities match backup data (not all 3)
- [ ] No references to deleted `companies` table
- [ ] All tests pass
- [ ] No deprecated code remains

---

## Risks

1. **Data loss**: Backup before any schema changes
2. **Breaking changes**: Other features may depend on old schema
3. **RLS complexity**: Multi-tenant permissions need careful testing

---

## Files to Modify

### Database

- `supabase/migrations/20251006_complete_monolithic_setup.sql`

### Services

- `src/lib/companies/application-service.ts` (update)
- `src/lib/companies/company-service.ts` (delete)
- `src/lib/companies/index.ts` (update exports)
- `src/lib/companies/multi-tenant-service.ts` (may need updates)

### UI

- `src/app/companies/page.tsx` (wire handlers)
- `src/components/organisms/CompanyDetailDrawer/CompanyDetailDrawer.tsx` (verify contact display)

### Tests

- Various test files referencing old schema

---

## Out of Scope (Future PRPs)

- Advanced application tracking features
- Resume/cover letter attachments
- Interview scheduling integration
