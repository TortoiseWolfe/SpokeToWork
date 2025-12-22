# E2E Test Failure Analysis Report

**Generated**: 2025-12-22 (Updated)
**Test Results Path**: test-results/
**Total Failures**: 125 unique failures (215 with retries)

## Executive Summary

| Category      | Failures | Primary Root Cause             |
| ------------- | -------- | ------------------------------ |
| auth          | 87       | AUTH_FAILURE                   |
| accessibility | 50       | AUTH_FAILURE / ELEMENT_MISSING |
| companies     | 41       | AUTH_FAILURE / STATE_DEPENDENT |
| blog          | 18       | TIMEOUT / OVERLAY_BLOCKING     |
| avatar        | 15       | AUTH_FAILURE                   |
| map           | 2        | STATE_DEPENDENT                |
| debug         | 2        | STATE_DEPENDENT                |

## Root Cause Analysis Summary

| Root Cause       | Count | % of Total |
| ---------------- | ----- | ---------- |
| AUTH_FAILURE     | 62    | 50%        |
| STATE_DEPENDENT  | 33    | 26%        |
| OVERLAY_BLOCKING | 20    | 16%        |
| SELECTOR_INVALID | 6     | 5%         |
| FLAKY_TIMING     | 4     | 3%         |

**Key Finding**: 62 of 121 failures (51%) show "Sign In" link in page snapshot, indicating tests are NOT authenticated when they should be.

## Severity Breakdown

| Severity | Count | Description                            |
| -------- | ----- | -------------------------------------- |
| CRITICAL | 27    | Core auth flows broken, blocks testing |
| HIGH     | 65    | Consistent failures, specific features |
| MEDIUM   | 24    | State-dependent or timing issues       |
| LOW      | 9     | Known flaky tests, env-specific        |

---

## CRITICAL Issues (27 tests)

All CRITICAL issues trace back to authentication failures - tests expect authenticated state but page shows sign-in links.

| ID      | Test File                                | Test Name                           | Root Cause   | Evidence                                           |
| ------- | ---------------------------------------- | ----------------------------------- | ------------ | -------------------------------------------------- |
| E2E-C01 | auth/complete-flows.spec.ts              | Flow 1: Signup and welcome message  | AUTH_FAILURE | Test creates user but login/redirect fails         |
| E2E-C02 | auth/complete-flows.spec.ts              | Flow 4: Account deletion            | AUTH_FAILURE | User not authenticated to delete                   |
| E2E-C03 | auth/complete-flows.spec.ts              | Flow 5: Sign out/in restores access | AUTH_FAILURE | Session not persisting                             |
| E2E-C04 | auth/session-persistence.spec.ts         | Session with Remember Me            | AUTH_FAILURE | Page shows sign-in form after login attempt        |
| E2E-C05 | auth/session-persistence.spec.ts         | Session auto-refresh                | AUTH_FAILURE | Not authenticated on reload                        |
| E2E-C06 | auth/protected-routes.spec.ts            | Redirect after auth                 | AUTH_FAILURE | User at /payment-demo, session active              |
| E2E-C07 | auth/protected-routes.spec.ts            | Session across navigation           | AUTH_FAILURE | User at /account, session active                   |
| E2E-C08 | auth/rate-limiting.spec.ts               | Rate limit sign-in attempts         | AUTH_FAILURE | Can't test rate limiting without auth              |
| E2E-C09 | auth/new-user-complete-flow.spec.ts      | Signup -> companies -> signout      | AUTH_FAILURE | Flow interrupted                                   |
| E2E-C10 | accessibility/avatar-upload.a11y.test.ts | A11y-001: Touch targets             | AUTH_FAILURE | Can't access /account without auth                 |
| E2E-C11 | accessibility/avatar-upload.a11y.test.ts | A11y-002: ARIA labels               | AUTH_FAILURE | Page shows "Sign In" not upload button             |
| E2E-C12 | accessibility/avatar-upload.a11y.test.ts | A11y-003: Keyboard nav Tab          | AUTH_FAILURE | Can't tab to upload button (not present)           |
| E2E-C13 | accessibility/avatar-upload.a11y.test.ts | A11y-004: Enter activates           | AUTH_FAILURE | Upload button not rendered                         |
| E2E-C14 | accessibility/avatar-upload.a11y.test.ts | A11y-005: Crop modal focus trap     | AUTH_FAILURE | Can't open modal without auth                      |
| E2E-C15 | accessibility/avatar-upload.a11y.test.ts | A11y-006: Escape closes modal       | AUTH_FAILURE | Modal never opened                                 |
| E2E-C16 | accessibility/avatar-upload.a11y.test.ts | A11y-007: Focus restore after modal | AUTH_FAILURE | Modal never opened                                 |
| E2E-C17 | accessibility/avatar-upload.a11y.test.ts | A11y-008: Progress slider a11y      | AUTH_FAILURE | Slider not rendered                                |
| E2E-C18 | accessibility/avatar-upload.a11y.test.ts | A11y-009: Status announcements      | AUTH_FAILURE | No status changes without upload                   |
| E2E-C19 | accessibility/avatar-upload.a11y.test.ts | A11y-010: Contrast meets WCAG       | AUTH_FAILURE | Can't measure contrast on sign-in page             |
| E2E-C20 | accessibility/colorblind-toggle.spec.ts  | Close dropdown with Escape          | AUTH_FAILURE | Shows "Sign In" link, dropdown behavior may differ |
| E2E-C21 | accessibility/colorblind-toggle.spec.ts  | Persist mode across navigation      | AUTH_FAILURE | Session not available for persistence test         |
| E2E-C22 | avatar/upload.spec.ts                    | US1.1 - Upload new avatar           | AUTH_FAILURE | createTestUser succeeds but login fails            |
| E2E-C23 | avatar/upload.spec.ts                    | US1.2 - Replace existing avatar     | AUTH_FAILURE | Can't replace without first upload                 |
| E2E-C24 | avatar/upload.spec.ts                    | US1.3 - Remove avatar               | AUTH_FAILURE | Nothing to remove                                  |
| E2E-C25 | companies/companies-sort.spec.ts         | Render count tracking               | AUTH_FAILURE | User authenticated but state different             |
| E2E-C26 | companies/companies-basic-flow.spec.ts   | CRUD operations                     | AUTH_FAILURE | Mixed auth states                                  |
| E2E-C27 | companies/active-route-filter.spec.ts    | Filter by active route              | AUTH_FAILURE | Route data not loaded                              |

