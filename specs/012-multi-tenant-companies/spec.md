# Feature Specification: Multi-Tenant Company Data Model

**Feature Branch**: `012-multi-tenant-companies`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "Multi-Tenant Company Data Model - Transform from single-user to multi-tenant with shared company registry, user-specific tracking, metro area organization, and moderated community contributions per the PRP at docs/prp-docs/012-multi-tenant-companies-prp.md"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Unified Company List (Priority: P1)

As a job seeker, I want to see all companies I'm tracking in one unified list, whether they come from the shared registry or are my private additions, so I can manage my job search efficiently.

**Why this priority**: This is the core read path - users must be able to view their companies before any other interaction. Without this, the application is unusable.

**Independent Test**: Can be fully tested by logging in and viewing the companies page, which should display both shared companies the user is tracking and private companies they've added.

**Acceptance Scenarios**:

1. **Given** I am a logged-in user with tracked shared companies and private companies, **When** I view the companies page, **Then** I see a unified list containing both types with no visible distinction in the main view
2. **Given** I am a logged-in user, **When** I view the companies page, **Then** I see a badge indicating "Community" vs "Private" origin for each company
3. **Given** I am a new user with no companies, **When** I view the companies page, **Then** I see an empty state with option to add companies or browse seed data

---

### User Story 2 - Add Company with Match Detection (Priority: P1)

As a job seeker, I want the system to detect when I'm adding a company that already exists in the shared registry, so I can choose to track the existing one instead of creating a duplicate.

**Why this priority**: This is the core write path and the primary mechanism for preventing data duplication. Essential for the multi-tenant model to work.

**Independent Test**: Can be fully tested by attempting to add "Amazon" when Amazon exists in shared_companies, and verifying the match suggestion appears.

**Acceptance Scenarios**:

1. **Given** "Amazon" exists in shared_companies, **When** I type "Amazon" in the company name field, **Then** I see a suggestion "Similar company exists: Amazon - Track this one?"
2. **Given** I see a match suggestion, **When** I click "Track this one", **Then** a user_company_tracking record is created and I can set my personal status/notes
3. **Given** I see a match suggestion for "Amazon CHA1", **When** I want to track "Amazon CHA2" (different location), **Then** I can click "Add as new location" to create a separate tracking record
4. **Given** no match exists in shared_companies, **When** I submit a new company, **Then** a private_companies record is created with my user_id
5. **Given** I am typing a company name, **When** the match detection query is running, **Then** I see a loading indicator (spinner) next to the input field

---

### User Story 3 - Track Personal Status Per Company (Priority: P1)

As a job seeker, I want to maintain my own application status, priority, and notes for each company I'm tracking, independent of other users.

**Why this priority**: Core user data isolation requirement. Each user's job search progress must be private and independent.

**Independent Test**: Can be fully tested by updating status on a shared company and verifying other users' views are unaffected.

**Acceptance Scenarios**:

1. **Given** I am tracking "Whirlpool" from the shared registry, **When** I change status to "interviewed", **Then** only my tracking record is updated
2. **Given** another user is also tracking "Whirlpool", **When** I mark it as "inactive", **Then** their tracking record still shows it as active
3. **Given** I am tracking a company, **When** I add personal notes like "HR contact: Jane Doe", **Then** those notes are only visible to me

---

### User Story 4 - Receive Seed Data on Signup (Priority: P2)

As a new user, I want to receive a starter list of companies in my metro area when I sign up, so I can begin my job search immediately.

**Why this priority**: Reduces new user friction and demonstrates platform value immediately. Not P1 because existing users don't need this.

**Independent Test**: Can be fully tested by creating a new account, selecting "Cleveland, TN" metro area, and verifying pre-populated company tracking records.

**Acceptance Scenarios**:

1. **Given** I am signing up for a new account, **When** I select my metro area, **Then** I see a preview of companies that will be added to my tracking list
2. **Given** I complete signup with "Cleveland, TN" metro area, **When** I view my companies page, **Then** I see the seed data companies from that metro area
3. **Given** seed data is loaded, **When** I view a seeded company, **Then** I can modify my personal status/notes without affecting the seed data

---

### User Story 5 - Submit Company to Community (Priority: P2)

As a job seeker, I want to submit my private companies to the community registry for admin review, so other users can benefit from my research.

**Why this priority**: Enables community growth and crowdsourcing. Important for platform value but not essential for individual job search.

