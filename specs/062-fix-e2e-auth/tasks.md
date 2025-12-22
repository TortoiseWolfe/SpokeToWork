# Tasks: Fix E2E Test Authentication Failures

**Branch**: `062-fix-e2e-auth` | **Generated**: 2025-12-22

## Phase 1: Cookie Consent Pre-seeding (US2)

**Goal**: Eliminate cookie banner from 95% of tests

- [x] T001 [P1] [US2] Create `tests/e2e/fixtures/` directory structure
- [x] T002 [P1] [US2] Create `tests/e2e/utils/consent-helpers.ts` with `generateConsentState()` function
- [x] T003 [P1] [US2] Create `tests/e2e/fixtures/storage-state.json` with pre-accepted cookie consent
- [x] T004 [P1] [US2] Update `playwright.config.ts` to use storageState by default
- [x] T005 [P1] [US2] Test that cookie banner does not appear with new config

## Phase 2: Auth Helper with Robust Verification (US1)

**Goal**: Fix 51% of failures with reliable auth verification

- [x] T006 [P1] [US1] Create `tests/e2e/utils/auth-helpers.ts` with `loginAndVerify()` function
- [x] T007 [P1] [US1] Add URL change detection (NOT /sign-in pattern)
- [x] T008 [P1] [US1] Add element verification ("User account menu" selector)
- [x] T009 [P1] [US1] Add error handling with descriptive messages
- [ ] T010 [P1] [US1] Create `tests/e2e/fixtures/auth.fixture.ts` wrapping the helper (deferred - not needed for core fix)
- [x] T011 [P1] [US1] Test helper manually with one failing auth test

## Phase 3: Test User Factory Hardening (US3)

**Goal**: Fail fast when SUPABASE_SERVICE_ROLE_KEY is missing

- [x] T012 [P2] [US3] Add env var validation at top of `tests/e2e/utils/test-user-factory.ts`
- [x] T013 [P2] [US3] Add clear error message format: "SUPABASE_SERVICE_ROLE_KEY required - check .env locally or GitHub Secrets in CI"
- [x] T014 [P2] [US3] Test fail-fast by temporarily removing env var

## Phase 4: Test Migration (US1, US3, US4)

**Goal**: Update failing tests to use new patterns

### Priority 1 - Auth Tests (5 files, ~30 tests)

- [x] T015 [P] [US1] Migrate `tests/e2e/auth/session-persistence.spec.ts` to use `loginAndVerify()`
- [ ] T016 [P] [US1] Migrate `tests/e2e/auth/complete-flows.spec.ts` to use `loginAndVerify()` (has other issues - Sign Out in dropdown)
- [x] T017 [P] [US1] Migrate `tests/e2e/auth/protected-routes.spec.ts` to use `loginAndVerify()`
- [ ] T018 [P] [US1] Verify all auth/ tests pass: `docker compose exec spoketowork pnpm exec playwright test tests/e2e/auth/`

### Priority 2 - Accessibility Tests (2 files, ~20 tests)

- [x] T019 [P] [US3] Migrate `tests/e2e/accessibility/avatar-upload.a11y.test.ts` to use `createTestUser()` + `loginAndVerify()`
- [ ] T020 [P] [US3] Migrate `tests/e2e/accessibility/colorblind-toggle.spec.ts` to new patterns
- [ ] T021 [P] [US3] Verify accessibility tests pass: `docker compose exec spoketowork pnpm exec playwright test tests/e2e/accessibility/`

### Priority 3 - Avatar Tests (1 file, ~5 tests)

- [ ] T022 [P] [US3] Migrate `tests/e2e/avatar/upload.spec.ts` to use `createTestUser()` + `loginAndVerify()`

### Priority 4 - Companies Tests (state-dependent)

- [ ] T023 [P] [US4] Review `tests/e2e/companies/companies-sort.spec.ts` for state dependencies
- [ ] T024 [P] [US4] Add proper data seeding in `beforeAll` for companies tests
- [ ] T025 [P] [US4] Add cleanup in `afterAll` for companies tests

### Priority 5 - Blog Tests

- [ ] T026 [P] [US3] Migrate `tests/e2e/blog/capture-screenshots.spec.ts` to new patterns
- [ ] T027 [P] [US3] Migrate any remaining blog tests using auth

## Phase 5: Verification (All User Stories)

**Goal**: Confirm success criteria are met

- [ ] T028 [P1] Verify cookie banner visible in 0% of error screenshots (SC-005)
- [ ] T029 [P1] Run full auth test suite: `docker compose exec spoketowork pnpm exec playwright test tests/e2e/auth/`
- [ ] T030 [P1] Run auth tests 3 times consecutively to verify consistency (SC-004)
- [ ] T031 [P1] Run full E2E suite and count remaining failures
- [ ] T032 [P1] Update `docs/specs/e2e-remediation/analysis-report.md` with new metrics
- [ ] T033 [P1] Verify CRITICAL failures reduced from 27 to 0 (SC-001)
- [ ] T034 [P1] Verify total failures < 20 (SC-002, target 84% improvement)

## Summary

| Phase                      | Tasks  | Priority     | User Stories  |
| -------------------------- | ------ | ------------ | ------------- |
| Phase 1: Cookie Consent    | 5      | P1           | US2           |
| Phase 2: Auth Helper       | 6      | P1           | US1           |
| Phase 3: Factory Hardening | 3      | P2           | US3           |
| Phase 4: Test Migration    | 13     | P (parallel) | US1, US3, US4 |
| Phase 5: Verification      | 7      | P1           | All           |
| **Total**                  | **34** |              |               |

## Dependency Notes

- T001-T005 (Cookie Consent) can run in parallel with T006-T011 (Auth Helper)
- T012-T014 (Factory) depends on T006 (auth-helpers exists for imports)
- T015-T027 (Migration) depends on T001-T014 being complete
- T028-T034 (Verification) depends on all previous tasks

## Task Legend

- `[P1]` - Priority 1, must complete first
- `[P2]` - Priority 2, can start after P1
- `[P]` - Parallel, can run simultaneously with other [P] tasks
- `[US1]` - Maps to User Story 1 (Auth Setup)
- `[US2]` - Maps to User Story 2 (Cookie Banner)
- `[US3]` - Maps to User Story 3 (Test User Factory)
- `[US4]` - Maps to User Story 4 (State-Dependent)
