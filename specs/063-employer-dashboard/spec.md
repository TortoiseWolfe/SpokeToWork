# Spec: Employer Dashboard — Phase 0

**Feature**: 063-employer-dashboard
**Date**: February 12, 2026
**Status**: DRAFT

---

## 1. Problem

SpokeToWork is 100% worker-facing. Workers can track companies, apply to jobs, and manage applications — but there is no employer-facing view. When a worker applies, the employer never sees it inside SpokeToWork.

**This phase** builds the first employer-facing page: an Application Management Dashboard that shows incoming job applications with visual status highlighting, filtering, and quick actions.

---

## 2. Success Criteria

- An employer can create an account with `role = 'employer'`
- Employer is linked to a company via `employer_company_links`
- `/employer/dashboard` shows all applications to the employer's company
- Each application row displays: applicant name, position, status badge, date applied, work location type
- Status badges use centralized `getStatusStyle()` with fallback for unknown statuses
- Employer can advance application status via quick action button
- Employer can filter applications by status
- Employer can sort applications by date, status, or position
- Stats bar shows count of applications per status
- Dashboard is mobile-responsive (card layout on small screens)
- Touch targets meet 44px minimum (`min-h-11 min-w-11`)
- Database seeded with 15-20 realistic test applications
- All components generated via Plop (5-file pattern)
- All pages under 150 lines
- All business logic in services/hooks, not pages
- Tests written before implementation (TDD)

---

## 3. User Roles

### 3.1 New: Employer Role

Add a `role` column to `user_profiles`:

| Field  | Type | Default    | Description                           |
| ------ | ---- | ---------- | ------------------------------------- |
| `role` | TEXT | `'worker'` | One of: `worker`, `employer`, `admin` |

```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'worker'
CHECK (role IN ('worker', 'employer', 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
```

Existing users are unaffected (default `'worker'`).

### 3.2 Employer-Company Association

New table: `employer_company_links`

| Column              | Type        | Constraints                        | Description                       |
| ------------------- | ----------- | ---------------------------------- | --------------------------------- |
| `id`                | UUID        | PK                                 |                                   |
| `user_id`           | UUID        | FK auth.users(id), NOT NULL        | The employer user                 |
| `shared_company_id` | UUID        | FK shared_companies(id), NOT NULL  | The company they manage           |
| `location_id`       | UUID        | FK company_locations(id), NULLABLE | Specific location (null = all)    |
| `is_primary`        | BOOLEAN     | DEFAULT true                       | Primary company for this employer |
| `created_at`        | TIMESTAMPTZ | DEFAULT NOW()                      |                                   |

**RLS**: Employers can read/insert their own links. Admins can manage all.
**Unique constraint**: `(user_id, shared_company_id, location_id)`

### 3.3 Auth Flow

1. Employer visits `/employer/sign-up`
2. Creates account with email/password (same Supabase Auth)
3. Profile created with `role = 'employer'`
4. Onboarding flow: select or create company in `shared_companies`
5. Link created in `employer_company_links`
6. Redirected to `/employer/dashboard`

---

## 4. Application Management Dashboard

### 4.1 Page: `/employer/dashboard`

**Route**: `src/app/employer/dashboard/page.tsx`

Shows all job applications submitted to the employer's linked companies. Data source: `job_applications` filtered by `shared_company_id` matching employer's links.

**Page composition** (must stay under 150 lines):

```
EmployerDashboardPage (page.tsx)
├── useEmployerApplications() hook
├── ApplicationStatsBar — summary counts by status
├── ApplicationFilters — filter/sort controls
└── ApplicationTable — the main data table
    └── ApplicationRow (repeated)
        ├── StatusBadge — color-coded status
        ├── CommuteIndicator — distance/mode badge
        └── QuickActions — advance, message, schedule
```

### 4.2 Data Query

```sql
SELECT
  ja.id, ja.position_title, ja.status, ja.outcome,
  ja.date_applied, ja.interview_date, ja.work_location_type,
  ja.priority, ja.notes, ja.created_at,
  up.display_name as applicant_name,
  sc.name as company_name,
  cl.address as location_address
FROM job_applications ja
JOIN employer_company_links ecl
  ON ja.shared_company_id = ecl.shared_company_id
  AND ecl.user_id = auth.uid()
LEFT JOIN user_profiles up ON ja.user_id = up.id
LEFT JOIN shared_companies sc ON ja.shared_company_id = sc.id
LEFT JOIN company_locations cl
  ON sc.id = cl.shared_company_id AND cl.is_headquarters = true
WHERE ja.is_active = true
ORDER BY ja.created_at DESC;
```

