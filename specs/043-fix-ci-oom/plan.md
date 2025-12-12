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

### Issue 1: Large Test Batches (Original)

The "Utils (rest)" batch runs ~4200 lines in a single vitest process.

### Issue 2: Additional Large Batches (Discovered)

After fixing utils, CI still crashed because:

- **Lib batch**: 18 test files, 4940 lines in one process
- **Services batch**: 7 test files, 3543 lines in one process

These run BEFORE utils, so memory was already exhausted by the time email-service.test.ts ran.

### Issue 3: Environment Mismatch (Discovered)

email-service.test.ts declares `@vitest-environment node` but vitest.workspace.ts was running it in happy-dom. The workspace config overrides inline directives. This mismatch caused worker crash during cleanup.

### Issue 4: Pending Timers (Root Cause)

The test's `baseDelay: 10` created setTimeout timers for retry logic. These timers weren't cleared when vitest worker exited, causing `ERR_IPC_CHANNEL_CLOSED` during IPC cleanup.

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

### Fix 1: `scripts/test-batched-full.sh` - Split Utils Batch

Replace inline utils command with individual `run_batch` calls for each file.

### Fix 2: `scripts/test-batched-full.sh` - Split Lib and Services Batches

```bash
# Lib - split by subdirectory
run_batch "Lib (messaging)" "src/lib/messaging"
run_batch "Lib (companies)" "src/lib/companies"
run_batch "Lib (logger)" "src/lib/logger"
run_batch "Lib (auth)" "src/lib/auth"
run_batch "Lib (payments)" "src/lib/payments"
run_batch "Lib (validation)" "src/lib/validation"
run_batch "Lib (avatar)" "src/lib/avatar"

# Services - split by file
run_batch "Services (welcome)" "src/services/messaging/welcome-service.test.ts"
run_batch "Services (connection)" "src/services/messaging/__tests__/connection-service.test.ts"
# ... (7 total)
```

### Fix 3: `vitest.workspace.ts` - Add Node Environment

```typescript
const nodeTests = ['**/email-service.test.ts'];

// Add third workspace project
{
  test: {
    name: 'node',
    environment: 'node',
    include: nodeTests,
  },
}
```

### Fix 4: `src/utils/email/email-service.test.ts` - Reduce Timer Delay

```typescript
// Change baseDelay from 10 to 1 to avoid pending timers
config: {
  maxRetries: 2,
  baseDelay: 1, // Was 10 - caused pending timers
  maxFailures: 3,
}
```

## Complexity Tracking

No constitution violations. Simple script modification with no architectural changes.

## Verification

1. Run locally: `docker compose exec spoketowork ./scripts/test-batched-full.sh`
2. Verify all 2918 tests pass
3. Push to trigger CI
4. Confirm no ERR_IPC_CHANNEL_CLOSED errors
