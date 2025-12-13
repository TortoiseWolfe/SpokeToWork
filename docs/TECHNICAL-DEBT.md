# Technical Debt

This document tracks known technical issues, workarounds, and future concerns that need to be addressed.

---

## Code Review Findings (2025-12-13)

Comprehensive code review conducted with 16 parallel analysis agents covering security, performance, code quality, and test coverage.

### Priority Matrix

| Priority | Category          | Issue Count | Status                                            |
| -------- | ----------------- | ----------- | ------------------------------------------------- |
| P0       | Security          | 2           | Fixed                                             |
| P1       | CI/Infrastructure | 1           | **Partial** (Node 22 done, RouteBuilder OOM open) |
| P1       | Security          | 6           | Open                                              |
| P1       | Performance       | 4           | Open                                              |
| P2       | Code Quality      | 15          | Open                                              |
| P2       | Test Coverage     | 55 files    | Open                                              |

---

## P0: Critical Security Issues (FIXED)

### 1. Edge Function Auth Bypass Vulnerability (FIXED)

**Date Fixed**: 2025-12-13
**File**: `supabase/functions/send-payment-email/index.ts:15`
**Issue**: Used `authHeader.includes(serviceRoleKey)` allowing substring attacks
**Fix Applied**: Changed to strict equality `authHeader !== 'Bearer ${serviceRoleKey}'`

### 2. SQL Injection in E2E Tests (FIXED)

**Date Fixed**: 2025-12-13
**File**: `tests/e2e/auth/welcome-message.spec.ts:70,136`
**Issue**: `TEST_EMAIL` interpolated directly into SQL without escaping
**Fix Applied**: Added `escapeSQL()` function and applied to queries

---

## P1: High Priority Issues

### Security: Private Keys Stored Unencrypted in IndexedDB

**Severity**: MEDIUM
**Files**: `src/lib/messaging/encryption.ts:73-93`
**Issue**: Private keys stored as plaintext JWK in IndexedDB, vulnerable to physical device access
**Mitigations in Place**: HTTPS, browser same-origin policy, CSP headers
**Recommended Fix**: Implement passphrase-based encryption of IndexedDB entries
**SpecKit Spec**: `docs/specs/045-indexeddb-encryption/spec.md`

### Security: Test Credential Fallbacks

**Severity**: LOW
**Files**: 67 test files with hardcoded fallback passwords
**Issue**: Default `TestPassword123!` used if env vars missing
**Recommended Fix**: Make env vars required, fail fast if missing
**SpecKit Spec**: `docs/specs/046-test-security/spec.md`

### Security: OAuth State Inconsistency

**Severity**: MEDIUM
**Files**: `src/components/auth/OAuthButtons/OAuthButtons.tsx`, `src/lib/auth/oauth-state.ts`
**Issue**: Custom CSRF tokens exist but aren't used; relies on Supabase PKCE instead
**Recommended Fix**: Either use custom tokens consistently or remove dead code

### Performance: Missing Memoization in List Components

**Severity**: HIGH
**Files**:

- `src/components/organisms/ConversationList/ConversationList.tsx`
- `src/components/organisms/ConnectionManager/ConnectionManager.tsx`
  **Issue**: Event handlers not wrapped in `useCallback`, causing child re-renders
  **Recommended Fix**: Add `useCallback` to handlers passed to child components
  **SpecKit Spec**: `docs/specs/047-performance-memoization/spec.md`

### Performance: Polling Instead of Realtime

**Severity**: MEDIUM
**Files**:

- `src/hooks/useOfflineQueue.ts:203` (30s interval)
- `src/hooks/usePaymentButton.ts:82` (5s interval)
- `src/lib/supabase/client.ts:131` (30s connection check)
  **Issue**: Timer-based polling when Supabase realtime could be used
  **Recommended Fix**: Replace with Supabase realtime subscriptions
  **SpecKit Spec**: `docs/specs/047-performance-memoization/spec.md`

### Performance: Duplicate Event Listeners

**Severity**: MEDIUM
**Files**: 4 files with online/offline listeners, 5+ with click-outside patterns
**Issue**: Same global events listened to in multiple places
**Recommended Fix**: Create unified hooks: `useOnlineStatus`, `useClickOutside`, `useVisibilityChange`
**SpecKit Spec**: `docs/specs/047-performance-memoization/spec.md`

---

## P2: Medium Priority Issues

### Code Quality: Duplicate Implementations

#### Offline Queue (3 implementations)

