# Feature Specification: Job Applications and Data Quality Fix

**Feature Branch**: `014-job-applications-fix`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Fix broken job applications feature from Feature 012 multi-tenant migration"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Job Application for Shared Company (Priority: P1)

A job seeker wants to track their application to a company in the shared registry. They open the company detail view, click "Add Application", enter position details, and save. The application appears in their job applications list and is linked to their user account.

**Why this priority**: Core functionality - users cannot track job applications at all without this working. This is the primary use case.

**Independent Test**: Can be fully tested by adding an application to any shared company and verifying it appears in the user's applications list.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a shared company detail, **When** they click "Add Application" and fill out the form, **Then** the application is saved and appears in their applications list
2. **Given** a user has created an application, **When** they view the company detail, **Then** they see their existing application(s) for that company
3. **Given** two different users, **When** both apply to the same shared company, **Then** each user sees only their own applications

---

### User Story 2 - View Contact Information (Priority: P1)

A job seeker needs to see contact details for a company to follow up on their application. They open the company detail drawer and see the contact name, title, phone number, and email address displayed clearly.

**Why this priority**: Essential for job search workflow - contact info was collected but is not displaying, making the data useless.

**Independent Test**: Can be fully tested by opening any company detail drawer and verifying contact fields display correctly.

**Acceptance Scenarios**:

1. **Given** a company with contact_name and contact_title in the database, **When** user opens company detail drawer, **Then** contact name and title display in the contact section
2. **Given** a company with phone and email in the database, **When** user opens company detail drawer, **Then** phone and email display as clickable links
3. **Given** a company with missing contact fields, **When** user opens company detail drawer, **Then** only available fields display (no empty labels)

---

### User Story 3 - Create Job Application for Private Company (Priority: P2)

A job seeker wants to track their application to a company they created privately (not in shared registry). They navigate to their private company, add an application, and it saves correctly.

**Why this priority**: Supports users who work with companies not in the shared registry, but lower priority since shared companies cover most use cases.

**Independent Test**: Can be fully tested by creating a private company, then adding an application to it.

**Acceptance Scenarios**:

1. **Given** a user with a private company, **When** they add an application to it, **Then** the application saves with private_company_id set
2. **Given** a user with applications to both shared and private companies, **When** they view their applications list, **Then** both types appear correctly

---

### User Story 4 - Accurate Priority Display (Priority: P2)

A job seeker sees companies with their correct priority levels (1-5) as originally set, not all defaulting to 3.

**Why this priority**: Affects user workflow - they prioritized companies during data collection and need accurate sorting.

**Independent Test**: Can be verified by checking that companies display varied priorities matching the backup data.

**Acceptance Scenarios**:

1. **Given** the seed data import has run, **When** a user views their company list, **Then** priorities vary (1-5) rather than all being 3
2. **Given** a company with priority 1 in backup data, **When** displayed in the UI, **Then** it shows priority 1

---

### User Story 5 - Edit and Delete Applications (Priority: P3)

A job seeker needs to update application status (applied, interviewing, offered, rejected) or delete applications they no longer want to track.

**Why this priority**: Important for ongoing job search management, but users can work around by creating new applications initially.

**Independent Test**: Can be tested by creating an application, editing its status, then deleting it.

**Acceptance Scenarios**:

1. **Given** an existing application, **When** user clicks edit and changes status, **Then** the updated status persists
2. **Given** an existing application, **When** user clicks delete and confirms, **Then** the application is removed

---

### Edge Cases

- What happens when a user tries to create a duplicate application (same user, same company, same position)? System should allow it - users may apply multiple times.
- How does the system handle a shared company being deleted? Applications should cascade delete (ON DELETE CASCADE).
- What happens if contact info is partially available? Display only available fields without empty labels or "N/A".
- What if a user has no applications yet? Display empty state with guidance.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create job applications linked to shared companies
- **FR-002**: System MUST allow users to create job applications linked to private companies
- **FR-003**: System MUST enforce that each application references exactly one company (either shared OR private, not both, not neither)
- **FR-004**: System MUST display contact information (contact_name, contact_title, phone, email) in company detail view when available
- **FR-005**: System MUST allow users to edit their own job applications
- **FR-006**: System MUST allow users to delete their own job applications
- **FR-007**: System MUST ensure users can only see and modify their own applications (RLS enforcement)
- **FR-008**: System MUST support multiple applications from the same user to the same company
- **FR-009**: System MUST display company priorities accurately from the original data (not defaulting to 3)
- **FR-010**: System MUST NOT contain references to the deprecated `companies` table

### Key Entities

- **Job Application**: Tracks a user's application to a company, including position, status (applied/interviewing/offered/rejected), dates, and notes. Linked to either a shared_company or private_company.
- **Shared Company**: Companies in the shared registry, with contact info stored in company_locations table
- **Private Company**: User-created companies not in shared registry
- **Company Location**: Physical location data including contact_name, contact_title, phone, email
- **User Company Tracking**: Links users to shared companies with user-specific data (priority, status, notes)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create, view, edit, and delete job applications within 5 seconds per action
- **SC-002**: Contact information displays for 100% of companies that have contact data in the database
- **SC-003**: Priority values in user_company_tracking accurately reflect backup data (varied 1-5, not all 3)
- **SC-004**: Zero runtime errors related to the deprecated companies table reference
- **SC-005**: All existing tests pass after migration
- **SC-006**: Multiple users can independently track applications at the same company without data leakage
