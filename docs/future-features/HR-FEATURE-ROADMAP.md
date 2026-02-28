# SpokeToWork — HR Feature Roadmap

High-level planning document for features to be worked through over time. No code yet.

---

## 1. Employee Onboarding Without Accounts

### What exists today

- `team_members` table has **nullable `user_id`** — HR can add people by name+email without a Supabase auth account
- `team_shifts.user_id` is also nullable — shifts can reference a `team_member` by `company_id` match even when they have no login
- RPCs `add_team_member` and `get_team_members` already work with name-only records

### What's missing

- **Bulk import**: No way to upload a CSV/spreadsheet of employees. HR must add one at a time via the dashboard
- **Invite flow**: No mechanism to email a team member with a link to create their account and auto-link to the existing `team_members` row
- **Account linking**: When an invited employee finally signs up, their `team_members.user_id` needs to be backfilled automatically (match by email)

### Proposed features

| Feature                    | Description                                                                                      | Priority |
| -------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| **Bulk employee import**   | CSV upload (name, email, role_title, start_date) → batch `add_team_member` calls                 | High     |
| **Invite link generation** | Generate a unique sign-up URL per team member, store token in DB, email it                       | High     |
| **Auto-link on sign-up**   | Auth trigger: when a new user registers, check `team_members` for matching email → set `user_id` | High     |
| **Invite status tracking** | Dashboard column showing Invited / Pending / Active per team member                              | Medium   |
| **Resend invite**          | Button to re-send the invite email for pending members                                           | Medium   |

### Key design decision

Scheduling unregistered employees **already works** — shifts are assigned by `team_members.id` via `company_id`, and `user_id` is optional. So HR can schedule people who ignore the invite. The employee just won't see their own schedule until they create an account.

---

## 2. Company Profiles & Claiming

### What exists today

- **`shared_companies`**: Public registry visible to all users. Has `is_verified` boolean (currently unused in any workflow). Seeded from metro-area data.
- **`private_companies`**: Per-user company records for personal job tracking. Not visible to others.
- **`employer_company_links`**: Ties an employer user to a `shared_company`. This is the "I manage this company" relationship.
- No public-facing company profile page exists.

### The two-tier gap

