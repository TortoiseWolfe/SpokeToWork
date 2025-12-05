# Feature Specification: Company Management

**Feature Branch**: `011-company-management`
**Created**: 2025-12-04
**Status**: Draft
**Input**: User description: "Company Management - track companies with name, contact details, address, coordinates, status, priority, notes, and route assignment per the core PRP"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add a New Company (Priority: P1)

As a job seeker, I want to add a new company to my list so I can track it for future visits.

**Why this priority**: This is the foundational action - without the ability to add companies, nothing else works. This is the MVP.

**Independent Test**: Can be fully tested by adding a single company with all required fields and verifying it appears in the company list.

**Acceptance Scenarios**:

1. **Given** I am on the company management page, **When** I click "Add Company" and fill in company name, address, and contact details, **Then** the company is saved and appears in my list.
2. **Given** I am adding a company, **When** I leave required fields empty, **Then** I see validation errors indicating which fields are required.
3. **Given** I am adding a company, **When** I enter an address, **Then** the system attempts to geocode it and shows the coordinates (or prompts for manual entry if geocoding fails).

---

### User Story 2 - View and Filter Companies (Priority: P2)

As a job seeker, I want to view all my companies in a spreadsheet-like interface and filter/search them so I can quickly find specific companies.

**Why this priority**: Once companies exist, I need to be able to find and view them efficiently.

**Independent Test**: Can be tested by having multiple companies in the system and verifying filters by status, priority, and route assignment work correctly.

**Acceptance Scenarios**:

1. **Given** I have multiple companies saved, **When** I open the company management page, **Then** I see all companies in a table with sortable columns.
2. **Given** I have companies with different statuses, **When** I filter by "contacted", **Then** I only see companies with "contacted" status.
3. **Given** I have companies, **When** I search for a company name, **Then** only matching companies are shown.

---

### User Story 3 - Edit Company Information (Priority: P3)

As a job seeker, I want to edit an existing company's information so I can keep my data up to date.

**Why this priority**: After adding and viewing, editing is the next most common operation.

**Independent Test**: Can be tested by editing a company's fields and verifying the changes persist.

**Acceptance Scenarios**:

1. **Given** a company exists in my list, **When** I click to edit it and change the contact name, **Then** the change is saved and reflected in the company list.
2. **Given** I am editing a company, **When** I change the address, **Then** the system re-geocodes and updates coordinates.

---

### User Story 4 - Update Application Status (Priority: P4)

As a job seeker, I want to update a company's application status so I can track my progress through the job hunt workflow.

**Why this priority**: Status tracking is core to the job hunting workflow.

**Independent Test**: Can be tested by cycling a company through all status states.

**Acceptance Scenarios**:

1. **Given** a company with status "not contacted", **When** I update status to "contacted", **Then** the status change is saved with a timestamp.
2. **Given** I am updating status, **When** I select any valid status (not contacted → contacted → follow-up → meeting → outcome), **Then** the transition is allowed and saved.

---

### User Story 5 - Delete a Company (Priority: P5)

As a job seeker, I want to delete a company from my list so I can remove companies I'm no longer interested in.

**Why this priority**: Lower priority cleanup operation.

**Independent Test**: Can be tested by deleting a company and verifying it no longer appears.

**Acceptance Scenarios**:

1. **Given** a company exists in my list, **When** I click delete and confirm, **Then** the company is removed from my list.
2. **Given** I click delete, **When** confirmation dialog appears, **Then** I can cancel to keep the company.

---

### User Story 6 - Bulk Import Companies (Priority: P6)

As a job seeker, I want to import companies from a spreadsheet so I can quickly populate my list with existing data.

**Why this priority**: Convenience feature for users with existing data.

**Independent Test**: Can be tested by importing a CSV with multiple companies and verifying they appear correctly.

**Acceptance Scenarios**:

1. **Given** I have a CSV file with company data, **When** I upload it via the import feature, **Then** all valid companies are added to my list.
2. **Given** I import a CSV with invalid rows, **When** import completes, **Then** I see a report showing which rows failed and why.

---

### User Story 7 - Export Company Data (Priority: P7)

As a job seeker, I want to export my company data so I can back it up or share it.

**Why this priority**: Data portability and backup.

**Independent Test**: Can be tested by exporting data and verifying the file contains all company information.

**Acceptance Scenarios**:

1. **Given** I have companies in my list, **When** I click export, **Then** I download a CSV/JSON file with all company data.

---

### Edge Cases

