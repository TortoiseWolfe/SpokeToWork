# Feature Specification: CI Test Memory Optimization

**Feature Branch**: `051-ci-test-memory`
**Created**: 2025-12-13
**Status**: Partial (P0 complete, RouteBuilder requires deeper investigation)
**Priority**: P1 (High)
**Input**: Git history analysis - 30+ commits addressing OOM and worker crashes in CI

## Progress (2025-12-13)

### P0 Requirements - COMPLETE

- [x] FR-001: Node.js aligned to 22 across all environments
  - Updated 5 workflow files: ci.yml, e2e.yml, component-structure.yml, monitor.yml, supabase-keepalive.yml
  - Added `engines` field to package.json
- [x] FR-002: Documented batched test architecture in docs/project/TESTING.md
- [ ] FR-003: 92 of 93 accessibility tests run in CI (RouteBuilder excluded - see below)

### RouteBuilder OOM Fix - PARTIAL

**Initial Theory**: Module-level cache in `useRoutes` hook accumulated across tests

**Attempted Fix**:

1. Added `__resetCacheForTesting()` export to `src/hooks/useRoutes.ts`
2. Added `afterEach` cleanup to `RouteBuilder.accessibility.test.tsx`

**Discovery (2025-12-13)**: The RouteBuilder component has a fundamental OOM issue during module loading - it consumes 4GB before any tests run. Both `RouteBuilder.test.tsx` and `RouteBuilder.accessibility.test.tsx` exhibit this behavior. The issue is NOT test accumulation but something in the component's dependency chain.

**Current Status**:

- RouteBuilder tests remain excluded from CI accessibility workflow
- 92 of 93 accessibility tests run in CI
- RouteBuilder OOM requires separate deep investigation (dependency profiling)

**Possible Root Causes to Investigate**:

- Heavy dependency chain (useRoutes → route-service → osrm-service → Supabase client)
- Leaflet type imports triggering full library load
- Circular imports causing infinite module resolution
- happy-dom environment compatibility issue

### AuthorProfile URL Fix - OPEN

**Issue Discovered (2025-12-13)**: AuthorProfile accessibility tests fail with `TypeError: Invalid URL`

**Root Cause**: happy-dom's URL parser is stricter than jsdom and fails on relative paths like `/avatar.jpg` when next/image internally calls `new URL()`.

**Error Stack**:

```
TypeError: Invalid URL
 ❯ new URL node_modules/.pnpm/happy-dom@20.0.11/node_modules/happy-dom/lib/url/URL.js:22:23
 ❯ getImgProps next/dist/shared/lib/get-img-props.js:518:27
```

**Fix Required**:

1. Change `avatar: '/avatar.jpg'` to `avatar: 'https://example.com/avatar.jpg'` in test mocks
2. Apply to both `AuthorProfile.test.tsx` and `AuthorProfile.accessibility.test.tsx`

**Files Affected**:

- `src/components/molecular/AuthorProfile/AuthorProfile.test.tsx`
- `src/components/molecular/AuthorProfile/AuthorProfile.accessibility.test.tsx`

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
| FR-003 | All 92 accessibility tests pass in CI               | Zero skipped, zero OOM crashes                  |

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
