# Feature Specification: IndexedDB Private Key Encryption

**Feature Branch**: `048-indexeddb-encryption`
**Created**: 2025-12-13
**Status**: Draft
**Priority**: P1 (High)
**Input**: Code review finding - private keys stored unencrypted in IndexedDB

## Execution Flow (main)

```
1. Parse input from security code review
   → Feature: Encrypt private keys at rest in IndexedDB
2. Extract key security risks
   → Medium: Private keys stored as plaintext JWK in IndexedDB
   → Risk: Physical device access allows key extraction via DevTools
3. Identify affected users
   → All users with messaging enabled: Private key protection
   → Attackers with physical access: Prevention of key theft
4. Generate Functional Requirements
   → P0: Encrypt private keys before IndexedDB storage
   → P1: Key derivation from user passphrase
   → P2: Seamless migration for existing keys
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT security outcomes are needed and WHY they matter
- Avoid HOW to implement (no specific encryption libraries)
- Written for security stakeholders and business owners
- Emphasizes user protection against physical device access attacks

---

## Problem Statement

Currently, ECDH private keys used for end-to-end encrypted messaging are stored as plaintext JWK (JSON Web Key) format in the browser's IndexedDB. While protected by browser same-origin policy and HTTPS, an attacker with physical access to an unlocked device can export these keys via browser DevTools.

### Current Mitigations (Insufficient)

- HTTPS enforced for all connections
- Browser same-origin policy
- CSP headers prevent XSS injection
- Keys cleared on logout

### Gap

No encryption at rest means physical device access = key compromise.

---

## User Scenarios & Testing

### Primary Security Story

As a user with encrypted conversations, I need my private messaging keys to be encrypted at rest so that even if someone gains access to my unlocked device, they cannot extract my keys without knowing my passphrase.

### Critical Security Scenarios

#### Scenario 1: Key Protection at Rest

1. **Given** I have messaging keys stored locally, **When** an attacker opens DevTools on my unlocked device, **Then** they cannot see my private key in plaintext
2. **Given** I enter my messaging passphrase on sign-in, **When** the app accesses IndexedDB, **Then** it decrypts keys only in memory
3. **Given** I close the browser tab, **When** memory is cleared, **Then** decrypted keys are no longer accessible

**Acceptance Criteria:**

- Private keys stored encrypted in IndexedDB
- Decryption requires user-provided passphrase
- Keys exist in plaintext only in memory during active session
- DevTools inspection shows only encrypted blobs

#### Scenario 2: Seamless User Experience

1. **Given** I sign in with my password, **When** keys are needed for messaging, **Then** they are decrypted automatically without additional prompts
2. **Given** I'm an existing user with unencrypted keys, **When** I sign in after this feature launches, **Then** my keys are migrated to encrypted format transparently
3. **Given** I forget my passphrase, **When** I reset my password, **Then** I can regenerate new keys (old messages remain encrypted)

**Acceptance Criteria:**

- No additional UX friction for normal sign-in flow
- Existing users migrated without data loss
- Key regeneration possible for passphrase recovery

---

## Functional Requirements

### P0 - Critical (Must Have)

| ID     | Requirement                                                        | Acceptance Criteria                                       |
| ------ | ------------------------------------------------------------------ | --------------------------------------------------------- |
| FR-001 | Private keys must be encrypted before storage in IndexedDB         | Keys in IndexedDB are not readable as JWK format          |
| FR-002 | Encryption key must be derived from user's authentication password | Same password used for sign-in derives the encryption key |
| FR-003 | Decrypted keys must exist only in memory during active session     | Browser memory audit shows no persistent plaintext keys   |

### P1 - High Priority

| ID     | Requirement                                                 | Acceptance Criteria                                                    |
| ------ | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| FR-004 | Existing unencrypted keys must be migrated on first sign-in | Users with existing keys can still access old messages after migration |
| FR-005 | Key derivation must use strong KDF (like Argon2)            | Brute-force attack on encrypted blob is computationally infeasible     |
| FR-006 | Password changes must re-encrypt stored keys                | New password works for key decryption after password change            |

### P2 - Medium Priority

| ID     | Requirement                                            | Acceptance Criteria                                                     |
| ------ | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| FR-007 | Failed decryption must provide clear user feedback     | User understands why decryption failed (wrong password, corrupted data) |
| FR-008 | Key encryption must not noticeably impact sign-in time | Sign-in latency increase < 500ms                                        |

---

## Out of Scope

- Hardware security key integration (future enhancement)
- Biometric unlock for key decryption (platform-dependent)
- Server-side key escrow (conflicts with zero-knowledge design)

---

## Files Affected

- `src/lib/messaging/encryption.ts` - Key storage/retrieval
- `src/lib/messaging/key-derivation.ts` - KDF implementation
- `src/services/messaging/key-service.ts` - Key lifecycle management
- Migration script for existing unencrypted keys

---

## Success Metrics

1. **Security**: Private keys in IndexedDB are not readable without passphrase
2. **UX**: Sign-in flow unchanged for users (no additional prompts)
3. **Migration**: 100% of existing users migrated without message access loss