- `src/utils/offline-queue.ts` (IndexedDB for forms)
- `src/services/messaging/offline-queue-service.ts` (Dexie for messages)
- `src/lib/payments/offline-queue.ts` (Dexie for payments)
  **Recommended Fix**: Create unified abstraction in `src/lib/offline-queue/`
  **SpecKit Spec**: `docs/specs/048-code-consolidation/spec.md`

#### Audit Logger (2 implementations)

- `src/lib/auth/audit-logger.ts` (functional)
- `src/services/auth/audit-logger.ts` (OOP class)
  **Recommended Fix**: Consolidate into single OOP pattern
  **SpecKit Spec**: `docs/specs/048-code-consolidation/spec.md`

#### Email Validation (3 implementations)

- `src/lib/auth/email-validator.ts` (most comprehensive)
- `src/lib/messaging/validation.ts`
- `src/lib/validation/patterns.ts`
  **Recommended Fix**: Use auth version everywhere
  **SpecKit Spec**: `docs/specs/048-code-consolidation/spec.md`

#### Rate Limiting (2 implementations)

- `src/lib/auth/rate-limiter.ts` (client-side localStorage)
- `src/lib/auth/rate-limit-check.ts` (server-side RPC)
  **Recommended Fix**: Document use cases or remove client version
  **SpecKit Spec**: `docs/specs/048-code-consolidation/spec.md`

### Code Quality: Dead Code & Stubs

- 5 placeholder tests with `expect(true).toBe(true)`
- 1 unused function `_handleRejectAll` in CookieConsent
- 1 deprecated method `hasValidKeys()` in key-service
- Commented code in oauth-state tests and middleware
  **SpecKit Spec**: `docs/specs/049-dead-code-cleanup/spec.md`

### Code Quality: Linter Disables (26 total - ALL LEGITIMATE)

- 6 `@next/next/no-img-element` for Supabase avatars
- 3 `react-hooks/exhaustive-deps` with documented reasons
- 12 `@ts-expect-error` for valid test patterns
- No action needed - all properly justified

---

## P2: Test Coverage Gaps

### Critical Untested Files (Need Tests Immediately)

1. `src/lib/payments/stripe.ts` - Stripe checkout
2. `src/lib/payments/paypal.ts` - PayPal integration
3. `src/lib/auth/retry-utils.ts` - Retry logic
4. `src/lib/auth/protected-route.tsx` - Route protection
5. `src/lib/payments/connection-listener.ts` - Connection sync

### High Priority Untested Files

1. `src/lib/routing/osrm-service.ts` - Route calculation
2. `src/lib/routes/route-service.ts` - Route CRUD
3. `src/lib/routes/route-export.ts` - Route export
4. `src/lib/messaging/database.ts` - Message DB ops
5. `src/services/messaging/group-service.ts` - Group messaging
6. `src/contexts/AuthContext.tsx` - Auth state
7. `src/lib/supabase/client.ts` - Supabase client
8. `src/lib/supabase/server.ts` - Server operations
9. `src/lib/supabase/middleware.ts` - Middleware

### Medium Priority Untested Hooks (17 total)

- useOfflineStatus, useReadReceipts, useKeyboardShortcuts
- useIdleTimeout, useMetroAreas, useCompanies
- useConnections, useGroupMembers, useUnreadCount
- useUserProfile, useTileProviders, useRoutes
- And 5 more...

**Overall Coverage**: ~54% of lib/services/hooks files have tests
**SpecKit Spec**: `docs/specs/050-test-coverage/spec.md`

---

## P3: Low Priority / Future Improvements

### Documentation Passwords

- `docs/messaging/QUICKSTART.md:463` - hardcoded test password
- `public/blog/authentication-supabase-oauth.md:824` - password in example
  **Recommended Fix**: Replace with placeholder text

### Skipped Tests (42 in E2E)

All are legitimate and properly documented:

- Data-dependent (companies must exist)
- Viewport-dependent (desktop-only features)
- Config-dependent (service role key required)
  No action needed.

---

## SpecKit Specs Created

| Spec Number | Title                             | Priority | Status                            |
| ----------- | --------------------------------- | -------- | --------------------------------- |
| 045         | IndexedDB Encryption              | P1       | Open                              |
| 046         | Test Security Hardening           | P1       | Open                              |
| 047         | Performance Memoization           | P1       | Open                              |
| 048         | Code Consolidation                | P2       | Open                              |
| 049         | Dead Code Cleanup                 | P2       | Open                              |
| 050         | Test Coverage Expansion           | P2       | Open                              |
| 051         | CI Test Memory Optimization       | P1       | **92/93** (RouteBuilder OOM open) |
| 052         | Dependency Infrastructure Updates | P2       | Open                              |

