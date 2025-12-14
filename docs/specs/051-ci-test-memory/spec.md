# Feature Specification: CI Test Memory Optimization

**Feature Branch**: `051-ci-test-memory`
**Created**: 2025-12-13
**Status**: COMPLETE
**Priority**: P1 (High)
**Input**: Git history analysis - 30+ commits addressing OOM and worker crashes in CI

## Progress (2025-12-13)

### P0 Requirements - COMPLETE

- [x] FR-001: Node.js aligned to 22 across all environments
  - Updated 5 workflow files: ci.yml, e2e.yml, component-structure.yml, monitor.yml, supabase-keepalive.yml
  - Added `engines` field to package.json
- [x] FR-002: Documented batched test architecture in docs/project/TESTING.md
- [x] FR-003: All 93 accessibility tests run in CI
  - 92 happy-dom tests pass (including RouteBuilder - OOM fixed)
  - 1 jsdom test (Card) runs separately and passes

### RouteBuilder OOM - COMPLETE (Module Alias + Stable Mocks)

**Issue**: RouteBuilder tests consumed 6GB+ memory during module loading, causing OOM before any tests executed.

**Root Cause Analysis (2025-12-13)**:

Two issues combined to cause 4GB+ memory consumption:

1. **Vite alias order**: The general `@` alias was matching before specific `@/hooks/useRoutes` alias, loading real heavy dependencies instead of mocks
2. **Unstable mock references**: Mocks returned new objects on every call, causing React infinite re-render loops

**Dependency Chain**:

```
RouteBuilder.accessibility.test.tsx
  → RouteBuilderInner.tsx
    → useRoutes.ts (line 11-14)
      → createClient from @/lib/supabase/client (~1MB+)
      → RouteService from @/lib/routes/route-service
      → getBicycleRoute from @/lib/routing/osrm-service
```

**Solution Applied (2025-12-13)**:

#### 1. Module Aliases in vitest.config.ts

Redirect heavy hook imports to lightweight mocks at **build time** (before vi.mock() runs):

```typescript
// vitest.config.ts
const testAliases = {
  '@/hooks/useRoutes': path.resolve(
    __dirname,
    './src/hooks/__mocks__/useRoutes.ts'
  ),
  '@/hooks/useUserProfile': path.resolve(
    __dirname,
    './src/hooks/__mocks__/useUserProfile.ts'
  ),
};

const sharedConfig = {
  resolve: {
    alias: {
      // IMPORTANT: Specific aliases MUST come before general ones
      // Vite checks aliases in definition order, not specificity
      ...testAliases,
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
};
```

#### 2. Stable Mock References

Prevent React infinite re-renders by using stable object references:

```typescript
// src/hooks/__mocks__/useRoutes.ts
const mockReturnValue = {
  routes: [], // Same array reference every call
  createRoute: vi.fn().mockResolvedValue(mockRoute),
  // ... other stable functions
};

export const useRoutes = vi.fn(() => mockReturnValue);
```

#### 3. Dynamic Import Split (Production)

RouteBuilder also uses next/dynamic for production lazy loading:

```
RouteBuilder/
├── RouteBuilder.tsx       # Lightweight wrapper with next/dynamic
├── RouteBuilderInner.tsx  # Heavy component (lazy loaded)
```

**Files Modified**:

- `vitest.config.ts` - Added module aliases (specific before general)
- `src/hooks/__mocks__/useRoutes.ts` - Created with stable mock references
- `src/hooks/__mocks__/useUserProfile.ts` - Created with stable mock references
- `src/components/organisms/RouteBuilder/RouteBuilder.tsx` - Dynamic wrapper
- `src/components/organisms/RouteBuilder/RouteBuilderInner.tsx` - Original component
- `src/components/organisms/RouteBuilder/RouteBuilder.test.tsx` - Use imported mocks directly
- `src/components/organisms/RouteBuilder/RouteBuilder.accessibility.test.tsx` - Use imported mocks directly
- `.github/workflows/accessibility.yml` - Re-enabled RouteBuilder tests

