# Feature Spec: Company Creation Fix

## Overview

**Feature ID:** 054-company-creation-fix
**Type:** Bug Fix / Technical Debt
**Priority:** High
**Status:** Resolved

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

| File                                        | Function               | Line |
| ------------------------------------------- | ---------------------- | ---- |
| `src/app/companies/page.tsx`                | `handleAddCompany`     | ~437 |
| `src/hooks/useCompanies.ts`                 | `createPrivate`        | ~278 |
| `src/lib/companies/multi-tenant-service.ts` | `createPrivateCompany` | ~387 |

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

- [x] Add logging to `createPrivateCompany` to see exact Supabase response
- [x] Check RLS policies on `private_companies` table (not the issue)
- [x] Verify `PrivateCompanyCreate` type matches table schema (not the issue)
- [x] Test direct Supabase insert via admin client (not needed - test selector was the issue)
- [x] Check if `metro_area_id` is required and being set (not required)

## Acceptance Criteria

- [x] Companies created via `CompanyForm` persist to `private_companies` table
- [x] Created companies appear in unified companies list
- [x] E2E test `capture-blog-screenshots.spec.ts` shows created Library company
- [x] No silent failures - errors are logged and displayed to user (added debug logging to service layer)

## Impact

- **Users:** Cannot add new companies to track job applications
- **E2E Tests:** Cannot verify full company creation flow
- **Blog:** Screenshots show empty companies list instead of demo data

## Related Features

- Feature 011: Company Management
- Feature 012: Unified Company Model
- Feature 014: Job Applications

---

## Confirmed Root Cause

**The application code was working correctly.** The issue was in the E2E test:

### Actual Problem

The E2E test `capture-blog-screenshots.spec.ts` used the wrong selector for the company name input:

- **Test used:** `#name`
- **Actual ID:** `#company-name`

Because the company name field wasn't being filled, HTML5 form validation blocked submission (the input has `required` attribute). The form's `onSubmit` handler was never called.

### Evidence

Adding debug logging revealed:

1. `[DEBUG] Submit button onClick fired` - Button was clicked
2. `[DEBUG] CompanyForm handleSubmit called` - NOT appearing (form submission blocked)

After fixing the selector:

1. `✏️ Filled company name` - Name now filled
2. `[lib-companies-service] DEBUG: Private company created successfully` - Company created
3. `📋 Library rows found: 1` - Test passes

### Resolution

Fixed test selector from `#name` to `#company-name` in `tests/e2e/blog/capture-blog-screenshots.spec.ts`.

---

## Clarifications

### Session 2025-12-15

**Q1: Root Cause Investigation Approach**

- **Decision**: Add debug logging first using existing `createLogger` system to confirm actual root cause before fixing
- **Rationale**: The spec lists 5 possible root causes; investigation found (1) missing `follow_up_date` in page handler and (2) error swallowed in CompanyForm, but neither alone should cause insert failure

**Q2: Error Display Method**

- **Decision**: Use existing `alert-error` pattern (DaisyUI) consistent with rest of app
- **Rationale**: Already used in CompanyForm, page.tsx, and throughout app

**Q3: Logging Approach**

- **Decision**: Use existing `createLogger` from `@/lib/logger`
- **Pattern**: `const logger = createLogger('lib:companies:service');`
- **Levels**: Use `logger.debug()` for tracing, `logger.error()` for failures

**Q4: Error Handler Integration**

- **Decision**: Integrate with existing `errorHandler` from `@/utils/error-handler` for structured error tracking
- **Categories**: Use `ErrorCategory.BUSINESS_LOGIC` for company creation failures

---

_Created: 2024-12-14_
_Last Updated: 2025-12-15_
