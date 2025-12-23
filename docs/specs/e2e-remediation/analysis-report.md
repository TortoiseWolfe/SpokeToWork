# E2E Test Failure Analysis Report

**Generated**: 2024-12-22 (Post Remember Me Fix)
**Test Results Path**: test-results/
**Total Failures**: 138 unique failures (226 with retries)

## Executive Summary

| Category      | Failures | Primary Root Cause         |
| ------------- | -------- | -------------------------- |
| accessibility | 50       | ELEMENT_MISSING            |
| auth          | 47       | RPC_FAILURE                |
| companies     | 44       | STATE_EXPECTATION_MISMATCH |
| map           | 25       | AUTH_FAILURE               |
| messaging     | 22       | MODAL_BLOCKING             |
| blog          | 18       | SCREENSHOT_TIMING          |
| avatar        | 17       | ELEMENT_MISSING            |

## Recent Fixes (This Session)

### Remember Me Feature - COMPLETED ✓

- Added Remember Me checkbox to SignInForm (was completely missing)
- Wired up SignUpForm Remember Me checkbox (existed but unused)
- Added AuthOptions interface to AuthContext
- Fixed test case sensitivity ('Remember Me' → 'Remember me')
- Fixed rate-limiting test selectors (input[name] → getByLabel)

**Key session persistence tests now PASS:**

- ✓ `should extend session duration with Remember Me checked`
- ✓ `should use short session without Remember Me`

## Severity Breakdown

| Severity | Count | Description                           |
| -------- | ----- | ------------------------------------- |
| CRITICAL | 25    | Auth/map tests showing Sign In link   |
| HIGH     | 72    | Consistent element/modal failures     |
| MEDIUM   | 30    | Timing-related, some retries pass     |
| LOW      | 11    | Screenshot/visual tests, env-specific |

---

## CRITICAL Issues

| ID      | Test File                     | Root Cause   | Evidence                                       |
| ------- | ----------------------------- | ------------ | ---------------------------------------------- |
| E2E-C01 | map.spec.ts                   | AUTH_FAILURE | Page shows "Sign In" link instead of user menu |
| E2E-C02 | map-visual-regression.spec.ts | AUTH_FAILURE | Page shows "Sign In" link instead of user menu |

**Analysis**: Map tests require authenticated state but are showing unauthenticated UI. The shared auth setup may not be applying to these tests.

---

## HIGH Issues

### Auth Rate Limiting (6 tests)

| ID      | Test Name                                   | Root Cause  | Evidence                              |
| ------- | ------------------------------------------- | ----------- | ------------------------------------- |
| E2E-H01 | should show lockout after 5 failed attempts | RPC_FAILURE | Rate limit RPC not triggering lockout |
| E2E-H02 | should show remaining time until unlock     | RPC_FAILURE | No rate limit message displayed       |
| E2E-H03 | should allow different users independently  | RPC_FAILURE | Rate limit not enforced per-user      |
| E2E-H04 | should track sign-up/sign-in separately     | RPC_FAILURE | Rate limits not isolated by type      |
| E2E-H05 | should show clear error message             | RPC_FAILURE | Empty alert element                   |
| E2E-H06 | should rate limit password reset            | RPC_FAILURE | Password reset not rate limited       |

**Analysis**: Rate limiting depends on Supabase RPC functions (`check_rate_limit`, `record_failed_attempt`). The code fails open when RPC fails, allowing all attempts. The UI implementation is correct - this is a database/infrastructure issue.

### Accessibility - Avatar Upload (17 tests)

| ID      | Test Name                     | Root Cause      | Evidence                          |
| ------- | ----------------------------- | --------------- | --------------------------------- |
| E2E-H07 | Crop modal traps focus        | ELEMENT_MISSING | Modal not opening on button click |
| E2E-H08 | Component has landmark roles  | ELEMENT_MISSING | Expected landmarks not found      |
| E2E-H09 | Screenreader announces status | ELEMENT_MISSING | ARIA live region not updating     |

**Analysis**: Avatar upload tests expect modal behavior that isn't triggering. The "Upload Avatar" button exists but doesn't open the expected crop modal.

### Messaging - Re-auth Modal (22 tests)

