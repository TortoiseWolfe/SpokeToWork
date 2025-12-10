# Feature Specification: Test Suite Memory Optimization

**Feature Branch**: `042-test-memory-optimization`
**Created**: 2025-12-09
**Status**: Complete (Phase 1)
**Input**: User description: "Test suite memory optimization and redundancy reduction - Fix OOM crashes when running 2800 tests locally in Docker/WSL2 by: 1) Switching from jsdom to happy-dom environment, 2) Enabling sequential execution with memory limits, 3) Auditing and eliminating redundant tests, 4) Consolidating to 4 pre-seeded test users (PRIMARY, SECONDARY, TERTIARY, ADMIN) instead of creating dynamic users per test, 5) Organizing tests by user flow through the app"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Runs Full Test Suite Locally (Priority: P1)

A developer wants to run the complete test suite (~2800 tests) locally in a Docker/WSL2 environment with limited memory (4GB) to verify code changes before committing. Currently, tests crash with OOM (exit code 137) before completing.

**Why this priority**: Without this, developers cannot validate their changes locally and must rely solely on CI, slowing down the development cycle and increasing failed builds.

**Independent Test**: Can be fully tested by running `pnpm test` in Docker container and observing all tests complete without OOM crashes.

**Acceptance Scenarios**:

1. **Given** a developer is in the Docker container with 4GB memory limit, **When** they run `pnpm test`, **Then** all ~2800 tests execute to completion without OOM crashes
2. **Given** a developer runs the test suite, **When** tests complete, **Then** the total execution time is under 10 minutes
3. **Given** a developer runs tests, **When** any individual test fails, **Then** the failure is clearly reported with file location and error message (not masked by OOM)

---

### User Story 2 - Developer Identifies Redundant Tests (Priority: P2) _(Deferred to Phase 3)_

A developer or QA engineer wants to audit the test suite to identify and eliminate redundant tests that test the same functionality multiple times across different test types (unit, contract, integration, E2E), reducing maintenance burden and execution time.

**Why this priority**: Redundant tests waste execution time, create maintenance burden, and obscure real coverage gaps. Reducing redundancy makes the suite faster and more maintainable.

**Independent Test**: Can be tested by generating a test coverage matrix showing overlap between test types and identifying tests that can be safely removed.

**Acceptance Scenarios**:

1. **Given** a test matrix exists for each user flow, **When** a reviewer examines it, **Then** they can identify which test types cover each flow and where overlap exists
2. **Given** redundant tests are identified, **When** they are removed, **Then** overall test count decreases by at least 15% while maintaining code coverage above 40%
3. **Given** tests are deduplicated, **When** a bug is introduced, **Then** at least one test catches it (no coverage regression)

---

### User Story 3 - Tests Use Pre-Seeded Users (Priority: P2) _(Deferred to Phase 2)_

A developer wants tests to use the 4 pre-seeded test users defined in the `.env` file (PRIMARY, SECONDARY, TERTIARY, ADMIN) instead of creating new dynamic users for each test, reducing database clutter, Supabase rate limiting, and test flakiness.

**Why this priority**: Dynamic user creation causes rate limiting issues, orphaned database records, and flaky tests. Using consistent test users improves reliability and simplifies debugging.

**Independent Test**: Can be tested by running the full test suite and verifying only 4 test users exist in the database afterward.

**Acceptance Scenarios**:

1. **Given** integration tests need a user, **When** they execute, **Then** they use the PRIMARY user credentials from `.env` (not create new users)
2. **Given** multi-user tests need multiple users, **When** they execute, **Then** they use PRIMARY + SECONDARY (or TERTIARY) users from `.env`
3. **Given** the full test suite completes, **When** database is queried, **Then** only 4 test users exist (PRIMARY, SECONDARY, TERTIARY, ADMIN)
4. **Given** signup flow tests (Feature 027), **When** they execute, **Then** they are the ONLY tests allowed to create dynamic users (with cleanup)

