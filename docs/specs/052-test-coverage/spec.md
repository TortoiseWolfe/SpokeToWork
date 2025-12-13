# Feature Specification: Test Coverage Expansion

**Feature Branch**: `052-test-coverage`
**Created**: 2025-12-13
**Status**: Draft
**Priority**: P2 (Medium)
**Input**: Code review finding - 55 untested files, 54% coverage of lib/services/hooks

## Execution Flow (main)

```
1. Parse input from test coverage review
   → Feature: Expand test coverage for critical untested files
2. Extract coverage gaps
   → Critical: 5 payment/auth files with zero tests
   → High: 9 core service files untested
   → Medium: 17 hooks untested
3. Identify affected users
   → Developers: Confidence in refactoring
   → Users: Fewer production bugs
4. Generate Functional Requirements
   → P0: Test critical payment/auth code
   → P1: Test core services
   → P2: Test hooks
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT needs tests and WHY
- Avoid implementation specifics
- Written for quality assurance stakeholders

---

## Problem Statement

The codebase has ~54% test coverage for lib/services/hooks files. Critical payment and authentication code lacks unit tests, creating risk for:

1. **Regressions**: Changes may break untested code paths
2. **Refactoring fear**: Developers avoid improving untested code
3. **Production bugs**: Edge cases not caught before deployment

### Coverage Gap Summary

| Priority | Category       | Untested Files | Risk Level |
| -------- | -------------- | -------------- | ---------- |
| Critical | Payments       | 5              | HIGH       |
| Critical | Auth           | 3              | HIGH       |
| High     | Routing/Routes | 3              | MEDIUM     |
| High     | Messaging      | 2              | MEDIUM     |
| High     | Supabase       | 3              | MEDIUM     |
| Medium   | Hooks          | 17             | LOW        |

---

## User Scenarios & Testing

### Primary Quality Story

As a developer making changes to critical code, I need comprehensive test coverage so that I can refactor with confidence and catch bugs before they reach production.

### Critical Coverage Scenarios

#### Scenario 1: Payment Code Coverage

1. **Given** `stripe.ts` handles checkout sessions, **When** tests run, **Then** success and error paths are covered
2. **Given** `paypal.ts` loads SDK and creates orders, **When** tests run, **Then** SDK loading and API calls are mocked and tested
3. **Given** `connection-listener.ts` syncs on reconnect, **When** tests run, **Then** online/offline transitions are tested

**Acceptance Criteria:**

- stripe.ts has > 80% coverage
- paypal.ts has > 80% coverage
- connection-listener.ts has > 80% coverage
- Payment error handling tested

#### Scenario 2: Auth Code Coverage

1. **Given** `retry-utils.ts` implements exponential backoff, **When** tests run, **Then** retry logic and timing are verified
2. **Given** `protected-route.tsx` guards routes, **When** tests run, **Then** redirect behavior is tested
3. **Given** `password-validator.ts` checks strength, **When** tests run, **Then** all validation rules are tested

**Acceptance Criteria:**

- retry-utils.ts has > 90% coverage (pure logic)
- protected-route.tsx has > 80% coverage
- password-validator.ts has > 90% coverage (pure logic)

#### Scenario 3: Core Service Coverage

1. **Given** `osrm-service.ts` calculates routes, **When** tests run, **Then** API calls and parsing are tested
2. **Given** `route-service.ts` manages CRUD, **When** tests run, **Then** create/read/update/delete are tested
3. **Given** `group-service.ts` handles group messaging, **When** tests run, **Then** group operations are tested

**Acceptance Criteria:**

- Routing services have > 70% coverage
- External APIs are mocked
- Error handling paths tested

#### Scenario 4: Context Coverage

1. **Given** `AuthContext.tsx` manages auth state, **When** tests run, **Then** sign-in/sign-out/session refresh are tested
2. **Given** `AccessibilityContext.tsx` manages a11y settings, **When** tests run, **Then** setting changes are tested

**Acceptance Criteria:**

- AuthContext has > 80% coverage
- State transitions tested
- Error scenarios tested

---

## Functional Requirements

### P0 - Critical (Must Have)

| ID     | Requirement                                             | Acceptance Criteria                   |
| ------ | ------------------------------------------------------- | ------------------------------------- |
| FR-001 | Add tests for `src/lib/payments/stripe.ts`              | Coverage > 80%, error handling tested |
| FR-002 | Add tests for `src/lib/payments/paypal.ts`              | Coverage > 80%, SDK mocking tested    |
| FR-003 | Add tests for `src/lib/auth/retry-utils.ts`             | Coverage > 90%, timing logic tested   |
| FR-004 | Add tests for `src/lib/auth/protected-route.tsx`        | Coverage > 80%, redirect tested       |
| FR-005 | Add tests for `src/lib/payments/connection-listener.ts` | Coverage > 80%, sync tested           |

### P1 - High Priority

| ID     | Requirement                                             | Acceptance Criteria                   |
| ------ | ------------------------------------------------------- | ------------------------------------- |
| FR-006 | Add tests for `src/lib/routing/osrm-service.ts`         | Coverage > 70%, API mocked            |
| FR-007 | Add tests for `src/lib/routes/route-service.ts`         | Coverage > 70%, CRUD tested           |
| FR-008 | Add tests for `src/lib/routes/route-export.ts`          | Coverage > 70%, export formats tested |
| FR-009 | Add tests for `src/lib/messaging/database.ts`           | Coverage > 70%, DB ops tested         |
| FR-010 | Add tests for `src/services/messaging/group-service.ts` | Coverage > 70%, group ops tested      |
| FR-011 | Add tests for `src/contexts/AuthContext.tsx`            | Coverage > 80%, state tested          |
| FR-012 | Add tests for `src/lib/supabase/client.ts`              | Coverage > 60%, initialization tested |
| FR-013 | Add tests for `src/lib/supabase/middleware.ts`          | Coverage > 60%, session tested        |

### P2 - Medium Priority

| ID     | Requirement                                           | Acceptance Criteria                 |
| ------ | ----------------------------------------------------- | ----------------------------------- |
| FR-014 | Add tests for 17 untested hooks                       | Each hook has basic happy path test |
| FR-015 | Increase overall lib/services/hooks coverage to 70%   | Coverage report shows 70%+          |
| FR-016 | Add tests for `src/lib/auth/password-validator.ts`    | Coverage > 90%                      |
| FR-017 | Add tests for `src/contexts/AccessibilityContext.tsx` | Coverage > 70%                      |

---

## Files Requiring Tests (Priority Order)

### Critical (P0)

1. `src/lib/payments/stripe.ts`
2. `src/lib/payments/paypal.ts`
3. `src/lib/auth/retry-utils.ts`
4. `src/lib/auth/protected-route.tsx`
5. `src/lib/payments/connection-listener.ts`

### High (P1)

6. `src/lib/routing/osrm-service.ts`
7. `src/lib/routes/route-service.ts`
8. `src/lib/routes/route-export.ts`
9. `src/lib/messaging/database.ts`
10. `src/services/messaging/group-service.ts`
11. `src/contexts/AuthContext.tsx`
12. `src/lib/supabase/client.ts`
13. `src/lib/supabase/middleware.ts`

### Medium (P2) - Hooks

14. useOfflineStatus, useReadReceipts, useKeyboardShortcuts
15. useIdleTimeout, useMetroAreas, useCompanies
16. useConnections, useGroupMembers, useUnreadCount
17. useUserProfile, useTileProviders, useRoutes
18. And 5 more...

---

## Success Metrics

1. **Critical Coverage**: All P0 files have > 80% coverage
2. **Overall Coverage**: lib/services/hooks at 70% (up from 54%)
3. **CI Integration**: Coverage thresholds enforced in CI
4. **Refactoring Confidence**: Developers can safely modify tested code
