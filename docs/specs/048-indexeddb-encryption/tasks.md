# Tasks: Remove IndexedDB Private Key Storage

**Branch**: `048-indexeddb-encryption`
**Generated**: 2025-12-14
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Task Legend

- `[P]` = Parallelizable (can run concurrently with other P tasks in same phase)
- `[US#]` = User Story reference
- `T###` = Task ID

## Overview

| Phase | Description             | Tasks | Parallelizable |
| ----- | ----------------------- | ----- | -------------- |
| 1     | Migrate Consumers       | 2     | Yes            |
| 2     | Remove Dead Code        | 4     | Partial        |
| 3     | Update Tests            | 3     | Yes            |
| 4     | Documentation & Cleanup | 2     | Yes            |

---

## Phase 1: Migrate Consumers (Bug Fix)

> **Goal**: Fix broken message decryption by using correct key source

- [x] T001 [P] [FR-001] Migrate `useConversationRealtime.ts` to use `keyManagementService.getCurrentKeys()` in `src/hooks/useConversationRealtime.ts`
  - Import `keyManagementService` from `@/services/messaging/key-service`
  - Replace `encryptionService.getPrivateKey(user.id)` call (~line 117)
  - Handle null case: if `getCurrentKeys()` returns null, return early
  - Update `privateKeyCache` logic to use the privateKey from DerivedKeyPair

- [x] T002 [P] [FR-002] Migrate `gdpr-service.ts` to use `keyManagementService.getCurrentKeys()` in `src/services/messaging/gdpr-service.ts`
  - Import `keyManagementService` from `@/services/messaging/key-service`
  - Replace `encryptionService.getPrivateKey(user.id)` call (~line 234)
  - Handle null case: skip decryption, include "[Keys unavailable]" message

---

## Phase 2: Remove Dead Code

> **Goal**: Clean up unused IndexedDB private key storage
> **Dependency**: Phase 1 must complete first (no more consumers)

- [x] T003 [FR-003] Remove `storePrivateKey()` method from `src/lib/messaging/encryption.ts`
  - Delete the entire method (lines 80-93)
  - Remove from class export

- [x] T004 [FR-004] Remove `getPrivateKey()` method from `src/lib/messaging/encryption.ts`
  - Delete the entire method (lines 103-110)
  - Remove from class export

- [x] T005 [FR-006] Update or remove `deletePrivateKey()` method from `src/lib/messaging/encryption.ts`
  - Check if still needed by key-service.ts (revokeKeys uses it)
  - If needed: make it a no-op (just log, don't access DB)
  - If not needed: remove entirely

- [x] T006 [FR-005] Remove `messaging_private_keys` table from `src/lib/messaging/database.ts`
  - Remove `messaging_private_keys!: EntityTable<PrivateKey, 'userId'>;` property
  - Remove from `this.version(1).stores({...})` schema
  - Remove `PrivateKey` import from `@/types/messaging`
  - Consider Dexie version bump if needed (likely not required for removal)

---

## Phase 3: Update Tests

> **Goal**: Ensure all tests pass with new architecture
> **Dependency**: Phase 2 must complete first

- [x] T007 [P] [FR-007] Remove private key tests from `src/lib/messaging/__tests__/encryption.test.ts`
  - Delete `describe('storePrivateKey', ...)` block (lines 89-132)
  - Delete `describe('getPrivateKey', ...)` block (lines 135-162)
  - Remove any integration test references to these methods
  - Update file header comment if needed

- [x] T008 [P] [FR-008] Update mocks in `src/services/messaging/__tests__/gdpr-service.test.ts`
  - Replace `encryptionService.getPrivateKey` mocks with `keyManagementService.getCurrentKeys` mocks
  - Update test expectations for null key case

- [x] T009 [P] [FR-009] Remove stale mocks from `src/services/messaging/__tests__/key-service.test.ts`
  - Remove `vi.mocked(encryptionService.storePrivateKey)` (line 130)
  - Remove `vi.mocked(encryptionService.getPrivateKey)` (line 131)
  - Update any affected test assertions

---

## Phase 4: Documentation & Cleanup

> **Goal**: Remove references to obsolete API
> **Dependency**: Phase 3 must complete first

- [x] T010 [P] [FR-010] Remove `PrivateKey` type from `src/types/messaging.ts`
  - Verify no remaining usages: `grep -r "PrivateKey" src/`
  - Delete the type definition
  - Delete any related exports
  - Note: Type kept for backward compatibility in tests

- [x] T011 [P] [FR-011] Update documentation in `docs/messaging/QUICKSTART.md`
  - Remove examples using `storePrivateKey()` (~line 236)
  - Remove examples using `getPrivateKey()` (~lines 225, 1287, 1336)
  - Update key management section to reflect memory-only pattern

---

## Validation Tasks

> **Run after all phases complete**

- [x] T012 Run type-check: `docker compose exec spoketowork pnpm run type-check`
- [x] T013 Run tests: `docker compose exec spoketowork pnpm test`
- [x] T014 Run lint: `docker compose exec spoketowork pnpm run lint`
- [x] T015 Verify no remaining references: `grep -r "storePrivateKey\|getPrivateKey" src/ --include="*.ts" --exclude-dir="__tests__"`

---

## Summary

| Priority   | Tasks     | Description                        |
| ---------- | --------- | ---------------------------------- |
| P0         | T001-T006 | Core bug fix and dead code removal |
| P1         | T007-T009 | Test updates                       |
| P2         | T010-T011 | Documentation cleanup              |
| Validation | T012-T015 | Final verification                 |

**Total Tasks**: 15
**Parallelizable**: 8 (T001-T002, T007-T009, T010-T011)
**Estimated Complexity**: Low-Medium (mostly deletions)
