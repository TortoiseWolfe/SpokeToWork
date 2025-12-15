# Tasks: 054-company-creation-fix

**Branch**: `054-company-creation-fix`
**Generated**: 2025-12-15
**Status**: Completed

## Phase 1: Debug Logging (Investigation)

- [x] T001 [P1] Add logger import to multi-tenant-service.ts
  - File: `src/lib/companies/multi-tenant-service.ts`
  - Add: `import { createLogger } from '@/lib/logger';`
  - Add: `const logger = createLogger('lib:companies:service');`

- [x] T002 [P1] Add debug logging to createPrivateCompany
  - File: `src/lib/companies/multi-tenant-service.ts`
  - Location: Lines 387-424
  - Log before insert: userId, company name, field count
  - Log on error: full error details (code, message, hint)
  - Log on success: inserted company ID

- [x] T003 [P1] Add logger import to useCompanies.ts
  - File: `src/hooks/useCompanies.ts`
  - Add: `import { createLogger } from '@/lib/logger';`
  - Add: `const logger = createLogger('hooks:useCompanies');`

- [x] T004 [P1] Add debug logging to createPrivate hook
  - File: `src/hooks/useCompanies.ts`
  - Location: Lines 278-321
  - Log when called: input data summary
  - Log service state: obtained or null
  - Log result: success with ID or error

- [x] T005 [P1] Add logger import to companies page
  - File: `src/app/companies/page.tsx`
  - Add: `import { createLogger } from '@/lib/logger';`
  - Add: `const logger = createLogger('app:companies');`

- [x] T006 [P1] Add debug logging to handleAddCompany
  - File: `src/app/companies/page.tsx`
  - Location: Lines 437-468
  - Log input data from form
  - Log transformed privateData
  - Log any field differences

## Phase 2: Test & Diagnose

- [x] T007 [P1] Run E2E test with logging enabled
  - Command: `docker compose exec spoketowork pnpm exec playwright test tests/e2e/blog/capture-blog-screenshots.spec.ts --project=chromium`
  - **Result**: Console output revealed form's `handleSubmit` never called

- [x] T008 [P1] Document actual root cause
  - **Finding**: E2E test used wrong selector `#name` instead of `#company-name`
  - **Impact**: Company name field not filled → HTML5 validation blocked submission

## Phase 3: Apply Fix

- [x] T009 [P1] Add missing follow_up_date field (not the root cause but good fix)
  - File: `src/app/companies/page.tsx`
  - Location: Line ~459 in handleAddCompany
  - Add: `follow_up_date: data.follow_up_date ?? undefined,`

- [x] T010 [P1] [CONDITIONAL] Fix RLS/auth issue if identified
  - **Skipped**: Root cause was not RLS-related

- [x] T011 [P1] [CONDITIONAL] Fix service initialization if identified
  - **Skipped**: Root cause was not service-related

- [x] T009.1 [P1] Fix E2E test selector
  - File: `tests/e2e/blog/capture-blog-screenshots.spec.ts`
  - Change: `#name` → `#company-name`
  - **This was the actual fix**

## Phase 4: Verification

- [x] T012 [P1] Re-run E2E test to verify fix
  - **Result**: `📋 Library rows found: 1` ✅
  - **Result**: `✅ Created Chattanooga Public Library` ✅

- [x] T013 [P1] Verify database persistence
  - **Verified**: Company ID `f80d27f6-97a2-4850-82ea-920a0b77835e` created successfully

- [ ] T014 [P1] Run full test suite
  - Command: `docker compose exec spoketowork pnpm test`
  - Expected: All tests pass, no regressions

## Phase 5: Cleanup

- [x] T015 [P2] Reduce verbose debug logging
  - Removed: Temporary `console.error` statements from code
  - Kept: Structured `logger.debug()` calls for production monitoring

- [x] T016 [P2] Update spec with confirmed root cause
  - Updated: `spec.md` status from "Draft" to "Resolved"
  - Added: "Confirmed Root Cause" section to both spec.md and research.md

- [ ] T017 [P2] Commit changes
  - Message: "fix(e2e): correct company name selector in blog screenshot test"
  - Include: All modified files

## Task Dependencies

```
T001 → T002 → T007
T003 → T004 → T007
T005 → T006 → T007
T007 → T008 → T009/T010/T011
T009/T010/T011 → T012 → T013 → T014
T014 → T015 → T016 → T017
```

## Summary

| Phase           | Tasks       | Priority | Status      |
| --------------- | ----------- | -------- | ----------- |
| Debug Logging   | T001-T006   | P1       | ✅ Complete |
| Test & Diagnose | T007-T008   | P1       | ✅ Complete |
| Apply Fix       | T009-T011.1 | P1       | ✅ Complete |
| Verification    | T012-T013   | P1       | ✅ Complete |
| Full Test Suite | T014        | P1       | ⏳ Pending  |
| Cleanup         | T015-T016   | P2       | ✅ Complete |
| Commit          | T017        | P2       | ⏳ Pending  |

**Resolution**: E2E test selector bug (not application code)
**Actual Fix**: Changed `#name` → `#company-name` in test
