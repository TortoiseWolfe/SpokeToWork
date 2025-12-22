# Feature Specification: Fix E2E Test Authentication Failures

**Feature Branch**: `062-fix-e2e-auth`
**Created**: 2025-12-22
**Status**: Clarified
**Input**: Fix E2E test failures: 27 CRITICAL (auth failures blocking 51% of tests), 65 HIGH (feature-specific). Primary root cause is authentication not persisting.

## Problem Statement

125 unique E2E test failures (215 with retries) are blocking the test suite. Analysis reveals:

| Root Cause       | Count | % of Total |
| ---------------- | ----- | ---------- |
| AUTH_FAILURE     | 62    | 51%        |
| STATE_DEPENDENT  | 33    | 26%        |
| OVERLAY_BLOCKING | 20    | 16%        |
| SELECTOR_INVALID | 6     | 5%         |
| FLAKY_TIMING     | 4     | 3%         |

**Key Finding**: 51% of failures show "Sign In" link when tests expect authenticated state. However, 59 tests DO show authenticated state, proving authentication works in some contexts.

## User Scenarios & Testing

### User Story 1 - Fix Authentication Setup in Tests (Priority: P1)

Tests that require authentication should reliably authenticate before running assertions.

**Why this priority**: 51% of all failures trace to authentication issues. Fixing this unblocks the majority of the test suite.

**Independent Test**: Run `tests/e2e/auth/complete-flows.spec.ts` - all 5 tests should pass.

**Acceptance Scenarios**:

1. **Given** a test uses `createTestUser()` to create a user, **When** the test logs in with those credentials, **Then** the page should show "User account menu" (not "Sign In" link)
2. **Given** a test uses `TEST_USER_PRIMARY_EMAIL/PASSWORD` env vars, **When** the test logs in, **Then** the page should show authenticated state within 10 seconds
3. **Given** a test navigates between pages after login, **When** the session is checked on each page, **Then** authentication should persist across all navigation

---

### User Story 2 - Add Cookie Banner Dismissal (Priority: P1)

Cookie consent banner should be automatically dismissed in E2E tests to prevent interaction blocking.

**Why this priority**: 95% of failures show cookie banner visible. This blocks element interactions even when auth works.

**Independent Test**: Run any test that clicks buttons - cookie banner should not appear or should be auto-dismissed.

**Acceptance Scenarios**:

1. **Given** a page loads with cookie consent banner, **When** tests try to interact with page elements, **Then** the banner should be dismissed automatically in test setup
2. **Given** cookie preferences are set via localStorage, **When** a new page loads, **Then** the banner should not appear at all
3. **Given** a test runs in a fresh browser context, **When** the page loads, **Then** cookie consent should be pre-accepted via Playwright fixture

---

### User Story 3 - Migrate Tests to Use createTestUser() (Priority: P2)

All tests requiring authentication should use the `createTestUser()` factory instead of hardcoded credentials.

**Why this priority**: Tests using env vars fail when credentials are invalid or user doesn't exist. Factory approach is more reliable.

**Independent Test**: Run `tests/e2e/accessibility/avatar-upload.a11y.test.ts` - all tests should pass.

**Acceptance Scenarios**:

1. **Given** `tests/e2e/accessibility/avatar-upload.a11y.test.ts` currently uses `TEST_USER_PRIMARY_EMAIL`, **When** migrated to `createTestUser()`, **Then** all 14 tests should pass
2. **Given** a test creates a user with `createTestUser()`, **When** the test completes, **Then** the user should be deleted in `afterAll`
3. **Given** `SUPABASE_SERVICE_ROLE_KEY` is not set, **When** tests run, **Then** tests MUST fail fast with error: "SUPABASE_SERVICE_ROLE_KEY required"

---

### User Story 4 - Fix State-Dependent Tests (Priority: P3)

Tests should not depend on data from previous test runs or shared state.

**Why this priority**: 26% of failures are state-dependent. Fixing auth first will reveal true state dependency issues.

**Independent Test**: Run `tests/e2e/companies/companies-sort.spec.ts` in isolation - should pass.

**Acceptance Scenarios**:

1. **Given** a test needs company data, **When** the test runs, **Then** it should seed its own data in `beforeAll`
2. **Given** multiple tests run in parallel, **When** they access shared resources, **Then** each should use unique identifiers (user-specific data)
3. **Given** a test modifies state, **When** the test completes, **Then** state should be cleaned up in `afterEach` or `afterAll`

