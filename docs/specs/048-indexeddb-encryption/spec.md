# Feature Specification: Remove IndexedDB Private Key Storage

**Feature Branch**: `048-indexeddb-encryption`
**Created**: 2025-12-13
**Updated**: 2025-12-14
**Status**: Clarified
**Priority**: P1 (High)
**Input**: Code review finding - dead code and inconsistent key storage patterns

## Execution Flow (main)

```
1. Parse input from code review + clarification session
   → Feature: Remove dead IndexedDB private key storage code
2. Extract issues identified
   → Dead code: storePrivateKey() never called in production
   → Bug: getPrivateKey() called but returns null (no writes)
   → Inconsistency: Two key storage patterns (memory vs IndexedDB)
3. Identify affected components
   → useConversationRealtime.ts - calls getPrivateKey() (broken)
   → gdpr-service.ts - calls getPrivateKey() (broken)
   → encryption.ts - has dead storePrivateKey/getPrivateKey methods
   → database.ts - has messaging_private_keys table definition
4. Generate Functional Requirements
   → P0: Migrate consumers to keyManagementService.getCurrentKeys()
   → P0: Remove dead IndexedDB private key code
   → P1: Update tests to reflect new architecture
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on code consolidation and bug fixes
- Remove dead code, don't encrypt it
- No migration of legacy data needed (beta tester data can be flushed)
- Written for developers cleaning up technical debt

---

## Problem Statement

The codebase has two incompatible key storage patterns:

1. **New Design (key-service.ts)**: Password-derived keys held in memory only
   - `initializeKeys(password)` derives keys, stores salt+public_key in Supabase
   - `deriveKeys(password)` re-derives same keys from password
   - Keys never written to IndexedDB

2. **Legacy Design (encryption.ts)**: Direct IndexedDB storage
   - `storePrivateKey()` - **Dead code** (never called in production)
   - `getPrivateKey()` - **Broken** (called but always returns null)

### Current Bug

Two components call `encryptionService.getPrivateKey()` expecting to find keys in IndexedDB:

- `src/hooks/useConversationRealtime.ts:117`
- `src/services/messaging/gdpr-service.ts:234`

But the new password-derived flow never writes to IndexedDB, so these calls always return `null`.

### Root Cause

Feature 032 (fix-e2e-encryption) migrated to password-derived keys but didn't fully update all consumers.

---

## User Scenarios & Testing

### Primary Story

As a developer maintaining this codebase, I need the key management to use a single consistent pattern so that message encryption/decryption works correctly.

### Critical Scenarios

#### Scenario 1: Message Decryption Works

1. **Given** I sign in with my password, **When** I open a conversation, **Then** messages decrypt correctly using my derived keys from memory
2. **Given** I'm viewing a realtime conversation, **When** a new message arrives, **Then** it decrypts using `keyManagementService.getCurrentKeys()`

**Acceptance Criteria:**

- `useConversationRealtime.ts` uses `keyManagementService.getCurrentKeys()`
- No calls to `encryptionService.getPrivateKey()` remain in production code
- Realtime message decryption works end-to-end

#### Scenario 2: GDPR Export Works

1. **Given** I request a data export, **When** the export runs, **Then** my messages are decrypted using my derived keys from memory

**Acceptance Criteria:**

- `gdpr-service.ts` uses `keyManagementService.getCurrentKeys()`
- Data export includes decrypted message content

#### Scenario 3: Dead Code Removed

1. **Given** the codebase, **When** I search for IndexedDB private key storage, **Then** only queued/cached messages remain in IndexedDB

**Acceptance Criteria:**

- `encryptionService.storePrivateKey()` removed
- `encryptionService.getPrivateKey()` removed
- `encryptionService.deletePrivateKey()` updated to no-op or removed
- `messaging_private_keys` table removed from database.ts
- `PrivateKey` type removed from types/messaging.ts (if not used elsewhere)

---

## Functional Requirements

### P0 - Critical (Must Have)

| ID     | Requirement                                                    | Acceptance Criteria                               |
| ------ | -------------------------------------------------------------- | ------------------------------------------------- |
| FR-001 | Migrate useConversationRealtime.ts to use keyManagementService | Calls getCurrentKeys() instead of getPrivateKey() |
| FR-002 | Migrate gdpr-service.ts to use keyManagementService            | Calls getCurrentKeys() instead of getPrivateKey() |
| FR-003 | Remove storePrivateKey method from EncryptionService           | Method no longer exists, no compile errors        |
| FR-004 | Remove getPrivateKey method from EncryptionService             | Method no longer exists, no compile errors        |
| FR-005 | Remove messaging_private_keys table from MessagingDatabase     | Table definition removed from database.ts         |

### P1 - High Priority

| ID     | Requirement                                           | Acceptance Criteria                |
| ------ | ----------------------------------------------------- | ---------------------------------- |
| FR-006 | Update deletePrivateKey to handle removal of table    | Method updated or removed cleanly  |
| FR-007 | Update encryption.test.ts to remove private key tests | Tests for removed methods deleted  |
| FR-008 | Update gdpr-service.test.ts to use new pattern        | Mocks use keyManagementService     |
| FR-009 | Update key-service.test.ts mocks if needed            | No stale mocks for removed methods |

### P2 - Medium Priority

| ID     | Requirement                                         | Acceptance Criteria                            |
| ------ | --------------------------------------------------- | ---------------------------------------------- |
| FR-010 | Remove PrivateKey type if unused after cleanup      | Type removed from types/messaging.ts           |
| FR-011 | Update documentation (QUICKSTART.md) to remove refs | No references to storePrivateKey/getPrivateKey |

---

## Out of Scope

- Encryption of IndexedDB (no longer needed - private keys not stored there)
- Migration of legacy encrypted messages (beta data can be flushed)
- Hardware security key integration (future enhancement)
- Biometric unlock (platform-dependent, future)

---

## Files Affected

### Must Change

- `src/hooks/useConversationRealtime.ts` - Migrate to keyManagementService
- `src/services/messaging/gdpr-service.ts` - Migrate to keyManagementService
- `src/lib/messaging/encryption.ts` - Remove private key methods
- `src/lib/messaging/database.ts` - Remove messaging_private_keys table
- `src/lib/messaging/__tests__/encryption.test.ts` - Remove private key tests

### May Change

- `src/services/messaging/__tests__/gdpr-service.test.ts` - Update mocks
- `src/services/messaging/__tests__/key-service.test.ts` - Update mocks
- `src/types/messaging.ts` - Remove PrivateKey type
- `docs/messaging/QUICKSTART.md` - Update documentation

---

## Success Metrics

1. **Functionality**: Message decryption works in realtime conversations
2. **Functionality**: GDPR data export decrypts messages correctly
3. **Code Quality**: No dead code related to IndexedDB private key storage
4. **Tests**: All tests pass with updated architecture

---

## Clarifications

### Session 2025-12-14

**Q1: What is the actual use case for IndexedDB encryption?**
A: Remove IndexedDB code - since password-derived keys are memory-only, the IndexedDB private key storage code is dead code and should be removed instead of encrypted.

**Q2: getPrivateKey IS actively used in 2 places - what should we do?**
A: Investigate further to understand the full flow.

**Q3: After investigation - the consumers are broken (return null). Update spec?**
A: Yes, update spec. We can flush old messages, it's only practice data from beta testers. No need to decrypt legacy messages, just flush the dead code from the system and focus on the current setup.

---

## Technical Notes

### Current Key Flow (password-derived, correct)

```
Sign In → keyManagementService.deriveKeys(password)
        → Fetch salt from Supabase
        → Argon2id(password, salt) → ECDH key pair
        → Store in memory (this.derivedKeys)
        → keyManagementService.getCurrentKeys() → returns memory keys
```

### Broken Flow (IndexedDB, to be removed)

```
useConversationRealtime → encryptionService.getPrivateKey(userId)
                        → IndexedDB lookup
                        → Returns null (nothing ever written)
                        → Decryption fails silently
```

### Fixed Flow (after this feature)

```
useConversationRealtime → keyManagementService.getCurrentKeys()
                        → Returns memory keys
                        → Decryption succeeds
```
