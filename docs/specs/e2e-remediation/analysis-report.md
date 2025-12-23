# E2E Test Failure Analysis Report

**Generated**: 2025-12-23
**Test Results Path**: test-results-ci/
**CI Run**: https://github.com/TortoiseWolfe/SpokeToWork/actions/runs/20468368455
**Head SHA**: a909a67
**Total Snapshots**: 492 page snapshots

## Executive Summary

| Category        | Status                      | Notes                                |
| --------------- | --------------------------- | ------------------------------------ |
| Authentication  | 363/492 (74%) authenticated | Auth working for majority of tests   |
| 404 Pages       | 42 snapshots                | Tests hitting non-existent pages     |
| Unauthenticated | 129 snapshots               | Tests running before auth or no auth |

**Previous Fix Applied**: Commit `870007c` addressed horizontal scroll and timeout issues but tests still failing.

## Severity Breakdown

| Severity | Count | Description                                    |
| -------- | ----- | ---------------------------------------------- |
| HIGH     | 42    | 404 errors - tests navigating to missing pages |
| MEDIUM   | 129   | Unauthenticated state - may be intentional     |
| LOW      | ~     | Various element visibility/timing issues       |

## Root Cause Analysis

### 404_PAGE_ERRORS (42 tests) - HIGH

**Pattern**: Tests navigating to pages that return 404

**Evidence from snapshots**:

- Page shows "404" heading
- "Page Not Found" message visible
- Tests may be targeting old routes or features not deployed

**Affected Areas**:

- `/docs/` route tests
- Component-specific pages
- Feature pages not in production build

**Fix Strategy**:

1. Verify which pages exist in production build
2. Update test URLs to match current route structure
3. Skip tests for features not yet deployed

---

### AUTH_STATE_VARIATION (129 tests) - MEDIUM

**Pattern**: 129 snapshots show unauthenticated state (Sign In/Sign Up visible)

**Context**:

- 363 snapshots (74%) show authenticated state with user "jonpohlner"
- This indicates auth is working correctly for most tests
- Unauthenticated tests may be:
  1. Intentionally testing public pages
  2. Running before auth setup completes
  3. Tests that don't require authentication

**Fix Strategy**:

1. Review which tests should require auth
2. Ensure auth setup runs before authenticated tests
3. No action needed for intentionally public page tests

---

### HORIZONTAL_SCROLL (Previous Issue)

**Status**: Fix applied in commit `870007c`

**Changes Made**:

- Added `overflow-x: hidden` to html/body in `globals.css`
- Added overflow constraints to GlobalNav container
- Updated navigation and homepage tests

**Verification Needed**: Check if horizontal scroll tests pass in this run.

---

### TIMEOUT (Previous Issue)

**Status**: Fix applied in commit `870007c`

**Changes Made**:

- Updated cross-page-navigation tests to use direct URL navigation
- Updated homepage tests to match current page structure
- Simplified theme persistence and external link tests

**Verification Needed**: Check if timeout tests pass in this run.

---

## Test File Health Summary

| Test Category   | Snapshots | Auth Rate | Health   |
| --------------- | --------- | --------- | -------- |
| Authenticated   | 363       | 100%      | GOOD     |
| Unauthenticated | 129       | 0%        | REVIEW   |
| 404 Pages       | 42        | N/A       | CRITICAL |

## Recommended Action Plan

### Immediate (CRITICAL)

1. **Fix 404 test routes** - Identify which tests target non-existent pages
   - Check `/docs/` route existence
   - Verify component demo pages exist
   - Update or skip tests for missing pages

### Short-term (HIGH)

2. **Review unauthenticated tests** - Determine which need auth
   - Separate public page tests from authenticated tests
   - Ensure auth setup completes before auth-required tests

### Medium-term (MEDIUM)

3. **Verify previous fixes** - Confirm horizontal scroll and timeout fixes work
   - Run local tests at 320px viewport
   - Check cross-page navigation timing

### Long-term (LOW)

4. **Test stability improvements**
   - Add retry logic for flaky network operations
   - Improve element wait strategies
   - Add test categorization (public vs authenticated)

---

## Files to Review

1. `tests/e2e/tests/mobile-horizontal-scroll.spec.ts` - Horizontal scroll tests
2. `tests/e2e/tests/cross-page-navigation.spec.ts` - Navigation timeout tests
3. `tests/e2e/tests/homepage.spec.ts` - Homepage element tests
4. `src/config/test-viewports.ts` - Viewport configurations

---

## Next Steps

Open HTML report to see detailed failures:

```bash
open test-results-ci/index.html
```

Or run E2E tests locally to verify fixes:

```bash
docker compose exec spoketowork pnpm exec playwright test --project=chromium
```