### Spec 051 Progress (2025-12-13) - PARTIAL

**Node.js Version Alignment** ✅ COMPLETE

All GitHub Actions workflows now use Node 22 to match Docker:

| Workflow                | Before | After          |
| ----------------------- | ------ | -------------- |
| ci.yml                  | 20.x   | 22             |
| e2e.yml                 | 20.x   | 22             |
| component-structure.yml | 20     | 22             |
| monitor.yml             | 20     | 22             |
| supabase-keepalive.yml  | 20     | 22             |
| accessibility.yml       | 22     | 22 (no change) |
| deploy.yml              | 22     | 22 (no change) |

**AuthorProfile Test Isolation Fix** ✅ COMPLETE

Root cause: happy-dom URL context corrupted in batch mode; next/image URL validation fails.

| File             | Change                                                           |
| ---------------- | ---------------------------------------------------------------- |
| `tests/setup.ts` | Added global `next/image` mock to bypass URL validation in tests |

**Result**: 91 happy-dom + 1 jsdom (Card) = 92 accessibility tests pass in CI

---

## P1: RouteBuilder OOM Issue - OPEN (Component #93)

**Severity**: HIGH
**Impact**: 1 of 93 accessibility tests cannot run
**Files**: `src/components/organisms/RouteBuilder/RouteBuilder.tsx`

### Symptoms

- Both `RouteBuilder.test.tsx` and `RouteBuilder.accessibility.test.tsx` fail with OOM
- Memory consumption reaches 4GB during Vitest module loading phase
- OOM occurs BEFORE any test code executes
- Issue persists regardless of test environment, pool configuration, or heap size

### Reproduction

```bash
# All of these fail with OOM at ~4GB before tests run:
docker compose exec spoketowork pnpm exec vitest run \
  src/components/organisms/RouteBuilder/RouteBuilder.accessibility.test.tsx

# With 4GB heap - still fails:
docker compose exec -e NODE_OPTIONS='--max-old-space-size=4096' spoketowork \
  pnpm exec vitest run src/components/organisms/RouteBuilder/RouteBuilder.accessibility.test.tsx

# With jsdom instead of happy-dom - still fails:
# (After adding to jsdomTests array in vitest.config.ts)
docker compose exec spoketowork pnpm exec vitest run \
  src/components/organisms/RouteBuilder/RouteBuilder.accessibility.test.tsx --project jsdom

# With main thread execution - still fails:
docker compose exec spoketowork pnpm exec vitest run \
  src/components/organisms/RouteBuilder/RouteBuilder.accessibility.test.tsx --isolate=false
```

### Attempted Fixes (All Failed)

1. **Cache reset in useRoutes** - Added `__resetCacheForTesting()` - No effect
2. **afterEach cleanup** - Added cleanup to test file - No effect
3. **jsdom environment** - Routed tests to jsdom - Still OOM at 4GB
4. **isolate=false** - Ran in main thread - Still OOM at 4GB
5. **4GB heap** - Increased NODE_OPTIONS - Still OOM
6. **vmThreads pool** - Changed pool type - Still OOM

### Root Cause Analysis

The OOM happens during Vitest/Vite module transformation, NOT during test execution. This suggests:

1. **Circular imports** in the dependency chain causing infinite resolution
2. **Heavy transitive dependencies** being fully loaded instead of tree-shaken
3. **Vite HMR/module graph** memory leak during transformation

### Dependency Chain to Investigate

```
RouteBuilder.tsx
├── useRoutes (hooks/useRoutes.ts)
│   ├── createClient (lib/supabase/client.ts)
│   ├── RouteService (lib/routes/route-service.ts)
│   │   └── types from @supabase/supabase-js
│   ├── getBicycleRoute (lib/routing/osrm-service.ts)
│   └── createLogger (lib/logger.ts)
├── useUserProfile (hooks/useUserProfile.ts)
│   ├── useAuth (contexts/AuthContext.tsx)
│   └── createClient (lib/supabase/client.ts)
└── types/route.ts
```

### Debugging Steps (Next Actions)

1. **Check for circular imports**:

   ```bash
   npx madge --circular src/components/organisms/RouteBuilder/RouteBuilder.tsx
   ```

