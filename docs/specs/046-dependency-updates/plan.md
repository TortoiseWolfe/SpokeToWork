# Implementation Plan: Dependency Infrastructure Updates

**Branch**: `046-dependency-updates` | **Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `docs/specs/046-dependency-updates/spec.md`

## Summary

Complete the dependency infrastructure by adding security auditing to CI, creating dependency update documentation, configuring Renovate for automated updates, and establishing a quarterly review process via GitHub Issue templates.

**Already Complete (Spec 051):**

- FR-001: Node.js v22 aligned across all environments
- FR-002: engines field in package.json

**Remaining Work:**

- FR-003: pnpm audit in CI (strict - any vulnerability fails)
- FR-004-006: Documentation and cadence
- FR-007: Renovate configuration
- FR-008-010: ADRs, bundle tracking, rollback docs (P3)

## Technical Context

**Language/Version**: N/A (Infrastructure/CI configuration)
**Primary Dependencies**: pnpm 10.16.1, GitHub Actions, Renovate
**Storage**: N/A
**Testing**: CI workflow validation, pnpm audit
**Target Platform**: GitHub Actions runners (ubuntu-latest)
**Project Type**: Infrastructure/DevOps
**Performance Goals**: CI should complete audit step in <30s
**Constraints**: Must not break existing CI pipeline
**Scale/Scope**: 7 workflow files, 1 Renovate config, 2 documentation files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                          |
| ------------------------------------ | ------ | ---------------------------------------------- |
| I. Proper Solutions Over Quick Fixes | PASS   | Using established tools (Renovate, pnpm audit) |
| II. Root Cause Analysis              | PASS   | Addresses infrastructure drift root cause      |
| III. Stability Over Speed            | PASS   | Strict audit prevents vulnerable deployments   |
| IV. Clean Architecture               | PASS   | Follows GitHub Actions best practices          |
| V. No Technical Debt                 | PASS   | Documentation ensures maintainability          |

## Project Structure

### Documentation (this feature)

```text
docs/specs/046-dependency-updates/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Renovate/audit research
└── tasks.md             # Implementation tasks (Phase 5)
```

### Files to Create/Modify

```text
.github/
├── workflows/
│   └── ci.yml                          # Add pnpm audit step
├── renovate.json                        # NEW: Renovate configuration
└── ISSUE_TEMPLATE/
    └── dependency-review.yml            # NEW: Quarterly review template

docs/
└── project/
    └── DEPENDENCY-UPDATES.md            # NEW: Update process guide
```

**Structure Decision**: This is infrastructure work - no source code changes, only CI/docs.

## Implementation Phases

### Phase 0: Fix Existing Vulnerabilities (PREREQUISITE)

**Must complete before FR-003 can be enabled.**

Current audit shows 11 vulnerabilities:

- **1 critical**: Next.js RCE (15.5.2 → 15.5.7+)
- **4 high**: Playwright SSL, tar-fs symlink, glob injection, Next.js cache
- **5 moderate**: Various transitive dependencies
- **1 low**: tmp symlink

**Direct updates needed:**

- `next`: 15.5.2 → 15.5.7+
- `@playwright/test`: ^1.55.0 → 1.55.1+

**Transitive dependencies:**

- May resolve after direct updates
- If not, use pnpm overrides in package.json

### Phase 1: CI Security (FR-003)

Add `pnpm audit` step to ci.yml that fails on any vulnerability.

### Phase 2: Documentation (FR-004, FR-005, FR-006)

Create DEPENDENCY-UPDATES.md with:

- Update process (audit → update → test → deploy)
- Major/minor/patch guidance
- Quarterly review schedule
- Dependency decision rationale

### Phase 3: Automation (FR-007)

Configure Renovate with:

- Group updates by type (patch, minor, major)
- Auto-merge for patch updates (if tests pass)
- Weekly schedule to avoid noise
- Respect package.json engines constraints

### Phase 4: Quarterly Review (FR-006)

Create GitHub Issue template for quarterly dependency reviews.

### Phase 5: Polish (FR-008, FR-009, FR-010 - P3)

- ADR format for decisions (optional)
- Bundle size tracking (optional)
- Rollback procedures (optional)

## Risk Assessment

| Risk                                      | Mitigation                                         |
| ----------------------------------------- | -------------------------------------------------- |
| pnpm audit finds existing vulnerabilities | Run audit locally first, fix before enabling in CI |
| Renovate creates too many PRs             | Configure grouping and weekly schedule             |
| Breaking changes from auto-updates        | Major updates require manual approval              |

## Complexity Tracking

No constitution violations. This is straightforward infrastructure work using established tools and patterns.
