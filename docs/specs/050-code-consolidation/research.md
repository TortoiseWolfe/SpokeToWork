# Technical Research: Code Consolidation

**Feature**: 050-code-consolidation
**Date**: 2025-12-15

## Overview

This document captures technical research and decisions for consolidating duplicate implementations in the codebase.

---

## Offline Queue Consolidation

### Current State Analysis

| Implementation                                | Database         | Pattern          | Retry Strategy      | Features                        |
| --------------------------------------------- | ---------------- | ---------------- | ------------------- | ------------------------------- |
| `utils/offline-queue.ts`                      | Native IndexedDB | Functional       | Manual tracking     | Basic CRUD                      |
| `services/messaging/offline-queue-service.ts` | Dexie.js         | Class/Singleton  | Exponential (1-16s) | Status tracking, encryption     |
| `lib/payments/offline-queue.ts`               | Dexie.js         | Functional+Class | Exponential (2^n)   | Payment intent handling         |
| `lib/companies/offline-sync.ts`               | Native IndexedDB | Class/Singleton  | Manual              | Conflict resolution, versioning |

### Decision: Dexie.js as Standard

**Rationale**:

1. Already used by 2/4 implementations (messaging, payments)
2. Cleaner API than native IndexedDB
3. Built-in TypeScript support
4. Promise-based operations
5. Easy schema migrations

**Alternatives Rejected**:

- Native IndexedDB: More boilerplate, harder to maintain
- localForage: Less control, not already in codebase

### Base Queue Design

```typescript
// src/lib/offline-queue/types.ts
interface QueueItem {
  id: string;
  type: string;
  data: unknown;
  status: 'pending' | 'processing' | 'failed';
  retries: number;
  createdAt: number;
  lastAttempt?: number;
  error?: string;
}

interface QueueConfig {
  dbName: string;
  tableName: string;
  maxRetries: number;
  retryStrategy: 'exponential' | 'linear' | 'fixed';
  baseDelay: number;
}
```

### Retry Strategy Decision

**Chosen**: Exponential backoff (1s, 2s, 4s, 8s, 16s)

**Rationale**:

1. Standard industry practice
2. Prevents overwhelming server during outages
3. Already implemented in messaging queue (proven pattern)
4. Max 5 retries = 31 seconds total before giving up

**Formula**: `delay = baseDelay * 2^(retryCount - 1)`

---

## Audit Logger Consolidation

### Current State Analysis

| Implementation                  | Pattern    | Event Types | Usage                   |
| ------------------------------- | ---------- | ----------- | ----------------------- |
| `lib/auth/audit-logger.ts`      | Functional | 8 events    | 4 production components |
| `services/auth/audit-logger.ts` | Class/OOP  | 12 events   | Test file only          |

### Decision: Keep Functional Pattern

**Rationale**:

1. Actually used in production (4 components)
2. Simpler API for consumers
3. Class version is dead code (only in tests)
4. No need to refactor working code

**Actions**:

1. Remove `services/auth/audit-logger.ts`
2. Remove `tests/unit/auth/audit-logger.test.ts`
3. Add JSDoc to `lib/auth/audit-logger.ts` documenting it as canonical

---

## Email Validation Consolidation

### Current State Analysis

| Implementation                | Completeness | TLD Check   | Disposable | Normalization |
| ----------------------------- | ------------ | ----------- | ---------- | ------------- |
| `lib/auth/email-validator.ts` | Full         | 51 TLDs     | 12 domains | Yes           |
| `lib/validation/patterns.ts`  | Minimal      | None        | No         | No            |
| `lib/messaging/validation.ts` | Moderate     | Length only | No         | No            |

### Decision: Auth Validator as Canonical

**Rationale**:

1. Most comprehensive implementation
2. TLD whitelist prevents typos
3. Disposable email detection for spam prevention
4. Already includes normalization

**Migration Path**:

1. `lib/messaging/validation.ts` - Import `validateEmail` from auth
2. `lib/validation/patterns.ts` - Re-export `isValidEmail` from auth
3. Consumers don't need changes (same function signatures)

---

## Rate Limiting Cleanup

### Current State Analysis

| Implementation                 | Approach        | Storage      | Status    |
| ------------------------------ | --------------- | ------------ | --------- |
| `lib/auth/rate-limit-check.ts` | Server-side RPC | PostgreSQL   | Active    |
| `lib/auth/rate-limiter.ts`     | Client-side     | localStorage | Dead code |

### Decision: Remove Client-Side Rate Limiter

**Rationale**:

1. Never imported anywhere in production code
2. Only exists in its own test file
3. Client-side rate limiting is bypassable (security theater)
4. Server-side RPC is the correct approach

**Security Analysis**:

- Client-side can be bypassed by: clearing localStorage, incognito mode, dev tools
- Server-side cannot be bypassed: enforced in PostgreSQL functions

**Actions**:

1. Delete `lib/auth/rate-limiter.ts`
2. Delete `tests/unit/auth/rate-limiter.test.ts`
3. Add comment to `rate-limit-check.ts` documenting it as canonical

---

## Migration Strategy

### Order of Operations

1. **Dead Code Removal** (safest first)
   - Rate limiter + test
   - Audit logger class + test
   - No consumers to update

2. **Offline Queue** (most complex)
   - Create new abstraction
   - Migrate consumers one by one
   - Deprecate old implementations
   - Remove after verification

3. **Email Validation** (import updates only)
   - Update imports
   - No new code
   - Low risk

### Deprecation Pattern

```typescript
// In deprecated files, add at top:
console.warn(
  '[DEPRECATED] This module is deprecated. ' +
    'Use @/lib/offline-queue instead. ' +
    'See docs/specs/050-code-consolidation/spec.md'
);
```

### Testing Strategy

1. Run existing tests before changes
2. After each migration, run affected tests
3. Full test suite after completion
4. Verify no imports from deprecated paths

---

## Risk Mitigation

| Risk                     | Probability | Impact | Mitigation                  |
| ------------------------ | ----------- | ------ | --------------------------- |
| Breaking queue consumers | Medium      | High   | Migrate one at a time       |
| Lost conflict resolution | Low         | High   | Preserve in company-adapter |
| Test coverage gaps       | Low         | Medium | Maintain 100% coverage      |
| Import path confusion    | Medium      | Low    | Deprecation warnings        |

---

## References

- Dexie.js documentation: https://dexie.org/
- Exponential backoff: https://en.wikipedia.org/wiki/Exponential_backoff
- IndexedDB specification: https://w3c.github.io/IndexedDB/