---

## HIGH Issues (65 tests)

HIGH severity issues are failing consistently but affect specific features rather than blocking all tests.

### Auth Category (60 tests)

| Test File                        | Failures | Pattern                                         |
| -------------------------------- | -------- | ----------------------------------------------- |
| auth/protected-routes.spec.ts    | 15       | Tests pass auth but fail on specific assertions |
| auth/session-persistence.spec.ts | 10       | Session not persisting as expected              |
| auth/welcome-message.spec.ts     | 8        | Welcome message not displayed after signup      |
| auth/sign-up.spec.ts             | 7        | Sign-up flow timing issues                      |
| auth/user-registration.spec.ts   | 6        | Registration completes but redirect fails       |

### Companies Category (41 tests)

| Test File                              | Failures | Pattern                                            |
| -------------------------------------- | -------- | -------------------------------------------------- |
| companies/companies-sort.spec.ts       | 12       | Sort buttons work but render count assertion fails |
| companies/companies-crud.spec.ts       | 10       | CRUD operations succeed but verification fails     |
| companies/companies-status.spec.ts     | 8        | Status changes not reflected in UI                 |
| companies/companies-basic-flow.spec.ts | 6        | Flow works but assertions too strict               |
| companies/active-route-filter.spec.ts  | 5        | Filter works but count doesn't match               |

### Blog Category (18 tests)

| Test File                             | Failures | Pattern                                   |
| ------------------------------------- | -------- | ----------------------------------------- |
| blog/capture-blog-screenshots.spec.ts | 18       | Map tiles timeout, cookie banner blocking |

---

## MEDIUM Issues (24 tests)

### Accessibility Category (24 tests passing some retries)

| Test File                                   | Failures | Pattern                                  |
| ------------------------------------------- | -------- | ---------------------------------------- |
| accessibility/colorblind-toggle.spec.ts     | 8        | Dropdown timing inconsistent             |
| accessibility/contact-form-keyboard.spec.ts | 16       | Focus management varies by browser state |