---

### User Story 4 - Tests Organized by User Flow (Priority: P3) _(Deferred to Phase 4)_

A developer wants tests organized by user journey through the application rather than by technical type, making it easier to understand coverage and identify gaps for specific features.

**Why this priority**: Flow-based organization provides clearer coverage visibility and makes it easier to identify what's tested vs untested. Lower priority because it's organizational rather than functional.

**Independent Test**: Can be tested by examining the test directory structure and verifying tests are grouped by user flow.

**Acceptance Scenarios**:

1. **Given** a developer looks at the test directory, **When** they navigate to a flow folder (e.g., `01-onboarding`), **Then** they find all tests related to that user journey
2. **Given** a new feature is added, **When** a developer writes tests, **Then** they know exactly where to place them based on user flow
3. **Given** tests are reorganized by flow, **When** the test suite runs, **Then** test output is grouped by flow for easier debugging

---

### Edge Cases

**Phase 1 (This PR):**

- What happens when a test is incompatible with happy-dom? → Use `environmentMatchGlobs` fallback to jsdom
- What happens if memory still exceeds limits with optimizations? → Rollback to jsdom, keep sequential execution

**Phase 2-4 (Deferred):**

- What happens when a test requires user state that conflicts with other tests using the same user?
- How does system handle tests that must run in isolation (e.g., password change tests)?
- What happens when a test accidentally modifies shared user data?
- How do we handle tests that legitimately need to create users (signup flow)?

## Requirements _(mandatory)_

### Functional Requirements (Phase 1 - This PR)

- **FR-001**: Test suite MUST complete all ~2800 tests without OOM crashes in Docker/WSL2 with 4GB memory limit
- **FR-002**: Test configuration MUST use happy-dom as default environment, with per-file jsdom fallback for incompatible tests
- **FR-003**: Test execution MUST use sequential (single-fork) mode to limit concurrent memory usage
- **FR-004**: Test scripts MUST set NODE_OPTIONS with max-old-space-size of 4096MB

### Functional Requirements (Phase 2-4 - Deferred to Follow-up PRs)

- **FR-005**: _(Deferred)_ Integration tests MUST use pre-seeded test users from `.env` instead of creating dynamic users
- **FR-006**: _(Deferred)_ E2E tests MUST use pre-seeded test users except for signup flow tests
- **FR-007**: _(Deferred)_ System MUST provide a test redundancy matrix showing coverage overlap by user flow
- **FR-008**: _(Deferred)_ After test suite completion, database MUST contain only 4 test users (PRIMARY, SECONDARY, TERTIARY, ADMIN)
- **FR-009**: _(Deferred)_ Signup flow tests MUST clean up any dynamically created users in afterAll hooks
- **FR-010**: _(Deferred)_ Tests MUST be organized in directories by user flow (onboarding, authentication, profile, etc.)

### Key Entities

- **Test User (PRIMARY)**: Main test account for most single-user tests; credentials in `TEST_USER_PRIMARY_EMAIL/PASSWORD`
- **Test User (SECONDARY)**: Second user for multi-user scenarios (messaging, connections); credentials in `TEST_USER_SECONDARY_EMAIL/PASSWORD`
- **Test User (TERTIARY)**: Third user for group interactions (3+ member conversations); credentials in `TEST_USER_TERTIARY_EMAIL/PASSWORD`
- **Test User (ADMIN)**: System user for automated messages; fixed UUID with ECDH public key stored in database
- **Test Flow**: A user journey grouping (e.g., onboarding, authentication, profile) containing related tests across all test types

## Success Criteria _(mandatory)_

### Measurable Outcomes (Phase 1 - This PR)

- **SC-001**: All ~2800 tests complete without OOM crashes when running `pnpm test` in Docker with 4GB memory
- **SC-002**: Full test suite execution completes in under 10 minutes
- **SC-007**: Peak memory usage during test execution stays under 3.5GB (leaving headroom for system)

