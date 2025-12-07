# Tasks: Code Quality Cleanup

**Input**: Design documents from `/specs/013-code-quality-cleanup/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete)

**Tests**: Existing tests (2655+) validate refactoring. No new test tasks needed - run existing test suite after each task.

**Organization**: Tasks grouped by user story priority. This is a refactoring feature - each story modifies existing files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- All tasks include exact file paths

---

## Phase 1: Setup (Audit & Baseline)

**Purpose**: Establish baseline metrics and identify all issues

- [ ] T001 [P] Run `grep -r "as any" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "__mocks__"` and document all occurrences in a tracking list
- [ ] T002 [P] Run `grep -rn "TODO" src/` and document all occurrences with file:line for triage
- [ ] T003 [P] Run `docker compose exec spoketowork pnpm lint 2>&1 | grep "react-hooks/exhaustive-deps"` to identify all hook dependency issues
- [ ] T004 [P] Run `grep -r "redirectToCheckout" src/` to confirm Stripe deprecated API locations

**Checkpoint**: All issues identified and documented - ready for systematic fixes

---

## Phase 2: Foundational (Shared Types & Patterns)

**Purpose**: Create shared infrastructure that multiple stories will use

**⚠️ CRITICAL**: Complete before user story implementation

- [ ] T005 Create union type definitions for connection status in `src/types/messaging.ts`: `type ConnectionStatus = 'pending' | 'accepted' | 'blocked'`
- [ ] T006 [P] Create centralized validation patterns file `src/lib/validation/patterns.ts` with EMAIL_REGEX and UUID_REGEX constants
- [ ] T007 [P] Document chosen error handling pattern in code comment at `src/hooks/useConnections.ts` (setError without throw)

**Checkpoint**: Shared types and patterns ready - user story implementation can begin

---

## Phase 3: User Story 1 - Type-Safe Development (Priority: P1) 🎯 MVP

**Goal**: Eliminate all `as any` casts in production code

**Independent Test**: `grep -r "as any" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "__mocks__"` returns zero results AND `pnpm type-check` passes

### Implementation for User Story 1

- [ ] T008 [P] [US1] Fix `as any` cast in `src/lib/payments/stripe.ts` line ~70 - replace with proper Stripe types
- [ ] T009 [P] [US1] Fix `as any` cast in `src/lib/payments/stripe.ts` line ~155 - replace with proper Stripe types
- [ ] T010 [P] [US1] Fix `as any` cast in `src/services/messaging/connection-service.ts` line ~120 - type the Supabase client properly
- [ ] T011 [P] [US1] Fix `as any` cast in `src/services/messaging/welcome-service.ts` line ~360 - add proper response types
- [ ] T012 [US1] Run `grep -r "as any" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "__mocks__"` - fix ALL remaining occurrences until count is zero (do not proceed to T013 until complete)
- [ ] T013 [US1] Run `docker compose exec spoketowork pnpm type-check` - must pass with zero errors
- [ ] T014 [US1] Run `docker compose exec spoketowork pnpm test` - all 2655+ tests must pass

**Checkpoint**: Zero `as any` casts, type-check passes, all tests pass

---

## Phase 4: User Story 2 - Predictable React Behavior (Priority: P1)

**Goal**: Fix all React hook dependency issues

**Independent Test**: `pnpm lint 2>&1 | grep "react-hooks/exhaustive-deps"` returns zero warnings

### Implementation for User Story 2

- [ ] T015 [US2] Fix useEffect dependencies in `src/contexts/AuthContext.tsx` line ~177 - wrap `getSessionWithRetry` in useCallback, add proper deps
- [ ] T016 [US2] Audit `src/hooks/` directory for other useEffect/useCallback with empty `[]` deps that reference external values
- [ ] T017 [P] [US2] Fix any identified hook dependency issues in `src/hooks/useConnections.ts`
- [ ] T018 [P] [US2] Fix any identified hook dependency issues in `src/hooks/useCompanies.ts`
- [ ] T019 [P] [US2] Fix any identified hook dependency issues in `src/hooks/useMetroAreas.ts`
- [ ] T020 [US2] Run `docker compose exec spoketowork pnpm lint` - zero react-hooks warnings
- [ ] T021 [US2] Run `docker compose exec spoketowork pnpm test` - all tests must pass

**Checkpoint**: All hook dependencies correct, lint passes, all tests pass

---

## Phase 5: User Story 3 - Modern Payment Processing (Priority: P2)

**Goal**: Migrate from deprecated Stripe `redirectToCheckout` to current API

**Independent Test**: `grep -r "redirectToCheckout" src/` returns zero results AND payment flow works in Stripe test mode

### Implementation for User Story 3

- [ ] T022 [US3] Read current Stripe.js integration in `src/lib/payments/stripe.ts` to understand existing flow
- [ ] T023 [US3] Research current Stripe Checkout best practices (server-initiated sessions vs client-side)
- [ ] T024 [US3] Replace `redirectToCheckout` calls with modern Stripe Checkout Session approach in `src/lib/payments/stripe.ts`
- [ ] T025 [US3] Update any related payment components that call the deprecated methods
- [ ] T026 [US3] Verify no `redirectToCheckout` references remain: `grep -r "redirectToCheckout" src/`
- [ ] T027 [US3] Run `docker compose exec spoketowork pnpm type-check` - must pass
- [ ] T028 [US3] Run `docker compose exec spoketowork pnpm test` - all tests must pass

**Checkpoint**: No deprecated Stripe API usage, type-check passes, all tests pass

---

## Phase 6: User Story 4 - Clean Codebase (Priority: P2)

**Goal**: Reduce TODO comments by 80% (from 40+ to <10)

**Independent Test**: `grep -rn "TODO" src/ | wc -l` returns fewer than 10

### Implementation for User Story 4

- [ ] T029 [US4] Triage all TODOs from T002 audit: categorize as Implement/Remove/Track
- [ ] T030 [P] [US4] Process TODOs in `src/services/messaging/group-service.ts` (8 TODOs lines 338-410) - implement small ones, remove stale ones, create issues for large ones
- [ ] T031 [P] [US4] Process TODOs in `src/lib/companies/company-service.test.ts` (14 TODOs) - implement test stubs or remove placeholder comments
- [ ] T032 [US4] Process remaining TODOs across src/ - apply same triage criteria
- [ ] T033 [US4] Create GitHub issues for any TODOs that need separate feature work (if any)
- [ ] T034 [US4] Verify TODO count: `grep -rn "TODO" src/ | wc -l` must be <10
- [ ] T035 [US4] Run `docker compose exec spoketowork pnpm test` - all tests must pass

**Checkpoint**: TODO count reduced 80%+, all tests pass

---

## Phase 7: User Story 5 - Consistent Patterns (Priority: P3)

**Goal**: Standardize code patterns for status enums, validation, and error handling

**Independent Test**: Status strings use union types, validation imports from centralized module, error handling is consistent

### Implementation for User Story 5

- [ ] T036 [P] [US5] Update `src/services/messaging/connection-service.ts` to use `ConnectionStatus` union type instead of magic strings
- [ ] T037 [P] [US5] Update `src/types/messaging.ts` to export all status union types (add ContributionStatus if needed)
- [ ] T037a [P] [US5] Identify all status string enums in codebase (`grep -r "status.*=" src/types/`) and create union types for any not yet converted (e.g., ContributionStatus, CompanyStatus)
- [ ] T038 [US5] Update `src/lib/messaging/validation.ts` to import from centralized `src/lib/validation/patterns.ts`
- [ ] T039 [US5] Update `src/utils/web3forms.ts` to import email regex from centralized patterns
- [ ] T040 [US5] Standardize error handling in `src/hooks/useConnections.ts` to match documented pattern (setError without throw)
- [ ] T041 [US5] Audit other hooks for error handling consistency and fix any deviations
- [ ] T042 [US5] Run `docker compose exec spoketowork pnpm type-check` - must pass
- [ ] T043 [US5] Run `docker compose exec spoketowork pnpm test` - all tests must pass

**Checkpoint**: Patterns standardized, type-check passes, all tests pass

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Minor improvements and final validation

- [ ] T044 [P] Search for `!!` double-negation patterns: `grep -r "!!" src/` and replace with explicit Boolean conversion where beneficial
- [ ] T045 [P] Add React.memo to `src/components/organisms/ConversationList/ConversationList.tsx` if beneficial for performance
- [ ] T046 Run full validation suite:
  - `docker compose exec spoketowork pnpm type-check`
  - `docker compose exec spoketowork pnpm lint`
  - `docker compose exec spoketowork pnpm test`
  - `docker compose exec spoketowork pnpm build`
- [ ] T047 Final verification of all success criteria:
  - SC-001: Zero `as any` in src/ (excluding tests)
  - SC-002: Type-check passes
  - SC-003: No react-hooks warnings
  - SC-004: No deprecated Stripe APIs
  - SC-005: <10 TODOs remain
  - SC-006: All 2655+ tests pass
  - SC-007: Build succeeds with no new warnings
  - SC-008: Validation patterns centralized

**Checkpoint**: All success criteria met - ready for PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - audit tasks run in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 - creates shared infrastructure
- **Phase 3-7 (User Stories)**: All depend on Phase 2 completion
  - US1 and US2 are both P1 - can run in parallel if desired
  - US3 and US4 are both P2 - can run in parallel
  - US5 is P3 - can run after foundational, but logically after US1-US4
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Type Safety)**: Independent - can start after Foundational
- **US2 (Hook Deps)**: Independent - can start after Foundational
- **US3 (Stripe)**: Independent - can start after Foundational (but benefits from US1 type fixes)
- **US4 (TODOs)**: Independent - can start after Foundational
- **US5 (Patterns)**: Uses types from Foundational - can start after Phase 2

### Parallel Opportunities

**Phase 1** (all parallel):

```
T001 || T002 || T003 || T004
```

**Phase 2** (T006, T007 parallel after T005):

```
T005 → (T006 || T007)
```

**Phase 3** (T008-T011 parallel, then sequential):

```
(T008 || T009 || T010 || T011) → T012 → T013 → T014
```

**User Stories can run in parallel** if multiple developers:

```
US1 || US2 (both P1)
US3 || US4 (both P2)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (audit)
2. Complete Phase 2: Foundational (shared types)
3. Complete Phase 3: User Story 1 (type safety)
4. **STOP and VALIDATE**: Run type-check and tests
5. Commit and verify stability

### Incremental Delivery

1. Setup + Foundational → Baseline established
2. Add US1 (Type Safety) → Validate → Commit
3. Add US2 (Hook Deps) → Validate → Commit
4. Add US3 (Stripe) → Validate → Commit
5. Add US4 (TODOs) → Validate → Commit
6. Add US5 (Patterns) → Validate → Commit
7. Polish → Final validation → PR

### Recommended Order (Single Developer)

```
Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → US5 → Phase 8
```

Each user story should be committed separately for easy rollback if issues arise.

---

## Notes

- [P] tasks = different files, safe to parallelize
- Run tests after EVERY task that modifies code
- If a type fix reveals a bug, fix the bug and document in commit message
- Commit after each completed user story for clean git history
- All 2655+ existing tests must pass at every checkpoint
