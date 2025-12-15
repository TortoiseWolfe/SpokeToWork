# Implementation Plan: Company Creation Fix

**Branch**: `054-company-creation-fix` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `docs/specs/054-company-creation-fix/spec.md`

## Summary

Fix bug where companies created via `CompanyForm` don't persist to `private_companies` table. Root cause investigation found: (1) missing `follow_up_date` field in page handler, (2) error propagation gap in form component. Approach: Add debug logging using existing `createLogger` system to confirm root cause, then apply targeted fix.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 15
**Primary Dependencies**: Supabase JS client, @tanstack/react-query, DaisyUI
**Storage**: Supabase PostgreSQL with Row-Level Security
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (static export to GitHub Pages)
**Project Type**: Next.js App Router (single project)
**Performance Goals**: N/A (bug fix)
**Constraints**: Docker-first development, static hosting (no API routes)
**Scale/Scope**: Fix single component call chain

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Status | Notes                                |
| --------------------------------- | ------ | ------------------------------------ |
| Proper Solutions Over Quick Fixes | ✅     | Debug first to find root cause       |
| Root Cause Analysis               | ✅     | Add logging to trace exact failure   |
| Stability Over Speed              | ✅     | Thorough investigation before fix    |
| Clean Architecture                | ✅     | Using existing logger/error patterns |
| No Technical Debt                 | ✅     | Full fix, no workarounds             |
| Docker-First Development          | ✅     | All commands via docker compose      |

## Project Structure

### Documentation (this feature)

```text
docs/specs/054-company-creation-fix/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Investigation findings
└── tasks.md             # Implementation tasks
```

### Source Code (affected files)

```text
src/
├── app/companies/page.tsx           # handleAddCompany (line ~461)
├── components/organisms/
│   └── CompanyForm/CompanyForm.tsx  # handleSubmit (line ~307)
├── hooks/useCompanies.ts            # createPrivate (line ~278)
├── lib/companies/
│   └── multi-tenant-service.ts      # createPrivateCompany (line ~387)
└── lib/logger/logger.ts             # Existing logger (use as-is)

tests/
└── e2e/blog/
    └── capture-blog-screenshots.spec.ts  # Failing test (reproduction)
```

**Structure Decision**: Bug fix within existing Next.js structure. No new directories needed.

## Call Chain Analysis

```
CompanyForm.handleSubmit() [line 307]
  ├── Validates: name, address, hasCoordinates
  ├── Creates: baseData with follow_up_date ✓
  └── Calls: onSubmit(data)
      │
      ▼
page.tsx handleAddCompany() [line 437]
  ├── Creates: privateData from data
  ├── BUG: Omits follow_up_date ✗
  └── Calls: createPrivate(privateData)
      │
      ▼
useCompanies.createPrivate() [line 278]
  ├── Gets service via getService()
  ├── Calls: service.createPrivateCompany(data)
  └── Performs: Optimistic update to local state
      │
      ▼
MultiTenantCompanyService.createPrivateCompany() [line 387]
  ├── Sets: user_id from this.userId
  ├── Inserts: supabase.from('private_companies').insert()
  └── Returns: Created company or throws error
```

## Root Cause Hypotheses

| #   | Hypothesis               | Likelihood | Investigation                              |
| --- | ------------------------ | ---------- | ------------------------------------------ |
| 1   | Missing `follow_up_date` | Low        | Field is optional, shouldn't cause failure |
| 2   | Error swallowed in form  | Medium     | Form catches but doesn't re-throw          |
| 3   | RLS policy blocking      | High       | `auth.uid()` mismatch possible             |
| 4   | Auth session expired     | Medium     | Token may be stale                         |
| 5   | Service not initialized  | Low        | Would throw explicit error                 |

## Implementation Phases

### Phase 1: Add Debug Logging

Add structured logging to trace the exact failure point.

**File 1: `src/lib/companies/multi-tenant-service.ts`**

- Add `createLogger('lib:companies:service')` import
- Add logging before insert: userId, company name, fields
- Add logging on error: full Supabase error details
- Add logging on success: inserted ID

**File 2: `src/hooks/useCompanies.ts`**

- Add `createLogger('hooks:useCompanies')` import
- Add logging when `createPrivate` called
- Add logging when service obtained/not obtained
- Add logging on success/error

**File 3: `src/app/companies/page.tsx`**

- Add `createLogger('app:companies')` import
- Add logging in `handleAddCompany`: input data, privateData
- Log any transformation issues

### Phase 2: Run E2E Test to Capture Logs

```bash
docker compose exec spoketowork pnpm exec playwright test \
  tests/e2e/blog/capture-blog-screenshots.spec.ts \
  --project=chromium --headed
```

Review console output to identify actual failure.

### Phase 3: Apply Fix (Based on Findings)

**Known Fix: Add missing `follow_up_date`**

In `src/app/companies/page.tsx` line ~459:

```typescript
const privateData: PrivateCompanyCreate = {
  // ... existing fields ...
  priority: data.priority,
  follow_up_date: data.follow_up_date ?? undefined, // ADD THIS
};
```

**Conditional Fixes (based on Phase 2 findings):**

- If RLS issue: Verify auth session refresh before insert
- If service issue: Add explicit authentication check
- If type mismatch: Adjust data transformation

### Phase 4: Verify Fix

1. Re-run E2E test - company should appear in list
2. Check Supabase dashboard - row should exist in `private_companies`
3. Verify `user_companies_unified` view returns company

### Phase 5: Cleanup

- Reduce verbose debug logging to production-appropriate levels
- Keep error logging for ongoing monitoring
- Update spec with confirmed root cause

## Acceptance Criteria Mapping

| Criterion                  | Implementation                         |
| -------------------------- | -------------------------------------- |
| Companies persist to table | Fix insert call chain                  |
| Companies appear in list   | Verify via unified view                |
| E2E test passes            | Run capture-blog-screenshots.spec.ts   |
| No silent failures         | Add structured logging + error display |

## Risk Assessment

| Risk                                | Mitigation                                           |
| ----------------------------------- | ---------------------------------------------------- |
| Debug logging impacts performance   | Use logger.debug() which is suppressed in production |
| Fix breaks other company operations | Run full test suite before merge                     |
| RLS policy needs modification       | Verify auth flow, don't modify RLS                   |