### Measurable Outcomes (Phase 2-4 - Deferred to Follow-up PRs)

- **SC-003**: _(Deferred)_ Test count reduced by at least 15% through redundancy elimination while maintaining 40%+ code coverage
- **SC-004**: _(Deferred)_ After full test suite run, database contains exactly 4 test users (no orphaned dynamic users)
- **SC-005**: _(Deferred)_ 100% of integration tests use pre-seeded test user credentials from `.env`
- **SC-006**: _(Deferred)_ Test redundancy matrix documents coverage for all 7 user flows with overlap analysis

## Out of Scope

- CI/CD (GitHub Actions) workflow changes - local Docker optimization only
- Phases 2-4 (test user consolidation, redundancy audit, flow reorganization) - deferred to follow-up PRs

## Assumptions

- Docker container has at least 4GB memory allocated
- Pre-seeded test users (PRIMARY, SECONDARY, TERTIARY, ADMIN) already exist in Supabase
- Sequential execution is acceptable trade-off for memory stability (slightly slower)
- Some tests may need refactoring to work with shared users instead of isolated users

## Clarifications

### Session 2025-12-09

- Q: What is the rollback strategy if happy-dom causes test failures? → A: Hybrid approach - use happy-dom for most tests, jsdom for incompatible tests (per-file environment override in vitest config)
- Q: Does this memory optimization apply to CI/CD or only local Docker testing? → A: Local only - keep CI unchanged, optimize local Docker testing first

---

## Technical Clarifications (Release Gate)

### Completeness

**CHK001 - Test Scripts Requiring NODE_OPTIONS**:
Only 2 test scripts need NODE_OPTIONS (based on package.json audit):

- `test` - Main test script
- `test:coverage` - Coverage test script

Other scripts (`test:ui`, `test:e2e`, `test:a11y`, etc.) don't need NODE_OPTIONS because:

- `test:ui` uses vitest UI mode (inherits from main config)
- `test:e2e` uses Playwright (separate process, own memory management)
- `test:a11y` uses pa11y (separate process)

**CHK002 - Vitest Config Files**:
Only one vitest config file exists: `vitest.config.ts`. No split configs (vitest.atomic.config.ts, etc.) exist in this project.

**CHK003 - Identifying jsdom-Incompatible Tests**:
Tests are jsdom-incompatible if they:

1. Fail with errors mentioning happy-dom limitations (e.g., specific Canvas API features)
2. Use jsdom-specific APIs not implemented in happy-dom
3. Rely on jsdom's more complete DOM implementation for edge cases

Detection method: Run test suite, identify failures with happy-dom error messages.

**CHK004 - Process for environmentMatchGlobs**:

1. Test fails with happy-dom-specific error
2. Developer adds path to `environmentMatchGlobs` array in vitest.config.ts
3. Alternative: Add `// @vitest-environment jsdom` comment at top of test file
4. Document reason in commit message

**CHK005 - Memory Monitoring**:

- Tool: `docker stats` in separate terminal during test execution
- Metric: MEM USAGE column for spoketowork container
- Threshold: Peak must stay below 3.5GB (3.5GiB displayed)
- Frequency: Sample every 1-2 seconds visually, note peak value

**CHK006 - happy-dom Version**:

- Current version: `^20.0.11` (installed in package.json)
- Minimum version: 14.0.0 (when major Vitest compatibility was established)
- Recommended: Use installed version, upgrade only if bugs encountered

### Clarity

**CHK007 - Test Count (~2800)**:
Approximate count is acceptable. Actual count may vary ±100 due to:

- Test file excludes in vitest.config.ts
- Pending/skipped tests
  Verification: Final count shown in Vitest output after successful run.

**CHK008 - Timing Measurement**:

- Start: When `docker compose exec spoketowork pnpm test -- --run` command is issued
- End: When command returns (exit code 0)
- Tool: Use `time` command prefix: `time docker compose exec spoketowork pnpm test -- --run`
- Threshold: "real" time must be under 10 minutes (600 seconds)

