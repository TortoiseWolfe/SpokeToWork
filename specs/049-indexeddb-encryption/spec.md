# Feature 049: Password Change Key Rotation

## Priority: P1 (Security)

## Problem Statement

~~Private cryptographic keys are stored as plaintext JWK in IndexedDB~~ **RESOLVED**

The original P1 security issue has been fixed. Private keys are now:

- **Never stored at rest** (not in IndexedDB, not anywhere)
- **Derived fresh on each login** from password + salt using Argon2id
- **Held in memory only**, cleared on logout/tab close

**Remaining Issue**: When a user changes their Supabase password via AccountSettings, the encryption keys are NOT rotated. This causes:

- Derived keys to become invalid (new password + old salt = different keys)
- Silent loss of ability to decrypt existing messages
- No user warning or recovery path

## Current State

**Key Management** (`src/services/messaging/key-service.ts`):

- ✅ Keys derived from password using Argon2id (lines 79-82)
- ✅ Keys held in memory only (line 37: `private derivedKeys: DerivedKeyPair | null`)
- ✅ Salt stored in Supabase, not locally (line 92)
- ✅ `rotateKeys(password)` method exists (lines 361-431)
- ❌ Password change does NOT trigger `rotateKeys()`

**Password Change** (`src/components/auth/AccountSettings/AccountSettings.tsx:131-184`):

```typescript
// Current: Only updates Supabase password
await supabase.auth.updateUser({ password });
// NO key rotation - derived keys silently become invalid!
```

## Requirements

### Functional Requirements

1. **FR-1**: Add "Current Password" field to password change form (required for key verification)
2. **FR-2**: Verify current password by deriving keys and matching public key before allowing change
3. **FR-3**: Generate new salt and derive new keys with new password
4. **FR-4**: Update salt + public key in Supabase before updating Supabase password
5. **FR-5**: If key rotation fails, abort password change with clear error message

### Non-Functional Requirements

1. **NFR-1**: Zero UX regression - password change flow remains intuitive
2. **NFR-2**: Clear error messages for each failure mode
3. **NFR-3**: All existing messaging tests continue to pass

## Technical Decisions

### Clarifications (Session 2025-12-21)

| Decision             | Choice                 | Rationale                                 |
| -------------------- | ---------------------- | ----------------------------------------- |
| Passphrase source    | Supabase password      | Zero UX friction, available during login  |
| Encryption algorithm | Existing AES-GCM       | Already implemented, no change needed     |
| Key derivation       | Existing Argon2id      | Already implemented, stronger than PBKDF2 |
| Password change      | Rotate keys atomically | New salt + new keys + update Supabase     |
| Key storage          | In-memory only         | Already implemented, most secure          |
| Salt storage         | Supabase               | Already implemented, works across devices |

### Implementation Approach

1. **Modify AccountSettings password form**:
   - Add "Current Password" field
   - Import `keyManagementService` from `@/services/messaging/key-service`

2. **Password change flow**:

   ```typescript
   // 1. Verify current password by deriving keys
   await keyManagementService.deriveKeys(currentPassword);

   // 2. Rotate keys with new password (generates new salt, updates Supabase)
   await keyManagementService.rotateKeys(newPassword);

   // 3. Only then update Supabase auth password
   await supabase.auth.updateUser({ password: newPassword });
   ```

3. **Error handling**:
   - KeyMismatchError → "Current password is incorrect"
   - ConnectionError → "Failed to update encryption keys. Please try again."
   - If rotateKeys() fails, don't call updateUser()

### Integration Points

1. **AccountSettings.tsx** (modify existing):
   - Add `currentPassword` state and input field
   - Import and use `keyManagementService`
   - Call `deriveKeys()` then `rotateKeys()` before `updateUser()`

2. **No changes needed to**:
   - `src/services/messaging/key-service.ts` (rotateKeys already exists)
   - `src/lib/messaging/encryption.ts` (no changes)
   - `src/contexts/AuthContext.tsx` (no changes)

## Success Criteria

- [x] Private keys never stored at rest (ALREADY DONE)
- [x] Keys derived from password via Argon2id (ALREADY DONE)
- [x] Salt stored in Supabase (ALREADY DONE)
- [x] Derived key cleared on logout (ALREADY DONE)
- [x] Password change form requires current password
- [x] Password change triggers key rotation via `rotateKeys()`
- [x] Failed key rotation aborts password change
- [x] Clear error messages for each failure mode
- [x] All existing messaging tests pass (213 tests)

## Out of Scope

- Hardware security module integration
- Biometric authentication
- Multi-device key sync
- ChaCha20-Poly1305 migration (existing AES-GCM is sufficient)
- @noble/ciphers dependency (not needed - existing crypto works)

## Migration Notes

**No migration needed** - this is a forward-only change:

- Existing users will be prompted for current password on next password change
- No stored data format changes
- Backward compatible with existing message encryption
