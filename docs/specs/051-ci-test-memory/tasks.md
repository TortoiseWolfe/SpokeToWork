# Tasks: CI Test Memory Optimization (051)

## Phase 1: Setup

- [x] T001 [P0] Create spec document at `docs/specs/051-ci-test-memory/spec.md`

## Phase 2: Node.js Alignment (FR-001) - COMPLETE

- [x] T002 [P0] Update `.github/workflows/ci.yml` to use Node 22
- [x] T003 [P0] Update `.github/workflows/e2e.yml` to use Node 22
- [x] T004 [P0] Update `.github/workflows/component-structure.yml` to use Node 22
- [x] T005 [P0] Update `.github/workflows/monitor.yml` to use Node 22
- [x] T006 [P0] Update `.github/workflows/supabase-keepalive.yml` to use Node 22
- [x] T007 [P0] Add `engines` field to `package.json` requiring Node >=22

## Phase 3: Documentation (FR-002) - COMPLETE

- [x] T008 [P0] Document batched test architecture in `docs/project/TESTING.md`

## Phase 4: Fix AuthorProfile Test Failure (FR-003) - IN PROGRESS

- [x] T009 [P0] Fix `AuthorProfile.accessibility.test.tsx` - use absolute URL for avatar mock
- [x] T010 [P0] Fix `AuthorProfile.test.tsx` - use absolute URL for avatar mock
- [x] T011 [P0] Verify all AuthorProfile tests pass locally (8/8 pass)
- [ ] T012 [P0] Commit and push fixes
- [ ] T013 [P0] Verify CI accessibility workflow passes (91/91 tests)

## Phase 5: RouteBuilder OOM Investigation (FR-003) - DEFERRED

- [ ] T014 [P1] Profile RouteBuilder test module loading with `--logHeapUsage`
- [ ] T015 [P1] Identify heavy dependencies in useRoutes chain
- [ ] T016 [P1] Create minimal repro of RouteBuilder OOM
- [ ] T017 [P1] Either fix RouteBuilder or document permanent exclusion

## Phase 6: Memory Budgets (FR-004-007) - FUTURE

- [ ] T018 [P2] Document memory budget per test batch type
- [ ] T019 [P2] Create batch splitting guidelines
- [ ] T020 [P2] Document pool configuration rationale (vmThreads vs forks)
- [ ] T021 [P2] Add `--logHeapUsage` option to test scripts

## Summary

- Total Tasks: 21
- Completed: 9
- In Progress: 5 (Phase 4)
- Pending: 7 (Phases 5-6)