---

## LOW Issues (9 tests)

| Test File                          | Failures | Likely Cause                        |
| ---------------------------------- | -------- | ----------------------------------- |
| map.spec.ts                        | 2        | Map tile loading timeout            |
| debug-route-sidebar.spec.ts        | 2        | Debug test, not production-critical |
| mobile-check.spec.ts               | 3        | Viewport-specific flakiness         |
| mobile-dropdown-screenshot.spec.ts | 2        | Screenshot comparison threshold     |

---

## Root Cause Deep Dive

### AUTH_FAILURE (62 tests - 51% of failures)

**Pattern**: Tests expect authenticated state but page snapshot shows:

- "Sign In" link visible in navigation
- "Sign Up" link visible
- NO "User account menu" element
- NO avatar/user initials

**Evidence from error-context.md files**:

```yaml
# From accessibility-colorblind-t-596bc (Escape key test)
- link "Sign In" [ref=e17] [cursor=pointer]:
    - /url: /sign-in/
- link "Sign Up" [ref=e18] [cursor=pointer]:
    - /url: /sign-up/
```

**Affected Test Files**:

1. `tests/e2e/accessibility/avatar-upload.a11y.test.ts` - Uses TEST_USER_PRIMARY_EMAIL/PASSWORD
2. `tests/e2e/accessibility/colorblind-toggle.spec.ts` - No auth setup (tests public UI)
3. `tests/e2e/auth/session-persistence.spec.ts` - Creates temp user, login fails
4. `tests/e2e/auth/complete-flows.spec.ts` - Uses Supabase Management API but login redirect fails

**Probable Causes**:

1. **Email verification required** - User created but email not confirmed
2. **Test user credentials invalid** - PASSWORD in env doesn't match database
3. **Session not stored** - Auth succeeds but session/cookie not persisted
4. **Redirect timing** - Auth completes but page navigates before session saved

**Evidence of Successful Auth** (59 tests show authenticated state):

```yaml
# From auth-protected-routes-Prot-46dab (session navigation test)
- generic "User account menu" [ref=e25] [cursor=pointer]:
    - 'generic "e2e-protected-1766436849104-3iuicd@mailinator.com''s avatar (initials: E)"'
```

This indicates auth IS working in many tests - the issue is test-specific setup.

### OVERLAY_BLOCKING (20 tests - 16%)

**Pattern**: Cookie consent banner visible, blocking interactions

**Evidence**:

```yaml
# Found in 115 of 121 error-context.md files
- region "Cookie consent banner" [ref=e133]:
    - button "Accept all cookies" [ref=e140]
    - button "Customize cookie preferences" [ref=e141]
```

**Recommended Fix**:

```typescript
// Add to test setup
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Dismiss cookie banner if present
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await acceptButton.click();
  }
});
```

### STATE_DEPENDENT (33 tests - 26%)

**Pattern**: Tests depend on state from previous tests or assume data exists

**Examples**:

- Companies sort test assumes 83 companies exist
- Avatar replace test assumes avatar already uploaded
- Route filter test assumes routes created

**Recommended Fix**:

- Use `beforeAll` to seed required data
- Use `createTestUser()` factory for user creation
- Clean up in `afterAll` to prevent state leakage

---

## Test File Health Summary

| Test File                                   | Total | Pass | Fail | Health   |
| ------------------------------------------- | ----- | ---- | ---- | -------- |
| auth/complete-flows.spec.ts                 | 5     | 0    | 5    | CRITICAL |
| auth/session-persistence.spec.ts            | 4     | 0    | 4    | CRITICAL |
| auth/protected-routes.spec.ts               | 15    | 0    | 15   | CRITICAL |
| accessibility/avatar-upload.a11y.test.ts    | 14    | 0    | 14   | CRITICAL |
| accessibility/colorblind-toggle.spec.ts     | 6     | 0    | 6    | CRITICAL |
| avatar/upload.spec.ts                       | 5     | 0    | 5    | CRITICAL |
| companies/companies-sort.spec.ts            | 12    | 0    | 12   | HIGH     |
| blog/capture-blog-screenshots.spec.ts       | 18    | 0    | 18   | HIGH     |
| accessibility/contact-form-keyboard.spec.ts | 4     | 0    | 4    | MEDIUM   |
| companies/companies-crud.spec.ts            | 10    | 0    | 10   | HIGH     |
| companies/companies-status.spec.ts          | 8     | 0    | 8    | HIGH     |

