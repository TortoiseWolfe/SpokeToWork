# Feature Spec: Company Creation Fix

## Overview

**Feature ID:** 054-company-creation-fix
**Type:** Bug Fix / Technical Debt
**Priority:** High
**Status:** Draft

## Problem Statement

When creating a company via the `CompanyForm` component, the form submits successfully but the company is not persisted to the `private_companies` table. Users cannot add new companies to track their job search.

## Observed Behavior

1. Fill out `CompanyForm` with valid data (name, address, geocoded coordinates)
2. Click "Add Company" button (enabled, form validates)
3. Form submits without visible error
4. Navigate to companies list
5. **No company appears** - list shows 0 companies

## Expected Behavior

Company should be saved to `private_companies` table and appear in the unified companies list via `user_companies_unified` view.

## Technical Analysis

### Call Chain

```
CompanyForm.handleSubmit()
  → parent.handleAddCompany(data)
    → useCompanies.createPrivate(privateData)
      → CompanyService.createPrivateCompany(data)
        → supabase.from('private_companies').insert()
```

### Relevant Files

| File                                   | Function               | Line |
| -------------------------------------- | ---------------------- | ---- |
| `src/app/companies/page.tsx`           | `handleAddCompany`     | ~461 |
| `src/hooks/useCompanies.ts`            | `createPrivate`        | ~278 |
| `src/lib/companies/company-service.ts` | `createPrivateCompany` | TBD  |

### Database Schema

```sql
-- private_companies table (Feature 012)
CREATE TABLE IF NOT EXISTS private_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metro_area_id UUID REFERENCES metro_areas(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  ...
);

-- RLS Policy
CREATE POLICY "Users can manage own private companies" ON private_companies
  FOR ALL USING (auth.uid() = user_id);
```

## Possible Root Causes

1. **RLS Policy Issue** - Insert blocked by Row-Level Security
2. **Missing Required Field** - `PrivateCompanyCreate` type missing field that DB requires
3. **Silent Error** - Service method catching and swallowing error
4. **Session Issue** - User auth token not valid during insert
5. **Metro Area** - Missing or invalid `metro_area_id` reference

## Reproduction Steps

```bash
# Run blog screenshot E2E test
docker compose exec spoketowork pnpm exec playwright test \
  tests/e2e/blog/capture-blog-screenshots.spec.ts \
  --project=chromium

# Observe output:
# 🔄 Submitted company form, waiting for save...
# 📋 Library rows found: 0
# ⚠️ Library not found, but 0 total companies exist
```

## Investigation Tasks

- [ ] Add logging to `createPrivateCompany` to see exact Supabase response
- [ ] Check RLS policies on `private_companies` table
- [ ] Verify `PrivateCompanyCreate` type matches table schema
- [ ] Test direct Supabase insert via admin client
- [ ] Check if `metro_area_id` is required and being set

## Acceptance Criteria

- [ ] Companies created via `CompanyForm` persist to `private_companies` table
- [ ] Created companies appear in unified companies list
- [ ] E2E test `capture-blog-screenshots.spec.ts` shows created Library company
- [ ] No silent failures - errors are logged and displayed to user

## Impact

- **Users:** Cannot add new companies to track job applications
- **E2E Tests:** Cannot verify full company creation flow
- **Blog:** Screenshots show empty companies list instead of demo data

## Related Features

- Feature 011: Company Management
- Feature 012: Unified Company Model
- Feature 014: Job Applications

---

_Created: 2024-12-14_
_Last Updated: 2024-12-14_
