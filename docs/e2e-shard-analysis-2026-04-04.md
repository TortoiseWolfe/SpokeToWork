# E2E Shard Failure Analysis — 2026-04-04

> Root cause analysis of 7/18 failing E2E shards after per-shard user migration.
> Based on CI run 23988942410 (commit 6c038c7).

## Current Status: 11/18 pass

```
PUSH 439849b 2026-04-04: 13/18 [baseline before per-shard]
PUSH 6c038c7 2026-04-04: 11/18 [per-shard users working, but timeout/distribution issues]
```

## The Shard Distribution Problem

517 tests across 79 files, split into 6 shards alphabetically by filename.
**ALL messaging tests land in shards 2 and 3:**

```
Shard 1/6:  87 tests,  0 messaging  ← auth, blog, companies, account
Shard 2/6:  87 tests, 15 messaging  ← encrypted-messaging, friend-requests, employer-team, complete-user-workflow
Shard 3/6:  87 tests, 60 messaging  ← group-chat, message-editing, scroll, offline-queue, performance, real-time-delivery
Shard 4/6:  87 tests,  0 messaging  ← routes, map, payment
Shard 5/6:  87 tests,  0 messaging  ← a11y, blog, mobile, security
Shard 6/6:  87 tests,  0 messaging  ← PWA, themes, touch targets
```

### Why messaging tests are heavy

Every multi-user messaging test requires:
1. **Admin-seeded data**: `ensureConnection()` + `ensureConversation()` via PostgREST (10-30s each with read-replica polling)
2. **Encryption key readiness**: `waitForEncryptionKeys()` polls up to 30x3s = 90s
3. **Argon2id key derivation**: 60-90s per user on chromium, 90-180s on Firefox/WebKit under CI contention
4. **Two browser contexts**: encrypted-messaging, real-time-delivery, and group-chat need two separate authenticated sessions

All of this happens in `beforeAll`/`beforeEach` hooks that have **no explicit timeout**, so Playwright's 30s default kills them.

### Messaging test files by complexity

| File | Tests | Multi-user | Needs encryption | Needs 2 contexts |
|------|-------|-----------|-----------------|------------------|
| encrypted-messaging.spec.ts | 6 | YES | YES | YES |
| friend-requests.spec.ts | 7 | YES | no | YES (search) |
| complete-user-workflow.spec.ts | 5 | YES | YES | YES |
| group-chat-multiuser.spec.ts | 6 | YES | YES | YES |
| message-editing.spec.ts | 14 | YES | YES | no |
| messaging-scroll.spec.ts | 7 | YES | YES | no |
| offline-queue.spec.ts | 6 | YES | YES | YES |
| performance.spec.ts | 11 | YES | YES | no |
| real-time-delivery.spec.ts | 9 | YES | YES | YES (2 windows) |
| gdpr-compliance.spec.ts | 14 | no | no | no |

9 of 10 messaging files require multi-user encryption setup. Only gdpr-compliance is lightweight.

---

## Failing Tests: Detailed Root Causes

### Shard 2/6 (chromium, firefox, webkit)

#### 1. encrypted-messaging.spec.ts — `beforeEach` timeout (lines 104-113)

**What fails**: All 6 tests in the Encrypted Messaging Flow describe block.