A job seeker can drop off a resume at the hardware store (it's a `shared_company` on the map), but the hardware store doesn't have an account. There's no way for the hardware store owner to "claim" that listing and upgrade it to a managed company with scheduling, team management, etc.

### Proposed features

| Feature                            | Description                                                                                                                                        | Priority |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Public company profile page**    | `/company/[id]` route showing name, address, website, open positions (if employer-managed)                                                         | High     |
| **Company claiming flow**          | Employer signs up → searches shared_companies → clicks "Claim this business" → creates `employer_company_links` row                                | High     |
| **Verification workflow**          | After claiming, company stays unverified. Admin reviews and sets `is_verified = true`. Verified companies get a badge and appear higher in search. | Medium   |
| **Claimed vs unclaimed indicator** | Map markers and list views distinguish: unclaimed (grey), claimed (colored), verified (badge)                                                      | Medium   |
| **Company dashboard**              | Claimed companies can edit their profile, post open positions, manage team from their profile page                                                 | Medium   |

### Verification tiers

1. **Unclaimed** — exists in `shared_companies`, no `employer_company_links` row. Anyone can see it on the map.
2. **Claimed** — has an `employer_company_links` row. Employer can manage team + schedule. `is_verified = false`.
3. **Verified** — Admin has confirmed legitimacy. `is_verified = true`. Gets a badge, boosted in search/map.

---

## 3. Industry & Job Type Filtering

### What exists today

- No `industry`, `job_type`, or `category` column on any table
- `shared_companies` has `metro_area_id` for geographic filtering only
- `job_applications` has `position_title` (free text) but no structured category

### Proposed features

| Feature                       | Description                                                                                                                | Priority |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Industry taxonomy table**   | `industries` table with id, name, icon. Seed with common categories (Food Service, Construction, Retail, Healthcare, etc.) | High     |
| **Company ↔ industry link**  | `shared_companies.industry_id` FK or many-to-many `company_industries` junction table                                      | High     |
| **Job type tags**             | `job_types` table (Full-time, Part-time, Temp, Contract, Gig). Link to `job_applications` and/or company open positions.   | Medium   |
| **Filter UI on map**          | Dropdown/chip filter on the map page: "Show me only restaurants" or "Only construction companies"                          | High     |
| **Filter UI on company list** | Same filtering on `/companies` page                                                                                        | Medium   |
| **Search by trade**           | "I'm a cook" → show food service companies. "I'm an electrician" → show construction/trades companies.                     | Medium   |

### Design note

Start with a flat industry list (single category per company). Many-to-many adds complexity without much value for v1. A company can always be recategorized.

---

## 4. Departments & Roles Within a Company

### What exists today

- `team_members.role_title` is free text (e.g., "Line Cook", "Manager")
- No department concept
- No hierarchy or reporting structure

### Proposed features

| Feature                          | Description                                                                                      | Priority |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| **Departments**                  | `departments` table (id, company_id, name). Team members belong to a department.                 | Low      |
| **Department-scoped scheduling** | Filter the WeekScheduleGrid by department (e.g., "Kitchen" vs "Front of House")                  | Low      |
| **Role-based permissions**       | Distinguish manager vs employee within a company (not just the `user_profiles.role` global role) | Low      |

### Why low priority

The current system works fine for small teams (5-20 people). Departments become necessary at ~50+ employees, which is beyond the initial target audience of small businesses hiring gig workers and cyclists.

---

## 5. Candidate Pipeline (Application Tracking for Employers)

### What exists today

- `job_applications` already has pipeline stages: `status` (not_applied, applied, screening, interviewing, offer, closed) and `outcome` (pending, hired, rejected, withdrawn, ghosted, offer_declined)
- `hire_applicant` RPC moves someone from applicant → team member
- But these are **worker-side only** — the worker sets their own status. No employer-facing view exists.

### What's missing

- Employers can't see inbound applications to their company
- Employers can't change application status (only the worker can today via RLS)
- No employer-facing inbox or Kanban board

### Proposed features

| Feature                           | Description                                                                                                               | Priority |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Employer application view RPC** | SECURITY DEFINER RPC: get all `job_applications` where the company is linked to the employer via `employer_company_links` | Medium   |
| **Employer application inbox**    | `/employer/applications` page showing all inbound applications grouped by stage (Kanban-style)                            | Medium   |
| **Employer stage transitions**    | New RPC letting employer advance/reject an application (updates `status`/`outcome`)                                       | Medium   |
| **Applicant notifications**       | When employer changes stage, notify the worker (in-app or email)                                                          | Low      |

### Schema note

The pipeline columns already exist — the work is RLS/RPC access + UI, not new tables.

---

## 6. Open Positions / Job Postings

### What exists today

- Nothing. Companies cannot post open positions. Workers can only track their own applications against companies they found.

### Proposed features

| Feature                         | Description                                                                                                      | Priority |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| **`open_positions` table**      | company_id, title, description, industry_id, job_type, pay_range, created_at, closes_at, is_active               | Medium   |
| **Post a position**             | Employer dashboard: create/edit/close positions                                                                  | Medium   |
| **Position listing page**       | `/jobs` page showing open positions, filterable by industry/type/location                                        | Medium   |
| **Apply button**                | Worker clicks "Apply" on a position → creates a `job_applications` row linked to the position + open_position_id | Medium   |
| **Position on company profile** | Company profile page shows their open positions                                                                  | Medium   |

---

## 7. Worker Profile & Resume

### What exists today

- `user_profiles` has: `display_name`, `bio`, `avatar_url` — that's it
- No resume upload, no skills list, no work history, no contact preferences

### What's missing

Workers have no way to present themselves to employers. Every application requires manually typing information that could be reusable.

### Proposed features

| Feature                 | Description                                                                                                                                                                                                                                                                      | Priority |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Resume upload**       | Supabase Storage bucket for PDF/DOCX/RTF resumes. `user_profiles.resume_url` column. RTF recommended as primary format — plain structured text that ATS and AI systems parse most reliably (no binary blobs, no layout artifacts). Accept all three, but nudge users toward RTF. | High     |
| **Skills/trades list**  | `user_skills` junction table linking user → industry/skill tags. "I'm a cook, I can also do prep and dishwashing."                                                                                                                                                               | High     |
| **Work history**        | `user_work_history` table: company_name, role, start_date, end_date, description. Optional — not everyone has a formal history.                                                                                                                                                  | Medium   |
| **Worker profile page** | `/profile/[id]` public-facing page showing name, bio, skills, resume download. Visible to employers.                                                                                                                                                                             | Medium   |
| **Contact preferences** | `user_profiles.preferred_contact` (email, phone, in-app). Phone number field.                                                                                                                                                                                                    | Low      |

### Design notes

- Resume upload uses Supabase Storage (already in the stack). The profile page is the worker's equivalent of the company profile page — symmetry between the two sides of the marketplace.
- **RTF as preferred format**: RTF files are plain structured text that ATS (Applicant Tracking Systems) and AI resume parsers handle best. PDF can lose structure in parsing; DOCX has binary XML complexity. RTF is the sweet spot — formatted enough for humans, clean enough for machines. The upload UI should accept `.rtf`, `.pdf`, and `.docx` but display a hint like "RTF format recommended for best compatibility with hiring systems."
- **Future: server-side parsing**: When resume parsing is added (auto-extract name, skills, work history into structured fields), RTF will be the easiest format to parse reliably via a Supabase Edge Function.

---

## 8. Application Auto-fill

### What exists today

- `job_applications` requires manual entry of `position_title`, `work_location_type`, `notes` per application
- No connection between the worker's profile data and new application forms

### The problem

If I've already entered my name, skills, and uploaded my resume, why do I have to re-enter everything for each new application? The system should pre-fill what it knows.

### Proposed features

| Feature                    | Description                                                                                                               | Priority                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Auto-fill from profile** | When creating a new application, pre-populate fields from `user_profiles` + `user_skills`                                 | Medium                             |
| **Auto-attach resume**     | New applications automatically attach the worker's current resume (from Storage)                                          | Medium                             |
| **Quick apply**            | One-click apply to an `open_position`: creates `job_applications` row with all profile data pre-filled, resume attached   | High (after open_positions exists) |
| **Application templates**  | Save a "default application" config: cover letter template, preferred work_location_type, etc. Reuse across applications. | Low                                |

### How it works

1. Worker fills out profile once (name, bio, skills, resume)
2. When applying to a new company/position, form pre-fills from profile
3. Worker can edit per-application before submitting
4. "Quick apply" skips the form entirely — sends profile + resume in one click

---

## 9. Time & Attendance (Clock In/Out)

### What exists today

- `team_shifts` stores scheduled shifts (date, start_time, end_time) but these are **planned** times, not actual hours worked
- No clock-in/clock-out mechanism
- No timesheet or hours-worked tracking

### Industry standard

Every HR/shift management app (Homebase, When I Work, Deputy, Workforce.com) includes:

- Employee clock-in/clock-out (mobile app, web, or kiosk)
- Actual vs scheduled time comparison
- Overtime alerts when approaching labor law limits
- Timesheet approval workflow (employee submits → manager approves)

### Proposed features

| Feature                            | Description                                                                                            | Priority |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| **`time_entries` table**           | employee_id, shift_id (nullable), clock_in, clock_out, total_hours, status (pending/approved/disputed) | High     |
| **Mobile clock-in/out**            | Worker taps "Clock In" from their schedule view. GPS optional.                                         | High     |
| **Timesheet view**                 | Weekly summary of actual hours worked, grouped by day                                                  | High     |
| **Manager approval**               | Manager reviews + approves timesheets before payroll export                                            | Medium   |
| **Overtime alerts**                | Warn when employee approaches 40hrs/week or local overtime threshold                                   | Medium   |
| **Actual vs scheduled comparison** | Dashboard showing late arrivals, early departures, no-shows                                            | Low      |

### Why this matters

Without time tracking, the schedule is just a plan. Employers need to know who actually showed up and for how long. This is table stakes for any shift-based workforce tool.

---

## 10. Leave & Time-Off Management (PTO)

### What exists today

- Nothing. No PTO tracking, no time-off requests, no accrual system.

### Industry standard

Employees can request time off, managers approve/deny, the system prevents scheduling conflicts with approved leave.

### Proposed features

| Feature                       | Description                                                                                               | Priority |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| **`time_off_requests` table** | employee_id, type (vacation/sick/personal), start_date, end_date, status (pending/approved/denied), notes | Medium   |
| **Request time off**          | Worker submits request from mobile/web                                                                    | Medium   |
| **Manager approval**          | Notification + approve/deny workflow                                                                      | Medium   |
| **Schedule integration**      | Approved time off blocks that date on the WeekScheduleGrid                                                | Medium   |
| **PTO balance tracking**      | Optional: accrual rules (X days/month), remaining balance display                                         | Low      |

---

## 11. Employee Self-Service Portal

### What exists today

- Workers can view their own applications and manage their job search
- No "my employment" view — a worker who has been hired and scheduled can't see their shifts from their own perspective (only the employer sees the WeekScheduleGrid)

### Industry standard

Employee self-service portals let workers: view their schedule, clock in/out, request time off, update personal info, download pay stubs, and access company policies — all without contacting HR.

### Proposed features

| Feature                       | Description                                                                      | Priority |
| ----------------------------- | -------------------------------------------------------------------------------- | -------- |
| **My Schedule view**          | `/my-schedule` — worker sees their own shifts across all companies they work for | High     |
| **Shift swap/trade requests** | Worker requests to swap a shift with a coworker, manager approves                | Medium   |
| **Open shift claiming**       | Employer posts an unfilled shift, available workers can claim it                 | Medium   |
| **Personal info management**  | Worker updates their own phone, email, emergency contact                         | Medium   |
| **Document access**           | Worker downloads their own onboarding docs, handbook, tax forms                  | Low      |

### Why critical

Right now the app is employer-centric for scheduling. A hired worker who logs in has no "employee dashboard" — they only see the job-seeker tools. We need a view that says "here are your upcoming shifts this week."

---

## 12. Notifications & Alerts

### What exists today

- In-app messaging system exists (encrypted messages between users)
- No push notifications, no email notifications, no schedule-change alerts

### Industry standard

Every scheduling app sends notifications for: new shift assigned, shift changed, shift cancelled, time-off request approved/denied, new message, upcoming shift reminder.

### Proposed features

| Feature                      | Description                                                                   | Priority |
| ---------------------------- | ----------------------------------------------------------------------------- | -------- |
| **Push notifications (PWA)** | Service worker push for shift reminders, schedule changes                     | High     |
| **Email notifications**      | Fallback for users who don't have push enabled                                | Medium   |
| **Notification preferences** | Per-user settings: what to notify about, which channel (push/email/both/none) | Medium   |
| **Shift reminder**           | "Your shift starts in 1 hour" push notification                               | Medium   |
| **Schedule change alert**    | "Your Tuesday shift was moved to Wednesday"                                   | Medium   |

### PWA advantage

The app already has service worker support for offline. Adding push notifications is a natural extension — no native app needed.

---

## 13. Schedule Printing & Export

### What exists today

- No `@media print` styles on the schedule grid
- No export-to-PDF button
- Ctrl+P renders interactive buttons, nav, drawers — unusable on paper
- Multi-page schedules (20+ employees) have no page-break logic

### Implemented (v1 — CSS print stylesheet)

- `@media print` in `globals.css`: hides nav, footer, buttons, drawers, mobile view
- Forces desktop table view for all screen sizes
- Adds company/week header visible only in print
- `page-break-inside: avoid` on table rows so employees don't split across pages
- Repeating table headers on each page via `thead { display: table-header-group }`

### Future enhancements

| Feature                  | Description                                                                                                 | Priority |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | -------- |
| **Export to PDF button** | Client-side PDF generation (html2canvas/jsPDF or server-side via Edge Function) for a polished, branded PDF | Medium   |
| **Print preview mode**   | In-app preview showing exactly what will print, with page-break indicators                                  | Low      |
| **Export to CSV/Excel**  | Download schedule data as spreadsheet for payroll integration                                               | Medium   |
| **Filtered print**       | Print only selected departments or date ranges                                                              | Low      |

---

## 14. Reporting & Analytics

### What exists today

- No reporting or analytics of any kind
- No dashboard metrics, no export capability

### Industry standard

Managers get dashboards showing: headcount, turnover rate, hours worked by department, overtime costs, hiring pipeline velocity, attendance patterns.

### Proposed features

| Feature                        | Description                                                                   | Priority |
| ------------------------------ | ----------------------------------------------------------------------------- | -------- |
| **Employer dashboard metrics** | Total team members, open positions, pending applications, shifts this week    | Medium   |
| **Hours worked report**        | Weekly/monthly hours per employee (requires time tracking)                    | Medium   |
| **Hiring funnel metrics**      | Applications received → screened → interviewed → hired, with conversion rates | Low      |
| **Export to CSV**              | Download any report as CSV for payroll systems or spreadsheets                | Medium   |
| **Attendance report**          | No-shows, late arrivals, patterns over time                                   | Low      |

---

## 15. Compliance & Labor Law

### What exists today

- Nothing. No overtime calculation, no break enforcement, no minor labor restrictions.

### Industry standard

HR apps include: overtime calculation (varies by state/country), mandatory break tracking, minor worker hour limits, labor law alerts.

### Proposed features

| Feature                 | Description                                                                                  | Priority |
| ----------------------- | -------------------------------------------------------------------------------------------- | -------- |
| **Overtime rules**      | Configurable per-company: 40hr/week threshold, daily OT rules                                | Low      |
| **Break enforcement**   | Flag shifts that don't include required breaks                                               | Low      |
| **Schedule validation** | Warn when scheduling violates labor rules (too many hours, insufficient rest between shifts) | Low      |

### Why low priority

SpokeToWork targets gig/bicycle workers and small businesses. Full compliance tooling is important but complex and jurisdiction-specific. Better to integrate with a payroll provider (Gusto, ADP) that handles compliance than to build it from scratch.

---

## Summary: Priority Order

### Phase 1 — Foundation (next sprint)

1. Company claiming flow (search → claim → `employer_company_links`)
2. Invite link generation + auto-link on sign-up
3. Industry taxonomy + company categorization
4. Resume upload + skills/trades on worker profile

### Phase 2 — Employee Experience

5. **My Schedule view** (worker sees their own shifts)
6. Public company profile page (`/company/[id]`)
7. Worker profile page (`/profile/[id]`)
8. **Time tracking (clock in/out)**
9. Industry/job type filters on map and company list

### Phase 3 — Marketplace

10. Open positions / job postings
11. Quick apply + auto-fill from profile
12. Employer application inbox (view + stage transitions)
13. Bulk employee import (CSV)
14. **Push notifications (PWA)**

### Phase 4 — Operations

15. Leave/PTO management
16. Timesheet approval workflow
17. Shift swap + open shift claiming
18. Verification workflow (admin review)
19. **Employer dashboard metrics + reporting**

### Phase 5 — Scale

20. Departments & department-scoped scheduling
21. Role-based permissions within a company
22. Overtime/compliance rules
23. Export to CSV / payroll integration
24. Applicant notifications
25. Application templates

---

## Existing Schema Anchors

These tables/columns already support the roadmap and should NOT be recreated:

| Table                    | Key Columns                                                  | Roadmap Relevance                                         |
| ------------------------ | ------------------------------------------------------------ | --------------------------------------------------------- |
| `shared_companies`       | `is_verified`                                                | Company verification tiers                                |
| `employer_company_links` | `user_id`, `shared_company_id`                               | Company claiming                                          |
| `team_members`           | `user_id` (nullable), `email`                                | Invite flow, auto-linking                                 |
| `team_shifts`            | `user_id` (nullable), `shift_date`, `start_time`, `end_time` | Scheduling + time tracking anchor                         |
| `user_profiles`          | `display_name`, `bio`, `avatar_url`                          | Worker profile expansion (add resume_url, skills)         |
| `job_applications`       | `status`, `outcome`, `position_title`                        | Pipeline stages already exist — need employer access RPCs |
| Supabase Storage         | (bucket)                                                     | Resume PDF/DOCX uploads                                   |
| Service Worker           | (existing PWA)                                               | Push notification foundation                              |
| Messaging system         | (encrypted)                                                  | Notification delivery channel                             |

---

## Industry Research Sources

- [18 must-have HR software features — TechTarget](https://www.techtarget.com/searchhrsoftware/tip/15-must-have-HR-software-features-and-system-requirements)
- [Best HRIS for Shift & Hourly Workforces — Workforce.com](https://workforce.com/buyers-guides/hris-software-shift-and-hourly-workforces)
- [Employee Self-Service Features — Workforce.com](https://workforce.com/software/employee-self-service)
- [HR Software for Small Business — Homebase](https://www.joinhomebase.com/blog/best-smb-hr-software)
- [HR Software Features for Small Businesses — OrangeHRM](https://www.orangehrm.com/en/resources/blog/hr-software-features-for-small-businesses)
- [Best Employee Scheduling Apps 2026 — Connecteam](https://connecteam.com/online-employee-scheduling-apps/)
