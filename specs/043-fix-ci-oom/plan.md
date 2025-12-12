# Implementation Plan: Fix CI OOM Crashes

**Branch**: `043-fix-ci-oom` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/043-fix-ci-oom/spec.md`

## Summary

CI crashes with ERR_IPC_CHANNEL_CLOSED due to memory exhaustion in the "Utils (rest)" batch. The batch runs ~4200 lines of test code in a single vitest process. Fix by splitting utils into individual batches so each vitest process handles only one test file.

## Technical Context

**Language/Version**: Bash script + Vitest 3.2.4 on Node.js 22
**Primary Dependencies**: Vitest, pnpm, GitHub Actions runner
**Storage**: N/A (test infrastructure)
**Testing**: Vitest with happy-dom/jsdom environments
**Target Platform**: GitHub Actions (ubuntu-latest, 7GB RAM)
**Project Type**: Single repo with batched test runner
**Performance Goals**: CI completion under 15 minutes
**Constraints**: <6GB peak memory, no local test impact
**Scale/Scope**: 2918 tests across 14 utils test files (5188 lines)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

N/A - Constitution not configured for this project. Proceeding with standard practices.

## Project Structure

### Documentation (this feature)

```text
specs/043-fix-ci-oom/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
scripts/
└── test-batched-full.sh    # PRIMARY FILE TO MODIFY

# No data model or API contracts needed - this is a script fix
```

**Structure Decision**: Single script modification. No new files required.

## Root Cause Analysis

The "Utils (rest)" batch runs these files in a single vitest process:

1. error-handler.test.ts (649 lines)
2. font-loader.test.ts (565 lines)
3. web3forms.test.ts (520 lines)
4. background-sync.test.ts (518 lines)
5. performance.test.ts (489 lines)
6. consent.test.ts (365 lines)
7. email-service.test.ts (321 lines) ← **CRASH POINT**
8. consent-types.test.ts (224 lines)
9. map-utils.test.ts (207 lines)
10. analytics.test.ts (179 lines)
11. colorblind.test.ts (148 lines)

**Total**: ~4200 lines in one process. Memory accumulates until crash at email-service.test.ts.

## Implementation Strategy

### Option A: Split Utils into Individual Batches (Recommended)

- Run each remaining utils test file as its own batch via `run_batch`
- Maximum isolation, most memory-safe
- Adds ~10 seconds overhead (11 files × 1s startup)
- **Tradeoff**: Slower but guaranteed stable

### Option B: Split Utils into 2-3 Sub-batches

- Group by size: large files separate, small files together
- Moderate isolation
- **Risk**: May still hit OOM if groupings are wrong

### Option C: Reduce NODE_OPTIONS Memory

- Lower max-old-space-size from 4096MB to 2048MB
- Forces earlier garbage collection
- **Risk**: May cause OOM in other batches

**Decision**: Option A - Split each utils file into its own batch. The 10-second overhead is acceptable given CI runs ~10 minutes total.

## Changes Required

### File: `scripts/test-batched-full.sh`

**Lines 67-86 (Utils section)** - Replace the "Utils (rest)" inline command with individual `run_batch` calls:

```bash
# Current (BROKEN):
# Lines 73-86 run all remaining utils in one process

# New (FIXED):
run_batch "Utils (error-handler)" "src/utils/error-handler.test.ts"
run_batch "Utils (font-loader)" "src/utils/font-loader.test.ts"
run_batch "Utils (web3forms)" "src/utils/web3forms.test.ts"
run_batch "Utils (background-sync)" "src/utils/background-sync.test.ts"
run_batch "Utils (performance)" "src/utils/performance.test.ts"
run_batch "Utils (consent)" "src/utils/consent.test.ts"
run_batch "Utils (email)" "src/utils/email/email-service.test.ts"
run_batch "Utils (consent-types)" "src/utils/consent-types.test.ts"
run_batch "Utils (map-utils)" "src/utils/__tests__/map-utils.test.ts"
run_batch "Utils (analytics)" "src/utils/analytics.test.ts"
run_batch "Utils (colorblind)" "src/utils/__tests__/colorblind.test.ts"
```

Note: consent-history, privacy, privacy-utils, and offline-queue already run as individual batches (lines 68-71).

## Complexity Tracking

No constitution violations. Simple script modification with no architectural changes.

## Verification

1. Run locally: `docker compose exec spoketowork ./scripts/test-batched-full.sh`
2. Verify all 2918 tests pass
3. Push to trigger CI
4. Confirm no ERR_IPC_CHANNEL_CLOSED errors
