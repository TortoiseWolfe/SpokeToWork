# Feature Specification: Dead Code Cleanup

**Feature Branch**: `045-dead-code-cleanup`
**Created**: 2025-12-13
**Status**: Draft
**Priority**: P2 (Medium)
**Input**: Code review finding - placeholder tests, unused functions, commented code

## Execution Flow (main)

```
1. Parse input from code quality review
   → Feature: Remove dead code and implement placeholders
2. Extract dead code issues
   → 5 placeholder tests with trivial assertions
   → 1 unused function (_handleRejectAll)
   → 1 deprecated method (hasValidKeys)
   → Commented code blocks in tests/middleware
3. Identify affected users
   → Developers: Cleaner codebase
   → Test coverage: More accurate metrics
4. Generate Functional Requirements
   → P1: Implement or remove placeholder tests
   → P1: Remove unused functions
   → P2: Remove commented code blocks
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT code needs to be cleaned up
- Avoid implementation specifics
- Written for code quality stakeholders

---

## Problem Statement

The codebase contains dead code that creates:

1. **False confidence**: Placeholder tests pass but test nothing
2. **Confusion**: Unused code suggests it's needed
3. **Noise**: Commented code clutters file reading
4. **Maintenance debt**: Deprecated methods that should be removed

### Dead Code Inventory

| Type               | Count    | Files                         |
| ------------------ | -------- | ----------------------------- |
| Placeholder tests  | 5        | Privacy components            |
| Unused functions   | 1        | CookieConsent                 |
| Deprecated methods | 1        | key-service                   |
| Commented code     | 4 blocks | oauth-state tests, middleware |

---

## User Scenarios & Testing

### Primary Code Quality Story

As a developer reading this codebase, I need all code to serve a purpose so that I can trust test coverage metrics and understand what code is actually in use.

### Critical Cleanup Scenarios

#### Scenario 1: Placeholder Test Resolution

1. **Given** ConsentModal has a placeholder accessibility test, **When** I run coverage, **Then** the test either provides real coverage OR is removed with explanation
2. **Given** PrivacyControls has placeholder tests, **When** code review occurs, **Then** reviewers don't see `expect(true).toBe(true)`
3. **Given** tests reference "integration tests", **When** those integration tests exist, **Then** placeholder can be safely removed

**Acceptance Criteria:**

- No tests with `expect(true).toBe(true)`
- Each test file provides meaningful coverage
- Placeholder removal documented if integration tests cover functionality

#### Scenario 2: Unused Function Removal

1. **Given** `_handleRejectAll` exists but is never called, **When** I search for usages, **Then** zero results (confirms unused)
2. **Given** the function has a void cast to suppress warnings, **When** cleaned up, **Then** the void cast and function are removed
3. **Given** the function might be needed later, **When** deciding to remove, **Then** git history preserves it

**Acceptance Criteria:**

- No unused functions with void casts
- Functions either called or removed
- Git history available if restoration needed

#### Scenario 3: Deprecated Method Removal

1. **Given** `hasValidKeys()` is marked deprecated, **When** I search for callers, **Then** all callers use recommended alternative
2. **Given** the deprecation comment suggests `getCurrentKeys() !== null`, **When** migrated, **Then** all callers use new pattern
3. **Given** no callers remain, **When** cleaned up, **Then** deprecated method is removed

**Acceptance Criteria:**

- Deprecated methods have zero callers
- Migration path documented and followed
- Method removed after migration complete

#### Scenario 4: Commented Code Removal

1. **Given** oauth-state tests have commented test code, **When** reviewing, **Then** either uncomment and fix OR delete entirely
2. **Given** middleware has example code comments, **When** cleaned up, **Then** examples moved to documentation OR removed
3. **Given** commented code is 6+ months old, **When** deciding, **Then** prefer deletion (git history preserves)

**Acceptance Criteria:**

- No multi-line commented code blocks
- Examples in documentation, not inline comments
- Single-line explanatory comments are acceptable

---

## Functional Requirements

### P1 - High Priority

| ID     | Requirement                                                    | Acceptance Criteria                                  |
| ------ | -------------------------------------------------------------- | ---------------------------------------------------- |
| FR-001 | Implement real tests OR remove placeholders with justification | Zero `expect(true).toBe(true)` patterns              |
| FR-002 | Remove `_handleRejectAll` and void cast from CookieConsent     | Function no longer exists in codebase                |
| FR-003 | Migrate `hasValidKeys()` callers and remove deprecated method  | Method no longer exists, all callers use new pattern |

### P2 - Medium Priority

| ID     | Requirement                                       | Acceptance Criteria                |
| ------ | ------------------------------------------------- | ---------------------------------- |
| FR-004 | Remove commented test code from oauth-state tests | No commented `expect()` statements |
| FR-005 | Remove example code comments from middleware      | Examples in docs, not inline       |
| FR-006 | Audit for other unused exports and remove         | ESLint unused-exports rule passes  |

---

## Files Affected

### Placeholder Tests

- `src/components/privacy/ConsentModal/ConsentModal.accessibility.test.tsx`
- `src/components/privacy/PrivacyControls/PrivacyControls.accessibility.test.tsx`
- (3 more in privacy components)

### Unused Functions

- `src/components/privacy/CookieConsent/CookieConsent.tsx` - `_handleRejectAll`

### Deprecated Methods

- `src/services/messaging/key-service.ts` - `hasValidKeys()`

### Commented Code

- `src/lib/auth/__tests__/oauth-state.test.ts` - lines 205-229
- `src/lib/supabase/middleware.ts` - lines 107-113

---

## Success Metrics

1. **Tests**: Zero placeholder assertions in test suite
2. **Coverage**: Test coverage metrics reflect actual testing
3. **Linting**: ESLint unused-exports rule enabled and passing
4. **Readability**: No multi-line commented code blocks
