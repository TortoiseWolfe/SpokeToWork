# Implementation Plan: Remove IndexedDB Private Key Storage

**Branch**: `048-indexeddb-encryption` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-indexeddb-encryption/spec.md`

## Summary

Remove dead IndexedDB private key storage code and migrate two consumers (`useConversationRealtime.ts` and `gdpr-service.ts`) to use the memory-based `keyManagementService.getCurrentKeys()` pattern. This consolidates the codebase to a single key management approach (password-derived, memory-only) and fixes a bug where message decryption was silently failing.

## Technical Context

**Language/Version**: TypeScript 5.x with React 19, Next.js 15
**Primary Dependencies**: Dexie.js 4.0.10 (IndexedDB), Web Crypto API, hash-wasm (Argon2id)
**Storage**: Supabase PostgreSQL (salt + public key), IndexedDB (queued/cached messages only after this change)
**Testing**: Vitest 3.x with happy-dom
**Target Platform**: Browser (PWA), static export to GitHub Pages
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: No regression in message decryption latency
**Constraints**: Client-side only (no server-side API routes), memory-based keys cleared on tab close
**Scale/Scope**: ~10 files affected, ~200 lines removed, ~50 lines modified

## Constitution Check

_GATE: Must pass before implementation._

| Principle                         | Status | Notes                                                               |
| --------------------------------- | ------ | ------------------------------------------------------------------- |
| Proper Solutions Over Quick Fixes | ✅     | Removing dead code is the proper fix, not encrypting unused storage |
| Root Cause Analysis               | ✅     | Root cause identified: Feature 032 didn't fully migrate consumers   |
| Stability Over Speed              | ✅     | Fixes existing bug (null keys), improves reliability                |
| Clean Architecture                | ✅     | Consolidates to single key management pattern                       |
| No Technical Debt                 | ✅     | Actively removing tech debt (dead code)                             |
| Docker-First                      | ✅     | All commands via docker compose exec                                |
| Static Hosting                    | ✅     | No server-side changes needed                                       |
| Component Structure               | N/A    | No new UI components                                                |
| Database Migrations               | N/A    | No schema changes (IndexedDB client-side only)                      |

**All gates pass.** No constitution violations.

## Project Structure

### Documentation (this feature)

```text
docs/specs/048-indexeddb-encryption/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── tasks.md             # Task list (to be generated)
└── checklists/
    └── requirements.md  # Requirements validation (to be generated)
```

### Source Code (affected files)

```text
src/
├── hooks/
│   └── useConversationRealtime.ts    # MODIFY: Use keyManagementService
├── services/
│   └── messaging/
│       ├── gdpr-service.ts           # MODIFY: Use keyManagementService
│       ├── key-service.ts            # READ ONLY (source of truth)
│       └── __tests__/
│           ├── gdpr-service.test.ts  # MODIFY: Update mocks
│           └── key-service.test.ts   # MODIFY: Remove stale mocks
├── lib/
│   └── messaging/
│       ├── encryption.ts             # MODIFY: Remove private key methods
│       ├── database.ts               # MODIFY: Remove messaging_private_keys
│       └── __tests__/
│           └── encryption.test.ts    # MODIFY: Remove private key tests
├── types/
│   └── messaging.ts                  # MODIFY: Remove PrivateKey type (if unused)
└── docs/
    └── messaging/
        └── QUICKSTART.md             # MODIFY: Update documentation
```

## Implementation Phases

### Phase 1: Migrate Consumers (Bug Fix)

**Goal**: Fix the broken message decryption by using correct key source.

1. **useConversationRealtime.ts**
   - Import `keyManagementService` from `@/services/messaging/key-service`
   - Replace `encryptionService.getPrivateKey(user.id)` with `keyManagementService.getCurrentKeys()`
   - Handle null case (keys not yet derived - user needs to re-authenticate)
   - Update `privateKeyCache` to use memory keys directly

2. **gdpr-service.ts**
   - Import `keyManagementService`
   - Replace `encryptionService.getPrivateKey(user.id)` with `keyManagementService.getCurrentKeys()`
   - Handle null case gracefully (skip decryption if no keys)

### Phase 2: Remove Dead Code

**Goal**: Clean up unused IndexedDB private key storage.

1. **encryption.ts**
   - Remove `storePrivateKey()` method
   - Remove `getPrivateKey()` method
   - Update `deletePrivateKey()` to no-op or remove entirely
   - Remove import of `db` if no longer needed

2. **database.ts**
   - Remove `messaging_private_keys` table from schema
   - Remove `PrivateKey` type import
   - Update version if needed (Dexie migration)

3. **types/messaging.ts**
   - Remove `PrivateKey` type definition (verify no other usages first)

### Phase 3: Update Tests

**Goal**: Ensure all tests pass with new architecture.

1. **encryption.test.ts**
   - Remove `describe('storePrivateKey', ...)` block
   - Remove `describe('getPrivateKey', ...)` block
   - Remove any integration tests using these methods

2. **gdpr-service.test.ts**
   - Update mocks to use `keyManagementService.getCurrentKeys()`
   - Remove `encryptionService.getPrivateKey` mocks

3. **key-service.test.ts**
   - Remove any mocks for `encryptionService.storePrivateKey`
   - Remove any mocks for `encryptionService.getPrivateKey`

### Phase 4: Update Documentation

**Goal**: Remove references to obsolete API.

1. **QUICKSTART.md**
   - Remove examples using `storePrivateKey()`
   - Remove examples using `getPrivateKey()`
   - Update key management section to reflect memory-only pattern

## Risk Assessment

| Risk                                 | Likelihood | Impact | Mitigation                                      |
| ------------------------------------ | ---------- | ------ | ----------------------------------------------- |
| Breaking existing message decryption | Low        | High   | Already broken (returns null) - this fixes it   |
| Dexie schema change causing issues   | Low        | Medium | Test IndexedDB migration in dev first           |
| Missing a consumer of getPrivateKey  | Low        | Medium | Grep search completed, only 2 production usages |
| Test failures after removal          | Medium     | Low    | Expected - will fix in Phase 3                  |

## Rollback Plan

If issues arise:

1. `git revert` the commits on this branch
2. Create new spec with alternative approach
3. No data loss risk (private keys already not in IndexedDB)

## Success Criteria

1. `docker compose exec spoketowork pnpm run type-check` passes
2. `docker compose exec spoketowork pnpm test` passes
3. `docker compose exec spoketowork pnpm run lint` passes
4. No references to `storePrivateKey` or `getPrivateKey` in `src/` (except tests for deletion)
5. Message decryption works in realtime conversations (manual E2E test)
