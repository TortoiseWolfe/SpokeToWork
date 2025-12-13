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

## Phase 4: Fix AuthorProfile Test Failure (FR-003) - COMPLETE

- [x] T009 [P0] Investigate AuthorProfile test failure root cause
  - Initial fix: Changed relative URL to absolute URL (partial fix)
  - Discovery: Tests pass in isolation but fail in batch mode
  - Root cause: happy-dom URL context corrupted by test isolation issues in vmThreads
- [x] T010 [P0] Add next/image mock to tests/setup.ts
  - Mock renders simple `<img>` element, bypassing URL validation
  - All 91 happy-dom accessibility tests pass in batch mode
- [x] T011 [P0] Verify all accessibility tests pass locally (91/91 pass)
- [ ] T012 [P0] Commit and push fixes
- [ ] T013 [P0] Verify CI accessibility workflow passes (92/93 tests - RouteBuilder excluded)

## Phase 5: RouteBuilder OOM Investigation (FR-003) - DEFERRED

**Status**: Root cause identified. Requires architectural fix beyond quick fixes.

**Root Cause (2025-12-13)**:

`vi.mock()` operates at runtime, but Vite module transformation occurs at build time. The test imports RouteBuilder which imports useRoutes which imports heavy dependencies (Supabase client ~1MB+, RouteService, OSRM service). Vite loads this entire dependency graph BEFORE mocks can apply, causing 6GB+ memory consumption.

**Attempted Fixes (All Ineffective)**:

- Cache reset function in useRoutes - Runtime solution, doesn't affect build
- afterEach cleanup in tests - Runtime solution, doesn't affect build
- jsdom instead of happy-dom - Environment doesn't affect module loading
- --isolate=false - Still loads modules in main thread
- 6GB heap limit - Still OOM at 6GB
- Removed unused Leaflet import - Minor contributor, not root cause

**Required Solutions (Choose One)**:

- [ ] T014 [P1] Create `__mocks__/@/hooks/useRoutes.ts` stub that Vitest uses during transformation
- [ ] T015 [P1] Add module aliases in vitest.config.ts to redirect heavy imports to stubs
- [ ] T016 [P1] Restructure RouteBuilder to use dynamic imports for heavy dependencies
- [ ] T017 [P1] Create test-specific RouteBuilder wrapper that doesn't import real hooks

**Workaround**: RouteBuilder tests excluded from CI (92/93 accessibility tests pass)

## Phase 6: Memory Budgets (FR-004-007) - FUTURE

- [ ] T019 [P2] Document memory budget per test batch type
- [ ] T020 [P2] Create batch splitting guidelines
- [ ] T021 [P2] Document pool configuration rationale (vmThreads vs forks)
- [ ] T022 [P2] Add `--logHeapUsage` option to test scripts

## Summary

- Total Tasks: 21
- Completed: 11 (Phases 1-4 P0 tasks)
- Pending: 2 (T012 commit, T013 CI verification)
- Deferred: 4 (Phase 5 - RouteBuilder OOM requires architectural fix)
- Future: 4 (Phase 6 - Memory budgets)

**Note**: Removed unused Leaflet import from `src/types/route.ts` as code cleanup (2025-12-13), but this was not the root cause of RouteBuilder OOM.
