# Code Review: GitHub Issues to Create

Generated from comprehensive code review on 2025-12-10.

## COMPLETED (No longer need issues) ✅

| Item                                     | Status                      |
| ---------------------------------------- | --------------------------- |
| Duplicate useOfflineQueue.test.ts        | ✅ Deleted                  |
| ESLint disable in useOfflineQueue.ts     | ✅ Fixed                    |
| ECDH cache in useConversationRealtime.ts | ✅ Added                    |
| DOMPurify for XSS protection             | ✅ Added                    |
| SECURITY-ARCHITECTURE.md                 | ✅ Created                  |
| Key service IndexedDB cleanup            | ✅ Fixed deletePrivateKey() |
| Unblock excluded test files              | ✅ Fixed 3 files            |
| message-service.test.ts                  | ✅ Created (23 tests)       |
| key-service.test.ts                      | ✅ Created (19 tests)       |
| Polling → Realtime (useUnreadCount)      | ✅ Fixed                    |
| Hardcoded template_user_id               | ✅ Fixed (gets from auth)   |
| CSP headers missing Supabase             | ✅ Added to layout.tsx      |

---

## GroupService Unimplemented Methods (8 issues)

### 1. feat(messaging): implement GroupService.addMembers()

**File:** `src/services/messaging/group-service.ts:337`
**Labels:** `enhancement`, `messaging`

Add new members to an existing group conversation.

- Validate user is group owner or has permission
- Check member count limits (MAX_MEMBERS constraint)
- Verify new members have accepted connections
- Distribute group encryption key to new members

---

### 2. feat(messaging): implement GroupService.removeMember()

**File:** `src/services/messaging/group-service.ts:347`
**Labels:** `enhancement`, `messaging`

Remove a member from a group (owner only).

- Verify requester is group owner
- Update `conversation_members` with `left_at` timestamp
- Rotate group key after removal (security)

---

### 3. feat(messaging): implement GroupService.leaveGroup()

**File:** `src/services/messaging/group-service.ts:356`
**Labels:** `enhancement`, `messaging`

Allow user to voluntarily leave a group.

- Prevent owner from leaving without transferring ownership
- Update `conversation_members` with `left_at` timestamp
- Rotate group key after departure

---

### 4. feat(messaging): implement GroupService.transferOwnership()

**File:** `src/services/messaging/group-service.ts:365`
**Labels:** `enhancement`, `messaging`

Transfer group ownership to another member.

- Verify requester is current owner
- Verify target is active member
- Update roles in `conversation_members`

---

### 5. feat(messaging): implement GroupService.upgradeToGroup()

**File:** `src/services/messaging/group-service.ts:374`
**Labels:** `enhancement`, `messaging`

Upgrade a 1-to-1 conversation to a group.

- Convert existing conversation to is_group=true
- Add new members
- Migrate encryption from ECDH to symmetric group key

---

### 6. feat(messaging): implement GroupService.deleteGroup()

**File:** `src/services/messaging/group-service.ts:383`
**Labels:** `enhancement`, `messaging`

Delete a group conversation (owner only).

- Verify requester is group owner
- Cascade delete members, messages, keys
- Consider soft-delete for audit trail

---

### 7. feat(messaging): implement GroupService.renameGroup()

**File:** `src/services/messaging/group-service.ts:393`
**Labels:** `enhancement`, `messaging`

Rename a group (owner only).

- Verify requester is group owner
- Validate name length (MAX_NAME_LENGTH constraint)
- Update `conversations.group_name`

---

### 8. feat(messaging): implement GroupService.getMembers()

**File:** `src/services/messaging/group-service.ts:402`
**Labels:** `enhancement`, `messaging`

Get list of group members with profiles.

- Return active members (left_at IS NULL)
- Include user profiles (username, display_name, avatar_url)
- Return role and join date

---

## TODO Comments (2 issues)

### 9. feat(errors): Integrate logging service

**File:** `src/utils/error-handler.ts:236`
**Labels:** `enhancement`, `observability`

TODO comment: "Implement additional integration with logging service"

Should send errors to centralized logging (e.g., Supabase logs, external service).

---

### 11. feat(errors): Integrate notification system

**File:** `src/utils/error-handler.ts:255`
**Labels:** `enhancement`, `observability`

TODO comment: "Integrate with your notification system"

Should trigger user notifications for critical errors.

---

## Test Coverage Gaps (4 issues)

### 12. test(messaging): Add message-service unit tests

**File:** `src/services/messaging/message-service.ts` (1,182 LOC, zero tests)
**Labels:** `testing`, `messaging`

Priority tests needed:

- `sendMessage()` - encryption, validation, offline queue
- `getHistory()` - decryption, pagination
- `editMessage()` - edit window validation
- `deleteMessage()` - delete window validation

---

### 13. test(messaging): Add key-service unit tests

**File:** `src/services/messaging/key-service.ts` (586 LOC, zero tests)
**Labels:** `testing`, `messaging`, `security`

Priority tests needed:

- `initializeKeys()` - new user key generation
- `deriveKeys()` - login key derivation
- `needsMigration()` - legacy key detection
- `rotateKeys()` - key rotation

---

### 14. test(messaging): Add group-key-service unit tests

**File:** `src/services/messaging/group-key-service.ts` (818 LOC, zero tests)
**Labels:** `testing`, `messaging`

Priority tests needed:

- `generateGroupKey()` - symmetric key generation
- `encryptGroupKey()` - per-member encryption
- `decryptGroupKey()` - key retrieval
- `rotateGroupKey()` - key rotation on member changes

---

### 15. test(payments): Add payment-service unit tests

**File:** `src/lib/payments/payment-service.ts` (312 LOC, zero tests)
**Labels:** `testing`, `payments`

Priority tests needed:

- `createPaymentIntent()` - metadata validation, offline queueing
- `getPaymentHistory()` - payment retrieval
- `retryPayment()` - retry logic

---

## Performance (optional issues)

### 16. perf(components): Add React.memo to large components

**Labels:** `performance`

Components >300 LOC without memoization:

- `CompanyDetailDrawer.tsx` (1,059 lines)
- `CompanyForm.tsx` (738 lines)
- `ApplicationForm.tsx` (516 lines)
- `CompanyTable.tsx` (360 lines)
- `CreateGroupModal.tsx` (346 lines)

---

### 17. perf(hooks): Consolidate online/offline listeners

**Labels:** `performance`, `refactor`

5+ separate event listeners for network status:

- `src/hooks/useOfflineQueue.ts`
- `src/hooks/useOfflineStatus.ts`
- `src/lib/payments/connection-listener.ts`
- `src/app/status/page.tsx`
- `src/components/atomic/NetworkStatus/useNetworkStatus.ts`

Should consolidate into single NetworkStatusContext.

---

## Commands to create issues (after installing gh CLI)

```bash
# Install gh CLI (if not installed)
# macOS: brew install gh
# Ubuntu: sudo apt install gh
# Then: gh auth login

# Create issues from this document
gh issue create --title "feat(messaging): implement GroupService.addMembers()" --label "enhancement,messaging" --body-file <body>
# ... repeat for each issue
```
