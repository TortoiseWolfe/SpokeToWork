# Implementation Plan: Code Consolidation

**Branch**: `050-code-consolidation` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `docs/specs/050-code-consolidation/spec.md`

## Summary

Consolidate duplicate implementations across 4 areas (offline queue, audit logger, email validation, rate limiting) into single canonical modules. Primary approach:

1. Create unified Dexie.js-based offline queue with domain adapters
2. Keep functional audit logger, remove unused class
3. Consolidate email validation to auth module
4. Remove dead code (client-side rate limiter)

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15, React 19
**Primary Dependencies**: Dexie.js (IndexedDB wrapper), Supabase JS Client
**Storage**: IndexedDB (client-side queues), Supabase PostgreSQL (server-side)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (PWA, static export to GitHub Pages)
**Project Type**: Web application (Next.js frontend, Supabase backend)
**Performance Goals**: Offline-first, <100ms queue operations
**Constraints**: Static hosting (no server-side API routes), Docker-first development
**Scale/Scope**: Single codebase consolidation, ~15 files affected

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Status | Notes                                       |
| --------------------------------- | ------ | ------------------------------------------- |
| Proper Solutions Over Quick Fixes | ✅     | Creating unified abstraction, not patching  |
| Root Cause Analysis               | ✅     | Addressing duplication at source            |
| Stability Over Speed              | ✅     | Careful migration with deprecation warnings |
| Clean Architecture                | ✅     | Consolidating to single patterns            |
| No Technical Debt                 | ✅     | Removing dead code, not deferring           |
| Docker-First Development          | ✅     | All work via Docker                         |
| Component Structure               | N/A    | No new React components created             |

## Project Structure

### Documentation (this feature)

```text
docs/specs/050-code-consolidation/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions
├── tasks.md             # Implementation tasks
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code Changes

```text
src/
├── lib/
│   ├── offline-queue/           # NEW - Consolidated queue
│   │   ├── index.ts             # Barrel export
│   │   ├── base-queue.ts        # Base Dexie.js abstraction
│   │   ├── types.ts             # Shared interfaces
│   │   ├── form-adapter.ts      # Form submissions
│   │   ├── message-adapter.ts   # Messaging
│   │   ├── payment-adapter.ts   # Payments
│   │   └── company-adapter.ts   # Companies with conflict resolution
│   ├── auth/
│   │   ├── audit-logger.ts      # KEEP - Add JSDoc
│   │   ├── rate-limit-check.ts  # KEEP - Add canonical comment
│   │   ├── rate-limiter.ts      # REMOVE - Dead code
│   │   └── email-validator.ts   # KEEP - Canonical validator
│   ├── messaging/
│   │   └── validation.ts        # UPDATE - Import from auth
│   ├── validation/
│   │   └── patterns.ts          # UPDATE - Re-export from auth
│   └── payments/
│       └── offline-queue.ts     # DEPRECATE → REMOVE
├── utils/
│   └── offline-queue.ts         # DEPRECATE → REMOVE
└── services/
    ├── auth/
    │   └── audit-logger.ts      # REMOVE - Unused class
    └── messaging/
        └── offline-queue-service.ts  # DEPRECATE → REMOVE
```

**Structure Decision**: Consolidate offline queues to `src/lib/offline-queue/` with domain-specific adapters. Keep existing locations for other consolidated modules (auth validators, rate limiting).

## Implementation Phases

### Phase 1: Setup & Dead Code Removal (P1)

Remove dead code first to reduce confusion:

- Delete `src/lib/auth/rate-limiter.ts` and its test
- Delete `src/services/auth/audit-logger.ts` and its test
- Add JSDoc/comments to canonical implementations

### Phase 2: Offline Queue Consolidation (P1)

Highest complexity, highest value:

1. Create base Dexie.js abstraction
2. Implement domain adapters
3. Migrate consumers one at a time
4. Add deprecation warnings
5. Remove deprecated implementations

### Phase 3: Email Validation Consolidation (P2)

Lower complexity, update imports:

1. Update messaging validation to import from auth
2. Update patterns.ts to re-export from auth
3. Verify all consumers use consistent validation

### Phase 4: Verification

- Run full test suite
- Verify no imports from deprecated locations
- Commit changes

## Risk Assessment

| Risk                              | Mitigation                              |
| --------------------------------- | --------------------------------------- |
| Breaking existing queue consumers | Migrate one at a time, test each        |
| Different retry strategies        | Standardize to exponential backoff      |
| Company conflict resolution lost  | Preserve in company-adapter.ts          |
| Test coverage gaps                | Maintain 100% of original test coverage |

## Dependencies

### External

- Dexie.js (already installed, version ^4.0.1)
- No new dependencies required

### Internal

- `src/hooks/useWeb3Forms.ts` depends on form queue
- `src/services/messaging/message-service.ts` depends on message queue
- `src/lib/payments/payment-service.ts` depends on payment queue
- `src/lib/payments/connection-listener.ts` depends on queue processing

## Success Criteria

1. **Reduction**: 4 duplicate patterns → 4 canonical implementations
2. **Imports**: Single import path per functionality
3. **Documentation**: Each consolidated module has JSDoc
4. **Tests**: All existing tests pass, 100% coverage maintained
5. **Clean**: No imports from deprecated locations