---

### Edge Cases

- What happens when `SUPABASE_SERVICE_ROLE_KEY` is not set? **Tests MUST fail fast** with clear error: "SUPABASE_SERVICE_ROLE_KEY required - check .env locally or GitHub Secrets in CI".
- What happens when cookie banner element doesn't exist? Not applicable - localStorage pre-seeding prevents banner from appearing.
- What happens when user creation fails mid-test? Test should fail with clear error message, not hang.
- What happens when login takes longer than expected? Tests use combination wait: `waitForURL` (10s) + `waitForSelector('User account menu')` (5s).

## Requirements

### Functional Requirements

- **FR-001**: Tests MUST use `createTestUser()` factory for dynamic user creation with auto-confirmed email
- **FR-002**: Tests MUST pre-seed localStorage with `cookie-consent: accepted` via Playwright `storageState` to prevent banner
- **FR-003**: Tests MUST verify authentication using combination approach: `waitForURL(NOT /sign-in)` then `waitForSelector('User account menu')` (negation pattern handles various redirect destinations)
- **FR-004**: Tests MUST clean up created users in `afterAll` hooks
- **FR-005**: Tests MUST NOT depend on data from previous test runs
- **FR-006**: Tests MUST use unique identifiers (timestamp-based emails) to avoid collisions
- **FR-007**: Tests MUST fail fast with clear error when `SUPABASE_SERVICE_ROLE_KEY` is missing

### Key Entities

- **TestUser**: User created by factory with id, email, password, auto-confirmed email
- **Cookie Consent State**: localStorage key that controls banner visibility
- **Auth Session**: Supabase session stored in localStorage, persists across page navigation

## Success Criteria

### Measurable Outcomes

- **SC-001**: CRITICAL test failures reduced from 27 to 0
- **SC-002**: Total unique failures reduced from 125 to <20 (84% improvement)
- **SC-003**: Auth-related failures reduced from 62 to 0
- **SC-004**: All tests in `tests/e2e/auth/` directory pass consistently (3 consecutive runs)
- **SC-005**: Cookie banner not visible in any test error screenshots
- **SC-006**: Tests complete within timeout limits (no hanging tests)

## Out of Scope

- Fixing flaky timing issues (4 tests, 3% of failures) - will be addressed separately
- Adding new E2E tests - focus is on fixing existing tests
- Refactoring test organization - maintain current file structure
- Performance optimization of test execution

## Technical Constraints

- All changes must work in Docker environment (per CLAUDE.md)
- No changes to production code - only test infrastructure
- Must maintain compatibility with CI/CD pipeline
- Must not require manual user creation in Supabase dashboard

## Clarifications

### Session 2025-12-22

**Q1: How should the cookie consent banner be dismissed in E2E tests?**

> **Answer**: localStorage pre-seeding. Set `cookie-consent: accepted` in localStorage before page loads via Playwright's `storageState`. Fastest approach - banner never appears.

**Q2: After login, what URL pattern should tests wait for to confirm authentication succeeded?**

> **Answer**: Combination approach (most robust). Wait for URL to NOT be `/sign-in` (`waitForURL(NOT /sign-in)`), then verify "User account menu" element is visible. Negation pattern handles various redirect destinations. Catches both navigation and session hydration issues.

**Q3: How should tests behave when `SUPABASE_SERVICE_ROLE_KEY` is not configured?**

> **Answer**: Fail fast with clear error. Message should specify: "SUPABASE_SERVICE_ROLE_KEY required - check .env locally or GitHub Secrets in CI". Missing key indicates configuration problem that needs immediate attention.

**Q4: In what order should we fix the failing tests?**

> **Answer**: Fix by root cause for cascading effect:
>
> 1. Cookie banner (affects 95% of tests) - localStorage pre-seeding
> 2. Auth setup (affects 51%) - URL + element verification
> 3. State-dependent tests (affects 26%) - proper seeding/cleanup

## References

- Analysis Report: `docs/specs/e2e-remediation/analysis-report.md`
- Test User Factory: `tests/e2e/utils/test-user-factory.ts`
- Playwright Config: `playwright.config.ts`
