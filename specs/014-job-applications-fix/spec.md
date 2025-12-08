# Feature Specification: Job Applications and Data Quality Fix

**Feature Branch**: `014-job-applications-fix`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Fix broken job applications feature from Feature 012 multi-tenant migration"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Job Application for Shared Company (Priority: P1)

A job seeker wants to track their application to a company in the shared registry. They open the company detail view, click "Add Application", enter position details and application status, and save. The application appears in their job applications list and is linked to their user account.

**Why this priority**: Core functionality - users cannot track job applications at all without this working. The job applications table currently references a deleted table, making the entire feature non-functional.

**Independent Test**: Can be fully tested by adding an application to any shared company and verifying it appears in the user's applications list with correct data.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a shared company detail, **When** they click "Add Application" and fill out the form with position title and status, **Then** the application is saved and appears in their applications list
2. **Given** a user has created an application, **When** they view the company detail, **Then** they see their existing application(s) for that company
3. **Given** two different users, **When** both apply to the same shared company, **Then** each user sees only their own applications

---

### User Story 2 - View Contact Information (Priority: P1)

A job seeker needs to see contact details for a company to follow up on their application. They open the company detail drawer and see the contact name, title, phone number, and email address displayed clearly.

**Why this priority**: Essential for job search workflow - contact info was collected during data migration but is not displaying in the UI, making the data useless to users.

**Independent Test**: Can be fully tested by opening any company detail drawer and verifying contact fields (contact_name, contact_title, phone, email) display correctly when data exists.

**Acceptance Scenarios**:

1. **Given** a company with contact_name and contact_title in the database, **When** user opens company detail drawer, **Then** contact name and title display in the contact section
2. **Given** a company with phone and email in the database, **When** user opens company detail drawer, **Then** phone and email display as clickable links (tel: and mailto:)
3. **Given** a company with missing contact fields, **When** user opens company detail drawer, **Then** only available fields display without empty labels or placeholders

---

### User Story 3 - Create Job Application for Private Company (Priority: P2)

A job seeker wants to track their application to a company they created privately (not in the shared registry). They navigate to their private company, add an application, and it saves correctly.

**Why this priority**: Supports users who work with companies not in the shared registry. Lower priority since shared companies cover most use cases with 83 seeded companies.

**Independent Test**: Can be fully tested by creating a private company, then adding an application to it and verifying the application persists correctly.

**Acceptance Scenarios**:

1. **Given** a user with a private company, **When** they add an application to it, **Then** the application saves and links to the private company
2. **Given** a user with applications to both shared and private companies, **When** they view their applications list, **Then** both types appear correctly with company names

---

### User Story 4 - Accurate Priority Display (Priority: P2)

A job seeker sees companies with their correct priority levels (1-5) as originally set during data collection, not all defaulting to priority 3.

**Why this priority**: Affects user workflow - users prioritized companies during data collection (76 companies with contact info, varied priorities) and need accurate sorting/filtering.

**Independent Test**: Can be verified by checking that companies display varied priorities (1-5) matching the original backup data rather than all showing priority 3.

**Acceptance Scenarios**:

1. **Given** the seed data has been corrected, **When** a user views their company list, **Then** priorities vary between 1-5 rather than all being 3
2. **Given** a company with priority 1 in the original backup data, **When** displayed in the UI, **Then** it shows priority 1

---

### User Story 5 - Edit and Delete Applications (Priority: P3)

A job seeker needs to update application status (applied, interviewing, offered, rejected) or delete applications they no longer want to track.

**Why this priority**: Important for ongoing job search management, but users can work around initially by noting status changes elsewhere.

**Independent Test**: Can be tested by creating an application, editing its status, then deleting it and verifying removal.

**Acceptance Scenarios**:

1. **Given** an existing application, **When** user clicks edit and changes status from "applied" to "interviewing", **Then** the updated status persists after page refresh
2. **Given** an existing application, **When** user clicks delete and confirms, **Then** the application is removed from their list

---

### Edge Cases

- What happens when a user tries to create a duplicate application (same user, same company, same position)? System should allow it - users may apply multiple times to the same company for different positions or reapply over time.
- How does the system handle a shared company being deleted? Applications should cascade delete to prevent orphaned records.
- What happens if contact info is partially available? Display only available fields without showing empty labels, "N/A", or placeholder text.
- What if a user has no applications yet? Display an empty state with guidance on how to add their first application.
- What if a company has multiple locations? Contact info should come from the headquarters location (is_headquarters = true).
- What happens when user is offline (PWA context)? Job application operations should queue and sync when connection is restored, following existing offline-sync patterns.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create job applications linked to shared companies
- **FR-002**: System MUST allow users to create job applications linked to private companies
- **FR-003**: System MUST enforce that each application references exactly one company (either shared OR private, never both, never neither)
- **FR-004**: System MUST display contact information (contact_name, contact_title, phone as tel: link, email as mailto: link) in company detail view when available
- **FR-005**: System MUST allow users to edit their own job applications (position, status, notes)
- **FR-006**: System MUST allow users to delete their own job applications
- **FR-007**: System MUST ensure users can only see and modify their own applications (data isolation between users)
- **FR-008**: System MUST support multiple applications from the same user to the same company
- **FR-009**: System MUST display company priorities accurately from the original data (values 1-5, not defaulting to 3)
- **FR-010**: System MUST NOT contain any references to the deprecated `companies` table in active code paths

### Key Entities

- **Job Application**: Tracks a user's application to a company. Key attributes: position title, status (not_applied/applied/screening/interviewing/offer/closed), outcome (pending/hired/rejected/withdrawn/ghosted/offer_declined), application date, notes. Links to exactly one company (shared or private) and one user.
- **Shared Company**: Companies in the shared registry accessible to all users. Contact info stored separately in location records.
- **Private Company**: User-created companies not in shared registry, visible only to the creating user.
- **Company Location**: Physical location with contact details (contact_name, contact_title, phone, email). One company may have multiple locations with one marked as headquarters.
- **User Company Tracking**: Links users to shared companies with user-specific data including priority (1-5), status, and notes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create, view, edit, and delete job applications within 3 seconds per action under normal network conditions (latency <500ms)
- **SC-002**: Contact information displays for 100% of companies that have contact data stored in the database
- **SC-003**: Priority values in user tracking records match original backup data with 100% accuracy (varied 1-5, not uniformly 3)
- **SC-004**: Zero runtime errors occur when users interact with job application features
- **SC-005**: All existing automated tests pass after the fix is implemented
- **SC-006**: Multiple users can independently track applications at the same company without seeing each other's data
- **SC-007**: 100% of job application operations complete successfully (no foreign key violations or constraint errors)