**CHK009 - Memory Measurement**:

- Granularity: Peak instantaneous value observed in `docker stats`
- Sampling: Visual observation during entire test run
- Threshold: No single reading should exceed 3.5GB
- Note: Brief spikes are acceptable if they don't cause OOM

**CHK010 - 4GB Docker Memory Limit**:

- Type: Configurable constraint (Docker Desktop/WSL2 settings)
- Default assumption: Developer has 4GB allocated to Docker
- Verification: `docker stats` shows 4GB limit or check Docker Desktop settings
- Lower limits may work but are not tested

**CHK011 - Sequential Execution**:

- Definition: `pool: 'forks'` with `poolOptions.forks.singleFork: true`
- Behavior: Tests run one at a time in a single forked process
- Isolation: Each test file runs, then process memory is released before next file
- Trade-off: Slower than parallel but prevents memory accumulation

**CHK012 - Incompatible Test Criteria**:
A test is jsdom-dependent if it:

1. Uses Canvas 2D context APIs not supported by happy-dom
2. Uses `createImageBitmap` with dimension checks
3. Relies on specific DOM mutation observer timing
4. Uses jsdom's `window.getComputedStyle` quirks

### Consistency

**CHK016 - Memory Limit Units**:
4GB = 4096MB = 4 GiB (consistent across spec and plan, different notation only)

**CHK017 - Test Script Names**:
Package.json scripts match spec references:

- `test` → `pnpm test` (main suite)
- `test:coverage` → `pnpm test:coverage` (coverage mode)

### Acceptance Criteria Measurement

**CHK018 - SC-001 Measurement**:

- Method: Check exit code after `pnpm test -- --run`
- Pass: Exit code 0
- Fail: Exit code 137 (OOM killed)
- Command: `echo $?` after test completion

**CHK019 - SC-002 Measurement**:

- Method: `time docker compose exec spoketowork pnpm test -- --run`
- Pass: "real" time < 10m0s
- Baseline: Not established (current tests crash before completing)

**CHK020 - SC-007 Measurement**:

- Method: `docker stats` during test run
- Pass: Peak MEM USAGE < 3.5GiB
- Sampling: Continuous visual monitoring

**CHK021 - Coverage Verification**:

- Method: `pnpm test:coverage` shows statement coverage
- Current baseline: 43% (vitest.config.ts thresholds)
- Pass: Coverage ≥ 40%

**CHK022 - Hybrid Environment Success**:

- Definition: Tests pass regardless of which environment they use
- Threshold: 100% of tests must pass (either via happy-dom or jsdom fallback)
- Failure handling: Any test that fails with both environments requires investigation

### Scenario Coverage

**CHK023 - Partial Test Suite Runs**:
Partial runs (e.g., `pnpm test src/components/`) are not optimized by this feature.
The NODE_OPTIONS still apply but memory pressure is lower with fewer tests.

**CHK024 - Watch Mode**:
Watch mode (`vitest` without `--run`) retains process between runs.
Memory may accumulate. Recommendation: Use `--run` for full suite, watch mode for TDD.

**CHK025 - Coverage Mode Memory**:
Coverage adds ~10-15% memory overhead for instrumentation.
NODE_OPTIONS applies equally. No separate threshold defined.

**CHK026 - Split Config Files**:
N/A - Only `vitest.config.ts` exists in this project.

**CHK027 - Child Process Tests**:
Playwright E2E tests are excluded from vitest runs.
No other tests spawn child processes.

### Edge Cases

**CHK028 - Single Test Exceeds Memory**:
If one test causes OOM alone:

1. Identify via binary search (run half the tests)
2. Fix the test or mark as `test.skip` with TODO
3. Out of scope for this Phase 1 feature

**CHK029 - happy-dom Test Failures**:
Per clarification: Use hybrid approach - add failing tests to environmentMatchGlobs.

