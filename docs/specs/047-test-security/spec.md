# Feature Specification: Test Security Hardening

**Feature Branch**: `047-test-security`
**Created**: 2025-12-13
**Status**: Draft
**Priority**: P1 (High)
**Input**: Code review finding - hardcoded test credentials and SQL injection in tests

## Execution Flow (main)

```
1. Parse input from security code review
   → Feature: Eliminate security anti-patterns in test code
2. Extract key security risks
   → Medium: 67 test files with hardcoded password fallbacks
   → Critical: SQL injection patterns in E2E test files
   → Low: Test credentials in documentation
3. Identify affected users
   → Developers: CI/CD pipeline security
   → Security auditors: Clean audit trail
4. Generate Functional Requirements
   → P0: Remove all SQL injection patterns
   → P1: Require env vars for test credentials (no fallbacks)
   → P2: Clean up documentation examples
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT security outcomes are needed and WHY they matter
- Avoid HOW to implement
- Written for security stakeholders and development leads

---

## Problem Statement

The test suite contains several security anti-patterns that, while not affecting production, create bad habits and potential CI/CD vulnerabilities:

1. **SQL Injection in Tests**: E2E tests interpolate environment variables directly into SQL queries
2. **Hardcoded Password Fallbacks**: 67 test files use `process.env.PASSWORD || 'TestPassword123!'`
3. **Documentation Examples**: Blog posts and quickstart guides contain example passwords

### Why This Matters

- Bad patterns in tests get copy-pasted to production code
- CI/CD environments may have different trust boundaries than expected
- Security audits flag these issues even in test code
- New developers learn from existing patterns

---

## User Scenarios & Testing

### Primary Security Story

As a development team member, I need test code to follow the same security patterns as production code so that I don't accidentally introduce vulnerabilities when referencing test patterns.

### Critical Security Scenarios

#### Scenario 1: SQL Injection Prevention in Tests

1. **Given** a test file uses SQL queries, **When** environment variables are used, **Then** they must be properly escaped or parameterized
2. **Given** a malicious value in an environment variable, **When** the test runs, **Then** SQL injection is not possible

**Acceptance Criteria:**

- All SQL in test files uses `escapeSQL()` or parameterized queries
- No string interpolation directly into SQL strings
- CI pipeline validates SQL patterns in test files

#### Scenario 2: Required Environment Variables

1. **Given** a test needs credentials, **When** the env var is missing, **Then** the test fails immediately with clear error message
2. **Given** I run tests without configuring `.env`, **When** tests start, **Then** I get a clear list of missing required variables
3. **Given** all env vars are configured, **When** tests run, **Then** no hardcoded fallbacks are used

**Acceptance Criteria:**

- No `|| 'DefaultPassword'` patterns in test files
- Tests fail fast when credentials are missing
- Clear documentation of required test environment setup

#### Scenario 3: Clean Documentation

1. **Given** I read the quickstart guide, **When** I see code examples, **Then** passwords use placeholder text like `<your-password>`
2. **Given** I search the codebase for `TestPassword123`, **When** results are returned, **Then** only test fixtures (not production paths) appear

**Acceptance Criteria:**

- Documentation uses placeholder passwords
- No real-looking passwords in public-facing content
- Test fixtures clearly marked as non-production

---

## Functional Requirements

### P0 - Critical (Must Have)

| ID     | Requirement                                            | Acceptance Criteria                                            |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------- |
| FR-001 | All SQL queries in tests must use proper escaping      | `grep "'\${" tests/ \| grep -v escapeSQL` returns zero results |
| FR-002 | Test credential environment variables must be required | Tests fail with clear error if TEST*USER*\* vars missing       |

### P1 - High Priority

| ID     | Requirement                                                | Acceptance Criteria                                |
| ------ | ---------------------------------------------------------- | -------------------------------------------------- |
| FR-003 | Remove all hardcoded password fallbacks from test files    | Grep for `\|\| 'TestPassword` returns zero results |
| FR-004 | Create centralized test credentials module with validation | Single source of truth for test user configuration |
| FR-005 | Add CI check for SQL injection patterns in tests           | PR blocked if SQL injection pattern detected       |

