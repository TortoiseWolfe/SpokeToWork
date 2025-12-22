# Implementation Plan: OAuth State Token Cleanup

**Branch**: `050-oauth-state-cleanup` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/050-oauth-state-cleanup/spec.md`

## Summary

Remove dead OAuth CSRF token code that was implemented but never integrated into the production OAuth flow. The application correctly uses Supabase's built-in PKCE (Proof Key for Code Exchange) for CSRF protection, making the custom implementation redundant. This cleanup removes ~520 lines of dead code, an unused database table, and updates documentation to accurately reflect the security model.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 15
**Primary Dependencies**: Supabase Auth (PKCE built-in), @supabase/supabase-js
**Storage**: Supabase PostgreSQL (removing `oauth_states` table)
**Testing**: Vitest 4.0 (removing dead test file)
**Target Platform**: GitHub Pages (static export)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: N/A (code removal)
**Constraints**: Zero regression in OAuth login flow
**Scale/Scope**: 5 files to modify/delete, 1 database table to drop

## Constitution Check

_GATE: Must pass before implementation._

| Principle                         | Status | Notes                                                  |
| --------------------------------- | ------ | ------------------------------------------------------ |
| Proper Solutions Over Quick Fixes | PASS   | Removing dead code is the proper solution              |
| Root Cause Analysis               | PASS   | Custom tokens were never integrated; PKCE handles CSRF |
| Stability Over Speed              | PASS   | Careful removal with E2E test verification             |
| Clean Architecture                | PASS   | Removes confusing duplicate security patterns          |
| No Technical Debt                 | PASS   | This IS the debt resolution                            |
| Docker-First Development          | PASS   | All commands via Docker                                |
| Static Hosting Constraint         | N/A    | No server-side changes                                 |
| Component Structure               | N/A    | No component changes                                   |
| Database Migrations               | PASS   | Editing monolithic migration file                      |

## Project Structure

### Files to DELETE

```text
src/lib/auth/oauth-state.ts                    # 210 lines - Dead code
src/lib/auth/__tests__/oauth-state.test.ts     # 309 lines - Tests dead code
```

### Files to MODIFY

```text
supabase/migrations/20251006_complete_monolithic_setup.sql  # Remove oauth_states table
src/lib/supabase/types.ts                                    # Remove oauth_states types
docs/SECURITY-ARCHITECTURE.md                                # Update OAuth section
docs/TECHNICAL-DEBT.md                                       # Mark issue as FIXED
```

### Database Changes

**DROP via Supabase Management API**:

```sql
DROP TABLE IF EXISTS oauth_states CASCADE;
DROP INDEX IF EXISTS idx_oauth_states_token;
DROP INDEX IF EXISTS idx_oauth_states_expires;
DROP INDEX IF EXISTS idx_oauth_states_session;
```

**Remove from migration file** (lines 247-294):

- `CREATE TABLE oauth_states`
- `CREATE INDEX idx_oauth_states_*`
- `COMMENT ON TABLE oauth_states`
- `ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY`
- All `oauth_states` policies

## Implementation Phases

### Phase 1: Verification (Pre-flight)

1. Confirm no production code imports `oauth-state.ts`
2. Verify `oauth_states` table is empty in production
3. Run existing E2E OAuth tests to establish baseline

### Phase 2: Database Cleanup

1. Execute DROP TABLE via Supabase Management API
2. Remove table definition from monolithic migration file
3. Remove types from `src/lib/supabase/types.ts`

### Phase 3: Code Removal

1. Delete `src/lib/auth/oauth-state.ts`
2. Delete `src/lib/auth/__tests__/oauth-state.test.ts`

### Phase 4: Documentation Update

1. Update `docs/SECURITY-ARCHITECTURE.md` OAuth section to document PKCE
2. Update `docs/TECHNICAL-DEBT.md` to mark issue as FIXED

### Phase 5: Verification (Post-flight)

1. Run full test suite (unit tests should pass)
2. Verify no remaining references: `grep -r "oauth-state\|oauth_states\|generateOAuthState" src/`
3. Run OAuth E2E tests if available

## Risk Assessment

| Risk                            | Likelihood | Impact | Mitigation                    |
| ------------------------------- | ---------- | ------ | ----------------------------- |
| Code is actually used somewhere | Very Low   | High   | Grep verification in Phase 1  |
| Table has production data       | Very Low   | Medium | Query table count before DROP |
| E2E tests break                 | Low        | Medium | Run tests before and after    |
| Types removal breaks build      | Low        | Medium | Run type-check after removal  |

## Rollback Plan

If issues discovered after merge:

1. Revert commit via `git revert`
2. Re-create table via Supabase SQL editor (migration file in git history)
3. Investigate root cause before re-attempting

## Success Verification

```bash
# No references remain
grep -r "oauth-state\|oauth_states\|generateOAuthState\|validateOAuthState" src/ | wc -l
# Expected: 0

# Type check passes
docker compose exec spoketowork pnpm run type-check

# Tests pass
docker compose exec spoketowork pnpm test

# Build succeeds
docker compose exec spoketowork pnpm run build
```

## Complexity Tracking

No constitution violations - this is a straightforward cleanup.