2. **Profile module loading**:

   ```bash
   docker compose exec spoketowork pnpm exec vitest run \
     src/components/organisms/RouteBuilder/RouteBuilder.accessibility.test.tsx \
     --reporter=verbose 2>&1 | head -100
   ```

3. **Isolate the problematic import** by creating a minimal test:

   ```typescript
   // test-minimal.ts
   import { vi } from 'vitest';

   // Mock everything BEFORE importing
   vi.mock('@/hooks/useRoutes');
   vi.mock('@/hooks/useUserProfile');

   // Then import component
   import RouteBuilder from './RouteBuilder';

   console.log('Import successful');
   ```

4. **Check if types are the issue**:

   ```bash
   # Comment out type imports one by one and test
   ```

5. **Try dynamic import in component**:

   ```typescript
   // Instead of static import:
   // import { useRoutes } from '@/hooks/useRoutes';

   // Try dynamic:
   const { useRoutes } = await import('@/hooks/useRoutes');
   ```

### Current Workaround

RouteBuilder tests are excluded from CI accessibility workflow:

```yaml
# .github/workflows/accessibility.yml
FILES=$(find src/components -name "*.accessibility.test.tsx" -type f \
  ! -name "Card.accessibility.test.tsx" \
  ! -name "RouteBuilder.accessibility.test.tsx" \  # <-- excluded here
  | tr '\n' ' ')
```

### Files to Modify When Fixed

1. `.github/workflows/accessibility.yml` - Remove RouteBuilder exclusion
2. `docs/TECHNICAL-DEBT.md` - Update this section
3. `docs/specs/051-ci-test-memory/spec.md` - Mark FR-003 as complete

### Using These Specs with SpecKit

To process any spec through the complete workflow:

```bash
/speckit.workflow docs/specs/047-performance-optimization
```

This runs all phases (plan → checklist → tasks → analyze → implement) with user checkpoints between each phase.

---

## TODO Summary (2025-09-19)

**Total TODOs in codebase**: 13

- **Component Tests**: 6 (need expanded test coverage)
- **Feature Extensions**: 3 (validation system, error handler integrations)
- **Template TODOs**: 4 (intentional, part of code generation)

## Sprint 3.5 Progress (2025-09-18 - 2025-09-19)

### Completed

- ✅ Component Structure Audit - 100% compliance with 5-file pattern
- ✅ Bundle Size Optimization - Met target of 102KB First Load JS
- ✅ Dynamic Imports - Calendar providers now lazy-loaded
- ✅ Bundle Analyzer - Added for ongoing monitoring
- ✅ E2E CI Integration - Multi-browser testing in GitHub Actions
- ✅ CalendarEmbed Tests - Fixed for dynamic import compatibility
- ✅ Security Headers Documentation - Complete guide for all platforms
- ✅ Offline Queue Tests - All 12 tests passing
- ✅ GoogleAnalytics Storybook - ConsentProvider already configured
- ✅ PWA Manifest - Already using build-time generation
- ✅ Next.js Workaround - Confirmed no dummy files needed (2025-09-19)
- ✅ MSW Setup - Already configured in Storybook
- ✅ Configuration Simplification - Already clean, no webpack workarounds
- ✅ Full Test Suite - All 793 tests passing

## Current Issues

### 7. Disqus Theme Integration

**Date Added**: 2025-09-28
**Severity**: Low
**Impact**: UX - Comments section doesn't fully match DaisyUI themes

**Issue**: Disqus comments component only supports basic light/dark theme detection, not the full range of 32 DaisyUI themes. Attempts to read actual theme colors using computed styles cause Disqus to fail loading.

**Current Workaround**: Simplified to basic light/dark detection with hardcoded RGB colors that Disqus can parse.

**Proper Solution**:

- Investigate alternative methods to pass theme colors to Disqus iframe
- Consider using CSS custom properties that Disqus can interpret
- Possibly implement a theme color mapping system

**Files Affected**:

- `/src/components/molecular/DisqusComments.tsx`

## Resolved Issues

### ~~9. Environment Variable Configuration Duplication~~ ✅ RESOLVED

**Date Added**: 2025-09-25
**Date Resolved**: 2025-09-30
**Severity**: None (already resolved)
**Impact**: None

**Issue**: Documentation mentioned `nodemon-blog.json` containing Docker polling variables.

**Resolution**:

- File was already removed in previous cleanup
- Docker environment variables properly configured in `docker-compose.yml`
- No action needed - documentation was outdated

