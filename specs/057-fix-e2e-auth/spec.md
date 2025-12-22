# Feature Specification: Fix E2E Test Authentication in CI

**Feature Branch**: `057-fix-e2e-auth`
**Created**: 2025-12-22
**Status**: Draft
**Input**: User description: "Fix E2E test failures - 51 unique failures (27 CRITICAL auth, 24 HIGH accessibility) all caused by AUTH_FAILURE in CI. Primary fix: verify GitHub Secrets for test user credentials."

## Overview

All 51 E2E test failures share a single root cause: **authentication is not working in CI**. Every `error-context.md` shows tests stuck at the unauthenticated home page when they expect authenticated state. This is a CI environment configuration issue, not a code bug.

**Analysis Report**: [docs/specs/e2e-remediation/analysis-report.md](../../docs/specs/e2e-remediation/analysis-report.md)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - CI Pipeline Passes E2E Tests (Priority: P1)

As a developer, I need E2E tests to pass in GitHub Actions so that PRs can be merged with confidence.

**Why this priority**: Without working E2E tests, the CI pipeline is effectively broken. This blocks all development.

**Independent Test**: Run `gh workflow run e2e.yml` and verify all tests pass.

**Acceptance Scenarios**:

1. **Given** a clean main branch, **When** E2E tests run in GitHub Actions, **Then** all 51 previously failing tests pass
2. **Given** test user credentials in GitHub Secrets, **When** auth tests execute, **Then** users are successfully authenticated
3. **Given** authenticated test user, **When** accessibility tests run, **Then** protected pages are accessible

---

### User Story 2 - Cookie Consent Handling (Priority: P2)

As a test suite, cookie consent banners must not block test interactions.

**Why this priority**: Secondary blocker - even with auth fixed, overlays could block element interactions.

**Independent Test**: Run accessibility tests and verify no "element obscured" errors from cookie banner.

**Acceptance Scenarios**:

1. **Given** cookie consent banner appears, **When** test setup runs, **Then** banner is dismissed before test assertions
2. **Given** any test expecting element interaction, **When** cookie banner would appear, **Then** test proceeds without obstruction

---

### User Story 3 - Test User Verification (Priority: P3)

As a CI system, test users must exist and have valid credentials in Supabase.

**Why this priority**: Prerequisite for US1 - test users must exist before auth can work.

**Independent Test**: Query Supabase for test user existence via Management API.

**Acceptance Scenarios**:

1. **Given** TEST_USER_PRIMARY_EMAIL environment variable, **When** querying Supabase, **Then** user exists with confirmed email
2. **Given** test user credentials, **When** attempting sign-in, **Then** authentication succeeds

---

### Edge Cases

- What happens if Supabase is rate-limiting the test user?
- How does system handle expired test user sessions?
- What if GitHub Secrets are configured but with wrong values?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: CI environment MUST have all required test user credentials configured as GitHub Secrets
- **FR-002**: Test users MUST exist in Supabase with confirmed email addresses
- **FR-003**: E2E test setup MUST dismiss cookie consent banner before test execution
- **FR-004**: E2E test setup MUST dismiss countdown promotional banner before test execution
- **FR-005**: Auth tests MUST verify user is authenticated before proceeding with assertions
- **FR-006**: All 27 auth tests MUST pass in CI environment
- **FR-007**: All 24 accessibility tests MUST pass in CI environment (after auth is fixed)

### Required GitHub Secrets

| Secret Name                     | Purpose                        |
| ------------------------------- | ------------------------------ |
| `TEST_USER_PRIMARY_EMAIL`       | Primary test user email        |
| `TEST_USER_PRIMARY_PASSWORD`    | Primary test user password     |
| `TEST_USER_TERTIARY_EMAIL`      | Tertiary test user (messaging) |
| `TEST_USER_TERTIARY_PASSWORD`   | Tertiary test user password    |
| `SUPABASE_ACCESS_TOKEN`         | Supabase Management API access |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key         |

### Key Entities

- **Test User**: Pre-created Supabase user with confirmed email for E2E testing
- **GitHub Secret**: Encrypted environment variable available to GitHub Actions
- **Cookie Consent State**: localStorage flag indicating consent status

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 51/51 previously failing E2E tests pass in GitHub Actions
- **SC-002**: Auth tests complete within 30 seconds per test (no timeout failures)
- **SC-003**: Zero "element obscured" errors from cookie/promotional banners
- **SC-004**: E2E workflow completes successfully on push to main branch
- **SC-005**: Test results show 0 failures in `test-results/` directory after CI run

## Assumptions

1. GitHub Secrets can be configured by repository owner
2. Test users already exist in Supabase (created during initial setup)
3. Supabase free tier is not rate-limiting the test users
4. The application code itself works correctly (this is a CI configuration issue)

## Out of Scope

- Creating new test users (assume they exist)
- Modifying application authentication logic
- Adding new E2E tests (just fixing existing ones)
- Changing Supabase configuration

## Clarifications

### Session 2025-12-22

**Q1: Root Cause Verified**

Database query confirmed the root cause: **email case mismatch**.

| Source              | Email                               |
| ------------------- | ----------------------------------- |
| `.env` file         | `JonPohlner@gmail.com` (mixed case) |
| Supabase auth.users | `jonpohlner@gmail.com` (lowercase)  |

Supabase's email comparison is case-sensitive, causing authentication to fail.

**Resolution**: Update `.env` to use lowercase email: `jonpohlner@gmail.com`

**Q2: Test Users Status**

All required test users exist and are confirmed:

- `jonpohlner@gmail.com` - Primary (confirmed)
- `test-user-b@example.com` - Secondary (confirmed)
- `test-user-c@example.com` - Tertiary (confirmed)
- `admin@spoketowork.com` - Admin (confirmed)

**Q3: Identity Records Fix (2025-12-22)**

Additional root cause discovered: `auth.identities` records had inconsistent `email_verified: false` in `identity_data` JSON despite users having `email_confirmed_at` set in `auth.users`.

**Issue**: The tertiary user `test-user-c@example.com` had NEVER signed in (`last_sign_in_at: null`) despite being "confirmed".

**Resolution**:

1. Updated `identity_data.email_verified` to `true` for all test users
2. Reset passwords to match `.env` file values
3. Verified all three test users can now authenticate via Supabase Auth API
