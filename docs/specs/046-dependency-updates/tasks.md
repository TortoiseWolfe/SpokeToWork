# Tasks: Dependency Infrastructure Updates

**Input**: Design documents from `docs/specs/046-dependency-updates/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which scenario this task belongs to (S1, S2, S3)

---

## Phase 1: Fix Existing Vulnerabilities (PREREQUISITE)

**Purpose**: Clear all vulnerabilities before enabling audit in CI

**⚠️ CRITICAL**: FR-003 cannot be enabled until vulnerabilities are resolved

- [ ] T001 Update `next` from 15.5.2 to latest (>=15.5.7) in package.json
- [ ] T002 Update `@playwright/test` from ^1.55.0 to latest (>=1.55.1) in package.json
- [ ] T003 Run `pnpm install` to update lockfile
- [ ] T004 Run `pnpm audit` to verify direct dependency fixes
- [ ] T005 If transitive vulnerabilities remain, add pnpm overrides to package.json
- [ ] T006 Run full test suite to verify no regressions: `pnpm test`
- [ ] T007 Run build to verify no breaking changes: `pnpm build`

**Checkpoint**: `pnpm audit` returns 0 vulnerabilities

---

## Phase 2: Scenario 1 - CI Security (FR-003) (Priority: P1)

**Goal**: Add pnpm audit step to CI that fails on any vulnerability

**Verification**: CI workflow fails if any vulnerability exists

- [ ] T008 [S1] Add security audit step to `.github/workflows/ci.yml` after install
- [ ] T009 [S1] Verify CI passes with clean audit locally before push

**Checkpoint**: CI workflow includes audit step and passes

---

## Phase 3: Scenario 2 - Documentation (FR-004, FR-005) (Priority: P2)

**Goal**: Create comprehensive dependency update documentation

**Verification**: Documentation exists with all required sections

- [ ] T010 [P] [S2] Create `docs/project/DEPENDENCY-UPDATES.md` with Quick Reference section
- [ ] T011 [S2] Add Update Process section (audit → update → test → commit)
- [ ] T012 [S2] Add Decision Framework section (patch/minor/major guidance)
- [ ] T013 [S2] Add Quarterly Review section with checklist
- [ ] T014 [S2] Add Current Stack section (copy rationale table from spec)
- [ ] T015 [S2] Add Troubleshooting section
- [ ] T016 [S2] Add Dev vs Prod Dependencies section (from spec)

**Checkpoint**: DEPENDENCY-UPDATES.md has all 7 required sections

---

## Phase 4: Scenario 3 - Automation (FR-006, FR-007) (Priority: P2)

**Goal**: Configure Renovate and quarterly review process

**Verification**: Renovate config exists, issue template exists

- [ ] T017 [P] [S3] Create `.github/renovate.json` with recommended config from research.md
- [ ] T018 [P] [S3] Create `.github/ISSUE_TEMPLATE/dependency-review.yml` for quarterly reviews
- [ ] T019 [S3] Verify Renovate config is valid: check renovatebot.com/validate

**Checkpoint**: Renovate and issue template configured

---

## Phase 5: Polish & Cross-Cutting

**Purpose**: Documentation updates and cleanup

- [ ] T020 [P] Update `docs/TECHNICAL-DEBT.md` to mark spec 046 complete
- [ ] T021 [P] Update `CLAUDE.md` with dependency update guidance if needed
- [ ] T022 Commit all changes with descriptive message

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Vulnerabilities) ─────► Phase 2 (CI Audit)
                                      │
                                      ▼
                          Phase 3 (Documentation) ◄──► Phase 4 (Automation)
                                      │                      │
                                      └──────────┬───────────┘
                                                 ▼
                                      Phase 5 (Polish)
```

- **Phase 1**: Must complete first - blocks Phase 2
- **Phase 2**: Depends on Phase 1 (clean audit)
- **Phase 3 & 4**: Can run in parallel after Phase 2
- **Phase 5**: After all others complete

### Parallel Opportunities

Within Phase 3:

- T010 can start immediately (create file)
- T011-T016 sequential (building on same file)

Within Phase 4:

- T017 and T018 can run in parallel (different files)

Within Phase 5:

- T020 and T021 can run in parallel (different files)

---

## Task Summary

| Phase     | Tasks     | Parallel | Description         |
| --------- | --------- | -------- | ------------------- |
| 1         | T001-T007 | 0        | Fix vulnerabilities |
| 2         | T008-T009 | 0        | CI audit step       |
| 3         | T010-T016 | 1        | Documentation       |
| 4         | T017-T019 | 2        | Automation          |
| 5         | T020-T022 | 2        | Polish              |
| **Total** | **22**    | **5**    |                     |

---

## P3 Tasks (Optional - Low Priority)

These are not required for spec completion:

- [ ] T023 [P3] FR-008: Create ADR format for dependency decisions
- [ ] T024 [P3] FR-009: Add bundle size tracking (e.g., size-limit)
- [ ] T025 [P3] FR-010: Document rollback procedures in DEPENDENCY-UPDATES.md

---

## Notes

- Phase 1 is critical - CI will fail immediately if audit is added before vulnerabilities are fixed
- Renovate requires GitHub App installation (separate from config file)
- Quarterly review is advisory - Issue template creates audit trail but doesn't enforce
