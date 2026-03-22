# Best-of-Both Sandbox Merge into SpokeToWork

## Context

Two AI models built industry taxonomy, worker skills, and resume upload features against sandbox clones of SpokeToWork during a Mercor A/B eval (TASK_15112). Neither has been merged into the real repo. The real repo's migration ends at line 3528 with no taxonomy tables.

**Model B** has cleaner code for industry taxonomy: cycle-safe resolver, pure function exports, cancellation guards, stable UUIDs, contract tests. It also has a superior worker skills spec with discoverability-by-tagging (no separate visibility toggle) and a generic taxonomy factory design. But it only finished 1 feature.

**Model A** shipped all 3 features (69 files) but has code quality issues: duplicated utilities, missing `search_path` on SQL functions, client-side-only enforcement, no generic taxonomy module.

**Plan:** Take B's architecture as the base, B's unimplemented designs for skills, and A's resume implementation (the only source), fixing known issues along the way.

## Source Files

- B's industry implementation: `~/repos/sandbox/model_b/`
- B's skills spec: `~/repos/sandbox/model_b/docs/superpowers/specs/2026-03-21-worker-skills-design.md`
- A's resume/visibility: `~/repos/sandbox/model_a/`
- Target: `~/repos/SpokeToWork/`

---

## Phase 1: Industry Taxonomy (Source: Model B)

Foundation everything else builds on. B's implementation is complete and tested.

### Migration (append to `supabase/migrations/20251006_complete_monolithic_setup.sql` before COMMIT)

Copy from B's migration (lines ~1987-2290):
- `industries` table with adjacency list, RLS (public read, admin write)
- `company_industries` junction with XOR constraint, partial unique indexes, split RLS
- `industry_suggestions` table with status workflow
- `get_industry_descendants` RPC with `SET search_path = public`
- `filter_companies_by_industry` RPC with `SECURITY INVOKER`
- Seed data: 6 sectors, stable UUIDs (`10000000-`, `20000000-`, `30000000-` prefixes)
- `user_companies_unified` view update adding `primary_industry_id`
- `GRANT SELECT ON industries TO anon`

### New Files (from B)

| File | Source | Notes |
|------|--------|-------|
| `src/hooks/useIndustries.ts` | B verbatim (168 lines) | Pure exports, TTL cache, cycle guard |
| `src/hooks/useCompaniesIndustryFilter.ts` | B (39 lines) | Stable memo, undefined-when-empty |
| `src/lib/industries/badge-class.ts` | B (17 lines) | Static DaisyUI class lookup |
| `src/lib/industries/seed-ids.ts` | B (9 lines) | UUID constants for tests |
| `src/components/molecular/IndustryFilter/` | B (5 files) | details/summary, axe-core test |
| `src/app/company/page.tsx` | B | `?id=` query param (static export safe) |
| `src/app/company/CompanyProfileInner.tsx` | B (165 lines) | Anon client, badge display |
| `tests/contract/rls/industries-anon.contract.test.ts` | B (72 lines) | RLS proof |
| `tests/unit/hooks/useIndustries.test.tsx` | B (10 cases) | Pure function tests |
| `tests/unit/lib/badge-class.test.ts` | B | Theme color coverage |
| `tests/e2e/company/company-profile-public.spec.ts` | B | Anon access, theme badges |

### Modified Files

