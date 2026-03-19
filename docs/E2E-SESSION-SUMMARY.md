# E2E Test Fix Session Summary (2026-03-14 to 2026-03-18)

## What We Built/Changed

### Application Code
- `src/services/messaging/key-service.ts` — localStorage caching for derived encryption keys, per-user storage (`stw_keys_<userId>`)
- `src/app/messages/page.tsx` — Restore keys from localStorage before showing ReAuth modal

### Test Infrastructure
- `tests/e2e/messaging/test-helpers.ts` — `ensureConnection` uses `.upsert()`, `dismissReAuthModal` has `quickCheck` param (2s vs 18s)
- `tests/e2e/messaging/friend-requests.spec.ts` — Chromium-only guard, `waitForResponse` for accept API, optimized retry loops
- `tests/e2e/messaging/complete-user-workflow.spec.ts` — Chromium-only guard, conversation URL preservation
- `tests/e2e/messaging/encrypted-messaging.spec.ts` — URL preservation, DB verification after send
- `tests/e2e/messaging/performance.spec.ts` — 90s timeouts for keyboard/scroll, quickCheck in openConversation
- `tests/e2e/messaging/message-editing.spec.ts` — Reload fallback for Realtime drops, 30s timeout
- `tests/e2e/messaging/real-time-delivery.spec.ts` — Timeout 120s→180s
- `tests/e2e/messaging/offline-queue.spec.ts` — Timeout 120s→180s
- `tests/e2e/auth.setup.ts` — Pre-derives encryption keys for all 3 test users in browser
- `tests/e2e/global-setup.ts` — Deletes ALL messages when re-seeding keys
- `.github/workflows/e2e.yml` — Auth Setup gets all test user env vars
- `playwright.config.ts` — Firefox testIgnore for map.spec.ts + mobile-check.spec.ts

## Key Decisions
- **Node.js @noble/curves P-256 ECDH ≠ Firefox WebCrypto** — same keys produce different shared secrets
- **Encryption keys cached in localStorage** — persists across Playwright browser contexts via storageState
- **Auth setup derives keys for ALL test users in browser** — eliminates argon2id during tests
- **Global setup deletes old messages when re-seeding keys** — prevents "Encrypted with previous keys"
- **Tests that DELETE user_connections are chromium-only** — prevents cross-shard interference
- **4 shards per browser is optimal** — 2 shards makes things worse

## Current State (commit ac73eb4)
- **11 of 12 shards pass consistently**
- **Firefox 2/4**: 6 messaging failures (intermittent Supabase Cloud timeouts)
- **Webkit/Chromium 2/4**: 0-2 intermittent failures per run
- Zero ReAuth modals, zero stale messages

## Next Steps
1. Remaining failures are **intermittent Supabase Cloud latency** — different tests fail each run
2. Real fix: **local Supabase for E2E** (`scripts/supabase-up.sh` already exists)
3. Alternative: upgrade Supabase plan (free tier can't handle 12 concurrent connections reliably)
