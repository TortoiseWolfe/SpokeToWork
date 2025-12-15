# Feature Specification: Code Consolidation

**Feature Branch**: `050-code-consolidation`
**Created**: 2025-12-13
**Status**: Ready for Planning
**Priority**: P2 (Medium)
**Input**: Code review finding - duplicate implementations across codebase

---

## Clarifications

### Session 2025-12-15

**Q1: Offline Queue Scope**
The spec initially listed 3 implementations, but 4 were found:

1. `src/utils/offline-queue.ts` (forms)
2. `src/services/messaging/offline-queue-service.ts` (messaging)
3. `src/lib/payments/offline-queue.ts` (payments)
4. `src/lib/companies/offline-sync.ts` (companies - with conflict resolution)

**Decision**: Include all 4 in consolidation.

**Q2: Database Wrapper**
Two approaches exist: Native IndexedDB (forms, companies) and Dexie.js (messaging, payments).

**Decision**: Standardize on Dexie.js - cleaner API, already used by 2/4 implementations.

**Q3: Audit Logger Pattern**

- Functional version (`src/lib/auth/audit-logger.ts`) - used by 4 production components
- Class version (`src/services/auth/audit-logger.ts`) - only used in test file

**Decision**: Keep functional pattern (it's actually used in production), remove unused class.

**Q4: Rate Limiter Dead Code**
Client-side rate limiter (`src/lib/auth/rate-limiter.ts`) is never imported or used anywhere except its test file.

**Decision**: Delete rate-limiter.ts and its test file - it's unused and bypassable.

## Execution Flow (main)

```
1. Parse input from code quality review
   → Feature: Consolidate duplicate implementations
2. Extract duplication issues
   → 3 offline queue implementations
   → 2 audit logger implementations
   → 3 email validation implementations
   → 2 rate limiting implementations
3. Identify affected users
   → Developers: Reduced maintenance burden
   → Code reviewers: Clearer ownership
4. Generate Functional Requirements
   → P1: Consolidate offline queues
   → P1: Consolidate audit loggers
   → P2: Consolidate email validation
   → P2: Clarify rate limiting approach
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT consolidation outcomes are needed
- Avoid implementation specifics
- Written for tech leads and architects

---

## Problem Statement

The codebase contains multiple implementations of the same functionality, creating:

1. **Maintenance burden**: Bug fixes must be applied in multiple places
2. **Inconsistent behavior**: Different implementations may behave differently
3. **Confusion**: Developers unsure which implementation to use

### Duplicate Areas Identified

| Functionality    | Implementations | Files                                                 |
| ---------------- | --------------- | ----------------------------------------------------- |
| Offline Queue    | 4               | utils, messaging service, payments lib, companies lib |
| Audit Logger     | 2               | lib/auth (functional), services/auth (class)          |
| Email Validation | 3               | auth, messaging, validation                           |
| Rate Limiting    | 2               | client-side (unused), server-side (active)            |

---

## User Scenarios & Testing

### Primary Code Quality Story

As a developer maintaining this codebase, I need a single canonical implementation of each utility so that I know exactly where to fix bugs and add features.

### Critical Consolidation Scenarios

#### Scenario 1: Offline Queue Unification

1. **Given** I need to queue an operation for offline retry, **When** I look for the offline queue, **Then** there is one clear implementation to use
2. **Given** the queue needs a bug fix, **When** I fix it in one place, **Then** all domains (forms, messaging, payments) benefit
3. **Given** I add a new offline-capable feature, **When** I integrate with the queue, **Then** I extend the shared abstraction

**Acceptance Criteria:**

- Single `OfflineQueue` abstraction in `src/lib/offline-queue/`
- Domain-specific adapters for forms, messaging, payments
- Same retry logic, exponential backoff, and sync behavior

#### Scenario 2: Audit Logger Consolidation

1. **Given** I need to log a security event, **When** I import the audit logger, **Then** there is one implementation
2. **Given** I want to change log format, **When** I update the logger, **Then** all auth events use new format
3. **Given** both functional and OOP patterns exist, **When** consolidated, **Then** one pattern is chosen consistently

**Acceptance Criteria:**

- Single audit logger implementation
- All auth-related logging uses same interface
- Clear migration path for existing usages

#### Scenario 3: Email Validation Consistency

1. **Given** I validate an email anywhere in the app, **When** the same email is tested, **Then** the result is consistent
2. **Given** the most comprehensive validator exists in auth, **When** used elsewhere, **Then** messaging and forms get same validation
3. **Given** I want to add disposable email detection, **When** I update one file, **Then** all email validation benefits

**Acceptance Criteria:**

- Single email validation module
- Includes TLD check, disposable domain detection
- Used by auth, messaging, and form validation

#### Scenario 4: Rate Limiting Clarification

1. **Given** client-side and server-side rate limiters exist, **When** I read documentation, **Then** the purpose of each is clear
2. **Given** server-side is more secure, **When** designing features, **Then** I know to prefer server-side
3. **Given** client-side rate limiter is unused, **When** codebase is cleaned, **Then** dead code is removed

**Acceptance Criteria:**

- Clear documentation of rate limiting strategy
- Client-side code removed OR documented with use case
- Server-side RPC is the canonical implementation

---

## Functional Requirements

### P1 - High Priority

| ID     | Requirement                                       | Acceptance Criteria                         |
| ------ | ------------------------------------------------- | ------------------------------------------- |
| FR-001 | Create unified offline queue abstraction          | One base class with domain adapters         |
| FR-002 | Consolidate audit logger to single implementation | One import path for audit logging           |
| FR-003 | Remove or document client-side rate limiter       | Clear decision on client vs server approach |

### P2 - Medium Priority

| ID     | Requirement                                                | Acceptance Criteria                          |
| ------ | ---------------------------------------------------------- | -------------------------------------------- |
| FR-004 | Consolidate email validation to auth module                | Single export used by all validators         |
| FR-005 | Update imports across codebase to use consolidated modules | No imports from deprecated locations         |
| FR-006 | Add deprecation warnings to old module locations           | Developers see warnings if using old imports |

---

## Files Affected

### Offline Queue Consolidation

**Create**: `src/lib/offline-queue/` (Dexie.js-based)

- `index.ts` - Module barrel export
- `base-queue.ts` - Base Dexie.js abstraction with shared retry logic
- `types.ts` - Shared TypeScript interfaces
- `form-adapter.ts` - Form submissions adapter
- `message-adapter.ts` - Messaging adapter
- `payment-adapter.ts` - Payments adapter
- `company-adapter.ts` - Company sync adapter with conflict resolution

**Deprecate → Remove**:

- `src/utils/offline-queue.ts`
- `src/services/messaging/offline-queue-service.ts`
- `src/lib/payments/offline-queue.ts`
- `src/lib/companies/offline-sync.ts`

### Audit Logger Consolidation

**Keep**: `src/lib/auth/audit-logger.ts` (functional pattern - used by 4 components)
**Remove**: `src/services/auth/audit-logger.ts` (unused class - only in test file)
**Remove**: `tests/unit/auth/audit-logger.test.ts` (tests unused class)

### Email Validation Consolidation

**Keep**: `src/lib/auth/email-validator.ts` (most comprehensive)
**Update**: `src/lib/messaging/validation.ts` to import from auth
**Update**: `src/lib/validation/patterns.ts` to re-export from auth

### Rate Limiting

**Keep**: `src/lib/auth/rate-limit-check.ts` (server-side RPC - canonical)
**Remove**: `src/lib/auth/rate-limiter.ts` (dead code - never imported)
**Remove**: `tests/unit/auth/rate-limiter.test.ts` (tests dead code)

---

## Success Metrics

1. **Reduction**: 4 duplicate patterns reduced to 4 canonical implementations
2. **Imports**: All code uses single import path per functionality
3. **Documentation**: Each consolidated module has clear usage docs
4. **Tests**: Consolidated modules maintain 100% of original test coverage
