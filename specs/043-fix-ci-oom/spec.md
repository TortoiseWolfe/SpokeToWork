# Feature Specification: Fix CI OOM Crashes

**Feature Branch**: `043-fix-ci-oom`
**Created**: 2025-12-12
**Status**: Draft
**Input**: User description: "Fix CI ERR_IPC_CHANNEL_CLOSED crashes - the batched test runner with pool=forks still crashes in GitHub Actions due to memory exhaustion. Need to split utils batch smaller and reduce memory pressure."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - CI Test Suite Passes Reliably (Priority: P1)

As a developer, I need the CI test suite to complete successfully without memory-related crashes, so that I can merge code with confidence.

**Why this priority**: CI failures block all development and deployments. Every failed CI run wastes 10+ minutes and requires manual re-runs.

**Independent Test**: Push a commit to main branch and verify CI completes without ERR_IPC_CHANNEL_CLOSED or OOM errors.

**Acceptance Scenarios**:

1. **Given** the full test suite is triggered in GitHub Actions, **When** all test batches execute, **Then** no worker process crashes occur (exit code 0)
2. **Given** the test runner starts a batch, **When** the batch completes, **Then** the vitest process exits completely (memory freed by OS process termination)
3. **Given** CI runs on GitHub Actions free tier (7GB RAM), **When** all 2900+ tests run, **Then** total memory usage stays under 6GB peak

---

### User Story 2 - Fast CI Feedback (Priority: P2)

As a developer, I need CI to complete in a reasonable time, so that I don't wait excessively for merge approval.

**Why this priority**: Overly aggressive memory optimization could slow down CI significantly. Balance is needed.

**Independent Test**: Measure CI duration before and after changes; should not increase by more than 5 minutes (absolute limit).

**Acceptance Scenarios**:

1. **Given** the test suite runs with memory optimizations, **When** comparing to baseline, **Then** total CI time increases by no more than 5 minutes
2. **Given** tests run in batches, **When** each batch completes, **Then** inter-batch overhead is under 5 seconds

---

### Edge Cases

- **EC-001**: When a single test file causes OOM, that batch MUST fail with non-zero exit code, but subsequent batches MUST continue executing
- **EC-002**: Flaky tests (pass/fail intermittently) MUST NOT be masked by memory optimizations - test results remain deterministic based on test logic, not memory state

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: CI test script MUST complete without ERR_IPC_CHANNEL_CLOSED errors
- **FR-002**: Test batches MUST be sized to stay within GitHub Actions memory limits (7GB total; Node heap limit is 4GB via NODE_OPTIONS, leaving ~3GB for OS and other processes)
- **FR-003**: Each test batch MUST run in isolation with memory freed between batches
- **FR-004**: The utils test batch MUST be split into smaller sub-batches to prevent OOM
- **FR-005**: CI MUST report accurate pass/fail counts across all batches
- **FR-006**: Local test execution MUST NOT be affected by CI-specific optimizations

### Key Entities

- **Test Batch**: A group of test files run in a single vitest process
- **Worker Process**: The Node.js process that executes tests (can crash on OOM)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: CI completes 100% of test runs without worker crashes (0 ERR_IPC_CHANNEL_CLOSED errors)
- **SC-002**: All 2900+ tests pass in CI environment
- **SC-003**: CI total duration remains under 15 minutes
- **SC-004**: Local test runs produce identical pass/fail results before and after changes (same tests pass, same tests fail)

## Assumptions

- GitHub Actions runners have 7GB RAM available
- Current test suite has approximately 2918 tests
- The utils batch is the primary cause of OOM crashes (crash happens at email-service.test.ts)
- Pool=forks with singleFork helps but isn't sufficient alone
- NODE_OPTIONS max-old-space-size is currently set to 4096MB