- What happens when geocoding fails for an address? → Prompt for manual coordinate entry
- What happens when importing duplicate companies? → Warn user and allow skip/overwrite
- What happens when editing a company that's assigned to a route? → Allow edit, route assignment preserved
- How does system handle very long notes? → Allow up to 5000 characters
- What happens when coordinates are outside the 20-mile radius? → Mark as "extended range" and warn user
- What happens when offline edits conflict with server data on sync? → Prompt user to choose which version to keep (local vs server)
- What happens when exporting with zero companies? → Export produces file with headers only (CSV) or empty array (JSON)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store companies with: name (required), contact name, contact title, phone, email, website, physical address (required), latitude/longitude coordinates, application status, priority level (1-5, where 1=highest priority), notes, follow-up date, route assignment, active/inactive flag.
- **FR-002**: System MUST validate that company name and address are provided before saving.
- **FR-002a**: System MUST enforce uniqueness on (name + address) combination per user; duplicate entries prevented with validation error.
- **FR-003**: System MUST attempt automatic geocoding when an address is entered or modified, using Nominatim (OpenStreetMap) API with 1 req/sec rate limit and OSM attribution in footer.
- **FR-003a**: System MUST use the first geocoding result when multiple results are returned; user can verify/adjust on the map preview before saving.
- **FR-004**: System MUST allow manual coordinate entry when geocoding fails or for corrections.
- **FR-004a**: System MUST display geocoded coordinates on a map for visual verification before saving.
- **FR-005**: System MUST persist all company data to local storage (IndexedDB) for offline access.
- **FR-005a**: System MUST handle concurrent edits from multiple browser tabs using last-write-wins based on updated_at timestamp.
- **FR-005b**: System MUST queue delete operations made while offline and sync them when connection is restored.
- **FR-005c**: System MUST display sync conflict resolution in a modal dialog showing side-by-side comparison of local vs server versions with choice buttons.
- **FR-006**: System MUST support application status values: not contacted, contacted, follow-up, meeting, outcome (positive/negative).
- **FR-007**: System MUST support filtering companies by status, priority, route assignment, and active/inactive. Multiple filter selections use AND logic (e.g., status=contacted AND priority=1).
- **FR-007a**: System MUST display inactive companies with strikethrough text styling; they remain visible unless filtered out.
- **FR-008**: System MUST support sorting companies by any column (name, status, priority, date added, follow-up date).
- **FR-009**: System MUST support free-text search across company name, contact name, and notes. Search is case-insensitive substring matching.
- **FR-010**: System MUST support bulk import from CSV format with column mapping.
- **FR-010a**: System MUST limit bulk import to maximum 500 rows and 5MB file size.
- **FR-011**: System MUST support export to CSV and JSON formats.
- **FR-011a**: System MUST support export to GPX format for cycling/navigation app import.
- **FR-011b**: System MUST support printable field sheet export with company details, addresses, and notes for offline reference.
- **FR-012**: System MUST validate coordinates are within geographic bounds (default 20 miles from home, user-configurable 1-100 miles).
- **FR-012a**: System MUST allow user to set home address/coordinates in profile settings; this is required before distance validation can occur.
- **FR-012b**: System MUST provide a settings UI for home location with address geocoding and map preview.
- **FR-013**: System MUST track created/modified timestamps for each company.
- **FR-014**: System MUST display appropriate UI states: loading skeleton during data fetch, empty state with "Add your first company" prompt when no companies exist, error state with retry option on failures.
- **FR-015**: System MUST display extended range warning inline in the form (not modal) when coordinates exceed the configured distance threshold.

### Key Entities

- **Company**: The core entity representing a business the user intends to visit. Contains all contact information, location data, and tracking metadata. Single source of truth for company data.
- **ApplicationStatus**: Enumeration of status values tracking the job application workflow progression.
- **RouteAssignment**: Reference to which geographic cluster/route this company belongs to (to be implemented in Route Cluster feature).

## Clarifications

### Session 2025-12-04

- Q: Can a user have multiple companies with the same name? → A: Name + Address must be unique (same company at different locations allowed)
- Q: How should offline sync conflicts be resolved? → A: Prompt user to choose which version to keep
- Q: How is the user's home location defined for the 20-mile radius? → A: User sets home address in profile/settings (one-time setup)
- Q: Is there a maximum company limit per user? → A: No limit (IndexedDB can handle thousands)
- Q: Which geocoding service should be used? → A: Nominatim (OpenStreetMap) - free, no API key, requires OSM attribution
- Q: What does priority 1 vs 5 mean? → A: Priority 1 = Highest (visit first), Priority 5 = Lowest (industry standard convention)
- Q: What does active/inactive flag do? → A: Visibility filter - inactive companies remain visible with strikethrough text, filterable via active/inactive toggle

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: User can add a new company with all required fields in under 60 seconds.
- **SC-002**: User can find any company in a list of 100+ companies in under 10 seconds using search/filter.
- **SC-003**: Geocoding succeeds for 90%+ of valid US addresses automatically.
- **SC-004**: All company data persists correctly across browser sessions (no data loss).
- **SC-005**: Bulk import of 50 companies completes in under 30 seconds.
- **SC-006**: Export produces valid, re-importable files that round-trip without data loss.
