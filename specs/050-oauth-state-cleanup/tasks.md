# Tasks: OAuth State Token Cleanup

**Feature**: 050-oauth-state-cleanup
**Generated**: 2025-12-21
**Source**: [spec.md](./spec.md), [plan.md](./plan.md)

## Task Legend

- `[P]` = Parallelizable (can run concurrently with other [P] tasks in same phase)
- `[S]` = Sequential (must complete before next task)
- Priority: P1 (critical), P2 (important)
- User Story: US1 (code clarity), US2 (database cleanliness), US3 (documentation)

---

## Phase 1: Verification (Pre-flight)

> Confirm assumptions before making changes

- [ ] **T001** [P] [P1] [US1] Verify no production imports of oauth-state.ts

  ```bash
  grep -r "from.*oauth-state\|import.*oauth-state" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
  ```

  Expected: No results (only test file imports it)

- [ ] **T002** [P] [P1] [US2] Verify oauth_states table is empty in production

  ```bash
  # Via Supabase Management API
  curl -s -X POST "https://api.supabase.com/v1/projects/utxdunkaropkwnrqrsef/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "SELECT COUNT(*) FROM oauth_states;"}'
  ```

  Expected: count = 0

- [ ] **T003** [P] [P1] [US1] Verify no other references to oauth-state functions
  ```bash
  grep -r "generateOAuthState\|validateOAuthState\|cleanupExpiredStates" src/ | grep -v "oauth-state"
  ```
  Expected: No results

---

## Phase 2: Database Cleanup

> Remove unused table from production and migration file

- [ ] **T004** [S] [P1] [US2] DROP oauth_states table via Supabase Management API

  ```sql
  DROP TABLE IF EXISTS oauth_states CASCADE;
  ```

  Depends on: T001, T002, T003 (all verification passed)

- [ ] **T005** [S] [P1] [US2] Remove oauth_states from monolithic migration file
      File: `supabase/migrations/20251006_complete_monolithic_setup.sql`
      Remove:
  - CREATE TABLE oauth_states (lines ~247-258)
  - CREATE INDEX idx*oauth_states*\* (lines ~260-262)
  - COMMENT ON TABLE oauth_states (line ~264)
  - ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY (line ~267)
  - All oauth_states policies (lines ~270-294)
  - Reference in final comment block
    Depends on: T004

- [ ] **T006** [S] [P1] [US2] Remove oauth_states types from Supabase types file
      File: `src/lib/supabase/types.ts`
      Remove: oauth_states type definition block
      Depends on: T005

---

## Phase 3: Code Removal

> Delete dead code files

- [ ] **T007** [P] [P1] [US1] Delete src/lib/auth/oauth-state.ts

  ```bash
  rm src/lib/auth/oauth-state.ts
  ```

  Depends on: T006 (types removed first to avoid import errors)

- [ ] **T008** [P] [P1] [US1] Delete src/lib/auth/**tests**/oauth-state.test.ts
  ```bash
  rm src/lib/auth/__tests__/oauth-state.test.ts
  ```
  Depends on: T006

---

## Phase 4: Documentation Update

> Update docs to reflect current security model

- [ ] **T009** [P] [P2] [US3] Update SECURITY-ARCHITECTURE.md OAuth section
      File: `docs/SECURITY-ARCHITECTURE.md`
      Replace lines 72-88 (OAuth Security section) with PKCE explanation:
  - Remove custom state token documentation
  - Document Supabase PKCE flow
  - Reference RFC 7636
    Depends on: T007, T008

- [ ] **T010** [P] [P2] [US3] Update TECHNICAL-DEBT.md to mark issue FIXED
      File: `docs/TECHNICAL-DEBT.md`
      Update "OAuth State Inconsistency" entry:
  - Change status to "✅ FIXED"
  - Add date and resolution note
    Depends on: T007, T008

---

## Phase 5: Verification (Post-flight)

> Confirm cleanup is complete and nothing broke

- [ ] **T011** [S] [P1] [US1] Verify no remaining oauth-state references

  ```bash
  grep -r "oauth-state\|oauth_states\|generateOAuthState\|validateOAuthState" src/
  ```

  Expected: No results
  Depends on: T007, T008, T009, T010

- [ ] **T012** [S] [P1] [US1] Run type-check to verify no broken imports

  ```bash
  docker compose exec spoketowork pnpm run type-check
  ```

  Expected: No errors
  Depends on: T011

- [ ] **T013** [S] [P1] [US1] Run test suite to verify no regressions

  ```bash
  docker compose exec spoketowork pnpm test
  ```

  Expected: All tests pass (fewer tests now)
  Depends on: T012

- [ ] **T014** [S] [P1] [US1] Run build to verify production build works

  ```bash
  docker compose exec spoketowork pnpm run build
  ```

  Expected: Build succeeds
  Depends on: T013

- [ ] **T015** [S] [P1] [US1] Verify OAuth E2E tests pass (if available)
  ```bash
  # Check if OAuth E2E tests exist
  ls tests/e2e/auth/*.spec.ts 2>/dev/null && \
    docker compose exec spoketowork pnpm exec playwright test tests/e2e/auth/
  ```
  Expected: Tests pass OR no OAuth-specific E2E tests exist
  Note: E2E tests are local-only per CLAUDE.md; skip in CI
  Depends on: T014

---

## Summary

| Phase                         | Tasks  | Parallelizable | Sequential |
| ----------------------------- | ------ | -------------- | ---------- |
| 1. Verification (Pre-flight)  | 3      | 3              | 0          |
| 2. Database Cleanup           | 3      | 0              | 3          |
| 3. Code Removal               | 2      | 2              | 0          |
| 4. Documentation Update       | 2      | 2              | 0          |
| 5. Verification (Post-flight) | 5      | 0              | 5          |
| **Total**                     | **15** | **7**          | **8**      |

### Task Dependency Graph

```
T001 ─┬─→ T004 → T005 → T006 ─┬─→ T007 ─┬─→ T009 ─┬─→ T011 → T012 → T013 → T014 → T015
T002 ─┤                       │         │         │
T003 ─┘                       └─→ T008 ─┴─→ T010 ─┘
```

### User Story Coverage

| User Story                       | Tasks                                                |
| -------------------------------- | ---------------------------------------------------- |
| US1: Developer Code Clarity      | T001, T003, T007, T008, T011, T012, T013, T014, T015 |
| US2: Database Schema Cleanliness | T002, T004, T005, T006                               |
| US3: Security Documentation      | T009, T010                                           |
