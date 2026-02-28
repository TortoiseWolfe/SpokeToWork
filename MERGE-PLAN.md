# Employer Dashboard Merge Plan

Branch: `feat/employer-dashboard-merge` (off main at 9890d9e)

## What Was Done

A previous Claude session cherry-picked the best work from two eval models (A and B) into this branch by copying files directly. No commits yet — everything is unstaged.

### Files copied (47 total: 25 modified, 22 new)

**Phase 1 — Migration (Model A)**

- `supabase/migrations/20251006_complete_monolithic_setup.sql`
  - Updated `create_user_profile()` trigger to read `requested_role` from signup metadata
  - Added `set_own_role(TEXT)` RPC — self-service role switch, admin never self-assignable
  - Added `get_team_members`, `add_team_member`, `remove_team_member` RPCs (SECURITY DEFINER)

**Phase 2 — Types & Auth (Model A)**

- `src/types/company.ts` — merged B's full types + A's `getStatusStyle()` + `JOB_STATUS_ORDER`
- `src/lib/supabase/types.ts` — `set_own_role` RPC type
- Auth flow: `sign-up/page.tsx`, `sign-in/page.tsx`, `auth/callback/page.tsx`
- `OAuthButtons.tsx` — `requestedRole` prop, localStorage stash
- `AuthContext.tsx` — `RequestableRole` type, signUp metadata
- NEW: `src/components/organisms/AuthPageShell/` (5 files)

**Phase 3 — Landing Page (Model A)**

- NEW: `StatusBadge/`, `FeatureSpotlight/`, `ProfileBanner/` (5 files each)
- NEW: `RouteHeroIllustration.tsx` + stories
- Modified: `HeroSection.tsx`, `FeaturesSection.tsx`, `CTAFooter.tsx` + tests

**Phase 4 — Employer Dashboard (Hybrid A+B)**

- NEW from A: `useEmployerTeam.ts` (optimistic CRUD), `TeamPanel/` (5 files)
- Modified from A: `useEmployerApplications.ts` (paginated), `EmployerDashboard.tsx`, `employer/page.tsx`
- NEW from B: `useApplicationRealtime.ts`, `ApplicationCard/`, `StatusColumn/`, `RoleToggle/`, `EmployeeList/` (5 files each)

**Phase 5 — Tests (Both)**

- From A: `useEmployerTeam.test.ts`, `employer-team.contract.test.ts`, `getStatusStyle.test.ts`, `vitest.contract.config.ts`
- From B: `useApplicationRealtime.test.ts`, `useTeamMembers.test.ts`, `company-status-helpers.test.ts`
- Overwritten: HeroSection, FeaturesSection, CTAFooter, EmployerDashboard test/story files

**Phase 6 — Seed Script (Model A)**

- NEW: `scripts/seed-employer-funnel.ts` (local Supabase seeder)

## What Still Needs Doing

### 1. Import Reconciliation (CRITICAL)

B's Kanban components were built against B's hook names. They may reference hooks or types that don't exist on this branch:

- `StatusColumn/` and `ApplicationCard/` may import from B's hook (e.g., `useApplications`) instead of A's `useEmployerApplications`
- `EmployeeList/` may reference B's employer context
- `RoleToggle/` may import B's auth helpers

**Action**: Run TypeScript compilation, fix every import error.

### 2. Run Tests

```bash
docker compose up -d
docker compose exec app pnpm run type-check
docker compose exec app pnpm test
docker compose exec app pnpm test:e2e
```

Fix any failures. The contract tests (`vitest.contract.config.ts`) need a running Supabase instance.

### 3. Verify Migration

```bash
docker compose exec app pnpm supabase db reset
```

Confirm the migration applies cleanly and the new RPCs exist.

### 4. Commit

Stage everything, commit with a descriptive message covering all 6 phases.

## Known Conflict Points

1. **B's `ApplicationCard` → import path**: likely imports a hook that doesn't exist. Check the import statements and rewire to `useEmployerApplications`.
2. **B's `EmployeeList` → employer context**: may reference a provider B created. Check if it needs A's `AuthContext` role support instead.
3. **`company.ts` types**: merged manually — verify no duplicate type names or missing exports.
4. **Test mocks**: some tests may mock hooks by B's names. Update mock paths to match A's hook files.

## Stray Remote Branch

Model A pushed `feat/employer-team-management` to origin (37 commits ahead of main). Main is clean. Delete it:

```bash
git push origin --delete feat/employer-team-management
```

## Branch State

- Main: `9890d9e` (clean, untouched)
- This branch: `feat/employer-dashboard-merge` (0 commits ahead — all changes unstaged)
- Nothing has been pushed from this branch
