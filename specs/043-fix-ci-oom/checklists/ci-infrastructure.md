# Requirements Quality Checklist: CI OOM Fix

**Purpose**: Validate completeness, clarity, and consistency of CI/infrastructure requirements
**Created**: 2025-12-12
**Completed**: 2025-12-12
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)
**Focus Areas**: CI/Infrastructure, Performance/Resources, Error Handling
**Depth**: Thorough
**Audience**: Author, PR Reviewer, QA/Release Gate

---

## Requirement Completeness

- [x] CHK001 - Are all utils test files explicitly enumerated in requirements? [Completeness, Gap]
  - ✓ Plan.md enumerates all 11 files; spec defines "utils batch" requirement
- [x] CHK002 - Is the exact batch splitting strategy documented in FR-004? [Completeness, Spec §FR-004]
  - ✓ Spec: "split into smaller sub-batches"; Plan: "one file per batch"
- [x] CHK003 - Are requirements for maintaining existing batch structure (non-utils) specified? [Completeness, Gap]
  - ✓ FR-006 ensures local execution unaffected; plan notes existing batches unchanged
- [x] CHK004 - Is the total number of batches after fix documented? [Completeness, Gap]
  - ✓ Tasks.md: "15 individual batches (4 existing + 11 new)"
- [x] CHK005 - Are requirements for the `run_batch` function behavior specified? [Completeness, Gap]
  - ✓ FR-003 covers batch isolation behavior; implementation uses run_batch

## Requirement Clarity

- [x] CHK006 - Is "memory freed between batches" quantified with specific criteria? [Clarity, Spec §FR-003]
  - ✓ Updated to "vitest process exits completely (memory freed by OS process termination)"
- [x] CHK007 - Is "smaller sub-batches" defined with measurable batch size limits? [Clarity, Spec §FR-004]
  - ✓ Plan specifies "one file per batch" - maximum granularity
- [x] CHK008 - Is "~4GB for Node" a hard requirement or guideline? [Ambiguity, Spec §FR-002]
  - ✓ Updated FR-002 to clarify: "Node heap limit is 4GB via NODE_OPTIONS"
- [x] CHK009 - Is "accurate pass/fail counts" defined with specific aggregation rules? [Clarity, Spec §FR-005]
  - ✓ Script aggregates via TOTAL_PASSED/TOTAL_FAILED; task T019 validates
- [x] CHK010 - Is "NOT be affected" in FR-006 quantified with measurable criteria? [Ambiguity, Spec §FR-006]
  - ✓ SC-004 defines: "identical pass/fail results before and after changes"

## Requirement Consistency

- [x] CHK011 - Does 6GB peak (SC) align with 4GB Node limit (FR-002)? [Consistency, Spec §FR-002 vs §SC]
  - ✓ Consistent: 4GB Node heap + ~2GB OS overhead < 6GB total system
- [x] CHK012 - Are memory constraints consistent between spec and plan (6GB vs 4GB)? [Consistency]
  - ✓ Spec: 6GB total system, 4GB Node heap; Plan: same values
- [x] CHK013 - Is the 15-minute CI duration consistent with "5 minutes max increase"? [Consistency, Spec §SC-003 vs §US2]
  - ✓ Consistent: ~10 min baseline + 5 min max increase = 15 min limit
- [x] CHK014 - Are batch isolation requirements consistent across all batch types? [Consistency, Spec §FR-003]
  - ✓ FR-003 applies universally; run_batch function enforces for all batches

## Performance Requirements Quality

- [x] CHK015 - Is the 15-minute CI duration threshold justified with baseline data? [Measurability, Spec §SC-003]
  - ✓ Plan documents current CI time ~10 minutes; 5-min buffer specified
- [x] CHK016 - Is "under 5 seconds" inter-batch overhead measurable and testable? [Measurability, Spec §US2]
  - ✓ Measurable via batch timestamp comparison in CI logs
- [x] CHK017 - Are memory monitoring requirements specified for validation? [Gap]
  - ✓ SC-001 validates via absence of ERR_IPC_CHANNEL_CLOSED (OOM indicator)
- [x] CHK018 - Is the "~10 seconds overhead" from plan reflected in spec requirements? [Gap, Plan vs Spec]
  - ✓ Within spec bounds: 10 seconds << 5 minutes max increase
- [x] CHK019 - Are performance requirements defined for individual batch execution time? [Gap]
  - ✓ Not needed: only total CI time matters (SC-003: under 15 minutes)

## Error Handling Requirements

- [x] CHK020 - Are requirements for single-batch OOM failure behavior specified? [Coverage, Spec §Edge Cases]
  - ✓ EC-001: "batch MUST fail with non-zero exit code, subsequent batches MUST continue"
- [x] CHK021 - Is the expected exit code for batch failures documented? [Gap]
  - ✓ EC-001 specifies "non-zero exit code"; script uses exit 1
- [x] CHK022 - Are requirements for partial CI completion (some batches pass, some fail) defined? [Gap]
  - ✓ EC-001: "subsequent batches MUST continue executing"
- [x] CHK023 - Is retry behavior for failed batches specified or explicitly excluded? [Gap]
  - ✓ Implicitly excluded: CI reruns handle retries at workflow level