**CHK030 - jsdom-Specific Features**:
Tests requiring: Canvas API, createImageBitmap, getComputedStyle quirks → add to environmentMatchGlobs.

**CHK031 - NODE_OPTIONS Conflicts**:
If existing NODE_OPTIONS in environment:

- Script NODE_OPTIONS override environment
- No conflicts expected in Docker container (clean environment)

**CHK032 - Tests Outside Docker**:
Running tests on host machine:

- NODE_OPTIONS still apply if using npm scripts
- Memory limit depends on host system
- Not covered by this feature (Docker-first project)

### Non-Functional Requirements

**CHK033 - Performance Degradation**:
Sequential execution expected to be 2-3x slower than parallel.
Acceptable trade-off: 5-10 minutes vs OOM crash.

**CHK034 - Memory Headroom Justification**:
3.5GB threshold leaves 500MB headroom for:

- Docker daemon overhead
- WSL2 memory management
- Garbage collection spikes
- System processes

**CHK035 - Test Stability**:
Flaky tests are not addressed by this feature.
Sequential execution may reduce race-condition flakiness.

**CHK036 - Config Maintainability**:
To add jsdom fallback: Edit `environmentMatchGlobs` array in vitest.config.ts.
To remove: Delete the entry. Self-documenting via comments.

### Dependencies

**CHK037 - happy-dom Installed**:
**ACTION REQUIRED**: happy-dom is NOT currently installed. Must be added as devDependency.

- Current: Only `jsdom: ^26.1.0` is installed
- Required: Add `happy-dom` via `docker compose exec spoketowork pnpm add -D happy-dom`
- This is a prerequisite task before switching environment in vitest.config.ts

**CHK038 - Docker 4GB Documentation**:
Developers verify via:

- Docker Desktop: Settings → Resources → Memory
- WSL2: `.wslconfig` file memory limit
- Linux: `docker stats` shows available memory

**CHK039 - Vitest Compatibility**:

- Current: `vitest ^3.2.4`
- `pool: 'forks'` available since Vitest 0.30.0
- `singleFork` available since Vitest 1.0.0

**CHK040 - Node.js Compatibility**:

- Current: Node.js 22 (from plan.md)
- `--max-old-space-size` available in all Node.js versions
- 4096 value valid for 64-bit systems

### Rollback

**CHK041 - Rollback Procedure**:

1. Revert vitest.config.ts: change `environment: 'happy-dom'` back to `environment: 'jsdom'`
2. Remove `pool` and `poolOptions` lines
3. Optionally keep NODE_OPTIONS (always beneficial)
   Time: ~2 minutes to edit and commit.

**CHK042 - Rollback Trigger Criteria**:
Trigger rollback if:

- > 10% of tests fail with happy-dom and can't be fixed with environmentMatchGlobs
- Test execution time exceeds 15 minutes (unacceptable degradation)
- Unexpected memory behavior (higher than jsdom baseline)

**CHK043 - Partial Rollback**:
Option to keep sequential execution (`pool: 'forks'`) while reverting environment to jsdom.
This alone may resolve OOM without happy-dom switch.

**CHK044 - Rollback Time Estimate**:

- Edit config: 1 minute
- Test verification: 5-10 minutes
- Total: ~15 minutes for full rollback and verification

### Traceability

**CHK048 - FR to SC Mapping**:

- FR-001 (no OOM) → SC-001 (exit code 0)
- FR-002 (happy-dom) → SC-001 (tests complete)
- FR-003 (sequential) → SC-001, SC-007 (memory control)
- FR-004 (NODE_OPTIONS) → SC-007 (memory limit)

**CHK049 - SC Verification Methods**:

- SC-001: Exit code check (`echo $?`)
- SC-002: Time command output
- SC-007: Docker stats observation

**CHK050 - Clarifications Reflected**:

- Hybrid approach → FR-002 "with per-file jsdom fallback"
- Local only → Out of Scope "CI/CD workflow changes"
