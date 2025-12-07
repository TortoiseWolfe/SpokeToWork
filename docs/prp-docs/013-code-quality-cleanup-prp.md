# Code Quality Cleanup PRP

**Feature:** 013-code-quality-cleanup
**Priority:** High
**Estimated Scope:** Medium (refactoring, no new features)

---

## Problem Statement

Code review identified 30+ `as any` type casts, deprecated API usage, inconsistent patterns, and technical debt (40+ TODOs) that reduce type safety, maintainability, and could mask runtime errors.

---

## Goals

1. Eliminate all `as any` type casts with proper TypeScript types
2. Fix React hook dependency issues
3. Migrate deprecated Stripe API
4. Clean up TODO comments (implement or create issues)
5. Standardize patterns across codebase

---

## Non-Goals

- New features
- UI changes
- Database schema changes

---

## Implementation Plan

### Phase 1: Critical Type Safety (Priority: CRITICAL)

#### T001: Fix `as any` casts in stripe.ts

- **File:** `src/lib/payments/stripe.ts` (lines 70, 155)
- **Issue:** `(stripe as any).redirectToCheckout`
- **Fix:** Migrate to Stripe Payment Element API or add proper Stripe.js types

#### T002: Fix `as any` casts in connection-service.ts

- **File:** `src/services/messaging/connection-service.ts` (line 120)
- **Issue:** `(msgClient as any).from('conversations')`
- **Fix:** Properly type the Supabase client for messaging schema

#### T003: Fix `as any` casts in welcome-service.ts

- **File:** `src/services/messaging/welcome-service.ts` (line 360)
- **Fix:** Add proper types for the Supabase response

#### T004: Audit and fix remaining `as any` casts

- Run: `grep -r "as any" src/`
- Fix each occurrence with proper types

### Phase 2: React Hook Issues (Priority: HIGH)

#### T005: Fix AuthContext useEffect dependencies

- **File:** `src/contexts/AuthContext.tsx` (line 177)
- **Issue:** Empty `[]` dependency with closure over state
- **Fix:** Add `useCallback` for `getSessionWithRetry`, add proper deps

#### T006: Audit other useEffect hooks

- Search for `useEffect.*\[\]` patterns
- Verify each has correct dependencies

### Phase 3: Deprecated API Migration (Priority: HIGH)

#### T007: Migrate Stripe redirectToCheckout

- **File:** `src/lib/payments/stripe.ts`
- **Issue:** `redirectToCheckout` is deprecated
- **Fix:** Migrate to embedded Checkout or Payment Element
- **Docs:** https://stripe.com/docs/payments/checkout/migration

### Phase 4: TODO Cleanup (Priority: MEDIUM)

#### T008: Audit all TODO comments

- Run: `grep -rn "TODO" src/`
- Categorize: implement now, create issue, or remove

#### T009: Implement or remove group-service.ts TODOs

- **File:** `src/services/messaging/group-service.ts` (lines 338-410)
- 8 TODO comments for unimplemented methods

#### T010: Clean up test file TODOs

- **File:** `src/lib/companies/company-service.test.ts` (14 TODOs)
- Either implement tests or remove placeholder comments

### Phase 5: Pattern Standardization (Priority: MEDIUM)

#### T011: Create union types for status enums

- **Files:** `src/types/messaging.ts`, `connection-service.ts`
- Replace magic strings: `'pending'`, `'accepted'`, `'blocked'`
- Create: `type ConnectionStatus = 'pending' | 'accepted' | 'blocked'`

#### T012: Centralize validation regexes

- **Files:** `src/lib/messaging/validation.ts`, `src/utils/web3forms.ts`
- Create shared constants for email, UUID patterns

#### T013: Standardize error handling

- **File:** `src/hooks/useConnections.ts`
- Decide: throw after setError or not (pick one pattern)

### Phase 6: Minor Improvements (Priority: LOW)

#### T014: Replace `!!` with explicit Boolean conversion

- Search: `grep -r "!!" src/`
- Replace with `Boolean(x)` or explicit `x !== null`

#### T015: Add React.memo to list components

- **File:** `src/components/organisms/ConversationList/`
- Prevent unnecessary re-renders

---

## Files to Modify

### Critical

- `src/lib/payments/stripe.ts`
- `src/services/messaging/connection-service.ts`
- `src/services/messaging/welcome-service.ts`
- `src/contexts/AuthContext.tsx`

### High

- `src/services/messaging/group-service.ts`
- `src/types/messaging.ts`

### Medium

- `src/lib/messaging/validation.ts`
- `src/utils/web3forms.ts`
- `src/hooks/useConnections.ts`
- Multiple test files

---

## Success Criteria

- [ ] Zero `as any` casts in src/ (excluding tests)
- [ ] All useEffect hooks have correct dependencies
- [ ] Stripe using non-deprecated API
- [ ] TODO count reduced by 80%
- [ ] All tests still passing (2655+)
- [ ] No type errors (`pnpm type-check`)

---

## Risks

1. **Stripe migration complexity** - May require UI changes for embedded checkout
2. **Breaking changes** - Type fixes might reveal actual bugs
3. **Test updates** - Some test mocks may need updating

---

## Out of Scope (Future PRPs)

- Payment consent server-side validation
- Race condition fixes in welcome-service (needs design)
- Large component splitting (CaptainShipCrewWithNPC)