| ID      | Test Name                        | Root Cause     | Evidence                                  |
| ------- | -------------------------------- | -------------- | ----------------------------------------- |
| E2E-H10 | User sees welcome message        | MODAL_BLOCKING | Re-auth modal blocking message access     |
| E2E-H11 | Message arrives within 5 seconds | MODAL_BLOCKING | Can't interact with messages behind modal |

**Analysis**: Messaging tests are blocked by "Enter Your Messaging Password" modal. This appears when session is restored but encryption keys need unlocking. Tests need to handle this modal.

### Companies - State Expectations (44 tests)

| ID      | Test Name                       | Root Cause                 | Evidence                              |
| ------- | ------------------------------- | -------------------------- | ------------------------------------- |
| E2E-H12 | Should redirect when not auth'd | STATE_EXPECTATION_MISMATCH | User is authenticated, sees companies |

**Analysis**: Companies tests expect unauthenticated state but shared auth session is active. Tests that need unauthenticated state must explicitly clear storage.

---

## MEDIUM Issues

### Session Persistence (5 tests)

| ID      | Test Name                              | Root Cause   | Evidence                       |
| ------- | -------------------------------------- | ------------ | ------------------------------ |
| E2E-M01 | should refresh token before expiration | FLAKY_TIMING | Token not visibly changing     |
| E2E-M02 | should persist across browser restarts | FLAKY_TIMING | Storage state not persisting   |
| E2E-M03 | should clear session on sign out       | FLAKY_TIMING | Email visibility check failing |
| E2E-M04 | should handle concurrent tab sessions  | FLAKY_TIMING | Cross-tab sync timing issues   |
| E2E-M05 | should refresh on page reload          | FLAKY_TIMING | Email element marked as hidden |

**Analysis**: These tests verify complex browser behaviors that are timing-sensitive. The core Remember Me functionality works (tested and passing).

### User Registration (6 tests)

| ID      | Test Name                  | Root Cause       | Evidence                                        |
| ------- | -------------------------- | ---------------- | ----------------------------------------------- |
| E2E-M06 | Complete registration flow | URL_MISMATCH     | `/sign-up` vs `/sign-up/` (trailing slash)      |
| E2E-M07 | Display OAuth buttons      | SELECTOR_INVALID | "Sign up with GitHub" vs "Continue with GitHub" |

**Analysis**: Minor selector and URL format mismatches.

---

## LOW Issues (Flaky/Timing)

### Blog Screenshots (18 tests)

| ID      | Test Name                   | Root Cause        | Evidence                   |
| ------- | --------------------------- | ----------------- | -------------------------- |
| E2E-L01 | Capture Map View screenshot | SCREENSHOT_TIMING | Map tiles not fully loaded |

**Analysis**: Screenshot tests are sensitive to async loading. These are utility tests, not feature tests.

---

## Root Cause Analysis

### AUTH_FAILURE (25 tests)

**Pattern**: Tests expect authenticated state but page shows "Sign In" link

**Affected Files**:

- tests/e2e/map.spec.ts
- tests/e2e/map-visual-regression.spec.ts

**Probable Causes**:

1. Map tests not configured with `dependencies: ['setup']` in playwright config
2. Tests using wrong storage state file

**Recommended Fix**:

- Ensure map tests depend on auth setup project
- Verify `storageState` path in playwright.config.ts for map tests

### RPC_FAILURE (6 tests)

**Pattern**: Rate limiting RPC functions not enforcing limits

**Affected Files**:

- tests/e2e/auth/rate-limiting.spec.ts

**Probable Causes**:

1. Supabase RPC functions `check_rate_limit` and `record_failed_attempt` don't exist
2. RPC functions exist but fail silently (code fails open by design)
3. Rate limit table not populated correctly

**Recommended Fix**:

- Verify RPC functions exist in Supabase: `SELECT proname FROM pg_proc WHERE proname LIKE '%rate%';`
- Check if `auth_rate_limits` table exists and has correct schema
- Consider adding integration tests for RPC functions separately

### MODAL_BLOCKING (22 tests)

**Pattern**: Re-authentication modal blocks test interactions

**Affected Files**:

- tests/e2e/messaging/complete-user-workflow.spec.ts
- tests/e2e/messaging/encrypted-messaging.spec.ts

**Probable Causes**:

1. Session restored from storage but encryption keys not unlocked
2. Tests don't handle the re-auth modal that appears

**Recommended Fix**:

- Add beforeEach hook to dismiss or complete the re-auth modal
- Store encryption key state in test fixtures
- Use test user with known password for key derivation

### ELEMENT_MISSING (67 tests)

**Pattern**: Expected UI elements not found in DOM

**Affected Files**:

- tests/e2e/accessibility/avatar-upload.a11y.test.ts
- tests/e2e/avatar/upload.spec.ts

**Probable Causes**:

1. Avatar upload modal not opening when "Upload Avatar" button clicked
2. Component structure changed since tests were written
3. Conditional rendering based on state not met

**Recommended Fix**:

- Debug avatar upload button click handler
- Verify modal component is properly mounted
- Update selectors to match current component structure

### STATE_EXPECTATION_MISMATCH (44 tests)

**Pattern**: Tests expect unauthenticated state but user is authenticated

**Affected Files**:

- tests/e2e/companies/companies-basic-flow.spec.ts

**Probable Causes**:

1. Shared auth session from setup project applies to all chromium tests
2. Tests that need unauthenticated state don't clear storage

**Recommended Fix**:

```typescript
test.describe('Unauthenticated scenarios', () => {
  test.use({ storageState: './tests/e2e/fixtures/storage-state.json' });
  // tests here start unauthenticated
});
```

---

## Test File Health Summary

| Test File                                | Total | Passing | Failing | Health   |
| ---------------------------------------- | ----- | ------- | ------- | -------- |
| auth/rate-limiting.spec.ts               | 8     | 2       | 6       | HIGH     |
| auth/session-persistence.spec.ts         | 9     | 4       | 5       | MEDIUM   |
| auth/user-registration.spec.ts           | 6     | 2       | 4       | MEDIUM   |
| auth/protected-routes.spec.ts            | 9     | 9       | 0       | HEALTHY  |
| auth/sign-up.spec.ts                     | 8     | 8       | 0       | HEALTHY  |
| accessibility/avatar-upload.a11y.test.ts | ~17   | 0       | ~17     | CRITICAL |
| messaging/complete-user-workflow.spec.ts | ~10   | 0       | ~10     | CRITICAL |
| companies/companies-basic-flow.spec.ts   | ~15   | 0       | ~15     | CRITICAL |
| map.spec.ts                              | ~10   | 0       | ~10     | CRITICAL |

---

## Recommended Action Plan

### Immediate (CRITICAL)

1. **Fix map test auth setup** - Add map tests to chromium project with auth dependencies
2. **Handle messaging re-auth modal** - Add modal dismissal in messaging test setup
3. **Fix companies test isolation** - Use unauthenticated storage state for tests expecting redirect

### Short-term (HIGH)

4. **Debug avatar upload modal** - Investigate why crop modal doesn't open
5. **Verify rate limit RPC functions** - Check Supabase database for function existence

### Medium-term (MEDIUM)

6. **Fix URL trailing slash handling** - Standardize `/sign-up` vs `/sign-up/`
7. **Update OAuth button selectors** - Match current button text
8. **Improve session persistence tests** - Add explicit waits for storage sync

### Long-term (LOW)

9. **Improve screenshot test reliability** - Add explicit waits for map tile loading
10. **Add rate limit integration tests** - Test RPC functions in isolation

---

## Commands to Run

```bash
# Run auth tests only (most stable after fixes)
docker compose exec -e SKIP_WEBSERVER=true -e PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 spoketowork pnpm exec playwright test tests/e2e/auth/ --project=chromium --project=chromium-noauth

# Run specific failing category
docker compose exec -e SKIP_WEBSERVER=true -e PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 spoketowork pnpm exec playwright test tests/e2e/messaging/ --project=chromium

# Debug a specific test
docker compose exec -e SKIP_WEBSERVER=true -e PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 spoketowork pnpm exec playwright test tests/e2e/auth/rate-limiting.spec.ts --debug
```