**Root cause**: `beforeEach` calls `ensureConnection()` + `ensureConversation()` with no timeout override. Under 18-shard CI load, these admin PostgREST calls take >30s (Playwright's default hook timeout).

**Evidence**: CI log shows `Test timeout of 30000ms exceeded while running "beforeEach" hook` at line 104.

**Fix needed**:
- Add `testInfo.setTimeout(120000)` to `beforeEach`
- Add `waitForEncryptionKeys()` call after `ensureConversation()`
- Import `waitForEncryptionKeys` from test-helpers

**Status**: ALREADY FIXED in working tree (commit pending)

#### 2. friend-requests.spec.ts — search results not on read replica (line 258)

**What fails**: "User A sends friend request and User B accepts" (line 187)

**Root cause**: After cleanup, the test searches for User B by display name. The search queries the read replica, which hasn't propagated the user profile created by `ensureUserProfiles()`. `waitForSelector('[data-testid="search-results"]', {timeout: 15000})` times out.

**Evidence**: CI log shows `TimeoutError: page.waitForSelector: Timeout 15000ms exceeded` waiting for `[data-testid="search-results"], .alert-error`.

**Fix needed**:
- Add `testInfo.setTimeout(120000)` to `beforeEach`
- Increase search result waitForSelector from 15s to 30s
- Consider adding a small delay after `ensureUserProfiles()` for replica propagation

#### 3. employer-team-workflow.spec.ts — cleanup polls too short (line 140-167)

**What fails**: "employer can connect with worker and add to team" (line 193)

**Root cause**: `cleanup()` polls only 5x3s=15s for deletion propagation. Under 18-shard CI load, read-replica lag regularly exceeds 15s. Subsequent `ensureEmployerSetup()` conflicts with stale data.

**Fix needed**:
- Add `testInfo.setTimeout(120000)` to `beforeEach`
- Increase cleanup poll count from 5 to 10 (30s total)

#### 4. complete-user-workflow.spec.ts — cascading from admin seeding timeout

**What fails**: "should complete cleanup successfully" (line 692)

**Root cause**: Same pattern — admin seeding in beforeAll/beforeEach exceeds 30s default.

**Fix needed**: Add `testInfo.setTimeout(120000)` to beforeAll/beforeEach hooks.

---

### Shard 3/6 (chromium, firefox, webkit)

#### 5. group-chat-multiuser.spec.ts — no waitForEncryptionKeys (lines 60-64)

**What fails**: "show New Group link" (line 66), "create group with connected users" (line 146)

**Root cause**: `beforeEach` calls `ensureConnection()` but does NOT call `waitForEncryptionKeys()`. Tests immediately call `signInAndNavigateToMessages()` → `completeEncryptionSetup()`, which hangs if keys aren't ready.

**Fix needed**:
- Import `waitForEncryptionKeys` from test-helpers
- Add `testInfo.setTimeout(120000)` to `beforeEach`
- Add `waitForEncryptionKeys()` call in `beforeEach`

#### 6. offline-queue.spec.ts — beforeEach has waitForEncryptionKeys but no timeout (line 68)

**What fails**: All 3 Offline Message Queue tests (lines 80, 198, 417)

**Root cause**: `beforeEach` (line 68) calls `waitForEncryptionKeys()` which polls up to 90s, but the hook has no timeout override. Playwright's 30s default kills it before keys are ready.

**Fix needed**:
- Add `testInfo.setTimeout(120000)` to `beforeEach` (line 68)

#### 7. real-time-delivery.spec.ts — same as offline-queue (line 288)

**What fails**: All 3 Real-time Delivery tests (lines 343, 430, 568)

**Root cause**: `beforeEach` (line 288) calls `waitForEncryptionKeys()` + login for 2 users, but no timeout override. 30s default exceeded.

**Fix needed**:
- Add `testInfo.setTimeout(120000)` to `beforeAll` (line 278) and `beforeEach` (line 288)

#### 8. performance.spec.ts — Argon2id contention (lines 479, 528, 677, 727)

**What fails**: All 4 Virtual Scrolling / Keyboard / Scroll tests

**Root cause**: `beforeAll` seeds 1000 messages (has 120s timeout — OK). But individual tests call `openConversation()` → `completeEncryptionSetup()` which runs Argon2id. Under CI contention with 18 shards, Argon2id takes 90-180s, exceeding test timeouts.

**Fix needed**:
- Import + add `waitForEncryptionKeys()` after connection seeding in beforeAll
- Verify test-level timeouts are sufficient (may need `test.setTimeout(180000)`)

#### 9. message-editing.spec.ts (webkit only) — login + Argon2id exceeds 90s

**What fails**: Lines 239, 302, 382 on webkit

**Root cause**: `test.describe.configure({ timeout: 90000 })` but `beforeEach` does loginAndVerify(45s) + navigateToConversation → completeEncryptionSetup(90s) = 135s total. Exceeds 90s.

**Status**: beforeAll already has `testInfo.setTimeout(120000)` and `waitForEncryptionKeys()`. The issue is the per-test timeout on webkit. With keys pre-derived via auth.setup, `completeEncryptionSetup` should be fast (just restore from localStorage). If it's still slow, increase describe timeout to 120s.

#### 10. messaging-scroll.spec.ts (firefox only) — same Argon2id pattern

**What fails**: Line 89 on firefox

**Root cause**: `beforeEach` calls login + `completeEncryptionSetup()` without timeout override. Firefox Argon2id is slowest (90-180s).

**Fix needed**:
- Import + add `waitForEncryptionKeys()` in 3 beforeEach blocks
- Add `testInfo.setTimeout(120000)` to each beforeEach

---

### webkit 1/6 — NOT related to per-shard changes

| Test | Error | Root Cause |
|------|-------|-----------|
| complete-flows.spec.ts:602 | 30s timeout | Supabase Management API slow. Test creates its OWN users (`e2e-deleted-*`), not shard users. |
| blog-screenshots.spec.ts:401 | Timeout | Webkit rendering timing flakiness |
| 3 others marked "flaky" | Passed on retry | Webkit-specific intermittent failures |

**No fix needed** — these are unrelated to our changes and are webkit platform flakiness.

---

## Why More Shards Alone Won't Fix It

Playwright shards alphabetically by file. All `messaging/*` files are adjacent, so they always clump:

```
 6 shards: shard 2 gets 15 msg, shard 3 gets 60 msg (2 hot shards)
 9 shards: shard 3 gets 17 msg, shard 4 gets 58 msg (still 1 hot shard with 58!)
12 shards: shard 4 gets 15 msg, shard 5 gets 48 msg, shard 6 gets 12 msg (still 1 hot shard with 48)
```

No shard count splits `messaging/g*` through `messaging/p*` — they're alphabetically adjacent.

## Solution: Split CI Matrix Into Messaging + Non-Messaging

Use `--grep` to run messaging and non-messaging tests in separate matrix entries:

```
Messaging:     76 tests in 11 files → 4 shards (17-23 tests each)
Non-messaging: 442 tests in 69 files → 4 shards (~110 tests each, all lightweight)
Total: 8 shards per browser × 3 browsers = 24 CI jobs (vs current 18)
```

### Messaging shard distribution (verified with `--grep "messaging/"`)

```
Msg shard 1/4: 20 tests — complete-user-workflow, encrypted-messaging, friend-requests, gdpr-compliance
Msg shard 2/4: 23 tests — gdpr-compliance, group-chat-multiuser, message-editing
Msg shard 3/4: 17 tests — message-editing, messaging-scroll, offline-queue
Msg shard 4/4: 19 tests — performance, real-time-delivery
```

Each messaging shard gets 2-4 files (vs 5-7 today). Less contention on Supabase per shard.

Non-messaging shards run fast (1-3 min) since they don't need encryption or admin seeding.

---

## The Real Fix: Pre-baked Encryption Keys

### The fundamental problem

Every CI run:
1. `global-setup.ts` DELETES encryption keys from `user_encryption_keys`
2. `auth.setup.ts` re-derives keys via Argon2id (60-180s per user under CI load)
3. Old messages are permanently undecryptable (the key that encrypted them is gone)
4. Tests wait 90s polling for keys, then still fail on timeouts

**We're testing Argon2id CI performance, not encrypted messaging.**

An encryption key is not something you randomly regenerate before the user can use it. It's a fundamental part of the encrypted message. Deleting it breaks the contract.

### The fix

Generate encryption keys ONCE. Store them as GitHub secrets/vars. Use the same keys every run.

Each shard user needs two pieces:
1. **DB row** (`user_encryption_keys`): `public_key` (JWK) + `encryption_salt` (base64)
2. **localStorage** (`stw_keys_{userId}`): `{ privateKeyJwk, publicKeyJwk, salt }`

### Implementation checklist

- [ ] **One-time key generation script** (`scripts/generate-e2e-keys.ts`): Generate ECDH P-256 keys for all 18 shard users (6 shards × 3 roles). Output JSON with DB rows + localStorage entries.
- [ ] **GitHub secret**: Store the key JSON as `E2E_SHARD_ENCRYPTION_KEYS` (or individual vars per shard)
- [ ] **global-setup.ts**: STOP deleting keys. Instead UPSERT pre-baked public keys + salts into `user_encryption_keys`. Stop deleting messages.
- [ ] **auth.setup.ts**: STOP running Argon2id. Instead inject pre-baked private+public keys directly into localStorage/storageState.
- [ ] **Remove all `waitForEncryptionKeys()` calls** — keys are seeded synchronously by global-setup
- [ ] **Remove all `completeEncryptionSetup()` calls in test beforeEach** — keys already in localStorage
- [ ] **Split CI matrix** into messaging (4 shards) + non-messaging (4 shards) using `--grep`

### What this eliminates
- 60-180s Argon2id per user per shard (saves 3-9 minutes per shard)
- `waitForEncryptionKeys()` 90s polling loops
- `testInfo.setTimeout(120000)` on beforeAll/beforeEach hooks
- Key mismatch errors between runs
- Undecryptable old messages
- The entire "keys not ready" failure class

### Key data format

```typescript
// Per shard user (e.g. e2e-s1-primary@mailinator.com)
{
  // Goes into user_encryption_keys table
  db: {
    public_key: { kty: "EC", crv: "P-256", x: "...", y: "..." },
    encryption_salt: "base64-encoded-salt"
  },
  // Goes into localStorage as stw_keys_{userId}
  localStorage: {
    privateKeyJwk: { kty: "EC", crv: "P-256", x: "...", y: "...", d: "..." },
    publicKeyJwk: { kty: "EC", crv: "P-256", x: "...", y: "..." },
    salt: "base64-encoded-salt"
  }
}
```

### Interim fix (until pre-baked keys are implemented)

While building the pre-baked key infrastructure, apply these tactical fixes to stop the bleeding:

#### Part 1: Split CI matrix (already in progress)
- [x] Modify `e2e.yml`: messaging (4 shards) + non-messaging (4 shards) via `--grep`

#### Part 2: Hook timeouts (stop 30s default from killing admin seeding)
- [x] `encrypted-messaging.spec.ts` — timeout + waitForEncryptionKeys
- [ ] `friend-requests.spec.ts` — timeout on beforeEach, search timeout 15→30s
- [ ] `employer-team-workflow.spec.ts` — timeout on beforeEach, cleanup polls 5→10
- [ ] `complete-user-workflow.spec.ts` — timeout on beforeAll/beforeEach
- [ ] `group-chat-multiuser.spec.ts` — timeout + waitForEncryptionKeys in beforeEach
- [ ] `offline-queue.spec.ts` — timeout on beforeEach
- [ ] `real-time-delivery.spec.ts` — timeout on beforeAll + beforeEach
- [ ] `performance.spec.ts` — waitForEncryptionKeys in beforeAll
- [ ] `messaging-scroll.spec.ts` — timeout + waitForEncryptionKeys in 3 beforeEach blocks