**Independent Test**: Can be fully tested by clicking "Submit to Community" on a private company and verifying a contribution record is created.

**Acceptance Scenarios**:

1. **Given** I have a private company "Local Tech Co", **When** I click "Submit to Community", **Then** a company_contributions record is created with status "pending"
2. **Given** I submitted a company, **When** I view that company, **Then** I see a badge indicating "Pending review"
3. **Given** admin approves my contribution, **When** I view that company, **Then** it now shows as "Community" and my tracking points to the shared record
4. **Given** admin reviews my contribution (approve/reject), **When** I next view the companies page, **Then** I see the updated status (no real-time notification required; status visible on next page load)

---

### User Story 6 - Submit Data Correction (Priority: P3)

As a job seeker, I want to suggest corrections to shared company data (e.g., new HR contact), so the community benefits from updated information.

**Why this priority**: Enables data quality maintenance. Lower priority because initial data is curated and corrections are less frequent.

**Independent Test**: Can be fully tested by clicking "Suggest Edit" on a shared company, submitting new contact info, and verifying an edit_suggestion record is created.

**Acceptance Scenarios**:

1. **Given** I'm viewing shared company "Whirlpool", **When** I click "Suggest Edit" and enter new contact info, **Then** a company_edit_suggestions record is created
2. **Given** I submitted an edit suggestion, **When** admin approves it, **Then** the shared company record is updated
3. **Given** I submitted an edit suggestion, **When** admin rejects it, **Then** my personal notes/overrides remain unchanged

---

### User Story 7 - Admin Reviews Contributions (Priority: P3)

As an admin, I want to review and moderate user contributions before they appear in the shared registry, so data quality is maintained.

**Why this priority**: Essential for moderation but secondary to user-facing features. Platform can function initially with admin-only seeding.

**Independent Test**: Can be fully tested by logging in as admin, viewing contribution queue, and approving/rejecting items.

**Acceptance Scenarios**:

1. **Given** I am logged in as admin, **When** I view the moderation queue, **Then** I see all pending company_contributions and company_edit_suggestions
2. **Given** a company contribution is pending, **When** I approve it, **Then** it's added to shared_companies and the contributor's tracking is updated
3. **Given** a contribution is a duplicate, **When** I select "Merge with existing", **Then** the contributor's tracking is linked to the existing shared company

---

### Edge Cases

- What happens when a user adds a company with coordinates outside all metro areas? → Auto-inferred metro_area_id is NULL, company still functions
- What happens when two users submit the same company simultaneously? → Admin sees both in queue, can merge or approve one/reject other
- What happens when a shared company is deleted by admin? → User tracking records orphaned, should show "Company no longer available"
- How does system handle company name changes? → Shared company name is canonical, users see updated name
- What happens when user deletes their account? → private_companies deleted, user_company_tracking deleted, contributions remain (anonymized)
- What happens if migration fails mid-execution? → Rollback procedure: restore from backup JSON file, re-run monolithic SQL to recreate old schema; all migration steps wrapped in transaction for atomicity
- What happens if PostGIS/pg_trgm extensions are unavailable? → Migration fails early with clear error message; extensions are prerequisites that must be enabled before migration runs
- What happens during match detection if query times out? → Show "Unable to check for matches" message, allow user to proceed with creating private company

## Clarifications

### Session 2025-12-06

