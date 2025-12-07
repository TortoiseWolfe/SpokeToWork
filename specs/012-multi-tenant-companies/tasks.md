# Tasks: Multi-Tenant Company Data Model

**Input**: Design documents from `/specs/012-multi-tenant-companies/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/company-api.yaml
**TDD Required**: Yes - Tests MUST be written and FAIL before implementation (RED-GREEN-REFACTOR)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7, or INFRA for shared)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Enable extensions and create base schema that all features depend on

- [x] T001 [INFRA] Enable PostGIS extension: `CREATE EXTENSION IF NOT EXISTS postgis`
- [x] T002 [INFRA] Enable pg_trgm extension: `CREATE EXTENSION IF NOT EXISTS pg_trgm`
- [x] T003 [INFRA] Add `is_admin` boolean column to user profile table
- [x] T004 [P] [INFRA] Create `company_status` enum in `supabase/migrations/20251006_complete_monolithic_setup.sql`
- [x] T005 [P] [INFRA] Create `contribution_status` enum in monolithic migration

---

## Phase 2: Foundational Database Schema (Blocking Prerequisites)

**Purpose**: Create all 7 tables that MUST exist before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Tests for Schema (RED phase)

- [ ] T006 [P] [INFRA] Write test: `metro_areas` table exists with correct columns in `tests/integration/schema.test.ts`
- [ ] T007 [P] [INFRA] Write test: `shared_companies` table exists with unique constraint on (metro_area_id, name)
- [ ] T008 [P] [INFRA] Write test: `company_locations` table exists with PostGIS geography index
- [ ] T009 [P] [INFRA] Write test: `user_company_tracking` table exists with user-owned RLS
- [ ] T010 [P] [INFRA] Write test: `private_companies` table exists with user-owned RLS
- [ ] T011 [P] [INFRA] Write test: `company_contributions` table exists with correct RLS
- [ ] T012 [P] [INFRA] Write test: `company_edit_suggestions` table exists with correct RLS
- [ ] T013 [P] [INFRA] Write test: `user_companies_unified` view returns data for authenticated user

### Implementation for Schema (GREEN phase)

- [x] T014 [INFRA] Create `metro_areas` table in monolithic migration (depends on T001)
- [x] T015 [INFRA] Create `shared_companies` table with pg_trgm GIN index on name (depends on T002, T014)
- [x] T016 [INFRA] Create `company_locations` table with PostGIS GIST index (depends on T001, T015)
- [x] T017 [INFRA] Create `user_company_tracking` table (depends on T015, T016)
- [x] T018 [INFRA] Create `private_companies` table (depends on T014)
- [x] T019 [INFRA] Create `company_contributions` table (depends on T018)
- [x] T020 [INFRA] Create `company_edit_suggestions` table (depends on T015, T016)
- [x] T021 [INFRA] Create RLS policies for all 7 tables (depends on T003, T014-T020)
- [x] T022 [INFRA] Create `user_companies_unified` view with UNION of shared tracking + private (depends on T017, T018)
- [x] T023 [INFRA] Create `assign_metro_area()` trigger function for private_companies (depends on T014, T018)
- [x] T024 [INFRA] Create `update_updated_at()` trigger for tables with updated_at column

### Seed Data

- [x] T025 [INFRA] Insert "Cleveland, TN" metro area record (center: 35.1595, -84.8707, radius: 30 miles)
- [x] T026 [INFRA] Execute migration via Supabase Management API

**Checkpoint**: Schema ready - run T006-T013 tests, expect all to PASS

---

## Phase 3: Data Migration

**Purpose**: Migrate 83 existing companies from old schema to new multi-tenant schema

### Tests for Migration (RED phase)

- [ ] T027 [P] [INFRA] Write test: All 83 companies exist in `shared_companies` after migration
- [ ] T028 [P] [INFRA] Write test: All 83 companies have corresponding `company_locations` records
- [ ] T029 [P] [INFRA] Write test: Current user has `user_company_tracking` for all 83 companies
- [ ] T030 [P] [INFRA] Write test: `job_applications` references remain valid after migration
- [ ] T031 [P] [INFRA] Write test: Old `companies` table no longer exists

### Implementation for Migration (GREEN phase)

- [ ] T032 [INFRA] Create backup of existing `companies` table to JSON file
- [ ] T033 [INFRA] Insert all 83 companies into `shared_companies` with metro_area_id = Cleveland, TN
- [ ] T034 [INFRA] Insert all company locations into `company_locations` (depends on T033)
- [ ] T035 [INFRA] Create `user_company_tracking` records for current user (depends on T033, T034)
- [ ] T036 [INFRA] Update `job_applications` foreign keys (depends on T033, T034, T035)
- [ ] T037 [INFRA] Drop old `companies` table (depends on T032-T036)

**Checkpoint**: Migration complete - run T027-T031 tests, expect all to PASS

---

## Phase 4: TypeScript Types & Core Services

**Purpose**: Create TypeScript interfaces and core services used by all user stories

### Tests for Types (Compile-Time Validation)

**Note**: These are TypeScript compile-time checks, not runtime Vitest tests. Validation occurs via `tsc --noEmit` ensuring interfaces match expected shapes.

- [ ] T038 [P] [INFRA] Verify: `SharedCompany` interface compiles against API schema (run `pnpm run type-check`)
- [ ] T039 [P] [INFRA] Verify: `PrivateCompany` interface compiles against API schema
- [ ] T040 [P] [INFRA] Verify: `UserCompanyTracking` interface compiles against API schema
- [ ] T041 [P] [INFRA] Verify: `UnifiedCompany` interface compiles against view output type
- [ ] T042 [P] [INFRA] Verify: `MatchResult` interface has confidence, reasons fields

### Implementation for Types (GREEN phase)

- [ ] T043 [P] [INFRA] Create `SharedCompany` interface in `src/types/company.ts`
- [ ] T044 [P] [INFRA] Create `CompanyLocation` interface in `src/types/company.ts`
- [ ] T045 [P] [INFRA] Create `UserCompanyTracking` interface in `src/types/company.ts`
- [ ] T046 [P] [INFRA] Create `PrivateCompany` interface in `src/types/company.ts`
- [ ] T047 [P] [INFRA] Create `UnifiedCompany` interface in `src/types/company.ts`
- [ ] T048 [P] [INFRA] Create `MatchResult` interface in `src/types/company.ts`
- [ ] T049 [P] [INFRA] Create `CompanyContribution` interface in `src/types/company.ts`
- [ ] T050 [P] [INFRA] Create `CompanyEditSuggestion` interface in `src/types/company.ts`

**Checkpoint**: Types ready - run T038-T042 tests, expect all to PASS

---

## Phase 5: User Story 1 - View Unified Company List (Priority: P1) MVP

**Goal**: User sees all tracked companies (shared + private) in one list
**Independent Test**: Log in, view /companies page, see unified list with origin badges

### Tests for User Story 1 (RED phase)

- [x] T051 [P] [US1] Write unit test: `companyService.getUnifiedCompanies()` returns combined list in `tests/unit/multi-tenant-service.test.ts`
- [ ] T052 [P] [US1] Write integration test: Unified view respects RLS (user only sees own data) in `tests/integration/company-rls.test.ts`
- [x] T053 [P] [US1] Write component test: `CompanyTable` displays source badge ("Community"/"Private") in `src/components/organisms/CompanyTable/CompanyTable.test.tsx`
- [ ] T054 [P] [US1] Write E2E test: User sees unified list on /companies page in `tests/e2e/companies/unified-view.spec.ts`
- [ ] T055 [P] [US1] Write accessibility test: Company table meets WCAG 2.1 in `src/components/organisms/CompanyTable/CompanyTable.accessibility.test.tsx`

### Implementation for User Story 1 (GREEN phase)

- [x] T056 [US1] Implement `getUnifiedCompanies()` in `src/lib/companies/multi-tenant-service.ts` (queries unified view)
- [x] T057 [US1] Update `CompanyRow` component to display origin badge in `src/components/molecular/CompanyRow/CompanyRow.tsx`
- [x] T058 [US1] Update `CompanyTable` to use `getUnifiedCompanies()` instead of old query
- [x] T059 [US1] Update `CompanyDetailDrawer` to show origin ("Community" vs "Private") badge
- [x] T060 [US1] Handle empty state for new users with no companies (CTA to add or browse seed data)
- [x] T061 [US1] Write Storybook story for `CompanyRow` with origin badge in `src/components/molecular/CompanyRow/CompanyRow.stories.tsx`

**Checkpoint**: US1 complete - run T051-T055 tests, expect all to PASS

---

## Phase 6: User Story 2 - Add Company with Match Detection (Priority: P1) MVP

**Goal**: When user adds a company, system suggests existing matches before creating duplicate
**Independent Test**: Type "Amazon", see match suggestion, can choose to track or create new

### Tests for User Story 2 (RED phase)

- [x] T062 [P] [US2] Write unit test: `matchService.findSimilarCompanies()` returns matches with confidence in `tests/unit/match-service.test.ts`
- [x] T063 [P] [US2] Write unit test: Fuzzy name matching (pg_trgm) finds "Amazn" → "Amazon" at >=0.3 similarity
- [x] T064 [P] [US2] Write unit test: Proximity matching finds companies within 5 miles
- [x] T065 [P] [US2] Write unit test: Domain matching boosts confidence when same domain
- [ ] T066 [P] [US2] Write integration test: `find_similar_companies` RPC returns expected results in `tests/integration/match-detection.test.ts`
- [x] T067 [P] [US2] Write component test: `CompanyMatchSuggestion` displays match options in `src/components/molecular/CompanyMatchSuggestion/CompanyMatchSuggestion.test.tsx`
- [ ] T068 [P] [US2] Write component test: `CompanyForm` shows loading state during match detection
- [ ] T069 [P] [US2] Write E2E test: Add company flow with match detection in `tests/e2e/companies/add-with-match.spec.ts`
- [ ] T070 [P] [US2] Write E2E test: Add company creates `private_companies` when no match exists

### Implementation for User Story 2 (GREEN phase)

- [x] T071 [US2] Create `find_similar_companies` RPC function in monolithic migration (uses pg_trgm + PostGIS)
- [x] T072 [US2] Create `src/lib/companies/match-service.ts` with `findSimilarCompanies()` function (implemented in multi-tenant-service.ts)
- [x] T073 [US2] Create `CompanyMatchSuggestion` component using generator: `pnpm run generate:component`
- [x] T074 [US2] Update `CompanyForm` to call match detection on name blur/debounce
- [x] T075 [US2] Add loading spinner during match detection query
- [x] T076 [US2] Implement "Track this one" action: creates `user_company_tracking` record
- [x] T077 [US2] Implement "Add as new" action: creates `private_companies` record
- [x] T078 [US2] Handle match timeout: show warning message, allow proceeding with private company

**Checkpoint**: US2 complete - run T062-T070 tests, expect all to PASS

---

## Phase 7: User Story 3 - Track Personal Status Per Company (Priority: P1) MVP

**Goal**: User maintains own status/priority/notes per company, isolated from other users
**Independent Test**: Update status on Whirlpool, verify another user's view unchanged

### Tests for User Story 3 (RED phase)

- [ ] T079 [P] [US3] Write unit test: `trackingService.updateTracking()` updates only user's record in `tests/unit/tracking-service.test.ts`
- [ ] T080 [P] [US3] Write integration test: RLS prevents user A from seeing user B's tracking in `tests/integration/tracking-rls.test.ts`
- [ ] T081 [P] [US3] Write component test: Status dropdown updates tracking record in `src/components/organisms/CompanyDetailDrawer/CompanyDetailDrawer.test.tsx`
- [ ] T082 [P] [US3] Write E2E test: Update status, refresh, verify persisted in `tests/e2e/companies/update-status.spec.ts`

### Implementation for User Story 3 (GREEN phase)

- [ ] T083 [US3] Implement `updateTracking()` in `src/lib/companies/company-service.ts`
- [ ] T084 [US3] Implement `updatePrivateCompany()` for private company status updates
- [ ] T085 [US3] Update `CompanyDetailDrawer` to use unified update function (handles both sources)
- [ ] T086 [US3] Add optimistic UI updates for status changes

**Checkpoint**: US3 (P1 MVP) complete - run T079-T082 tests, expect all to PASS

---

## Phase 8: User Story 4 - Receive Seed Data on Signup (Priority: P2)

**Goal**: New users get starter companies for their metro area
**Independent Test**: Create account, select Cleveland TN, see seed companies

### Tests for User Story 4 (RED phase)

- [ ] T087 [P] [US4] Write unit test: `seedService.getSeedCompaniesForMetro()` returns companies in `tests/unit/seed-service.test.ts`
- [ ] T088 [P] [US4] Write integration test: Signup trigger creates tracking records in `tests/integration/seed-on-signup.test.ts`
- [ ] T089 [P] [US4] Write E2E test: New user sees seed data after signup in `tests/e2e/auth/signup-seed-data.spec.ts`

### Implementation for User Story 4 (GREEN phase)

- [ ] T090 [US4] Create seed data JSON file at `data/seed/cleveland-tn/companies.json`
- [ ] T091 [US4] Create database trigger: on user profile insert, create tracking for metro seed companies
- [ ] T092 [US4] Update signup flow to capture metro area selection
- [ ] T093 [US4] Show preview of seed companies during signup

**Checkpoint**: US4 complete - run T087-T089 tests, expect all to PASS

---

## Phase 9: User Story 5 - Submit Company to Community (Priority: P2)

**Goal**: User submits private company for admin review to join shared registry
**Independent Test**: Click "Submit to Community", see pending status

### Tests for User Story 5 (RED phase)

- [ ] T094 [P] [US5] Write unit test: `contributionService.submitToShared()` creates contribution record in `tests/unit/contribution-service.test.ts`
- [ ] T095 [P] [US5] Write integration test: Contribution RLS allows user to view own submissions in `tests/integration/contribution-rls.test.ts`
- [ ] T096 [P] [US5] Write component test: "Submit to Community" button creates contribution in `src/components/organisms/CompanyDetailDrawer/CompanyDetailDrawer.test.tsx`
- [ ] T097 [P] [US5] Write E2E test: Submit flow shows pending badge in `tests/e2e/companies/submit-to-community.spec.ts`

### Implementation for User Story 5 (GREEN phase)

- [ ] T098 [US5] Implement `submitToShared()` in `src/lib/companies/contribution-service.ts`
- [ ] T099 [US5] Add "Submit to Community" button to `CompanyDetailDrawer` (for private companies only)
- [ ] T100 [US5] Display "Pending Review" badge on submitted companies
- [ ] T101 [US5] Show contribution status on next page load (no realtime notification per spec)

**Checkpoint**: US5 complete - run T094-T097 tests, expect all to PASS

---

## Phase 10: User Story 6 - Submit Data Correction (Priority: P3)

**Goal**: User suggests corrections to shared company data for admin review
**Independent Test**: Click "Suggest Edit" on shared company, submit new contact info

### Tests for User Story 6 (RED phase)

- [ ] T102 [P] [US6] Write unit test: `suggestionService.submitEditSuggestion()` creates record in `tests/unit/suggestion-service.test.ts`
- [ ] T103 [P] [US6] Write component test: "Suggest Edit" form submits to correct endpoint
- [ ] T104 [P] [US6] Write E2E test: Edit suggestion flow in `tests/e2e/companies/suggest-edit.spec.ts`

### Implementation for User Story 6 (GREEN phase)

- [ ] T105 [US6] Implement `submitEditSuggestion()` in `src/lib/companies/contribution-service.ts`
- [ ] T106 [US6] Add "Suggest Edit" button to `CompanyDetailDrawer` (for shared companies)
- [ ] T107 [US6] Create inline edit form for allowed fields (phone, email, contact_name, website, careers_url)

**Checkpoint**: US6 complete - run T102-T104 tests, expect all to PASS

---

## Phase 11: User Story 7 - Admin Reviews Contributions (Priority: P3)

**Goal**: Admin reviews and approves/rejects user contributions
**Independent Test**: Login as admin, view moderation queue, approve contribution

### Tests for User Story 7 (RED phase)

- [ ] T108 [P] [US7] Write unit test: `adminService.getContributionQueue()` returns all pending in `tests/unit/admin-service.test.ts`
- [ ] T109 [P] [US7] Write unit test: `adminService.approveContribution()` creates shared_company and tracking
- [ ] T110 [P] [US7] Write unit test: `adminService.mergeContribution()` links tracking to existing shared
- [ ] T111 [P] [US7] Write integration test: Admin RLS allows write to shared tables in `tests/integration/admin-rls.test.ts`
- [ ] T112 [P] [US7] Write component test: `AdminModerationQueue` displays pending items
- [ ] T113 [P] [US7] Write E2E test: Admin approval flow in `tests/e2e/admin/moderation-queue.spec.ts`

### Implementation for User Story 7 (GREEN phase)

- [ ] T114 [US7] Implement admin service in `src/lib/admin/admin-service.ts`
- [ ] T115 [US7] Create `AdminModerationQueue` component using generator: `pnpm run generate:component`
- [ ] T116 [US7] Create `/admin/moderation` page in `src/app/admin/moderation/page.tsx`
- [ ] T117 [US7] Implement approve action: create shared_company + location, update contributor's tracking
- [ ] T118 [US7] Implement reject action: update contribution status, leave private company unchanged
- [ ] T119 [US7] Implement merge action: link contributor's tracking to existing shared company

**Checkpoint**: US7 complete - run T108-T113 tests, expect all to PASS

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Performance Tests (SC-002, SC-003, SC-004, SC-007)

- [ ] T120 [P] Write E2E performance test: unified view loads in <1s with 1000 companies (SC-004) in `tests/e2e/performance/page-load.spec.ts`
- [ ] T121 [P] Write E2E performance test: add-company flow (with match detection) completes in <30s (SC-002) in `tests/e2e/performance/add-company.spec.ts`
- [ ] T122 [P] Write E2E performance test: seed data visible in <5s after signup (SC-003) in `tests/e2e/performance/seed-data.spec.ts`
- [ ] T123 [P] Write performance test: admin can process 10 contributions in <60s (SC-007) in `tests/e2e/performance/admin-throughput.spec.ts`

### Offline Support (Constitution V - Progressive Enhancement)

- [ ] T124 [P] [INFRA] Configure service worker to cache unified company view for offline access
- [ ] T125 [P] [INFRA] Add offline indicator when cached data is being displayed
- [ ] T126 [P] [INFRA] Write E2E test: unified view accessible when offline in `tests/e2e/pwa/offline-companies.spec.ts`

### Coordinate Validation (Constitution VIII - Geographic Accuracy)

- [ ] T127 [P] [INFRA] Add coordinate validation: warn if coordinates >50 miles from selected metro area
- [ ] T128 [P] [INFRA] Write unit test: coordinate validation triggers warning for out-of-bounds locations

### Final Verification

- [ ] T129 [P] Add database indexes if query performance issues found
- [ ] T130 [P] Run full accessibility audit across all new components
- [ ] T131 [P] Update quickstart.md with actual file paths after implementation
- [ ] T132 Run full test suite: `docker compose exec spoketowork pnpm test && docker compose exec spoketowork pnpm run test:e2e`
- [ ] T133 Verify migration rollback procedure works

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup → Phase 2: Schema → Phase 3: Migration → Phase 4: Types
                                                              ↓
                      ┌───────────────────────────────────────┴───────────────────────────────────────┐
                      ↓                       ↓                       ↓                               ↓
              Phase 5: US1 (P1)       Phase 6: US2 (P1)       Phase 7: US3 (P1)                      ...
                      ↓                       ↓                       ↓
                      └───────────────────────┴───────────────────────┴───────────────────────────────┘
                                                              ↓
                                                      Phase 12: Polish
```

### Within Each Phase: TDD Order

1. Write tests (T-tests) → expect FAILURE (RED)
2. Run tests to confirm failure
3. Implement code (T-impl) → expect PASS (GREEN)
4. Run tests to confirm pass
5. Refactor if needed (keep tests green)

### Parallel Opportunities

- All tests within a phase marked [P] can run in parallel
- User stories US1, US2, US3 can run in parallel after Phase 4
- User stories US4, US5 can run in parallel
- User stories US6, US7 can run in parallel

---

## Notes

- **Total Tasks**: 133 (was 125, added 8 for performance, offline, and coordinate validation)
- TDD is MANDATORY per spec: write failing tests before implementation
- Use component generator: `docker compose exec spoketowork pnpm run generate:component`
- Execute migrations via Supabase Management API (not CLI)
- Commit after each logical task group
- Stop at any checkpoint to validate story independently
- Performance thresholds: SC-002 (<30s), SC-003 (<5s), SC-004 (<1s), SC-007 (10/min)