**Results**:

- **Before**: 4GB+ OOM, tests never executed
- **After**: 633ms total, all 28 tests pass (13 unit + 15 accessibility)

### AuthorProfile URL Fix - COMPLETE

**Issue Discovered (2025-12-13)**: AuthorProfile accessibility tests fail with `TypeError: Invalid URL` when run in batch mode with other tests.

**Root Cause**: When running accessibility tests in batch mode with `--pool vmThreads`, happy-dom's URL parser context gets corrupted by test isolation issues. This causes next/image's internal URL validation (`getImgProps → new URL()`) to fail with "TypeError: Invalid URL" even for valid absolute URLs.

**Key Finding**: AuthorProfile tests PASS when run in isolation but FAIL when run with all 92 accessibility tests together. This is a test isolation issue, not a URL format issue.

**Error Stack**:

```
TypeError: Invalid URL
 ❯ new URL node_modules/.pnpm/happy-dom@20.0.11/node_modules/happy-dom/lib/url/URL.js:22:23
 ❯ getImgProps next/dist/shared/lib/get-img-props.js:518:27
```

**Solution Applied**:

1. Added global mock for `next/image` in `tests/setup.ts`
2. Mock renders a simple `<img>` element, bypassing next/image's URL validation
3. All 92 happy-dom accessibility tests now pass in batch mode

**Files Modified**:

- `tests/setup.ts` - Added next/image mock

### P1 Requirements - FUTURE

- [ ] FR-004-007: Memory budgets and profiling (optional future iteration)

## Execution Flow (main)