### 4.3 RLS Policies

```sql
-- Employers can view applications to their companies
CREATE POLICY "Employers view applications to their companies"
ON job_applications FOR SELECT TO authenticated
USING (
  shared_company_id IN (
    SELECT shared_company_id FROM employer_company_links
    WHERE user_id = auth.uid()
  )
);

-- Employers can update application status
CREATE POLICY "Employers update applications to their companies"
ON job_applications FOR UPDATE TO authenticated
USING (
  shared_company_id IN (
    SELECT shared_company_id FROM employer_company_links
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  shared_company_id IN (
    SELECT shared_company_id FROM employer_company_links
    WHERE user_id = auth.uid()
  )
);
```

### 4.4 Status-to-Style Mapping

New file: `src/lib/status-styles.ts`

All status-to-badge-class mappings live here. Single source of truth for worker and employer views.

```typescript
import type { JobApplicationStatus, ApplicationOutcome } from '@/types/company';

const APPLICATION_STATUS_STYLES: Record<JobApplicationStatus, string> = {
  not_applied: 'badge-ghost',
  applied: 'badge-info',
  screening: 'badge-warning',
  interviewing: 'badge-primary',
  offer: 'badge-success',
  closed: 'badge-neutral',
};

const OUTCOME_STYLES: Record<ApplicationOutcome, string> = {
  pending: 'badge-ghost',
  hired: 'badge-success',
  rejected: 'badge-error',
  withdrawn: 'badge-warning',
  ghosted: 'badge-neutral',
  offer_declined: 'badge-warning',
};

const FALLBACK_STYLE = 'badge-ghost';

export function getStatusStyle(status: string): string {
  return (
    (APPLICATION_STATUS_STYLES as Record<string, string>)[status] ??
    FALLBACK_STYLE
  );
}

export function getOutcomeStyle(outcome: string): string {
  return (OUTCOME_STYLES as Record<string, string>)[outcome] ?? FALLBACK_STYLE;
}
```

Deprecates `JOB_STATUS_COLORS` and `OUTCOME_COLORS` in `src/types/company.ts` — worker-facing code should migrate to these functions in a follow-up task.

---

## 5. Component Inventory

All components created via Plop generator. Mandatory 5-file pattern.

### 5.1 New Components

| Component             | Category  | Purpose                                                     |
| --------------------- | --------- | ----------------------------------------------------------- |
| `StatusBadge`         | atomic    | Centralized status badge with color mapping + fallback      |
| `CommuteIndicator`    | atomic    | Commute distance and mode (bike/walk/e-bike)                |
| `ApplicationStatsBar` | molecular | Summary counts: X applied, Y screening, Z interviewing      |
| `ApplicationFilters`  | molecular | Filter bar: status dropdown, date range, position search    |
| `QuickActions`        | molecular | Status advance, message, schedule buttons                   |
| `ApplicationRow`      | molecular | Single application row with status, applicant, actions      |
| `ApplicationTable`    | organisms | Sortable table of ApplicationRows with empty/loading states |
| `EmployerNav`         | organisms | Employer-specific navigation                                |
| `EmployerOnboarding`  | templates | Company selection/creation flow                             |

### 5.2 New Pages

| Route                  | Purpose                | Lines target |
| ---------------------- | ---------------------- | ------------ |
| `/employer/dashboard`  | Application management | <150         |
| `/employer/sign-up`    | Employer registration  | <100         |
| `/employer/onboarding` | Company linking        | <100         |

### 5.3 New Services

| Service                      | File                                           | Responsibility                                 |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `EmployerApplicationService` | `src/services/employer/application-service.ts` | Fetch applications, update status, filter/sort |
| `EmployerCompanyService`     | `src/services/employer/company-service.ts`     | Manage employer-company links, onboarding      |
| `EmployerAuthService`        | `src/services/employer/auth-service.ts`        | Employer sign-up with role assignment          |

### 5.4 New Hooks

| Hook                      | File                                   | Responsibility                          |
| ------------------------- | -------------------------------------- | --------------------------------------- |
| `useEmployerApplications` | `src/hooks/useEmployerApplications.ts` | Fetch, cache, filter, sort applications |
| `useEmployerCompany`      | `src/hooks/useEmployerCompany.ts`      | Get employer's linked companies         |
| `useApplicationStats`     | `src/hooks/useApplicationStats.ts`     | Compute status counts for stats bar     |