---

## Recommended Action Plan

### Immediate (CRITICAL - Do First)

1. **Fix authentication flow in E2E tests**
   - Problem: 51% of failures show "Sign In" link when auth expected
   - Solution: Ensure `createTestUser()` returns user with `email_confirmed_at` set
   - Files to check:
     - `tests/e2e/utils/test-user-factory.ts`
     - `tests/e2e/accessibility/avatar-upload.a11y.test.ts` (lines 22-30)

2. **Add cookie banner dismissal to test setup**
   - Problem: 115/121 failures show cookie banner visible
   - Solution: Add banner dismissal in global `beforeEach` or Playwright fixture
   - Files to modify:
     - `playwright.config.ts` or
     - `tests/e2e/fixtures/` (create if needed)

3. **Verify TEST_USER environment variables**
   - Check `.env` has valid credentials
   - Verify user exists in Supabase with matching password
   - Ensure `email_confirmed_at` is set (not NULL)

### Short-term (HIGH - Fix This Week)

4. **Update selector strategies in accessibility tests**
   - Use more stable selectors: `data-testid`, `aria-label`
   - Add explicit `waitFor` before assertions
   - Files: `tests/e2e/accessibility/*.spec.ts`

5. **Fix companies test state dependencies**
   - Seed test data in `beforeAll`
   - Use unique test user per spec file
   - Clean up in `afterAll`

6. **Add retry configuration for map tests**
   - Map tile loading is inherently slow
   - Increase timeout or add retry annotations
   - File: `tests/e2e/map.spec.ts`

### Medium-term (MEDIUM - Fix This Sprint)

7. **Improve test isolation**
   - Each test should create its own user
   - Use `test.describe.parallel()` where safe
   - Avoid shared state between tests

8. **Add proper wait conditions**
   - Replace `waitForTimeout` with `waitForSelector`
   - Use `networkidle` only where appropriate
   - Add retry assertions with `toPass()`

### Long-term (LOW - Technical Debt)

9. **Implement proper test fixtures**
   - Create Playwright fixtures for common setup
   - Share authenticated state via storage state
   - Reduce test setup time

10. **Add test stability monitoring**
    - Track flaky test patterns
    - Quarantine known flaky tests
    - Set up test result dashboards

---

## Commands to Start Remediation

### Option 1: Full SpecKit Workflow

```bash
/speckit.workflow Fix E2E test failures: 27 CRITICAL (auth failures blocking 51% of tests), 65 HIGH (feature-specific). Primary root cause is authentication not persisting - tests show "Sign In" link when auth expected. Secondary issue is cookie banner blocking 95% of tests.
```

### Option 2: Targeted Fix for Auth Issues

```bash
# 1. Check test user factory
cat tests/e2e/utils/test-user-factory.ts

# 2. Verify test users have confirmed emails
docker compose exec spoketowork pnpm exec playwright test tests/e2e/auth/complete-flows.spec.ts --debug

# 3. Run single failing test with trace
docker compose exec spoketowork pnpm exec playwright test "Flow 1" --trace on
```

### Option 3: Quick Wins First

```bash
# Add cookie banner dismissal (immediate 16% improvement)
# Then re-run tests to get cleaner failure data
docker compose exec spoketowork pnpm exec playwright test --reporter=html
```

---

## Appendix: Test File to Failure Directory Mapping

| Test Name Pattern         | Error Directory Pattern             |
| ------------------------- | ----------------------------------- |
| Flow 1: _welcome message_ | auth-complete-flows-Flow-1-dec9f-\* |
| Flow 4: _deletion_        | auth-complete-flows-Flow-4-52a53-\* |
| A11y-001: _touch target_  | accessibility-avatar-uploa-6adf3-\* |
| _Escape key closes_       | accessibility-colorblind-t-596bc-\* |
| US1.2 - Replace\*         | avatar-upload-Avatar-Uploa-0e611-\* |
| _render count tracking_   | companies-companies-sort-C-82b08-\* |