- Q: How should company matching work for duplicate detection? → A: Combined approach - fuzzy name match + location proximity (within 5 miles), with website domain match as additional confidence signal (same domain = likely same company, different location)
- Q: How should the system identify admin users for RLS policies? → A: Database flag - `is_admin` boolean column on user profile table (single admin expected for foreseeable future)
- Q: What migration approach for the 83 existing companies? → A: Big-bang cutover - single migration script, old table dropped after; backup file exists in repo root, monolithic SQL file maintained for recovery
- Q: Should we use PostGIS for spatial queries or simpler approach? → A: PostGIS ST_DWithin - full spatial queries; available on Supabase free tier (enable with `CREATE EXTENSION IF NOT EXISTS postgis`)
- Q: Which extension for fuzzy name matching? → A: pg_trgm with `similarity()` function, 0.3 threshold (enable with `CREATE EXTENSION IF NOT EXISTS pg_trgm`). Threshold is configurable via environment variable `MATCH_SIMILARITY_THRESHOLD` (default: 0.3)
- Q: How are confidence levels determined? → A: Confidence thresholds are: high (≥0.7 similarity OR domain match), medium (≥0.4 similarity), low (≥0.3 similarity). Multiple signals compound (e.g., 0.5 similarity + proximity = high)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST maintain a shared company registry (shared_companies) with public read access. Company names are unique per metro area (UNIQUE constraint on metro_area_id + name)
- **FR-002**: System MUST allow users to create private companies visible only to them
- **FR-003**: System MUST suggest matching companies from shared registry using: (1) fuzzy name similarity via pg_trgm `similarity()` >= 0.3, (2) location proximity within 5 miles via PostGIS, (3) website domain match as confidence boost
- **FR-004**: System MUST maintain user-specific tracking records (status, priority, notes) per company
- **FR-005**: System MUST organize companies by metro area with auto-inference from coordinates
- **FR-006**: System MUST populate new user accounts with seed data based on selected metro area
- **FR-007**: System MUST allow users to submit private companies for community review
- **FR-008**: System MUST allow users to suggest edits to shared company data. Editable fields: phone, email, contact_name, website, careers_url. Location edits (address, coordinates) require new location submission via FR-007
- **FR-009**: System MUST provide admin moderation queue for contributions and edits
- **FR-010**: System MUST maintain RLS policies isolating user data (tracking, private companies)
- **FR-010a**: System MUST identify admins via `is_admin` boolean on user profile; RLS policies grant admin write access to shared tables
- **FR-011**: System MUST support companies with multiple locations (company_locations table)
- **FR-012**: System MUST provide a unified view combining shared tracking + private companies; view inherits RLS from underlying tables (user sees only their tracking + private records)
- **FR-013**: System MUST preserve job_applications linkage during migration

### Key Entities

- **Metro Area**: Geographic region with center coordinates and radius; organizes companies for seed data distribution
- **Shared Company**: Deduplicated company record (name, website, careers_url) visible to all users; admin-managed
- **Company Location**: Physical address for a shared company; supports multi-location companies
- **User Company Tracking**: User's relationship to a shared company; contains personal status, priority, notes, contact overrides
- **Private Company**: User-owned company not yet in shared registry; full company data with auto-inferred metro area
- **Company Contribution**: Pending submission of private company to shared registry; awaiting admin review
- **Company Edit Suggestion**: Pending data correction for shared company; awaiting admin review
- **Job Application**: User's application to a specific position; links to either tracking or private company

## Testing Requirements _(mandatory)_

### Test-Driven Development

All implementation MUST follow TDD (RED-GREEN-REFACTOR cycle) per the project constitution:

1. **RED**: Write a failing test that defines the expected behavior
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Clean up code while keeping tests green

### Test Categories

| Category            | Scope                          | Tools                    |
| ------------------- | ------------------------------ | ------------------------ |
| Unit Tests          | Services, utilities, hooks     | Vitest                   |
| Integration Tests   | Database queries, RLS policies | Vitest + Supabase        |
| Component Tests     | React components with mocks    | Vitest + Testing Library |
| E2E Tests           | Full user flows                | Playwright               |
| Accessibility Tests | WCAG compliance                | Pa11y, axe-core          |

### Required Test Coverage

- **FR-001 to FR-013**: Each functional requirement must have corresponding tests
- **RLS Policies**: Integration tests verifying user isolation (user A cannot see user B's data)
- **Match Detection**: Unit tests for fuzzy matching, proximity calculation, confidence scoring
- **Migration**: Verification tests confirming data integrity post-migration
- **Unified View**: Tests confirming correct data aggregation from shared + private sources

### Test-First Implementation Order

For each user story:

1. Write acceptance test (E2E) - expect failure
2. Write integration tests for data layer - expect failure
3. Write unit tests for business logic - expect failure
4. Implement minimal code to pass unit tests
5. Implement data layer to pass integration tests
6. Verify E2E test passes
7. Refactor if needed, keeping all tests green

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Shared company data is not duplicated - each company appears once in shared_companies regardless of user count
- **SC-002**: Users can complete the add-company flow (with match detection) in under 30 seconds
- **SC-003**: New users see seed data companies within 5 seconds of completing signup
- **SC-004**: Page load for unified company list remains under 1 second with 1000 companies
- **SC-005**: Zero data loss during migration - all 83 existing companies preserved with tracking records
- **SC-006**: RLS policies verified - users cannot access other users' tracking records or private companies
- **SC-007**: Admin can process 10 contributions per minute through moderation queue
- **SC-008**: Metro area auto-inference correctly assigns companies within 50 miles of metro center