- [x] CHK024 - Are requirements for distinguishing OOM crashes from test failures defined? [Gap]
  - ✓ EC-002: "test results remain deterministic based on test logic, not memory state"

## Edge Case Coverage

- [x] CHK025 - Are requirements defined for when new test files are added to utils? [Coverage, Gap]
  - ✓ Out of scope: maintenance concern, not part of this fix
- [x] CHK026 - Is behavior specified when a single test file exceeds safe memory threshold? [Coverage, Spec §Edge Cases]
  - ✓ EC-001 covers: batch fails, CI continues with subsequent batches
- [x] CHK027 - Are requirements for handling test file renames/moves specified? [Gap]
  - ✓ Out of scope: standard maintenance, not part of this fix
- [x] CHK028 - Is behavior defined when GitHub Actions runner memory changes? [Gap]
  - ✓ Documented in Assumptions: "7GB RAM available" - changes would require spec update
- [x] CHK029 - Are requirements for flaky test detection vs memory issues documented? [Coverage, Spec §Edge Cases]
  - ✓ EC-002: "Flaky tests MUST NOT be masked by memory optimizations"

## Recovery & Rollback Scenarios

- [x] CHK030 - Are rollback requirements defined if the fix causes new failures? [Gap, Recovery Flow]
  - ✓ Standard git revert applies; not specific to this fix
- [x] CHK031 - Is the baseline state for comparison documented? [Gap]
  - ✓ Plan documents crash point at email-service.test.ts; tasks include before/after
- [x] CHK032 - Are requirements for reverting batch changes specified? [Gap, Recovery Flow]
  - ✓ Standard git workflow; single file change is easily revertible
- [x] CHK033 - Is monitoring/alerting for CI regression defined? [Gap]
  - ✓ GitHub Actions provides built-in failure notifications

## Dependencies & Assumptions

- [x] CHK034 - Is the 7GB GitHub Actions RAM assumption validated and documented? [Assumption, Spec §Assumptions]
  - ✓ Documented; standard for ubuntu-latest runners
- [x] CHK035 - Is the 2918 test count current and verified? [Assumption, Spec §Assumptions]
  - ✓ Verified via local test runs; documented in plan
- [x] CHK036 - Is the NODE_OPTIONS max-old-space-size=4096MB assumption justified? [Assumption, Spec §Assumptions]
  - ✓ Current script setting documented in Assumptions
- [x] CHK037 - Are vitest version requirements specified? [Gap, Plan §Technical Context]
  - ✓ Plan specifies "Vitest 3.2.4 on Node.js 22"
- [x] CHK038 - Is pool=forks with singleFork a hard dependency or recommendation? [Ambiguity, Spec §Assumptions]
  - ✓ Documented as "helps but isn't sufficient alone" - used in combination with batching

## Acceptance Criteria Quality

- [x] CHK039 - Can "0 ERR_IPC_CHANNEL_CLOSED errors" be objectively verified? [Measurability, Spec §SC-001]
  - ✓ Yes: grep CI logs for error string; count must be 0
- [x] CHK040 - Is "all 2900+ tests pass" testable with exact expected count? [Measurability, Spec §SC-002]
  - ✓ Script outputs exact count; ~2918 tests documented
- [x] CHK041 - Is "no increase in local test flakiness" quantified with baseline? [Ambiguity, Spec §SC-004]
  - ✓ Updated SC-004: "identical pass/fail results before and after changes"
- [x] CHK042 - Are acceptance criteria defined for the "memory properly freed" scenario? [Gap, Spec §US1]
  - ✓ Updated US1: "vitest process exits completely (memory freed by OS process termination)"

## Traceability & Documentation

- [x] CHK043 - Are all functional requirements traced to acceptance scenarios? [Traceability]
  - ✓ FR-001→SC-001, FR-002→US1#3, FR-003→US1#2, FR-004→US1, FR-005→T019, FR-006→SC-004
- [x] CHK044 - Is the root cause analysis in plan traceable to spec requirements? [Traceability]
  - ✓ Plan crash analysis → FR-004 (split utils batch)
- [x] CHK045 - Are the 11 utils files in plan aligned with spec's "utils batch" requirement? [Traceability, Plan vs Spec]
  - ✓ Plan enumerates files; spec requires splitting; tasks implement

---

## Summary

| Dimension           | Items      | Status |
| ------------------- | ---------- | ------ |
| Completeness        | CHK001-005 | ✓ PASS |
| Clarity             | CHK006-010 | ✓ PASS |
| Consistency         | CHK011-014 | ✓ PASS |
| Performance         | CHK015-019 | ✓ PASS |
| Error Handling      | CHK020-024 | ✓ PASS |
| Edge Cases          | CHK025-029 | ✓ PASS |
| Recovery            | CHK030-033 | ✓ PASS |
| Dependencies        | CHK034-038 | ✓ PASS |
| Acceptance Criteria | CHK039-042 | ✓ PASS |
| Traceability        | CHK043-045 | ✓ PASS |

**Total Items**: 45
**Completed**: 45
**Status**: ✓ ALL PASS
