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

| ID     | Requirement                                            | Acceptance Criteria                                        |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------- |
| FR-001 | All SQL queries in tests must use proper escaping      | Grep for SQL + `${` returns zero results without escapeSQL |
| FR-002 | Test credential environment variables must be required | Tests fail with clear error if TEST*USER*\* vars missing   |

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

- `tests/e2e/auth/welcome-message.spec.ts` (FIXED)
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
