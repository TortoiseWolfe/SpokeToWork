# Feature Specification: Fix E2E Email Domain Rejection

**Feature Branch**: `060-fix-e2e-email-domain`
**Created**: 2025-12-22
**Status**: Draft
**Input**: Fix E2E test failures - 49 unique failures caused by EMAIL_DOMAIN_REJECTED. Supabase rejects @example.com as invalid (RFC 2606 reserved domain). Primary fix: replace @example.com with @mailinator.com in 7 test files.

## Problem Statement

E2E tests in GitHub Actions CI are failing because Supabase rejects dynamically generated email addresses using the `@example.com` domain. Per RFC 2606, `example.com` is a reserved domain that cannot receive real emails, and Supabase's email validation rejects it as invalid.

### Root Cause

Test files generate unique email addresses like:

- `e2e-protected-${Date.now()}@example.com`
- `delete-test-${Date.now()}@example.com`
- `e2e-session-${Date.now()}@example.com`

Supabase returns: `Email address "e2e-protected-1766427463635@example.com" is invalid`

### Solution

Replace `@example.com` with `@mailinator.com` - a legitimate domain that accepts any email address without verification (commonly used for testing).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - E2E Tests Pass in CI (Priority: P1)

As a developer, I want E2E authentication tests to pass in GitHub Actions so that PR merges are not blocked by false failures.

**Why this priority**: This is blocking all CI pipelines - 49 test failures prevent any PR from merging.

**Independent Test**: Run the full E2E test suite in GitHub Actions and verify zero failures related to email validation.

**Acceptance Scenarios**:

1. **Given** E2E tests run in GitHub Actions, **When** tests generate dynamic email addresses, **Then** Supabase accepts the email format and tests proceed to authentication
2. **Given** user registration tests run, **When** a unique email is generated with @mailinator.com, **Then** the signup form submits successfully
3. **Given** session persistence tests run, **When** email addresses use @mailinator.com, **Then** authentication completes without "invalid email" errors

---

### Edge Cases

- **Timestamp collision**: Two tests generating emails at the same millisecond - mitigated by unique test prefixes (`e2e-protected-`, `delete-test-`, etc.)
- **Rate limiting**: Mailinator may have rate limits - not a concern for E2E tests which run sequentially with delays

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All E2E test files generating dynamic emails MUST use `@mailinator.com` instead of `@example.com`
- **FR-002**: Test email prefixes MUST remain unique per test file to avoid collisions
- **FR-003**: The fix MUST NOT require any Supabase configuration changes

### Files to Modify

| File                                            | Current Pattern | New Pattern       |
| ----------------------------------------------- | --------------- | ----------------- |
| `tests/e2e/auth/protected-routes.spec.ts`       | `@example.com`  | `@mailinator.com` |
| `tests/e2e/auth/session-persistence.spec.ts`    | `@example.com`  | `@mailinator.com` |
| `tests/e2e/auth/user-registration.spec.ts`      | `@example.com`  | `@mailinator.com` |
| `tests/e2e/auth/complete-flows.spec.ts`         | `@example.com`  | `@mailinator.com` |
| `tests/e2e/auth/rate-limiting.spec.ts`          | `@example.com`  | `@mailinator.com` |
| `tests/e2e/auth/new-user-complete-flow.spec.ts` | `@example.com`  | `@mailinator.com` |
| `tests/e2e/auth/sign-up.spec.ts`                | `@example.com`  | `@mailinator.com` |

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero E2E test failures with "invalid email" or "EMAIL_DOMAIN_REJECTED" errors
- **SC-002**: All 49 previously failing tests now pass in GitHub Actions
- **SC-003**: No regression in other E2E tests

## Assumptions

- Mailinator.com domain is accepted by Supabase email validation
- These are dynamic test emails that don't require actual email delivery
- The email domain change has no impact on test logic (only validation passes)
