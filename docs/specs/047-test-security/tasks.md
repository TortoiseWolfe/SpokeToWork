# Tasks: Test Security Hardening

**Input**: Design documents from `/docs/specs/047-test-security/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story/requirement this task belongs to

---

## Phase 1: Setup

**Purpose**: Prepare infrastructure for security hardening

- [ ] T001 [P] Create branch `047-test-security` from main
- [ ] T002 [P] Audit current test files for credential patterns: `grep -rn "TestPassword" tests/`

---

## Phase 2: Pre-flight Validation (FR-002, FR-004)

**Goal**: Tests fail immediately with clear error when env vars missing

**Independent Test**: Run `pnpm test` without .env configured

### Implementation

- [ ] T003 Create `tests/setup-env-validation.ts` with env var validation logic
- [ ] T004 Update `tests/setup.ts` to import env validation at top
- [ ] T005 Test validation by temporarily unsetting env vars and running tests

**Checkpoint**: Tests fail with clear error listing missing vars

---

## Phase 3: Remove Credential Fallbacks (FR-003)

**Goal**: No hardcoded fallback passwords in test files

**Independent Test**: `grep '\|\| .TestPassword' tests/` returns zero results

### Implementation

- [ ] T006 Update `tests/fixtures/test-user.ts` - remove PRIMARY fallbacks (lines 16-18)
- [ ] T007 Update `tests/fixtures/test-user.ts` - remove TERTIARY fallbacks (lines 31-33)
- [ ] T008 Update `tests/fixtures/test-user.ts` - remove ADMIN fallback (line 62)
- [ ] T009 [P] Search for fallback patterns in all 4 user types (PRIMARY, SECONDARY, TERTIARY, ADMIN): `grep -rn "|| 'Test" tests/`
- [ ] T010 Fix any additional fallback patterns found in T009 (note: SECONDARY has no fallbacks by design)

**Checkpoint**: `grep '\|\| .TestPassword' tests/` returns zero results

---

## Phase 4: SQL Injection Fixes (FR-001)

**Goal**: All SQL queries use escapeSQL() for interpolated values

**Independent Test**: `grep "'\${[^e]" tests/` returns zero results (no unescaped interpolation)

### Implementation

- [ ] T011 [P] Audit `tests/e2e/auth/welcome-message.spec.ts` for SQL patterns
- [ ] T012 [P] Audit `tests/e2e/auth/complete-flows.spec.ts` for SQL patterns
- [ ] T013 [P] Audit `tests/e2e/global-setup.ts` for SQL patterns
- [ ] T014 Fix `welcome-message.spec.ts` lines 88, 93, 101, 161-162 - add escapeSQL for UUIDs
- [ ] T015 Fix any SQL patterns found in complete-flows.spec.ts
- [ ] T016 Fix any SQL patterns found in global-setup.ts
- [ ] T017 Verify fix: `grep "'\${" tests/e2e/ | grep -v escapeSQL` returns zero

**Checkpoint**: All SQL interpolation uses escapeSQL()

---

## Phase 5: CI Security Check (FR-005)

**Goal**: PRs blocked if SQL injection pattern detected

**Independent Test**: PR with `'${variable}'` SQL pattern fails CI

### Implementation

- [ ] T018 Add SQL injection check step to `.github/workflows/ci.yml`
- [ ] T019 [P] Test CI check locally: run the grep pattern on tests/
- [ ] T020 Document allowlist pattern for escapeSQL in CI workflow comments

**CI Check Pattern:**

```yaml
- name: Check for SQL injection patterns in tests
  run: |
    if grep -rn --include="*.spec.ts" --include="*.test.ts" "'\${" tests/ | grep -v "escapeSQL"; then
      echo "::error::SQL injection pattern detected in tests. Use escapeSQL() for all interpolated values."
      exit 1
    fi
    echo "No SQL injection patterns found"
```

**Checkpoint**: CI rejects PRs with unsafe SQL patterns

---

## Phase 6: Documentation Cleanup (FR-006, FR-007)

**Goal**: No hardcoded passwords in documentation

**Independent Test**: `grep -r "TestPassword123" docs/ public/` returns zero results

### Implementation

- [ ] T021 [P] Update `docs/messaging/QUICKSTART.md` - replace passwords with `<your-password>`
- [ ] T022 [P] Update `public/blog/authentication-supabase-oauth.md` - replace passwords with `<your-password>`
- [ ] T023 [P] Update `CLAUDE.md` Test Users section - use env var references
- [ ] T024 Update `.env.example` with all required TEST*USER*\* variables
- [ ] T025 Verify: `grep -r "TestPassword" docs/ public/ CLAUDE.md` returns only appropriate references

**Checkpoint**: Documentation uses placeholders, .env.example is complete

---

## Phase 7: Verification & Polish

**Purpose**: Final verification and cleanup

- [ ] T026 Run full test suite: `docker compose exec spoketowork pnpm test`
- [ ] T027 Run E2E tests with configured env: `docker compose exec spoketowork pnpm exec playwright test`
- [ ] T028 Verify all acceptance criteria from spec.md
- [ ] T029 [P] Update spec.md status from "Draft" to "Complete"
- [ ] T030 Create PR with comprehensive description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Pre-flight)**: Depends on Phase 1
- **Phase 3 (Fallbacks)**: Depends on Phase 2 (validation must exist before removing fallbacks)
- **Phase 4 (SQL)**: Can run parallel to Phase 3 (different files)
- **Phase 5 (CI)**: Can run parallel to Phases 3-4
- **Phase 6 (Docs)**: Can run parallel to Phases 3-5
- **Phase 7 (Verify)**: Depends on all previous phases

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:

- T001, T002 (Setup)
- T009 with T006-T008 (Fallbacks - audit parallel with fixes)
- T011, T012, T013 (SQL audits)
- T019 with T018 (CI)
- T021, T022, T023 (Docs)

### Critical Path

T003 → T004 → T006-T008 → T026-T028 (Pre-flight → Fallbacks → Verify)

---

## Summary

| Phase      | Tasks  | Parallel? | Est. Effort |
| ---------- | ------ | --------- | ----------- |
| Setup      | 2      | Yes       | Low         |
| Pre-flight | 3      | No        | Medium      |
| Fallbacks  | 5      | Partial   | Medium      |
| SQL        | 7      | Partial   | Medium      |
| CI         | 3      | Partial   | Low         |
| Docs       | 5      | Yes       | Low         |
| Verify     | 5      | Partial   | Low         |
| **Total**  | **30** |           |             |
