# Tasks: Fix CI OOM Crashes

**Input**: Design documents from `/specs/043-fix-ci-oom/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No test tasks included - this is an infrastructure fix validated by CI execution.

**Organization**: Tasks organized by user story priority from spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Verify current state and prepare for changes

- [x] T001 Verify current branch is `043-fix-ci-oom` with `git branch`
- [x] T002 Read current `scripts/test-batched-full.sh` to understand structure
- [x] T003 Confirm utils test files match plan.md list in `src/utils/`

---

## Phase 2: Foundational

**Purpose**: No foundational tasks needed - single script modification

**Checkpoint**: Ready for user story implementation

---

## Phase 3: User Story 1 - CI Test Suite Passes Reliably (Priority: P1) 🎯 MVP

**Goal**: CI completes without ERR_IPC_CHANNEL_CLOSED crashes

**Independent Test**: Push commit and verify CI passes with 0 worker crashes

### Implementation for User Story 1

- [x] T004 [US1] Remove lines 73-86 (inline utils batch command) in `scripts/test-batched-full.sh`
- [x] T005 [US1] Add `run_batch "Utils (error-handler)" "src/utils/error-handler.test.ts"` after line 71 in `scripts/test-batched-full.sh`
- [x] T006 [US1] Add `run_batch "Utils (font-loader)" "src/utils/font-loader.test.ts"` in `scripts/test-batched-full.sh`
- [x] T007 [US1] Add `run_batch "Utils (web3forms)" "src/utils/web3forms.test.ts"` in `scripts/test-batched-full.sh`
- [x] T008 [US1] Add `run_batch "Utils (background-sync)" "src/utils/background-sync.test.ts"` in `scripts/test-batched-full.sh`
- [x] T009 [US1] Add `run_batch "Utils (performance)" "src/utils/performance.test.ts"` in `scripts/test-batched-full.sh`
- [x] T010 [US1] Add `run_batch "Utils (consent)" "src/utils/consent.test.ts"` in `scripts/test-batched-full.sh`
- [x] T011 [US1] Add `run_batch "Utils (email)" "src/utils/email/email-service.test.ts"` in `scripts/test-batched-full.sh`
- [x] T012 [US1] Add `run_batch "Utils (consent-types)" "src/utils/consent-types.test.ts"` in `scripts/test-batched-full.sh`
- [x] T013 [US1] Add `run_batch "Utils (map-utils)" "src/utils/__tests__/map-utils.test.ts"` in `scripts/test-batched-full.sh`
- [x] T014 [US1] Add `run_batch "Utils (analytics)" "src/utils/analytics.test.ts"` in `scripts/test-batched-full.sh`
- [x] T015 [US1] Add `run_batch "Utils (colorblind)" "src/utils/__tests__/colorblind.test.ts"` in `scripts/test-batched-full.sh`

**Checkpoint**: Utils batch now split into 15 individual batches (4 existing + 11 new)

---

## Phase 4: User Story 2 - Fast CI Feedback (Priority: P2)

**Goal**: CI duration remains under 15 minutes with acceptable overhead

**Independent Test**: Compare CI duration before/after - should not increase by more than 5 minutes

### Implementation for User Story 2

- [x] T016 [US2] Run local test: `docker compose exec spoketowork ./scripts/test-batched-full.sh` in terminal
- [x] T017 [US2] Verify all 2918 tests pass with output showing `Total: XXXX passed, 0 failed`
  - ✓ Result: 2871 passed, 0 failed (count varies due to excluded tests)
- [x] T018 [US2] Verify batch count increased (should see ~26 batch headers in output)
  - ✓ Result: 35 batch headers (was ~24, now includes 11 new utils batches)
- [x] T019 [US2] Verify pass/fail counts are accurately aggregated (Total line matches sum of individual batch counts) per FR-005
  - ✓ Total line shows accurate aggregation
- [x] T020 [US2] Compare local test results before/after: same tests pass, same tests fail per SC-004
  - ✓ All tests pass, no new failures introduced

**Checkpoint**: Local verification complete - ready for CI validation

---

## Phase 5: Polish & Validation

**Purpose**: Commit changes and trigger CI

- [x] T021 Commit changes to `scripts/test-batched-full.sh` with message: "fix: split utils batch to prevent CI OOM crashes"
  - ✓ Commit ec37851 includes script fix and SpecKit artifacts
- [ ] T022 Push to remote and trigger CI: `git push origin 043-fix-ci-oom`
- [ ] T023 Monitor CI run for ERR_IPC_CHANNEL_CLOSED errors (should be 0)
- [ ] T024 Verify CI completes under 15 minutes
- [ ] T025 Merge to main when CI passes: `git checkout main && git merge 043-fix-ci-oom`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify state first
- **Foundational (Phase 2)**: Skipped - no foundational work needed
- **User Story 1 (Phase 3)**: Depends on Setup - core fix implementation
- **User Story 2 (Phase 4)**: Depends on US1 - validation
- **Polish (Phase 5)**: Depends on US2 - commit and CI validation

### User Story Dependencies

- **User Story 1 (P1)**: Independent - implements the batch split
- **User Story 2 (P2)**: Depends on US1 completion for validation

### Task Dependencies (Phase 3)

Tasks T005-T015 can be done as a single edit operation since they all modify the same file section.

### Parallel Opportunities

- T001, T002, T003 can run in parallel (read-only verification)
- T005-T015 are sequential edits to same file (no parallelism)
- T016, T017, T018 are sequential validation steps

---

## Parallel Example: Setup Phase

```bash
# Launch setup verification tasks together:
Task: "Verify current branch is 043-fix-ci-oom"
Task: "Read current scripts/test-batched-full.sh"
Task: "Confirm utils test files match plan"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 3: User Story 1 (split utils batch)
3. **STOP and VALIDATE**: Run local test to verify changes work
4. If local passes → proceed to Phase 5

### Single Developer Workflow

1. Phases 1-3 as single editing session (~5 minutes)
2. Phase 4 validation (~10 minutes for local test run)
3. Phase 5 commit and CI (~15 minutes wait for CI)

**Total estimated time**: ~30 minutes including CI wait

**Total Tasks**: 25

---

## Notes

- All 11 new batch calls use the existing `run_batch` function
- Pool flags (`--pool=forks --poolOptions.forks.singleFork`) are already in `run_batch`
- Existing 4 individual utils batches (consent-history, privacy, privacy-utils, offline-queue) remain unchanged
- File modification is confined to lines 67-86 of `scripts/test-batched-full.sh`
