# Research: Job Applications and Data Quality Fix

**Feature**: 014-job-applications-fix
**Date**: 2025-12-07

## Research Summary

This feature is a **fix** to existing functionality broken by Feature 012 multi-tenant migration. Research focused on understanding the current broken state and migration path.

---

## Decision 1: Job Applications Table Structure

**Decision**: Use dual optional foreign keys (`shared_company_id`, `private_company_id`) with CHECK constraint

**Rationale**:

- Matches the multi-tenant pattern established in Feature 012
- Allows applications to either shared OR private companies
- CHECK constraint ensures data integrity (exactly one FK set)
- Follows same pattern as `user_company_tracking` which links to `shared_companies`

**Alternatives Considered**:

- Single polymorphic `company_id` with `company_type` column - Rejected: No FK integrity
- Separate tables for shared/private applications - Rejected: Duplicates code/queries

---

## Decision 2: Contact Information Storage

**Decision**: Add `contact_name` and `contact_title` columns to `company_locations` table

**Rationale**:

- Contact info is location-specific (different contacts per office)
- `company_locations` already has `phone` and `email`
- Keeps related data together
- 76/83 companies have contact_name in backup data

**Alternatives Considered**:

- Add to `shared_companies` table - Rejected: Contact info is location-specific
- Create separate `contacts` table - Rejected: Over-engineering for simple use case
- Store in `user_company_tracking` - Rejected: Contact info is shared, not user-specific

---

## Decision 3: Priority Data Fix Approach

**Decision**: One-time data migration script using Supabase Management API

**Rationale**:

- Priorities already exist in `user_company_tracking` (just wrong values)
- Backup file `data/companies_backup.json` has correct priorities
- Match by company name to find corresponding tracking records
- Execute via Supabase Management API (per CLAUDE.md constraints)

**Alternatives Considered**:

- Manual SQL in Supabase dashboard - Rejected: CLAUDE.md says don't tell user to do manual SQL
- Re-run seeding - Rejected: Would lose any user customizations

---

## Decision 4: Service Layer Updates

**Decision**: Update existing `application-service.ts` rather than creating new service

**Rationale**:

- Service already has CRUD structure for applications
- Only FK references need updating (companies → shared_companies/private_companies)
- Maintains existing patterns and test structure
- Less code churn than new service

**Alternatives Considered**:

- Create new multi-tenant-application-service.ts - Rejected: Unnecessary duplication
- Merge into multi-tenant-service.ts - Rejected: Violates single responsibility

---

## Decision 5: UI Wiring Approach

**Decision**: Wire handlers in existing companies page, pass to existing components

**Rationale**:

- CompanyDetailDrawer already has props for application handlers (just not connected)
- Follows existing pattern from other handlers (onUpdate, onDelete)
- Minimal UI changes needed

**Alternatives Considered**:

- Create separate applications page - Rejected: Applications are child of companies
- Use global state/context - Rejected: Over-engineering for this use case

---

## Technical Findings

### Current Database State (verified via queries)

| Table                   | Rows | Status                                    |
| ----------------------- | ---- | ----------------------------------------- |
| `shared_companies`      | 83   | ✅ Working                                |
| `company_locations`     | 83   | ⚠️ Missing contact_name, contact_title    |
| `user_company_tracking` | 415  | ⚠️ All priorities = 3 (should vary 1-5)   |
| `private_companies`     | 0    | ✅ Working (empty is expected)            |
| `job_applications`      | 0    | ❌ Broken FK to deleted `companies` table |
| `companies` (old)       | -    | ❌ DELETED                                |

### Backup Data Coverage

From `data/companies_backup.json`:

- `contact_name`: 76/83 companies (92%)
- `contact_title`: varies
- `priority`: 1-5 (varied, not uniform)
- `careers_url`: 48/83 companies (58%)

### Existing Service Analysis

`application-service.ts` has 14 references to `companies` table:

- Line 88-94: Company validation query
- Line 329: Get company by ID
- Line 364-369: Get all companies for list view
- Various filter/join operations

All need updating to use `shared_companies`/`private_companies`.