```
1. Parse input from git history analysis
   → Feature: Stabilize CI test execution and eliminate OOM crashes
2. Extract key issues
   → Critical: Node version mismatch (Docker Node 22 vs CI Node 20)
   → High: Vitest worker IPC channel crashes
   → High: Test memory accumulation exceeds 7GB CI limit
   → Medium: Inconsistent pool configuration across test types
3. Identify affected users
   → Developers: Reliable CI feedback
   → CI/CD: Stable green builds
4. Generate Functional Requirements
   → P0: Align Node versions across environments
   → P1: Document batched test architecture
   → P1: Establish memory budgets
   → P2: Create CI monitoring dashboard
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT stability outcomes are needed
- Avoid implementation specifics
- Written for DevOps and infrastructure stakeholders

---

## Problem Statement

The CI test suite experiences intermittent Out of Memory (OOM) crashes and IPC channel failures despite extensive workarounds. Recent git history shows 30+ commits addressing these issues:

### Evidence from Git History

```
6bede99 fix: run all 92 accessibility tests correctly in CI
5e949ae fix: use vmThreads pool in accessibility workflow to prevent worker crash
53429b4 fix: reduce memory usage in batched tests for CI
b0197c4 fix: upgrade vitest to v4.0 to fix tinypool IPC crash
4f72ed3 fix: split Lib and Services batches to prevent CI OOM
ec37851 fix: split utils batch to prevent CI OOM crashes
```

### Root Causes Identified

| Issue                 | Impact                         | Current Workaround             |
| --------------------- | ------------------------------ | ------------------------------ |
| Node version mismatch | Memory behavior differs        | None - inconsistent            |
| Test accumulation     | Memory grows per file          | 14+ batched processes          |
| IPC channel cleanup   | Worker crashes on shutdown     | vmThreads pool, isolate: false |
| Large test files      | Single test exceeds 2GB budget | Skip or split tests            |

### Environment Comparison

| Aspect       | Docker (Local)     | GitHub Actions (CI) |
| ------------ | ------------------ | ------------------- |
| Node.js      | 22-slim            | 20.x                |
| RAM          | Host dependent     | ~7GB                |
| Memory limit | 4GB (NODE_OPTIONS) | 2GB per batch       |
| Test runner  | Single process OK  | Batched required    |

---

## User Scenarios & Testing

### Primary Stability Story

As a developer pushing code, I need CI tests to pass reliably so that I can trust test failures indicate real bugs, not infrastructure issues.

### Critical Stability Scenarios

#### Scenario 1: Node Version Alignment

1. **Given** Docker uses Node 22, **When** CI runs on Node 20, **Then** memory behavior may differ
2. **Given** GitHub Actions node-version is updated to 22, **When** tests run, **Then** behavior matches local development
3. **Given** all environments use Node 22, **When** OOM occurs, **Then** root cause is consistent

**Acceptance Criteria:**

- `.github/workflows/ci.yml` uses `node-version: '22'`
- `.github/workflows/accessibility.yml` uses `node-version: '22'`
- Docker and CI produce identical test results

#### Scenario 2: Batched Test Architecture

1. **Given** tests are split into 14+ batches, **When** each batch runs, **Then** memory is freed between batches
2. **Given** a batch exceeds 2GB, **When** identified, **Then** batch is split further
3. **Given** batch execution completes, **When** CI reports, **Then** total time < 15 minutes

**Acceptance Criteria:**

- Each batch stays under 2GB peak memory
- Total CI time < 15 minutes
- Zero ERR_IPC_CHANNEL_CLOSED errors

#### Scenario 3: Memory Budget Enforcement

1. **Given** memory budget is 2GB per batch, **When** a test approaches limit, **Then** it's flagged for splitting
2. **Given** new tests are added, **When** batch size grows, **Then** monitoring warns before OOM
3. **Given** CI completes, **When** metrics are collected, **Then** peak memory per batch is logged

**Acceptance Criteria:**

- Memory usage logged per batch
- Threshold alerts at 1.5GB (75% of budget)
- Documentation of memory-heavy tests

---

## Functional Requirements

### P0 - Critical (Must Have)

| ID     | Requirement                                         | Acceptance Criteria                             |
| ------ | --------------------------------------------------- | ----------------------------------------------- |
| FR-001 | Align Node.js version to 22 across all environments | CI and Docker both use Node 22                  |
| FR-002 | Document current batched test architecture          | Architecture diagram in docs/project/TESTING.md |
| FR-003 | All 93 accessibility tests pass in CI               | Zero skipped, zero OOM crashes                  |

### P1 - High Priority

| ID     | Requirement                            | Acceptance Criteria                                       |
| ------ | -------------------------------------- | --------------------------------------------------------- |
| FR-004 | Establish memory budget per batch type | Documented limits: hooks 500MB, components 1GB, lib 1.5GB |
| FR-005 | Create batch splitting guidelines      | Decision tree for when to split batches                   |
| FR-006 | Document pool configuration rationale  | vmThreads vs forks vs threads explained                   |
| FR-007 | Add memory profiling to test scripts   | `--logHeapUsage` flag available                           |

### P2 - Medium Priority

| ID     | Requirement                             | Acceptance Criteria                       |
| ------ | --------------------------------------- | ----------------------------------------- |
| FR-008 | Create CI health dashboard              | GitHub Actions summary shows memory stats |
| FR-009 | Add pre-commit check for test file size | Warn if test file > 500 lines             |
| FR-010 | Document known memory-heavy tests       | List in TESTING.md with recommendations   |

---

## Files Affected

### GitHub Actions Workflows

- `.github/workflows/ci.yml` - Update node-version to 22
- `.github/workflows/accessibility.yml` - Update node-version to 22
- `.github/workflows/e2e.yml` - Update node-version to 22

### Test Scripts

- `scripts/test-batched-full.sh` - Add memory logging
- `scripts/test-organisms-sequential.sh` - Document skip reasons

### Documentation

- `docs/project/TESTING.md` - Add batched architecture section
- `docs/TECHNICAL-DEBT.md` - Reference this spec

### Configuration

- `vitest.config.ts` - Document environment choices
- `package.json` - Verify NODE_OPTIONS settings

---

## Success Metrics

1. **Reliability**: CI passes 95%+ of runs without OOM
2. **Consistency**: Local and CI produce identical results
3. **Performance**: Total test time < 15 minutes
4. **Observability**: Memory usage visible per batch
5. **Documentation**: New developers understand architecture in < 30 minutes