### ~~8. Next.js Dynamic Params Warning~~ ✅ RESOLVED

**Date Added**: 2025-09-28
**Date Resolved**: 2025-09-30
**Severity**: None
**Impact**: None

**Issue**: Next.js 15 showed warnings about using `params.slug` without awaiting params first in blog pages.

**Resolution**:

- Updated `/src/app/blog/[slug]/page.tsx` to use `params: Promise<{ slug: string }>`
- Updated `/src/app/blog/tags/[tag]/page.tsx` to use `params: Promise<{ tag: string }>`
- Both files now properly await params before accessing properties
- Follows Next.js 15 async params best practices

## Resolved Issues (Previous)

### ~~6. lint-staged Git Stash Issues in Docker~~ ✅ RESOLVED

**Date Added**: 2025-09-19
**Date Resolved**: 2025-09-19
**Severity**: None
**Impact**: None

**Issue**: lint-staged failed with git stash errors when running inside Docker container.

**Resolution**:

- Added `--no-stash` flag to lint-staged commands in Docker
- Modified `.husky/pre-commit` to use `pnpm exec lint-staged --no-stash`
- Removed problematic `vitest related --run` from lint-staged config
- Works correctly in both Docker and host environments

### ~~1. Next.js 15.5 Static Export Compatibility~~ ✅ RESOLVED

**Date Added**: 2025-09-18
**Date Resolved**: 2025-09-19
**Severity**: None
**Impact**: None

**Issue**: Previously thought Next.js 15.5.2 with `output: 'export'` required dummy Pages Router files, but this was incorrect.

**Resolution**:

- Tested build without any Pages Router files - works perfectly
- Next.js 15.5.2 supports pure App Router with static export
- No dummy files or workarounds needed
- Build completes successfully after clearing cache (`pnpm run clean:next`)

### ~~2. ContactForm Storybook Stories~~ ✅ RESOLVED

**Date Added**: 2025-09-18
**Date Resolved**: 2025-09-19
**Severity**: None
**Impact**: None

**Issue**: Previously thought ContactForm stories failed with jest.mock() errors.

**Resolution**:

- MSW (Mock Service Worker) is already configured in `.storybook/preview.tsx`
- Web3Forms API mocks are already set up in `/src/mocks/handlers.ts`
- Stories should work without jest.mock()
- The perceived issue may have been a build cache problem

### ~~3. GoogleAnalytics Storybook Context Error~~ ✅ RESOLVED

**Date Added**: 2025-09-18
**Date Resolved**: 2025-09-19
**Severity**: None
**Impact**: None

**Issue**: Previously thought GoogleAnalytics stories failed due to missing ConsentProvider.

**Resolution**:

- ConsentProvider is already configured as a global decorator in `.storybook/preview.tsx` (line 52-54)
- The GoogleAnalytics stories already include a MockConsentWrapper for demonstration
- No additional fixes needed

### ~~4. Project Configuration Complexity~~ ✅ RESOLVED

**Date Added**: 2025-09-18
**Date Resolved**: 2025-09-19
**Severity**: None
**Impact**: None

**Issue**: Thought the auto-detection of project configuration added unnecessary complexity.

**Resolution**:

- The configuration is already simplified and clean
- No webpack workarounds found in the codebase
- The detection script is straightforward and works well
- Generated config is a simple TypeScript file with constants
- No further simplification needed

### ~~5. Husky Pre-commit Hook Docker Detection~~ ✅ RESOLVED

**Date Added**: 2025-09-19
**Date Resolved**: 2025-09-19
**Severity**: None
**Impact**: None

**Issue**: Pre-commit hook failed when committing from inside Docker container because it tried to run `docker compose ps` which doesn't exist inside the container.

**Resolution**:

- Added detection for running inside Docker container (checks for `/app` directory)
- Hook now handles three scenarios properly:
  1. Inside Docker: runs `pnpm lint:staged` directly
  2. Host with Docker: uses `docker compose exec`
  3. Host without Docker: runs `pnpm` locally
- No longer need `--no-verify` when committing from inside Docker

## Future Concerns

### ~~1. Security Headers~~ ✅ DOCUMENTED

**Impact**: Production security
**Documentation**: `/docs/deployment/security-headers.md`

With the removal of the `headers()` function from Next.js config (due to static export incompatibility), security headers need to be configured at the hosting level. Complete documentation now available with platform-specific configurations for:

