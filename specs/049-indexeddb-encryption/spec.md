# Feature 049: IndexedDB Private Key Encryption

## Priority: P1 (Security)

## Problem Statement

Private cryptographic keys are stored as plaintext JWK (JSON Web Key) in IndexedDB, making them vulnerable to:

- Physical device access
- Browser extension attacks
- XSS if CSP is bypassed

## Current State

**File**: `src/lib/messaging/encryption.ts:73-93`

Keys are stored directly in IndexedDB without encryption:

```typescript
await db.put('keys', { id: 'private', key: privateKeyJwk });
```

**Existing Mitigations**:

- HTTPS enforced
- Browser same-origin policy
- CSP headers configured

## Requirements

### Functional Requirements

1. **FR-1**: Encrypt private keys before storing in IndexedDB using a user-derived passphrase
2. **FR-2**: Decrypt keys on-demand when needed for message operations
3. **FR-3**: Provide secure key derivation using PBKDF2 or Argon2
4. **FR-4**: Handle passphrase changes with re-encryption workflow
5. **FR-5**: Fallback gracefully if Web Crypto API unavailable

### Non-Functional Requirements

1. **NFR-1**: Key derivation must take >100ms to resist brute force
2. **NFR-2**: No plaintext keys in memory longer than necessary
3. **NFR-3**: Zero breaking changes to existing message encryption/decryption

## Success Criteria

- [ ] Private keys encrypted at rest in IndexedDB
- [ ] Passphrase never stored, only derived key
- [ ] All existing messaging tests pass
- [ ] Security audit passes for key storage

## Out of Scope

- Hardware security module integration
- Biometric authentication
- Multi-device key sync
