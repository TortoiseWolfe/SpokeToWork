# Research: Company Creation Fix

**Feature**: 054-company-creation-fix
**Date**: 2025-12-15

## Investigation Summary

Investigation of the company creation bug traced the full call chain from `CompanyForm.handleSubmit()` through to `supabase.from('private_companies').insert()`.

## Findings

### 1. Missing Field in Page Handler

**Location**: `src/app/companies/page.tsx` lines 445-459

The `handleAddCompany` function creates a `privateData` object but **omits** `follow_up_date`:

```typescript
const privateData: PrivateCompanyCreate = {
  name: data.name ?? '',
  address: data.address,
  latitude: data.latitude,
  longitude: data.longitude,
  website: data.website ?? undefined,
  careers_url: data.careers_url ?? undefined,
  phone: data.phone ?? undefined,
  email: data.email ?? undefined,
  contact_name: data.contact_name ?? undefined,
  contact_title: data.contact_title ?? undefined,
  notes: data.notes ?? undefined,
  status: data.status,
  priority: data.priority,
  // ❌ follow_up_date is MISSING
};
```

However, the form **does include** `follow_up_date` in its `baseData` (line 346).

**Impact**: Field is optional in database, so this alone shouldn't cause insert failure.

### 2. Error Propagation Gap

**Location**: `src/components/organisms/CompanyForm/CompanyForm.tsx` lines 355-358

```typescript
} catch (error) {
  setSubmitError(
    error instanceof Error ? error.message : 'Failed to save company'
  );
  // ❌ Error is NOT re-thrown - parent handler never sees it
}
```

**Impact**: If `onSubmit` (parent's `handleAddCompany`) throws an error, the form:

- Catches and displays it in the form UI
- Does NOT propagate it to the parent component
- The form stays open (correct behavior on error)

However, E2E tests don't check for form error alerts, so failures appear silent.

### 3. Database Schema Analysis

**Location**: `supabase/migrations/20251006_complete_monolithic_setup.sql` lines 1893-1939

```sql
CREATE TABLE IF NOT EXISTS private_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metro_area_id UUID REFERENCES metro_areas(id),  -- NULLABLE
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),                            -- NULLABLE
  careers_url VARCHAR(500),                        -- NULLABLE
  address VARCHAR(500),                            -- NULLABLE
  latitude DECIMAL(10, 7),                         -- NULLABLE
  longitude DECIMAL(10, 7),                        -- NULLABLE
  ...
);
```

**Key Points**:

- Only `user_id` and `name` are required
- `metro_area_id` is auto-assigned by trigger if coordinates provided
- All other fields are optional

### 4. RLS Policies

```sql
CREATE POLICY "Users can create own private companies" ON private_companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Key Points**:

- INSERT requires `auth.uid()` to match `user_id` in the row
- If auth session is invalid, `auth.uid()` returns NULL
- NULL != user_id, so insert would be silently blocked

### 5. Service Layer Implementation

**Location**: `src/lib/companies/multi-tenant-service.ts` lines 387-424

```typescript
async createPrivateCompany(data: PrivateCompanyCreate): Promise<PrivateCompany> {
  this.ensureInitialized();

  const company = {
    user_id: this.userId!,  // Set from initialized user
    name: data.name.trim(),
    // ... all fields properly mapped
  };

  const { data: inserted, error } = await this.supabase
    .from('private_companies')
    .insert(company)
    .select()
    .single();

  if (error) {
    throw error;  // ✅ Error is thrown
  }

  return inserted as PrivateCompany;
}
```

**Key Points**:

- `user_id` is correctly set from `this.userId`
- Error from Supabase is thrown (not swallowed)
- `ensureInitialized()` checks service is ready

### 6. Existing Logging System

**Location**: `src/lib/logger/logger.ts`

The app has a structured logging system:

- `createLogger(category)` factory function
- Log levels: debug, info, warn, error
- Environment-aware: debug/info suppressed in production
- PII redaction for sensitive data

**Usage Pattern**:

```typescript
import { createLogger } from '@/lib/logger';
const logger = createLogger('lib:companies:service');
logger.debug('Creating company', { name, userId });
```

## Root Cause Hypothesis

Based on investigation, the most likely root cause is one of:

1. **RLS Policy Blocking** (HIGH likelihood)
   - Auth session may be stale when insert executes
   - `auth.uid()` returns NULL or mismatched value

2. **Error Swallowed in Form** (MEDIUM likelihood)
   - Error thrown by parent handler
   - Form catches and displays but doesn't propagate
   - E2E test doesn't detect the error alert

3. **Service Not Initialized** (LOW likelihood)
   - Would throw explicit "Not authenticated" error
   - Should be visible in console

## Recommended Investigation Steps

1. Add debug logging to trace exact failure point
2. Log user ID at each step of call chain
3. Log full Supabase error response
4. Check browser console during E2E test execution

## Decision Record

| Decision            | Rationale                              | Alternatives Considered                 |
| ------------------- | -------------------------------------- | --------------------------------------- |
| Debug logging first | Confirms root cause before fix         | Direct fix (risky without confirmation) |
| Use existing logger | Consistent with codebase patterns      | console.log (inconsistent)              |
| Keep error handling | Form error display is correct behavior | Re-throw (would require UI changes)     |

---

## Confirmed Root Cause (2025-12-15)

**None of the hypotheses above were correct.** The actual root cause was in the E2E test itself:

### The Problem

The E2E test `capture-blog-screenshots.spec.ts` used the wrong selector for the company name input:

- **Test selector**: `#name`
- **Actual form input ID**: `#company-name`

### Why This Caused the Bug

1. Test clicked "Add Company" button, form appeared
2. Test tried to fill `#name` - selector didn't match, field remained empty
3. Test filled address, clicked Geocode (worked)
4. Test clicked Submit button (click event fired)
5. **HTML5 form validation blocked submission** because `#company-name` input has `required` attribute and was empty
6. Form's `onSubmit` handler was never called
7. No company was created

### Debug Evidence

Adding `console.error('[DEBUG]...')` statements revealed:

- `[DEBUG] Submit button onClick fired` - Button received click
- `[DEBUG] CompanyForm handleSubmit called` - **NOT logged** (form submission blocked)

After fixing selector:

- `✏️ Filled company name` - Name now filled
- `[lib-companies-service] DEBUG: Private company created successfully`
- `📋 Library rows found: 1`

### The Fix

Changed selector from `#name` to `#company-name` in `tests/e2e/blog/capture-blog-screenshots.spec.ts`:

```typescript
// Before (wrong)
const nameInput = page.locator('#name');

// After (correct)
const nameInput = page.locator('#company-name');
```

### Lessons Learned

1. **Application code was correct** - The bug wasn't in the company creation code
2. **E2E tests need careful selector maintenance** - When form field IDs change, tests must be updated
3. **HTML5 validation can silently block submission** - No error is thrown, form just doesn't submit
4. **Debug logging is valuable** - Adding strategic logging quickly revealed where the call chain broke
