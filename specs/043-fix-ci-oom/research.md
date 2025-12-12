# Research: Fix CI OOM Crashes

**Feature**: 043-fix-ci-oom
**Date**: 2025-12-12

## Research Questions

### Q1: Why does CI crash with ERR_IPC_CHANNEL_CLOSED?

**Decision**: Worker process runs out of memory and dies, breaking IPC channel to parent.

**Rationale**:

- ERR_IPC_CHANNEL_CLOSED occurs when a child process terminates unexpectedly
- The crash happens after email-service.test.ts passes (memory exhaustion during cleanup)
- GitHub Actions has 7GB RAM; Node process has 4GB max-old-space-size
- The "Utils (rest)" batch runs ~4200 lines of test code accumulating memory

**Alternatives Considered**:

- Network issue: Ruled out (error is local to worker)
- Vitest bug: Ruled out (works locally with more memory)
- Test timeout: Ruled out (tests complete before crash)

### Q2: Why does pool=forks with singleFork not solve it?

**Decision**: singleFork isolates test files but the batch still runs multiple files sequentially in one vitest process.

**Rationale**:

- `--pool=forks` creates child processes for test execution
- `--poolOptions.forks.singleFork` uses one fork at a time
- BUT: The vitest process itself accumulates memory across test files
- Memory is freed when vitest exits, not between test files

**Alternatives Considered**:

- Add `--isolate` flag: Still same vitest process
- Add `--no-file-parallelism`: Already using singleFork
- Use threads pool: Higher memory usage than forks

### Q3: What's the optimal batch size for GitHub Actions?

**Decision**: One test file per batch for utils (maximum isolation).

**Rationale**:

- GitHub Actions: 7GB RAM, ~4GB available for Node
- Each vitest startup: ~200MB base + test requirements
- Large test files (>500 lines): Can use 500MB+ during execution
- Grouping large files together exceeds safe memory threshold

**Alternatives Considered**:

- 2-3 file batches: Risk of OOM if files are large
- Size-based batching: Complex to maintain, prone to drift
- Memory monitoring: Overkill for this use case

### Q4: What's the performance impact of more batches?

**Decision**: ~10 seconds additional overhead, acceptable.

**Rationale**:

- Each batch adds ~1 second startup overhead
- 11 additional batches = ~11 seconds
- Current CI time: ~10 minutes
- 11 seconds = 1.8% increase, well under 20% threshold

**Alternatives Considered**:

- Parallel batches: Would increase memory, not reduce it
- Caching: vitest already caches transforms
- Warm workers: Not available in GitHub Actions

## Key Findings

1. **Root Cause**: "Utils (rest)" batch runs 11 test files (4200 lines) in one vitest process
2. **Crash Point**: Memory exhaustion after email-service.test.ts completes
3. **Solution**: Split into individual `run_batch` calls for each file
4. **Impact**: +11 seconds CI time, 100% OOM prevention
