# Implementation Plan: Fix E2E Test Authentication in CI

**Feature Branch**: `057-fix-e2e-auth`
**Created**: 2025-12-22
**Spec**: [spec.md](./spec.md)

## Technical Context

### Problem Statement

All 51 E2E tests fail in CI because authentication fails. Root cause: **email case mismatch**.

| Source              | Email                               |
| ------------------- | ----------------------------------- |
| `.env` file         | `JonPohlner@gmail.com` (mixed case) |
| Supabase auth.users | `jonpohlner@gmail.com` (lowercase)  |

Supabase's email comparison is case-sensitive.

### Technology Stack

- **Testing**: Playwright E2E tests
- **Auth**: Supabase Auth (email/password)
- **CI**: GitHub Actions
- **Config**: Environment variables (.env, GitHub Secrets)

### Files to Modify

| File                        | Change                                                          |
| --------------------------- | --------------------------------------------------------------- |
| `.env`                      | Fix email case: `JonPohlner@gmail.com` → `jonpohlner@gmail.com` |
| `tests/e2e/utils/`          | Add cookie consent dismissal if needed                          |
| `.github/workflows/e2e.yml` | Verify secret names match .env variable names                   |

## Constitution Check

| Principle                         | Status | Notes                                             |
| --------------------------------- | ------ | ------------------------------------------------- |
| Proper Solutions Over Quick Fixes | PASS   | Fixing root cause (case mismatch), not workaround |
| Root Cause Analysis               | PASS   | Identified case sensitivity as root cause         |
| Docker-First Development          | N/A    | No package installation needed                    |
| No Technical Debt                 | PASS   | Simple, clean fix                                 |

## Implementation Phases

### Phase 1: Fix Email Case in .env

1. Update `TEST_USER_EMAIL` to lowercase
2. Update `TEST_USER_PRIMARY_EMAIL` to lowercase
3. Verify password still matches

### Phase 2: Verify Local Tests Pass

1. Run auth tests locally with fixed credentials
2. Verify login succeeds
3. Run full E2E suite locally

### Phase 3: Handle Cookie Consent

1. Check if tests need cookie consent dismissal
2. Add localStorage preset in test setup if needed:
   ```typescript
   await page.evaluate(() => {
     localStorage.setItem('cookie-consent', 'accepted');
   });
   ```

### Phase 4: Update GitHub Secrets

1. Document required secrets for user to update
2. Provide exact values to configure
3. Verify secret names match workflow expectations

### Phase 5: Verify CI Passes

1. Commit changes
2. Push to feature branch
3. Monitor GitHub Actions E2E workflow
4. Verify all 51 tests pass

## Risk Assessment

| Risk                           | Likelihood | Impact | Mitigation                                           |
| ------------------------------ | ---------- | ------ | ---------------------------------------------------- |
| Wrong password after email fix | Low        | High   | Verify password from .env works with lowercase email |
| GitHub Secrets not updated     | Medium     | High   | Document exact values for user to configure          |
| Other tests break              | Low        | Medium | Run full test suite before pushing                   |

## Dependencies

- None (simple configuration fix)

## Estimated Effort

- Implementation: Minimal (< 30 minutes)
- Verification: Run E2E tests locally (~10 minutes)
- CI verification: Wait for GitHub Actions (~15 minutes)

## Success Metrics

- All 51 previously failing E2E tests pass
- No new test failures introduced
- CI pipeline completes successfully