| File | Change |
|------|--------|
| `src/types/company.ts` | Add Industry, ResolvedIndustry, UnifiedCompanyFilters.industry_ids |
| `src/lib/supabase/types.ts` | Add table/function types |
| `src/lib/companies/multi-tenant-service.ts` | Industry filter integration (B's lines 90-133) |
| `src/app/companies/CompaniesPageInner.tsx` | Wire filter + markers |
| `src/hooks/useCompanyMarkers.ts` | Resolver integration |
| `src/components/map/MapContainer/MapContainerInner.tsx` | Industry color on markers |

### Verify
```bash
docker compose exec -T spoketowork pnpm vitest run -- tests/contract/rls/industries-anon
docker compose exec -T spoketowork pnpm vitest run -- tests/unit/hooks/useIndustries
docker compose exec -T spoketowork pnpm vitest run
```

---

## Phase 2: Generic Taxonomy Extraction (Source: B's spec, new code)

Refactor useIndustries into a reusable factory before building useSkills. B designed this but didn't implement it.

### New Files

| File | Notes |
|------|-------|
| `src/lib/taxonomy/adjacency.ts` | `TaxonomyNode`, `ResolvedTaxonomyNode`, `TaxonomyTreeNode<T>` interfaces. `narrowColor()`, `buildResolver<T>()`, `buildTree<T>()`, `createTaxonomyHook<T>()` factory. **Critical:** per-instantiation cache inside factory body, not module singleton. |
| `src/lib/taxonomy/badge-class.ts` | Move from `src/lib/industries/badge-class.ts`, leave re-export shim |
| `tests/unit/lib/taxonomy.test.ts` | Move 10 pure-function tests from useIndustries.test.tsx |

### Modified Files

| File | Change |
|------|--------|
| `src/hooks/useIndustries.ts` | Shrink to ~20 lines: factory call + re-exports |
| `src/components/molecular/IndustryFilter/IndustryFilter.tsx` | `.industry` -> `.node` on tree nodes |

### Gotchas (from B's spec)
- `IndustryTreeNode` has `.industry` field today; `TaxonomyTreeNode<T>` uses `.node`. Grep all `.industry.` dereferences.
- Module-level cache must be per-factory-instantiation or useIndustries/useSkills stomp each other.

### Verify
All Phase 1 tests still pass. No functional changes, purely structural.

---

## Phase 3: Worker Skills with Discoverability-by-Tagging (Source: B spec + A components)

### Migration (append after industry section)

From B's spec:
- `skills` table (adjacency list, `ON DELETE RESTRICT`, no depth column)
- `user_skills` junction with `is_primary`, partial unique index `uq_user_skills_primary`
- `idx_user_skills_user` for EXISTS probe performance
- **Discoverability policy** on `user_profiles`: `USING (EXISTS (SELECT 1 FROM user_skills us WHERE us.user_id = user_profiles.id))`
- `get_skill_descendants` RPC with `SET search_path = public`
- `filter_workers_by_skill` RPC returning scalar `user_id`
- Seed: 7 trades, 23 specializations, `a`/`b` UUID prefixes
- **No `company_skills` table** (B correctly scopes skills to workers only)

### New Files

| File | Source | Notes |
|------|--------|-------|
| `src/types/worker.ts` | B spec | Skill, ResolvedSkill, DiscoverableWorker, WorkerFilters |
| `src/lib/skills/seed-ids.ts` | B spec | UUID constants |
| `src/hooks/useSkills.ts` | New (~20 lines) | Factory wrapper, fallback icon 'user' |
| `src/hooks/useMySkills.ts` | B spec + A patterns | Own-tags CRUD, auto-primary on first tag |
| `src/hooks/useWorkersSkillFilter.ts` | New | Same pattern as useCompaniesIndustryFilter |
| `src/lib/workers/worker-service.ts` | B spec | `!inner` join, two-round-trip filter |
| `src/components/molecular/SkillPicker/` | A adapted | 5 files, use generic tree, add is_primary radio |
| `src/components/atomic/SkillBadge/` | A adapted | 5 files, badge-class.ts instead of hexToRgba |
| `src/components/molecular/SkillFilter/` | New | 5 files, mirrors IndustryFilter |
| `src/components/molecular/WorkerCard/` | New | 5 files per B spec |
| `src/app/workers/page.tsx` | New | Anon-accessible worker list |
| `src/app/worker/page.tsx` | New | `?id=` public worker profile |
| `tests/contract/rls/worker-discoverability.contract.test.ts` | B spec | **Write first.** Core privacy proof. |
| `tests/contract/rls/skills-anon.contract.test.ts` | New | Anon SELECT, INSERT denial, RPC |
| `tests/unit/hooks/useMySkills.test.tsx` | New | Auto-primary, setPrimary clear-then-set |
| `tests/unit/lib/worker-service.test.ts` | New | Primary resolution fallback |
| `tests/e2e/worker/worker-profile-public.spec.ts` | New | Anon access |
| `tests/e2e/worker/workers-filter.spec.ts` | New | Skill filter |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/supabase/types.ts` | Add skills, user_skills, RPC types |
| `src/components/auth/AccountSettings/` | Mount SkillPicker |
| `src/components/auth/UserProfileCard/` | Add skill badges below bio |
| `tests/e2e/global-setup.ts` | `ensureDiscoverableWorker()` |

### Verify
```bash
docker compose exec -T spoketowork pnpm vitest run -- tests/contract/rls/worker-discoverability
docker compose exec -T spoketowork pnpm vitest run -- tests/contract/rls/skills-anon
docker compose exec -T spoketowork pnpm vitest run
```

---

## Phase 4: Resume Upload and Profile Visibility (Source: Model A, fixed)

A is the only source. Apply B's defensive patterns and fix known issues.

### Migration (append after skills section)

From A, with fixes:
- `worker_resumes` table with `check_resume_limit()` trigger (**fixes A's client-only enforcement**)
- `worker_visibility` table (for resume visibility, separate from skills discoverability)
- `can_access_resume()` function — **add `SET search_path = public`** (missing in A)
- `set_default_resume()` function — **add `SET search_path = public`**
- `get_worker_profile_for_employer()` function — **add `SET search_path = public`**
- `job_applications.resume_id` FK addition
- Storage bucket `resumes` (private) with RLS policies

### New Files

| File | Source | Notes |
|------|--------|-------|
| `src/lib/resumes/types.ts` | A | Resume, WorkerVisibility, constants |
| `src/lib/resumes/validation.ts` | A (28 lines) | MIME, size, empty checks |
| `src/lib/resumes/resume-service.ts` | A (139 lines) | Upload, delete, default promotion |
| `src/lib/resumes/visibility-service.ts` | A (46 lines) | Upsert-on-first-access |
| `src/hooks/useWorkerResumes.ts` | A | CRUD with refetch |
| `src/hooks/useWorkerVisibility.ts` | A | Optimistic updates |
| `src/hooks/useResumeDownload.ts` | A | Signed URL generation |
| `src/hooks/useWorkerProfileForEmployer.ts` | A | Employer view |
| `src/components/molecular/ResumeList/` | A (5 files) | Upload UI, rename, default |
| `src/components/molecular/ResumePicker/` | A (5 files) | Radio group for applications |
| `src/components/molecular/VisibilityControls/` | A (5 files) | Profile/resume toggles |
| `src/components/molecular/WorkerProfileForEmployer/` | A (5 files) | Employer view |
| `src/lib/resumes/resume-service.test.ts` | A (255 lines) | |
| `src/lib/resumes/visibility-service.test.ts` | A | |
| `src/hooks/__tests__/useWorkerResumes.test.ts` | A | |
| `src/hooks/__tests__/useWorkerVisibility.test.ts` | A | |
| `tests/e2e/account/resume-upload.spec.ts` | A (**fix auth setup**) | |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/supabase/types.ts` | Add resume/visibility types |
| `src/components/auth/AccountSettings/` | Add Resumes + Visibility cards |
| `src/components/organisms/ApplicationForm/` | Add resume_id to submission |
| `src/lib/companies/application-service.ts` | Pass resume_id |

### Fixes Applied to A's Code
1. **`search_path`** on all 3 SQL functions (security)
2. **Server-side resume limit** via trigger (was client-only)
3. **E2E auth setup** wired through global-setup fixtures
4. **No hexToRgba duplication** (badge-class.ts from Phase 2)

### Verify
```bash
docker compose exec -T spoketowork pnpm vitest run -- src/lib/resumes/
docker compose exec -T spoketowork pnpm vitest run
docker compose exec -T spoketowork pnpm playwright test
```

---

## Phase 5: Integration and Full Suite

- Verify `/workers` page uses skill filter AND discoverability-by-tagging
- Verify employer view shows correct resume access level
- Verify AccountSettings has Skills + Resumes + Visibility cards
- Full test suite: unit + contract + E2E across all 3 browsers

```bash
docker compose exec -T spoketowork pnpm vitest run
docker compose exec -T spoketowork pnpm playwright test --project=chromium
docker compose exec -T spoketowork pnpm playwright test
```

---

## Phase Dependencies

```
Phase 1 (Industry from B)
    |
Phase 2 (Generic Taxonomy)
    |
Phase 3 (Skills from B spec + A components)  -->  Phase 4 (Resume from A, fixed)
                                                        |
                                                   Phase 5 (Integration)
```

## Key Design Decisions

1. **B's schema over A's** — `ON DELETE RESTRICT` (safer), stable UUIDs (test-referenceable), `SET search_path` on all RPCs
2. **B's discoverability-by-tagging** — tagging a skill IS the opt-in to being public. Eliminates a separate visibility table for skills
3. **No `company_skills` table** — B correctly scopes skills to workers. Companies have industries, workers have skills
4. **`?id=` query params** over `[id]/` dynamic segments — works natively with static export to GitHub Pages
5. **Generic taxonomy factory** — `useIndustries` and `useSkills` share one implementation instead of duplicating 150 lines