### 5.5 New Types

New file: `src/types/employer.ts`

| Type                         | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `EmployerCompanyLink`        | Shape of `employer_company_links` row                |
| `EmployerApplication`        | Application joined with applicant name, company name |
| `EmployerApplicationFilters` | Filter options for employer dashboard                |
| `ApplicationStats`           | Counts per status for stats bar                      |

---

## 6. Database Changes

All changes in the monolithic migration: `supabase/migrations/20251006_complete_monolithic_setup.sql`

```sql
-- ============================================================
-- EMPLOYER DASHBOARD (Phase 0) — Feature 063
-- ============================================================

-- Add role to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'worker'
CHECK (role IN ('worker', 'employer', 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Employer-company links
CREATE TABLE IF NOT EXISTS employer_company_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_company_id UUID NOT NULL REFERENCES shared_companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employer_company_links_unique
  ON employer_company_links(user_id, shared_company_id,
     COALESCE(location_id, '00000000-0000-0000-0000-000000000000'));
CREATE INDEX IF NOT EXISTS idx_employer_company_links_user
  ON employer_company_links(user_id);
CREATE INDEX IF NOT EXISTS idx_employer_company_links_company
  ON employer_company_links(shared_company_id);

-- RLS
ALTER TABLE employer_company_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers view own links"
  ON employer_company_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Employers insert own links"
  ON employer_company_links FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON employer_company_links TO authenticated;

-- Employer application policies (additive to existing worker policies)
CREATE POLICY "Employers view applications to their companies"
  ON job_applications FOR SELECT TO authenticated
  USING (
    shared_company_id IN (
      SELECT shared_company_id FROM employer_company_links
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employers update applications to their companies"
  ON job_applications FOR UPDATE TO authenticated
  USING (
    shared_company_id IN (
      SELECT shared_company_id FROM employer_company_links
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    shared_company_id IN (
      SELECT shared_company_id FROM employer_company_links
      WHERE user_id = auth.uid()
    )
  );
```

### Seed Data

15-20 applications across statuses:

- 5 x `applied`, 3 x `screening`, 3 x `interviewing`, 2 x `offer`
- 2 x `closed`/`hired`, 2 x `closed`/`rejected`, 1 x `closed`/`withdrawn`, 1 x `closed`/`ghosted`
- Realistic position titles (CNA, Shift Supervisor, Warehouse Associate, etc.)
- Dates spread across last 30 days, varying priorities

---

## 7. Routing & Navigation

| Route                  | Auth | Role       | Purpose                |
| ---------------------- | ---- | ---------- | ---------------------- |
| `/employer/sign-up`    | No   | —          | Registration           |
| `/employer/onboarding` | Yes  | `employer` | Company linking        |
| `/employer/dashboard`  | Yes  | `employer` | Application management |

**Route protection**:

- Unauthenticated → `/sign-in`
- Workers on `/employer/*` → `/companies`
- Employers on `/companies` → `/employer/dashboard`

**Employer nav items**:

- Dashboard (`/employer/dashboard`)
- Company Profile (`/employer/company` — placeholder for Phase 1)
- Account (`/account` — shared)

---

## 8. UI Specification

### 8.1 Desktop Layout

```
┌─────────────────────────────────────────────────┐
│ EmployerNav                                      │
├─────────────────────────────────────────────────┤
│ ApplicationStatsBar                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │  5   │ │  3   │ │  3   │ │  2   │ │  6   │  │
│ │Applied│ │Screen│ │Inter │ │Offer │ │Closed│  │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
├─────────────────────────────────────────────────┤
│ ApplicationFilters                               │
│ [Status v] [Date range] [Search position...]    │
├─────────────────────────────────────────────────┤
│ ApplicationTable                                 │
│ Name   │ Position  │ Status    │ Applied │ Act  │
│ Jane D │ CNA       │ Applied   │ Feb 10  │ > @  │
│ Mike R │ Shift Sup │ Screening │ Feb 8   │ > @  │
│ Ana S  │ Warehouse │ Interview │ Feb 5   │ > @  │
│ Tom B  │ Cashier   │ Offer     │ Jan 28  │ > @  │
│ Li W   │ CNA       │ Closed    │ Jan 20  │   @  │
└─────────────────────────────────────────────────┘
```

### 8.2 Mobile Layout

