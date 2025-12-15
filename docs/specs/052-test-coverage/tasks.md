# Tasks: 052-test-coverage

**Branch**: `052-test-coverage`
**Generated**: 2025-12-15
**Status**: Ready for Implementation

---

## Phase 1: Setup

- [x] T001 [P1] Create feature branch `052-test-coverage`
  - Command: `git checkout -b 052-test-coverage`
  - Done: Branch created

- [ ] T002 [P1] Verify test infrastructure
  - Command: `docker compose exec spoketowork pnpm test -- --run`
  - Expected: Existing tests pass

---

## Phase 2: Critical Tests - Auth/Payments (P0)

### Auth

- [ ] T003 [P0] Create tests for `src/lib/auth/retry-utils.ts`
  - File: `src/lib/auth/__tests__/retry-utils.test.ts`
  - Coverage target: >90%
  - Test cases: retry logic, backoff timing, max retries, success path

### Payments

- [ ] T004 [P0] Create tests for `src/lib/payments/connection-listener.ts`
  - File: `src/lib/payments/__tests__/connection-listener.test.ts`
  - Coverage target: >80%
  - Test cases: online/offline events, sync trigger, queue processing

### Contexts

- [ ] T005 [P1] Create tests for `src/contexts/AuthContext.tsx`
  - File: `src/contexts/__tests__/AuthContext.test.tsx`
  - Coverage target: >80%
  - Test cases: sign-in, sign-out, session refresh, error handling

### Supabase

- [ ] T006 [P1] Create tests for `src/lib/supabase/client.ts`
  - File: `src/lib/supabase/__tests__/client.test.ts`
  - Coverage target: >60%
  - Test cases: client initialization, singleton pattern

- [ ] T007 [P1] Create tests for `src/lib/supabase/middleware.ts`
  - File: `src/lib/supabase/__tests__/middleware.test.ts`
  - Coverage target: >60%
  - Test cases: session handling, cookie management

---

## Phase 3: Service Tests - Routing (P1)

- [ ] T008 [P1] Create tests for `src/lib/routing/osrm-service.ts`
  - File: `src/lib/routing/__tests__/osrm-service.test.ts`
  - Coverage target: >70%
  - Test cases: route calculation, API response parsing, error handling

- [ ] T009 [P1] Create tests for `src/lib/routes/route-service.ts`
  - File: `src/lib/routes/__tests__/route-service.test.ts`
  - Coverage target: >70%
  - Test cases: CRUD operations, query filters, error handling

- [ ] T010 [P1] Create tests for `src/lib/routes/route-export.ts`
  - File: `src/lib/routes/__tests__/route-export.test.ts`
  - Coverage target: >70%
  - Test cases: GPX export, GeoJSON export, format validation

---

## Phase 4: Context Tests (P1)

- [ ] T011 [P1] Create tests for `src/contexts/AccessibilityContext.tsx`
  - File: `src/contexts/__tests__/AccessibilityContext.test.tsx`
  - Coverage target: >70%
  - Test cases: font size, high contrast, reduced motion

---

## Phase 5: Hook Tests (P2)

### Payment Hooks

- [ ] T012 [P2] Create tests for `usePaymentButton`
  - File: `src/hooks/__tests__/usePaymentButton.test.ts`
  - Test cases: loading state, success, error handling

- [ ] T013 [P2] Create tests for `usePaymentConsent`
  - File: `src/hooks/__tests__/usePaymentConsent.test.ts`
  - Test cases: consent state, storage, updates

- [ ] T014 [P2] Create tests for `usePaymentRealtime`
  - File: `src/hooks/__tests__/usePaymentRealtime.test.ts`
  - Test cases: subscription, updates, cleanup

### Data Hooks

- [ ] T015 [P2] Create tests for `useCompanies`
  - File: `src/hooks/__tests__/useCompanies.test.ts`
  - Test cases: fetch, create, update, delete

- [ ] T016 [P2] Create tests for `useConnections`
  - File: `src/hooks/__tests__/useConnections.test.ts`
  - Test cases: list, status updates, realtime

- [ ] T017 [P2] Create tests for `useGroupMembers`
  - File: `src/hooks/__tests__/useGroupMembers.test.ts`
  - Test cases: member list, add, remove

- [ ] T018 [P2] Create tests for `useMetroAreas`
  - File: `src/hooks/__tests__/useMetroAreas.test.ts`
  - Test cases: area list, selection

- [ ] T019 [P2] Create tests for `useRoutes`
  - File: `src/hooks/__tests__/useRoutes.test.ts`
  - Test cases: route list, create, update, delete

- [ ] T020 [P2] Create tests for `useUserProfile`
  - File: `src/hooks/__tests__/useUserProfile.test.ts`
  - Test cases: fetch, update, loading states

### Messaging Hooks

- [ ] T021 [P2] Create tests for `useReadReceipts`
  - File: `src/hooks/__tests__/useReadReceipts.test.ts`
  - Test cases: mark read, get unread count

- [ ] T022 [P2] Create tests for `useUnreadCount`
  - File: `src/hooks/__tests__/useUnreadCount.test.ts`
  - Test cases: count calculation, realtime updates

### UI/UX Hooks

- [ ] T023 [P2] Create tests for `useCodeBlockPreferences`
  - File: `src/hooks/__tests__/useCodeBlockPreferences.test.ts`
  - Test cases: theme, line numbers, word wrap

- [ ] T024 [P2] Create tests for `useIdleTimeout`
  - File: `src/hooks/__tests__/useIdleTimeout.test.ts`
  - Test cases: idle detection, callback trigger, reset

- [ ] T025 [P2] Create tests for `useKeyboardShortcuts`
  - File: `src/hooks/__tests__/useKeyboardShortcuts.test.ts`
  - Test cases: key binding, handler execution, cleanup

- [ ] T026 [P2] Create tests for `useOfflineStatus`
  - File: `src/hooks/__tests__/useOfflineStatus.test.ts`
  - Test cases: online/offline detection, state changes

- [ ] T027 [P2] Create tests for `useTileProviders`
  - File: `src/hooks/__tests__/useTileProviders.test.ts`
  - Test cases: provider list, selection, URLs

---

## Phase 6: Verification

- [ ] T028 [P1] Run full test suite
  - Command: `docker compose exec spoketowork ./scripts/test-batched-full.sh`
  - Expected: All tests pass

- [ ] T029 [P1] Verify coverage targets
  - Command: `docker compose exec spoketowork pnpm test -- --coverage`
  - Expected: lib/services/hooks at 70%+

- [ ] T030 [P1] Commit changes
  - Message: "test: expand coverage for lib/services/hooks (25 new test files)"

---

## Task Dependencies

```
T001 (branch)
  ↓
T002 (verify setup)
  ↓
T003-T007 (critical tests - can run in parallel)
  ↓
T008-T011 (service/context tests - can run in parallel)
  ↓
T012-T027 (hook tests - can run in parallel)
  ↓
T028 → T029 → T030 (verification - sequential)
```

---

## Summary

| Phase          | Tasks     | Priority | Status  |
| -------------- | --------- | -------- | ------- |
| Setup          | T001-T002 | P1       | Pending |
| Critical Tests | T003-T007 | P0/P1    | Pending |
| Service Tests  | T008-T011 | P1       | Pending |
| Hook Tests     | T012-T027 | P2       | Pending |
| Verification   | T028-T030 | P1       | Pending |

**Total**: 30 tasks
**Parallel opportunities**: T003-T007, T008-T011, T012-T027
