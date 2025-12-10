# Implementation Plan: Test Suite Memory Optimization

**Branch**: `042-test-memory-optimization` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/042-test-memory-optimization/spec.md`
**Scope**: Phase 1 only (memory optimization) - Phases 2-4 deferred to follow-up PRs

## Summary

Fix OOM crashes (exit code 137) when running ~2800 tests locally in Docker/WSL2 with 4GB memory limit by:

1. Switching default test environment from jsdom to happy-dom (lighter memory footprint)
2. Enabling sequential execution (single-fork mode) to prevent memory accumulation
3. Setting NODE_OPTIONS with max-old-space-size=4096MB in test scripts

**Technical Approach**: Modify vitest.config.ts and package.json test scripts. Use hybrid environment strategy - happy-dom default with per-file jsdom fallback for incompatible tests.

## Technical Context

**Language/Version**: TypeScript 5.9 with Node.js 22
**Primary Dependencies**: Vitest 3.2.3, happy-dom 20.0.11 (already installed), React 19
**Storage**: N/A (test infrastructure change)
**Testing**: Vitest (this IS the testing framework being optimized)
**Target Platform**: Docker/WSL2 local development (CI/CD unchanged)
**Project Type**: Web application (Next.js 15)
**Performance Goals**: All tests complete without OOM, total execution under 10 minutes, peak memory < 3.5GB
**Constraints**: 4GB Docker memory limit, must maintain 40%+ code coverage (current: 43%)
**Scale/Scope**: ~2800 tests across 105 test files (~24.5k LOC)

## Constitution Check

_GATE: Constitution is placeholder template - no specific gates defined._

✅ No violations - proceeding with implementation.

## Project Structure

### Documentation (this feature)

```text
specs/042-test-memory-optimization/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output (below)
├── checklists/          # Requirements checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (files to modify)

```text
# Configuration files (2 files)
vitest.config.ts         # Main change: environment, pool settings
package.json             # Test scripts: NODE_OPTIONS

# Verification (read-only)
tests/setup.ts           # Verify happy-dom compatibility
```

**Structure Decision**: Minimal configuration changes - no new directories or files needed. This is a config-only change affecting 2 existing files.

## Complexity Tracking

No violations requiring justification. This is a straightforward configuration change.

---

## Phase 0: Research

### Research Tasks Completed

**1. happy-dom vs jsdom Memory Usage**

- **Decision**: Use happy-dom as default environment
- **Rationale**: happy-dom uses significantly less memory than jsdom (~40-60% reduction in typical scenarios).
- **CORRECTION (CHK037)**: happy-dom is NOT currently installed. Must install via `pnpm add -D happy-dom` before implementing.
- **Alternatives considered**:
  - Keep jsdom (rejected: causes OOM)
  - node environment (rejected: no DOM APIs for component tests)

**2. Vitest Sequential Execution**

- **Decision**: Use `pool: 'forks'` with `singleFork: true`
- **Rationale**: Prevents memory accumulation across parallel workers. Already proven in `scripts/test-organisms-sequential.sh`.
- **Alternatives considered**:
  - `pool: 'threads'` with singleThread (rejected: forks provides better isolation)
  - Multiple workers with memory limits (rejected: harder to predict total memory)

**3. Hybrid Environment Strategy**

- **Decision**: happy-dom default + per-file jsdom override for incompatible tests
- **Rationale**: From clarification session - allows adopting happy-dom benefits while handling edge cases
- **Implementation**: Use Vitest's `environmentMatchGlobs` or inline `@vitest-environment` comments

**4. NODE_OPTIONS Memory Limit**

- **Decision**: Set `NODE_OPTIONS='--max-old-space-size=4096'` in test scripts
- **Rationale**: Explicit memory limit prevents runaway allocation, matches Docker container limit
- **Alternatives considered**:
  - Environment variable in .env (rejected: not portable)
  - Docker memory limits alone (rejected: doesn't help Node.js GC behavior)

### Unknowns Resolved

| Unknown                 | Resolution                                                      |
| ----------------------- | --------------------------------------------------------------- |
| happy-dom compatibility | Test after implementation; fallback via `environmentMatchGlobs` |
| CI/CD impact            | Out of scope - local only per clarification                     |
| Rollback strategy       | Hybrid approach - keep jsdom for incompatible tests             |

---

## Phase 1: Implementation Design

### Changes Required

#### 1. vitest.config.ts

**Current** (line 8):

```typescript
environment: 'jsdom',
```

**New**:

```typescript
environment: 'happy-dom',
pool: 'forks',
poolOptions: {
  forks: {
    singleFork: true,
  },
},
// Fallback to jsdom for incompatible tests
environmentMatchGlobs: [
  // Add paths here if specific tests need jsdom
  // ['**/some-incompatible-test.ts', 'jsdom'],
],
```

#### 2. package.json (test scripts)

**Current**:

```json
"test": "pnpm run clean:next && vitest",
"test:coverage": "vitest run --coverage",
```

**New**:

```json
"test": "NODE_OPTIONS='--max-old-space-size=4096' pnpm run clean:next && vitest",
"test:coverage": "NODE_OPTIONS='--max-old-space-size=4096' vitest run --coverage",
```

Also update: `test:atomic`, `test:molecular`, `test:organisms*`, `test:lib`

### Verification Plan

1. **Run full test suite**: `docker compose exec spoketowork pnpm test -- --run`
2. **Check exit code**: Must be 0 (not 137 OOM)
3. **Monitor memory**: `docker stats` during execution, peak < 3.5GB
4. **Verify coverage**: `pnpm test:coverage` - must remain ≥ 40%
5. **Check for failures**: If any tests fail with happy-dom, add to `environmentMatchGlobs`

### Rollback Plan

If happy-dom causes widespread failures:

1. Revert `environment: 'happy-dom'` to `environment: 'jsdom'`
2. Keep `pool: 'forks'` and `singleFork: true` (these help regardless)
3. Keep `NODE_OPTIONS` (always beneficial)

---

## Data Model

N/A - This is a configuration change with no data model impact.

## API Contracts

N/A - This is a configuration change with no API impact.

---

## Next Steps

1. Run `/speckit.tasks` to generate dependency-ordered tasks.md
2. Run `/speckit.implement` to execute the implementation