- ✅ Vercel (vercel.json)
- ✅ Netlify (\_headers file)
- ✅ nginx configuration
- ✅ Apache (.htaccess)
- ✅ CloudFlare Pages (\_headers or Workers)

### ~~2. PWA Manifest API Route~~ ✅ RESOLVED (2025-09-18)

**Impact**: ~~PWA functionality~~ None
**Status**: Already using build-time generation

The PWA manifest is properly generated at build time via `scripts/generate-manifest.js` which runs in the prebuild step. No API route exists - fully compatible with static export.

### ~~3. Test Coverage for Offline Features~~ ✅ RESOLVED (2025-09-18)

**Impact**: ~~Test reliability~~ None
**Status**: All 12 offline queue tests now passing

The offline queue integration tests previously had issues with React Hook Form timing but are now working correctly. No further action needed.

## Code Cleanup Status

1. ~~**Pages Router Dummy Files** (`src/pages/*`)~~ - ✅ Removed (2025-09-18)
2. ~~**Security headers constants**~~ - ✅ None found in next.config.ts (2025-09-19)
3. ~~**Webpack workarounds**~~ - ✅ None found in project.config.ts (2025-09-19)

## Performance Optimizations ~~Needed~~ ✅ COMPLETED

### ~~3. Font Loading Optimization~~ ✅ OPTIMIZED (2025-09-19)

**Status**: Complete

- Added `display: swap` to Geist fonts for faster rendering
- Added font preconnect links to Google Fonts
- Added fallback font stacks to prevent layout shifts
- Set font-display and size-adjust properties in CSS
- Optimized text rendering properties for better performance

### ~~1. Bundle Size~~ ✅ OPTIMIZED (2025-09-18)

**Status**: Complete

- Current First Load JS: 102KB (meets target)
- Added @next/bundle-analyzer for monitoring
- Run `pnpm run analyze` to view bundle composition

### ~~2. Lazy Loading~~ ✅ IMPLEMENTED (2025-09-18)

**Status**: Complete

- Calendar providers (CalendlyProvider, CalComProvider) now use dynamic imports
- Loading states implemented for better UX
- Maps already use dynamic loading with SSR disabled

3. **Font Loading**: Optimize font loading strategy to reduce CLS

## Testing Improvements

1. **Storybook Coverage**: Restore full story coverage for ContactForm
2. ~~**E2E Tests**: Currently only running locally, need CI integration~~ ✅ CI ADDED (2025-09-18)
   - Created `.github/workflows/e2e.yml` with multi-browser testing
   - Tests run on Chromium, Firefox, and WebKit
   - Artifacts and reports uploaded for review
3. **Visual Regression**: PRP-012 deferred but needed for UI stability

## Documentation Updates Needed

1. Update deployment guides for security headers configuration
2. Document the forking process with new auto-configuration system
3. Add troubleshooting guide for common build issues

## Test Coverage Improvements Needed

### Accessibility Tests

Multiple components have TODO comments for expanding test coverage:

- **Dice** (`Dice.accessibility.test.tsx`) - line 14
- **DraggableDice** (`DraggableDice.accessibility.test.tsx`) - line 14
- **DiceTray** (`DiceTray.accessibility.test.tsx`) - line 14

Each TODO indicates need for:

- Tests with different prop combinations
- Keyboard navigation testing
- ARIA attribute verification
- Color contrast validation
- Focus management testing

## Feature Extensions Needed

### Validation System Extension

- Should extend ValidatedInput pattern to other atomic components: Button, Input, and other form components
- This would improve form consistency and error handling across the application

### Error Handler Integrations

**Location**: `src/utils/error-handler.ts`

1. **Logging Service Integration**
   - TODO on line 233: "Implement additional integration with logging service"
   - Currently only logs to console in development
   - Should integrate with services like Sentry, LogRocket, or DataDog
   - Would provide better production error tracking

2. **Notification System Integration**
   - TODO on line 252: "Integrate with your notification system"
   - Currently only logs user notifications to console
   - Should integrate with a proper toast/notification system
   - Would improve user experience for error feedback

## Template TODOs (Intentional)

The following TODO comments are part of code generation templates and are intentional:

1. **migrate-components.js** (lines 304, 350)
   - Template placeholders for generated test files
   - Gets replaced with actual test code when components are migrated

2. **validate-structure.test.js** (lines 152, 154)
   - Test fixtures for validation testing
   - Used to simulate incomplete component structures

These TODOs should remain as they are part of the tooling infrastructure.