### P2 - Medium Priority

| ID     | Requirement                                       | Acceptance Criteria                               |
| ------ | ------------------------------------------------- | ------------------------------------------------- |
| FR-006 | Update documentation to use placeholder passwords | No `TestPassword123!` in public docs              |
| FR-007 | Document required test environment setup          | New developers can configure tests in < 5 minutes |

---

## Files Affected

### Test Files (67 with credential fallbacks)

- `tests/e2e/**/*.spec.ts`
- `tests/integration/**/*.test.ts`
- `tests/contract/**/*.test.ts`

### SQL Injection Fixes

- `tests/e2e/auth/welcome-message.spec.ts` (PARTIAL - email escaped, UUIDs need escaping)
- `tests/e2e/auth/complete-flows.spec.ts`
- `tests/e2e/global-setup.ts`

### Documentation

- `docs/messaging/QUICKSTART.md`
- `public/blog/authentication-supabase-oauth.md`

### Centralized Credentials

- `tests/fixtures/test-user.ts` (consolidation target)

---

## Success Metrics

1. **SQL Safety**: Zero SQL injection patterns in test files
2. **Configuration**: Tests fail clearly when env vars missing
3. **Consistency**: Single source of truth for test credentials
4. **Documentation**: No real-looking passwords in public content

---

## Clarifications

### Session 2025-12-14

#### Q1: SQL Injection Scope

**Question**: Should SQL injection prevention apply to ALL interpolated values in SQL queries, including UUIDs?
**Answer**: All values must be escaped/parameterized, including UUIDs, emails, and any interpolated data.
**Impact**: Update FR-001 scope to include ALL interpolated values, not just user-controlled data. The "FIXED" status of `welcome-message.spec.ts` is incomplete - UUIDs on lines 88, 93, 101, 161-162 also need escaping.

#### Q2: Fallback Behavior for All User Types

**Question**: Should ALL test user types (PRIMARY, SECONDARY, TERTIARY, ADMIN) have NO fallbacks?
**Answer**: No fallbacks anywhere. All 4 user types require environment variables to be configured.
**Impact**: Update FR-003 to explicitly cover all 4 user types in `tests/fixtures/test-user.ts`. Tests will fail if any of the following are missing:

- `TEST_USER_PRIMARY_EMAIL`, `TEST_USER_PRIMARY_PASSWORD`
- `TEST_USER_SECONDARY_EMAIL`, `TEST_USER_SECONDARY_PASSWORD`
- `TEST_USER_TERTIARY_EMAIL`, `TEST_USER_TERTIARY_PASSWORD`
- `TEST_USER_ADMIN_EMAIL`, `TEST_USER_ADMIN_PASSWORD`

#### Q3: CI Check Implementation

**Question**: How should the CI check detect SQL injection patterns in test files?
**Answer**: Grep for unsafe patterns (e.g., `${` inside SQL strings in .spec.ts/.test.ts files) with an allowlist for `escapeSQL()` usage.
**Impact**: FR-005 CI check should:

- Detect: `${variable}` inside SQL query strings
- Allow: `${escapeSQL(variable)}` patterns
- Target files: `**/*.spec.ts`, `**/*.test.ts`

#### Q4: Validation Timing

**Question**: When should the validation for missing test credentials run?
**Answer**: Pre-flight check via Vitest setupFile that validates ALL required env vars before any test runs.
**Impact**: FR-002 implementation should add a `tests/setup-env-validation.ts` file included in Vitest's `setupFiles` that:

- Checks all required TEST*USER*\* env vars
- Throws clear error listing ALL missing vars
- Runs before any test executes

#### Q5: Documentation Cleanup Scope

**Question**: Which files should be updated to remove hardcoded passwords for documentation cleanup (FR-006)?
**Answer**: Update ALL files including:

- Public docs (`docs/`, `public/blog/`)
- Internal guidance (`CLAUDE.md`)
- Test fixtures (`tests/fixtures/test-user.ts`)
  **Impact**: FR-006 scope expanded. Use `<your-password>` or `${TEST_PASSWORD}` placeholders throughout.
