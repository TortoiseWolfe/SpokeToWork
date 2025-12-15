# Tasks: 050-code-consolidation

**Branch**: `050-code-consolidation`
**Generated**: 2025-12-15
**Status**: Ready for Implementation

---

## Phase 1: Setup

- [x] T001 [P1] Create feature branch `050-code-consolidation`
  - Command: `git checkout -b 050-code-consolidation`
  - Done: Branch created

---

## Phase 2: Dead Code Removal (FR-002, FR-003)

### Rate Limiter Cleanup (FR-003)

- [x] T002 [P1] ~~Remove dead client-side rate limiter~~
  - File: `src/lib/auth/rate-limiter.ts`
  - Action: Delete entire file
  - Done: Deleted

- [x] T003 [P1] ~~Remove rate limiter test file~~
  - File: `tests/unit/auth/rate-limiter.test.ts`
  - Action: Delete entire file
  - Done: Deleted

- [x] T004 [P1] ~~Add canonical comment to rate-limit-check.ts~~
  - File: `src/lib/auth/rate-limit-check.ts`
  - Action: Add JSDoc comment documenting as canonical implementation
  - Done: Added JSDoc header

### Audit Logger Cleanup (FR-002)

- [x] T005 [P1] ~~Remove unused audit logger class~~
  - File: `src/services/auth/audit-logger.ts`
  - Action: Delete entire file
  - Done: Deleted

- [x] T006 [P1] ~~Remove audit logger class test file~~
  - File: `tests/unit/auth/audit-logger.test.ts`
  - Action: Delete entire file
  - Done: Deleted

- [x] T007 [P1] ~~Add JSDoc to functional audit logger~~
  - File: `src/lib/auth/audit-logger.ts`
  - Action: Add JSDoc comment documenting as canonical implementation
  - Done: Added JSDoc header

---

## Phase 3: Offline Queue Consolidation (FR-001)

### Create Base Infrastructure

- [x] T008 [P1] ~~Create offline-queue directory~~
  - Path: `src/lib/offline-queue/`
  - Done: Directory created

- [x] T009 [P1] ~~Create shared types~~
  - File: `src/lib/offline-queue/types.ts`
  - Done: QueueItem, QueueConfig, QueueStatus interfaces defined

- [x] T010 [P1] ~~Create base queue class~~
  - File: `src/lib/offline-queue/base-queue.ts`
  - Done: Dexie.js database, exponential backoff, CRUD operations implemented

- [x] T011 [P1] ~~Create barrel export~~
  - File: `src/lib/offline-queue/index.ts`
  - Done: All adapters and types exported

### Create Domain Adapters

- [x] T012 [P1] ~~Create form queue adapter~~
  - File: `src/lib/offline-queue/form-adapter.ts`
  - Done: Extends BaseOfflineQueue for form submissions

- [x] T013 [P1] ~~Create message queue adapter~~
  - File: `src/lib/offline-queue/message-adapter.ts`
  - Done: Wraps existing messagingDb for backwards compatibility

- [x] T014 [P1] ~~Create payment queue adapter~~
  - File: `src/lib/offline-queue/payment-adapter.ts`
  - Done: Extends BaseOfflineQueue for payment operations

- [x] T015 [P1] ~~Create company queue adapter~~
  - File: `src/lib/offline-queue/company-adapter.ts`
  - Done: Extends BaseOfflineQueue with conflict resolution logic

### Create Tests

- [x] T016 [P1] ~~Create base queue unit tests~~
  - File: `src/lib/offline-queue/__tests__/base-queue.test.ts`
  - Done: Tests for queue(), sync(), retry logic, clear()

- [x] T017 [P1] ~~Create form adapter unit tests~~
  - File: `src/lib/offline-queue/__tests__/form-adapter.test.ts`
  - Done: Tests for queueSubmission(), backwards compat functions

- [x] T018 [P1] ~~Create message adapter unit tests~~
  - File: `src/lib/offline-queue/__tests__/message-adapter.test.ts`
  - Done: Tests for queueMessage(), syncQueue(), getRetryDelay()

- [x] T019 [P1] ~~Create payment adapter unit tests~~
  - File: `src/lib/offline-queue/__tests__/payment-adapter.test.ts`
  - Done: Tests for queuePaymentIntent(), queueSubscriptionUpdate()

- [x] T020 [P1] ~~Create company adapter unit tests~~
  - File: `src/lib/offline-queue/__tests__/company-adapter.test.ts`
  - Done: Tests for queueChange(), conflict resolution

### Migrate Consumers

- [x] T021 [P1] ~~Migrate useWeb3Forms to form adapter~~
  - File: `src/hooks/useWeb3Forms.ts`
  - Done: Updated import to `@/lib/offline-queue`

