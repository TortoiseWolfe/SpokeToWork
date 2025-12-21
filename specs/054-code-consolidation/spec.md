# Feature 054: Code Consolidation

## Priority: P2 (Code Quality)

## Problem Statement

Multiple duplicate implementations exist for common patterns, creating maintenance burden and inconsistency.

## Duplicate Implementations

### Offline Queue (3 implementations)

| File                                              | Purpose             |
| ------------------------------------------------- | ------------------- |
| `src/utils/offline-queue.ts`                      | IndexedDB for forms |
| `src/services/messaging/offline-queue-service.ts` | Dexie for messages  |
| `src/lib/payments/offline-queue.ts`               | Dexie for payments  |

**Recommendation**: Create unified abstraction in `src/lib/offline-queue/`

### Audit Logger (2 implementations)

| File                                | Style      |
| ----------------------------------- | ---------- |
| `src/lib/auth/audit-logger.ts`      | Functional |
| `src/services/auth/audit-logger.ts` | OOP class  |

**Recommendation**: Consolidate into single OOP pattern

### Email Validation (3 implementations)

| File                              | Notes              |
| --------------------------------- | ------------------ |
| `src/lib/auth/email-validator.ts` | Most comprehensive |
| `src/lib/messaging/validation.ts` | Partial            |
| `src/lib/validation/patterns.ts`  | Partial            |

**Recommendation**: Use auth version everywhere

### Rate Limiting (2 implementations)

| File                               | Type                     |
| ---------------------------------- | ------------------------ |
| `src/lib/auth/rate-limiter.ts`     | Client-side localStorage |
| `src/lib/auth/rate-limit-check.ts` | Server-side RPC          |

**Recommendation**: Document use cases or remove client version

## Requirements

### Functional Requirements

1. **FR-1**: Create unified offline queue abstraction
2. **FR-2**: Consolidate audit logger implementations
3. **FR-3**: Consolidate email validation to single source
4. **FR-4**: Clarify rate limiter usage or remove duplicate

### Non-Functional Requirements

1. **NFR-1**: Zero breaking changes to existing functionality
2. **NFR-2**: Maintain or improve test coverage
3. **NFR-3**: Clear documentation for each consolidated module

## Success Criteria

- [ ] Single offline queue implementation used everywhere
- [ ] Single audit logger implementation
- [ ] Single email validation source
- [ ] Rate limiter purpose documented or duplicate removed
- [ ] All existing tests pass

## Out of Scope

- Adding new functionality
- Changing external APIs