- Stats bar: horizontal scrolling cards
- Filters: collapse to "Filter" button with dropdown
- Table: card layout (one card per application)
- Touch targets: `min-h-11 min-w-11` (44px)

### 8.3 Quick Actions

| Action             | Behavior                                               |
| ------------------ | ------------------------------------------------------ |
| Advance status     | Moves to next pipeline status. Disabled when `closed`. |
| Message applicant  | Opens existing encrypted messaging system              |
| Schedule interview | Sets `interview_date` on the application               |

---

## 9. File Structure

```
src/
├── app/employer/
│   ├── dashboard/page.tsx          # <150 lines
│   ├── sign-up/page.tsx            # <100 lines
│   └── onboarding/page.tsx         # <100 lines
├── components/
│   ├── atomic/
│   │   ├── StatusBadge/            # 5-file pattern
│   │   └── CommuteIndicator/       # 5-file pattern
│   ├── molecular/
│   │   ├── ApplicationStatsBar/    # 5-file pattern
│   │   ├── ApplicationFilters/     # 5-file pattern
│   │   ├── ApplicationRow/         # 5-file pattern
│   │   └── QuickActions/           # 5-file pattern
│   ├── organisms/
│   │   ├── ApplicationTable/       # 5-file pattern
│   │   └── EmployerNav/            # 5-file pattern
│   └── templates/
│       └── EmployerOnboarding/     # 5-file pattern
├── hooks/
│   ├── useEmployerApplications.ts
│   ├── useEmployerCompany.ts
│   └── useApplicationStats.ts
├── services/employer/
│   ├── application-service.ts
│   ├── company-service.ts
│   └── auth-service.ts
├── lib/
│   └── status-styles.ts
└── types/
    └── employer.ts
```

---

## 10. Implementation Approach

### TDD Workflow

1. Write the test — define expected behavior
2. Watch it fail — confirm the test is valid
3. Implement — minimum code to pass
4. Refactor — clean up while tests stay green

### Architecture Rules

| Rule          | Constraint                                                     |
| ------------- | -------------------------------------------------------------- |
| Pages         | Under 150 lines. Compose components, no business logic.        |
| Services      | CRUD, data transformation, Supabase queries.                   |
| Hooks         | State management, caching, real-time subscriptions.            |
| Components    | UI rendering only. Data via props or hooks.                    |
| Types         | In `src/types/employer.ts`. No inline types in components.     |
| Status styles | From `src/lib/status-styles.ts`. Never hardcode badge classes. |

---

## 11. Stretch Goals

- [ ] Message applicant opens existing messaging system
- [ ] Schedule interview action with date picker
- [ ] Commute indicator showing distance and transport mode
- [ ] Real-time updates when new applications arrive (Supabase Realtime)
- [ ] Employer onboarding flow with company search/creation

## 12. Out of Scope

- Scheduling / shift management (Phase 1)
- Team communication (Phase 1)
- Time tracking (Phase 2)
- Job posting / creation (Phase 2)
- Payroll integration (Phase 4)
- Indeed / LinkedIn integration (Phase 2+)
- Multi-location management
- Employer billing / subscription tiers

---

## 13. Open Questions

1. **Employer test user** — Add `TEST_USER_EMPLOYER_EMAIL` / `TEST_USER_EMPLOYER_PASSWORD` to `.env`, or reuse existing test user with role changed?
2. **Onboarding depth** — (a) Employer selects from existing `shared_companies`, or (b) hardcode link via seed data for demos?
3. **Worker privacy** — Show `display_name` to employers, or anonymize?
4. **Status permissions** — Can only employers advance status, or can workers also update their own?
5. **Worker-side indicator** — Show workers that their application will be visible to the employer?

---

## 14. Dependencies

| Dependency                                                  | Status                           |
| ----------------------------------------------------------- | -------------------------------- |
| Supabase Auth                                               | Exists                           |
| `user_profiles` table                                       | Exists — needs `role` column     |
| `shared_companies` table                                    | Exists                           |
| `company_locations` table                                   | Exists                           |
| `job_applications` table                                    | Exists                           |
| Status types (`JobApplicationStatus`, `ApplicationOutcome`) | Exists in `src/types/company.ts` |
| Color mappings (`JOB_STATUS_COLORS`, `OUTCOME_COLORS`)      | Exists — will be centralized     |
| Component generator (Plop)                                  | Exists                           |
| Encrypted messaging                                         | Exists — for stretch goal        |
| DaisyUI badge classes                                       | Exists                           |
