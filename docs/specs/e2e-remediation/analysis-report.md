# E2E Test Failure Analysis Report

**Generated**: 2025-12-22
**Test Results Path**: test-results/
**Total Failures**: 98 unique failures (181 with retries)

## Executive Summary

| Category      | Failures | Primary Root Cause                |
| ------------- | -------- | --------------------------------- |
| auth          | 89       | AUTH_FAILURE / VERIFY_EMAIL       |
| accessibility | 50       | ELEMENT_MISSING / AUTH_DEPENDENCY |
| companies     | 23       | ELEMENT_MISSING                   |
| avatar        | 16       | ELEMENT_MISSING                   |
| blog          | 3        | INVALID_CREDENTIALS               |

## Severity Breakdown

| Severity | Count | Description                          |
| -------- | ----- | ------------------------------------ |
| CRITICAL | 29    | Core auth flows broken               |
| HIGH     | 39    | Accessibility tests blocked by auth  |
| MEDIUM   | 23    | Companies tests - element mismatches |
| LOW      | 7     | Blog screenshot tests - wrong creds  |

## Root Cause Analysis

### AUTH_FAILURE (~30 tests)

**Pattern**: Tests expect authenticated state but page shows "Sign In" link or stuck at "Verify Your Email"

**Evidence from error-context.md**:

```yaml
- heading "Sign In" [level=1] # Expected authenticated page
- link "Sign In" [ref=e17] # Unauthenticated state
```

**Affected Files**:

- `tests/e2e/auth/protected-routes.spec.ts`
- `tests/e2e/auth/session-persistence.spec.ts`
- `tests/e2e/auth/complete-flows.spec.ts`
- `tests/e2e/auth/new-user-complete-flow.spec.ts`

**Probable Causes**:

1. Email domain fix (`@mailinator.com`) applied but not yet pushed to CI
2. Session not persisting between page navigations
3. Tests stuck at "Verify Your Email" page

### EMAIL_VERIFICATION_STUCK (~15 tests)

**Pattern**: User registered but stuck at email verification page

**Evidence**:

```yaml
- heading "Verify Your Email" [level=1]
- paragraph: Check your inbox for a verification link
```

**Probable Cause**:
Dynamic test users created without `email_confirmed_at` set via Supabase admin API

### INVALID_CREDENTIALS (3 tests)

**Pattern**: Blog screenshot tests using wrong credentials

**Evidence**:

```yaml
- alert [ref=e45]:
    - generic [ref=e46]: Invalid login credentials
- textbox "Email": text: JonPohlner+testb@gmail.com
```

**Affected Files**:

- `tests/e2e/blog/capture-blog-screenshots.spec.ts`

**Fix**: Tests should use TEST_USER_PRIMARY_EMAIL/PASSWORD from env vars

### ELEMENT_MISSING (~50 tests)

**Pattern**: Expected elements not found or wrong selectors

**Categories**:

1. **Accessibility tests** - Looking for elements on authenticated pages (blocked by auth)
2. **Avatar upload tests** - Modal/crop interactions not matching selectors
3. **Companies tests** - CRUD operations with different drawer/form structure

## Test File Health Summary

| Test File                                | Total | Failing | Health   |
| ---------------------------------------- | ----- | ------- | -------- |
| auth/protected-routes.spec.ts            | 9     | 9       | CRITICAL |
| auth/session-persistence.spec.ts         | 4     | 4       | CRITICAL |
| auth/complete-flows.spec.ts              | 4     | 4       | CRITICAL |
| auth/rate-limiting.spec.ts               | 7     | 7       | CRITICAL |
| accessibility/avatar-upload.a11y.test.ts | ~20   | ~20     | HIGH     |
| companies/companies-crud.spec.ts         | ~23   | ~23     | MEDIUM   |
| blog/capture-blog-screenshots.spec.ts    | 3     | 3       | LOW      |

## Previous Fixes Applied

### Fix 1: Password Selector (`{ exact: true }`) ✅ WORKING

Commit `2b58b05` - Password fields now being filled correctly

### Fix 2: Email Domain (`@mailinator.com`) ✅ APPLIED

Commit `3bdb032` - Replaced `@example.com` with `@mailinator.com`

**Status**: Applied locally but NOT YET PUSHED to CI

## Recommended Action Plan

### Immediate (CRITICAL)

1. **Push email domain fix to remote** - Triggers CI with `@mailinator.com` emails

   ```bash
   git push
   ```

2. **Monitor CI results** - Expect auth failures to drop significantly

### Short-term (HIGH)

3. **Fix blog screenshot test credentials** - Use env vars for test user
4. **Review accessibility test auth setup** - May pass after auth fixed

### Medium-term (MEDIUM)

5. **Companies CRUD selectors** - Review drawer/form element matching
6. **Avatar upload modal** - Check crop modal selector updates

### Verification Steps

After push, run:

```bash
/analyze-e2e
```

Expected improvement:

- AUTH_FAILURE: 89 → ~10 (remaining may need additional fixes)
- accessibility: 50 → ~5 (auth-dependent tests should pass)