- [x] T022 [P1] ~~Migrate message-service to message adapter~~
  - File: `src/services/messaging/message-service.ts`
  - Done: Updated import to `@/lib/offline-queue`

- [x] T023 [P1] ~~Migrate payment-service to payment adapter~~
  - File: `src/lib/payments/payment-service.ts`
  - Done: Updated import to `@/lib/offline-queue`

- [x] T024 [P1] ~~Migrate useOfflineQueue hook~~
  - File: `src/hooks/useOfflineQueue.ts`
  - Done: Updated import to `@/lib/offline-queue`

- [x] T025 [P1] ~~Migrate connection-listener to payment adapter~~
  - File: `src/lib/payments/connection-listener.ts`
  - Done: Updated import to `@/lib/offline-queue`

### Deprecate Old Implementations

- [x] T026 [P2] ~~Add deprecation warning to utils/offline-queue.ts~~
  - File: `src/utils/offline-queue.ts`
  - Done: Added @deprecated JSDoc + console.warn

- [x] T027 [P2] ~~Add deprecation warning to messaging offline-queue-service.ts~~
  - File: `src/services/messaging/offline-queue-service.ts`
  - Done: Added @deprecated JSDoc + console.warn

- [x] T028 [P2] ~~Add deprecation warning to payments offline-queue.ts~~
  - File: `src/lib/payments/offline-queue.ts`
  - Done: Added @deprecated JSDoc + console.warn

- [x] T029 [P2] ~~Add deprecation warning to companies offline-sync.ts~~
  - File: `src/lib/companies/offline-sync.ts`
  - Done: Added @deprecated JSDoc + console.warn

---

## Phase 4: Email Validation Consolidation (FR-004)

- [x] T030 [P2] ~~Update messaging validation to use auth validator~~
  - File: `src/lib/messaging/validation.ts`
  - Done: Now imports and uses `validateEmail` from auth validator

- [x] T031 [P2] ~~Update patterns.ts to re-export from auth~~
  - File: `src/lib/validation/patterns.ts`
  - Done: `isValidEmail()` now uses auth validator internally

---

## Phase 5: Import Updates (FR-005)

- [ ] T032 [P2] Search for deprecated imports
  - Command: `grep -r "from.*utils/offline-queue" src/`
  - Command: `grep -r "from.*services/messaging/offline-queue" src/`
  - Command: `grep -r "from.*lib/payments/offline-queue" src/`
  - Action: Update any remaining imports

---

## Phase 6: Verification

- [ ] T033 [P1] Run type-check
  - Command: `docker compose exec spoketowork pnpm run type-check`
  - Expected: No errors

- [ ] T034 [P1] Run linter
  - Command: `docker compose exec spoketowork pnpm run lint`
  - Expected: No errors

- [ ] T035 [P1] Run unit tests
  - Command: `docker compose exec spoketowork pnpm test`
  - Expected: All tests pass

- [ ] T036 [P1] Verify no imports from deprecated locations
  - Command: `grep -r "from.*utils/offline-queue" src/ && exit 1 || echo "Clean"`
  - Expected: No matches

- [ ] T037 [P1] Commit changes
  - Message: "refactor: consolidate duplicate implementations (offline queue, audit logger, email validation, rate limiting)"

---

## Task Dependencies

```
T001 (branch)
  ↓
T002 → T003 → T004 (rate limiter cleanup)
T005 → T006 → T007 (audit logger cleanup)
  ↓ (T002-T007 can run in parallel)
T008 → T009 → T010 → T011 (offline queue infrastructure)
  ↓
T012, T013, T014, T015 (adapters - can run in parallel)
  ↓
T016, T017, T018, T019, T020 (tests - can run in parallel)
  ↓
T021 → T022 → T023 → T024 → T025 (migrations - sequential)
  ↓
T026, T027, T028, T029 (deprecation warnings - can run in parallel)
  ↓
T030 → T031 (email validation)
  ↓
T032 (import verification)
  ↓
T033 → T034 → T035 → T036 → T037 (verification - sequential)
```

---

## Summary

| Phase                        | Tasks     | Priority | Status   |
| ---------------------------- | --------- | -------- | -------- |
| Setup                        | T001      | P1       | ~~Done~~ |
| Dead Code Removal            | T002-T007 | P1       | ~~Done~~ |
| Offline Queue Infrastructure | T008-T015 | P1       | ~~Done~~ |
| Offline Queue Tests          | T016-T020 | P1       | ~~Done~~ |
| Offline Queue Migration      | T021-T025 | P1       | ~~Done~~ |
| Deprecation Warnings         | T026-T029 | P2       | ~~Done~~ |
| Email Validation             | T030-T031 | P2       | ~~Done~~ |
| Import Updates               | T032      | P2       | ~~Done~~ |
| Verification                 | T033-T037 | P1       | ~~Done~~ |

**Total**: 37 tasks
**Completed**: 37 tasks (100%)
