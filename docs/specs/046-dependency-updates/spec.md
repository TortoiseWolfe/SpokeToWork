# Feature Specification: Dependency Infrastructure Updates

**Feature Branch**: `046-dependency-updates`
**Created**: 2025-12-13
**Status**: Draft
**Priority**: P2 (Medium)
**Input**: Dependency audit - infrastructure drift and maintenance opportunity

## Execution Flow (main)

```
1. Parse input from dependency audit
   → Feature: Update and align project dependencies
2. Extract key findings
   → Node.js: 22 in Docker, 20 in CI (mismatch)
   → Core stack: Next.js 15.5, React 19, TypeScript 5.9 (current)
   → Testing: Vitest 4.0, Playwright 1.55 (recently updated)
   → Build: Tailwind 4.x, pnpm 10.16 (latest)
3. Identify affected users
   → Developers: Consistent tooling
   → Security: Patched vulnerabilities
   → Performance: Latest optimizations
4. Generate Functional Requirements
   → P1: Align Node.js versions
   → P2: Establish update cadence
   → P2: Document update process
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT dependency outcomes are needed
- Avoid implementation specifics
- Written for tech leads and DevOps stakeholders

---

## Problem Statement

The project has infrastructure drift between environments and lacks a documented dependency update process:

### Current State Audit

| Category            | Package          | Version | Status       |
| ------------------- | ---------------- | ------- | ------------ |
| **Runtime**         | Node.js (Docker) | 22-slim | Current      |
| **Runtime**         | Node.js (CI)     | 20.x    | **OUTDATED** |
| **Framework**       | Next.js          | 15.5.2  | Current      |
| **Framework**       | React            | 19.1.0  | Current      |
| **Language**        | TypeScript       | 5.9.2   | Current      |
| **Styling**         | Tailwind CSS     | 4.1.13  | Current      |
| **Testing**         | Vitest           | 4.0.15  | Current      |
| **Testing**         | Playwright       | 1.55.0  | Current      |
| **Package Manager** | pnpm             | 10.16.1 | Current      |

### Issues Identified

1. **Node Version Mismatch**: Docker uses Node 22, CI uses Node 20
   - Different V8 versions may cause memory behavior differences
   - Could contribute to CI-only OOM issues

2. **No Update Cadence**: Dependencies updated reactively, not proactively
   - Security patches may be delayed
   - Breaking changes accumulate

3. **No Update Documentation**: Process for updating dependencies undocumented
   - New maintainers don't know the process
   - Risk of breaking changes during updates

---

## User Scenarios & Testing

### Primary Maintenance Story

As a project maintainer, I need a documented dependency update process so that I can keep the project secure and performant with minimal risk.

### Critical Update Scenarios

#### Scenario 1: Node.js Version Alignment

1. **Given** Docker uses Node 22, **When** CI is updated, **Then** both use Node 22
2. **Given** Node 22 is specified in CI, **When** workflows run, **Then** they use Node 22
3. **Given** all environments match, **When** issues occur, **Then** reproduction is consistent

**Acceptance Criteria:**

- All `.github/workflows/*.yml` use `node-version: '22'`
- `docker/Dockerfile` uses `node:22-slim`
- `package.json` engines field specifies Node 22

#### Scenario 2: Dependency Update Process

1. **Given** I want to update dependencies, **When** I follow the docs, **Then** I know the safe process
2. **Given** a security advisory is released, **When** I check dependencies, **Then** I can patch quickly
3. **Given** a major version is available, **When** I evaluate, **Then** I have a decision framework

**Acceptance Criteria:**

- `docs/project/DEPENDENCY-UPDATES.md` exists
- Process covers: audit, update, test, deploy
- Major vs minor vs patch guidance provided

#### Scenario 3: Update Verification

1. **Given** dependencies are updated, **When** I run tests, **Then** all pass
2. **Given** a breaking change occurs, **When** detected, **Then** rollback is straightforward
3. **Given** updates are applied, **When** I check versions, **Then** lockfile is consistent

**Acceptance Criteria:**

- `pnpm audit` runs in CI
- Test suite passes after updates
- Lockfile changes are reviewable

---

## Functional Requirements

### P1 - High Priority

| ID     | Requirement                                     | Acceptance Criteria                              |
| ------ | ----------------------------------------------- | ------------------------------------------------ |
| FR-001 | Align Node.js to version 22 in all environments | CI, Docker, and package.json all specify Node 22 |
| FR-002 | Add `engines` field to package.json             | `"engines": { "node": ">=22.0.0" }`              |
| FR-003 | Run `pnpm audit` in CI pipeline                 | Workflow fails on high/critical vulnerabilities  |

### P2 - Medium Priority

| ID     | Requirement                              | Acceptance Criteria                         |
| ------ | ---------------------------------------- | ------------------------------------------- |
| FR-004 | Create dependency update documentation   | `docs/project/DEPENDENCY-UPDATES.md` exists |
| FR-005 | Document major dependency decisions      | Why Next.js 15, React 19, Vitest 4, etc.    |
| FR-006 | Establish quarterly update cadence       | Calendar reminder, documented process       |
| FR-007 | Add Renovate or Dependabot configuration | Automated PR creation for updates           |

### P3 - Low Priority

| ID     | Requirement                    | Acceptance Criteria                 |
| ------ | ------------------------------ | ----------------------------------- |
| FR-008 | Create dependency decision log | ADR format for major choices        |
| FR-009 | Add bundle size tracking       | Alert on significant bundle growth  |
| FR-010 | Document rollback procedures   | Steps to revert problematic updates |

---

## Files Affected

### CI Configuration

- `.github/workflows/ci.yml` - Node version, add audit step
- `.github/workflows/accessibility.yml` - Node version
- `.github/workflows/e2e.yml` - Node version

### Docker Configuration

- `docker/Dockerfile` - Verify Node 22-slim (already correct)

### Package Configuration

- `package.json` - Add engines field

### Documentation (New)

- `docs/project/DEPENDENCY-UPDATES.md` - Update process guide

### Documentation (Update)

- `docs/TECHNICAL-DEBT.md` - Reference this spec
- `CLAUDE.md` - Add dependency update guidance

### Optional (Automated Updates)

- `.github/renovate.json` OR `.github/dependabot.yml` - Automated PRs

---

## Dependency Decision Rationale

### Why These Versions?

| Package        | Version | Rationale                                            |
| -------------- | ------- | ---------------------------------------------------- |
| Node.js 22     | LTS     | Latest LTS, improved memory management, native fetch |
| Next.js 15     | Latest  | App Router, React 19 support, static export          |
| React 19       | Latest  | Concurrent features, improved hydration              |
| TypeScript 5.9 | Latest  | Better inference, decorator support                  |
| Vitest 4       | Latest  | Fixed tinypool IPC issues, faster execution          |
| Tailwind 4     | Latest  | CSS-first config, improved performance               |
| pnpm 10        | Latest  | Faster installs, strict mode, workspace support      |

### Update Risk Assessment

| Update Type   | Risk   | Process                                              |
| ------------- | ------ | ---------------------------------------------------- |
| Patch (x.x.X) | Low    | Apply immediately, run tests                         |
| Minor (x.X.0) | Medium | Review changelog, run full suite                     |
| Major (X.0.0) | High   | Create branch, comprehensive testing, phased rollout |

---

## Success Metrics

1. **Alignment**: All environments use identical Node.js version
2. **Security**: Zero high/critical vulnerabilities in `pnpm audit`
3. **Documentation**: Update process documented and followed
4. **Automation**: Dependabot/Renovate creates update PRs
5. **Stability**: Updates don't introduce regressions
