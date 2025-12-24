# E2E Test Failure Analysis Report

**Generated**: 2025-12-24
**Test Results Path**: test-results-ci/
**Source**: GitHub Actions Run 20475653755

## Executive Summary

| Metric                | Count |
| --------------------- | ----- |
| Total page snapshots  | 111   |
| Authenticated pages   | 40    |
| Unauthenticated pages | 71    |

## Root Cause: Sharding Breaks Auth Setup

**CRITICAL**: The CI workflow uses `--shard` which distributes tests across separate GitHub Actions jobs. The auth setup project (`auth.setup.ts`) may only run in one shard, while other shards expect the `storage-state-auth.json` file to already exist.

### How Sharding Works

```yaml
# From e2e.yml - each combination is a SEPARATE job
matrix:
  browser: [chromium, firefox, webkit]
  shard: [1/4, 2/4, 3/4, 4/4] # 12 separate jobs
```

Each shard job:

1. Starts fresh (no shared files between jobs)
2. Runs `pnpm exec playwright test --project=chromium --shard=1/4`
3. Playwright tries to run setup due to `dependencies: ['setup']`
4. BUT: Setup tests may be sharded too!

### The Problem

When Playwright shards tests, it distributes ALL matching tests across shards:

- Shard 1/4 might get the `auth.setup.ts` test
- Shards 2/4, 3/4, 4/4 might NOT get any setup tests
- Those shards expect `storage-state-auth.json` but it doesn't exist

### Evidence

- 71 of 111 (64%) page snapshots show "Sign In" link (unauthenticated)
- This matches shards that didn't run auth setup
- E2E chromium 4/4 and firefox 4/4 FAILED (higher shards = less likely to get setup)

## Fix Required

### Option 1: Run Setup Before Sharding (Recommended)

Add a separate job that runs ONLY the setup project and saves the auth state as an artifact:

```yaml
# Add new job before e2e
auth-setup:
  name: Auth Setup
  runs-on: ubuntu-latest
  needs: smoke
  steps:
    - uses: actions/checkout@v4
    # ... standard setup ...
    - name: Run auth setup
      run: pnpm exec playwright test --project=setup
    - name: Upload auth state
      uses: actions/upload-artifact@v4
      with:
        name: auth-state
        path: tests/e2e/fixtures/storage-state-auth.json

e2e:
  needs: [smoke, auth-setup] # Wait for auth-setup
  steps:
    # ... existing steps ...
    - name: Download auth state
      uses: actions/download-artifact@v4
      with:
        name: auth-state
        path: tests/e2e/fixtures/
    - name: Run tests (exclude setup)
      run: pnpm exec playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }} --grep-invert=auth.setup
```

### Option 2: Skip Sharding for Setup

Modify the test command to run setup in every shard without distributing it:

```yaml
- name: Run auth setup first
  run: pnpm exec playwright test --project=setup

- name: Run E2E tests
  run: pnpm exec playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}
```

### Option 3: Pre-commit Auth State (Not Recommended)

Un-gitignore `storage-state-auth.json` and commit a valid auth state.

- Problem: Auth tokens expire, would need constant updates

## Severity

| Severity | Count | Description                                      |
| -------- | ----- | ------------------------------------------------ |
| CRITICAL | 71    | Auth not available in shards 2-4                 |
| MEDIUM   | 40    | Tests ran with auth but failed for other reasons |

## Action Plan

### Immediate

1. **Update `.github/workflows/e2e.yml`** - Add auth-setup job before e2e shards
2. Share auth artifact between shards

### After Auth Fix

3. Re-run CI to see actual test failures (not auth cascade)
4. Analyze remaining ~40 authenticated failures

## SpecKit Command

```
/speckit.workflow Fix E2E CI auth sharding - Add auth-setup job to run before shards and share storage-state-auth.json artifact
```
