# Implementation Tasks: Company Management

**Feature**: 011-company-management
**Generated**: 2025-12-04
**Total Tasks**: 62
**User Stories**: 7 (P1-P7)

---

## Phase 1: Setup (Project Initialization)

### [X] T001 - Create TypeScript type definitions [P]

**File**: `src/types/company.ts`
**Story**: Setup (shared)
**Description**: Create all TypeScript interfaces and types for Company entity, ApplicationStatus enum, CompanyCreate, CompanyUpdate, CompanyFilters, CompanySort, and HomeLocation per data-model.md.

### [X] T002 - Add companies table to monolithic migration [P]

**File**: `supabase/migrations/20251006_complete_monolithic_setup.sql`
**Story**: Setup (shared)
**Description**: Add PART 11 (Company Management) to the monolithic migration file. Include companies table with all columns, constraints, indexes, RLS policies, and triggers per data-model.md. Add home location fields to user_profiles table.

### T003 - Execute schema via Supabase Management API

**File**: N/A (API call)
**Story**: Setup (shared)
**Depends**: T002
**Description**: Execute the new schema additions using the Supabase Management API with SUPABASE_ACCESS_TOKEN. Verify table creation and RLS policies are active.

### [X] T004 - Create service barrel export [P]

**File**: `src/lib/companies/index.ts`
**Story**: Setup (shared)
**Description**: Create barrel export file for the companies service module. Export all public interfaces and functions.

### T004a - Generate HomeLocationSettings component scaffold [P]

**File**: `src/components/organisms/HomeLocationSettings/`
**Story**: Setup (shared)
**Description**: Run `pnpm run generate:component` to create HomeLocationSettings with 5-file pattern.

### T004b - Implement HomeLocationSettings component

**File**: `src/components/organisms/HomeLocationSettings/HomeLocationSettings.tsx`
**Story**: Setup (shared)
**Depends**: T004a
**Description**: Implement home location settings form with:

- Address input field with geocoding
- Map preview showing home location (using CoordinateMap)
- Distance radius slider (1-100 miles, default 20)
- Save button persisting to user_profiles
- Validation for required home location before company distance checks

### T004c - Write HomeLocationSettings tests [P]

**File**: `src/components/organisms/HomeLocationSettings/HomeLocationSettings.test.tsx`
**Story**: Setup (shared)
**Description**: Write tests for HomeLocationSettings:

- Address geocoding triggers
- Map preview updates on geocode
- Radius slider updates value
- Save persists to profile

**⬛ CHECKPOINT: Setup complete. Database schema deployed, types defined, home location UI ready.**

---

## Phase 2: Foundational (Blocking Prerequisites)

### [X] T005 - Implement geocoding service with rate limiter

**File**: `src/lib/companies/geocoding.ts`
**Story**: Foundational
**Description**: Implement Nominatim geocoding client with:

- Rate limiter (1 req/sec queue)
- Address normalization
- Response parsing
- Error handling for API failures
- Haversine distance calculation function
  Per contracts/geocoding.md.

### [X] T006 - Write geocoding service tests

**File**: `src/lib/companies/geocoding.test.ts`
**Story**: Foundational
**Depends**: T005
**Description**: Write unit tests for geocoding service covering:

- Rate limiter queuing behavior
- Address normalization
- Successful geocode response parsing
- Error handling (network, not found, rate limit)
- Haversine distance calculation accuracy

### [X] T007 - Implement IndexedDB offline store

**File**: `src/lib/companies/offline-sync.ts`
**Story**: Foundational
**Depends**: T001
**Description**: Implement IndexedDB wrapper with:

- Database initialization (spoketowork-companies, v1)
- Object stores: companies, sync_queue, conflicts, geocode_cache
- CRUD operations for local storage
- Sync queue management
- Conflict detection logic
  Per contracts/offline-sync.md.

### [X] T008 - Write offline sync tests [P]

**File**: `src/lib/companies/offline-sync.test.ts`
**Story**: Foundational
**Description**: Write unit tests for offline sync covering:

- Database initialization
- Local CRUD operations
- Sync queue add/remove
- Conflict detection
- Version tracking
  Use fake-indexeddb for mocking.

### [X] T009 - Implement company service core

**File**: `src/lib/companies/company-service.ts`
**Story**: Foundational
**Depends**: T001, T005, T007
**Description**: Implement CompanyService class with:

- Constructor (Supabase client, offline store injection)
- Private methods for online/offline detection
- Geocode integration for address → coordinates
- Distance validation from home location
  Per contracts/company-service.md (core interface only, CRUD methods added per story).

### T010 - Write company service core tests

**File**: `src/lib/companies/company-service.test.ts`
**Story**: Foundational
**Depends**: T009
**Description**: Write unit tests for company service core:

- Service initialization
- Online/offline detection
- Geocode integration
- Distance validation logic
  Mock Supabase client and offline store.

### T010a - Generate CoordinateMap component scaffold [P]

**File**: `src/components/molecular/CoordinateMap/`
**Story**: Foundational
**Description**: Run `pnpm run generate:component` to create CoordinateMap with 5-file pattern.

### T010b - Implement CoordinateMap component

**File**: `src/components/molecular/CoordinateMap/CoordinateMap.tsx`
**Story**: Foundational
**Depends**: T010a
**Description**: Implement map component for coordinate verification (Constitution §VIII compliance):

- Leaflet map with OpenStreetMap tiles
- Marker at specified coordinates
- Click-to-update coordinates (for manual adjustment)
- Zoom controls
- Attribution for OSM
- Props: lat, lng, onCoordinateChange callback
- Responsive sizing

### T010c - Write CoordinateMap tests [P]

**File**: `src/components/molecular/CoordinateMap/CoordinateMap.test.tsx`
**Story**: Foundational
**Description**: Write tests for CoordinateMap:

- Renders map with marker at coordinates
- Click updates coordinates via callback
- Handles invalid coordinates gracefully

### T010d - Write CoordinateMap Storybook stories [P]

**File**: `src/components/molecular/CoordinateMap/CoordinateMap.stories.tsx`
**Story**: Foundational
**Description**: Create Storybook stories:

- Default (centered on coordinates)
- Interactive (click to move marker)
- With home location marker
- Loading state

**⬛ CHECKPOINT: Foundational services ready. Map component available. Can begin user story implementation.**

---

## Phase 3: User Story 1 - Add a New Company (P1 - MVP)

**Goal**: User can add a new company with all required fields
**Independent Test**: Add single company with all fields, verify it appears in list

### T011 - Add create method to company service

**File**: `src/lib/companies/company-service.ts`
**Story**: US1
**Description**: Implement `create(data: CompanyCreate): Promise<Company>` method:

- Validate required fields (name, address)
- Check uniqueness (name + address)
- Geocode address if coordinates not provided
- Validate coordinates against home location
- Save to Supabase (online) or IndexedDB (offline)
- Return complete Company object

### T012 - Write create method tests

**File**: `src/lib/companies/company-service.test.ts`
**Story**: US1
**Depends**: T011
**Description**: Add tests for create method:

- Successful creation with all fields
- Validation error for missing required fields
- Duplicate detection (name + address)
- Geocoding integration
- Extended range warning
- Offline queuing

### T013 - Generate CompanyForm component scaffold [P]

**File**: `src/components/organisms/CompanyForm/`
**Story**: US1
**Description**: Run `pnpm run generate:component` to create CompanyForm with 5-file pattern:

- index.tsx (barrel)
- CompanyForm.tsx (main)
- CompanyForm.test.tsx (unit)
- CompanyForm.stories.tsx (storybook)
- CompanyForm.accessibility.test.tsx (a11y)

### T014 - Implement CompanyForm component

**File**: `src/components/organisms/CompanyForm/CompanyForm.tsx`
**Story**: US1
**Depends**: T013, T010b
**Description**: Implement add company form with:

- All Company fields as inputs (DaisyUI form controls)
- Required field validation (name, address)
- Geocode button/auto-trigger on address blur
- CoordinateMap integration for visual verification (FR-004a)
- Manual coordinate entry fallback (click map to adjust)
- Extended range warning display
- Submit handler calling company service create
- Loading state during geocode/save
- Error display for validation failures

### T015 - Write CompanyForm tests [P]

**File**: `src/components/organisms/CompanyForm/CompanyForm.test.tsx`
**Story**: US1
**Description**: Write tests for CompanyForm:

- Form renders all fields
- Required field validation
- Submit calls service with correct data
- Loading state during submission
- Error display on failure

### T016 - Write CompanyForm Storybook stories [P]

**File**: `src/components/organisms/CompanyForm/CompanyForm.stories.tsx`
**Story**: US1
**Description**: Create Storybook stories:

- Default (empty form)
- With validation errors
- Loading state
- Geocoding in progress
- Extended range warning

### T017 - Write CompanyForm accessibility tests [P]

**File**: `src/components/organisms/CompanyForm/CompanyForm.accessibility.test.tsx`
**Story**: US1
**Description**: Write Pa11y accessibility tests:

- Form labels associated with inputs
- Error messages linked via aria-describedby
- Focus management after submit
- Keyboard navigation

### T018 - Create companies page with basic layout

**File**: `src/app/companies/page.tsx`
**Story**: US1
**Description**: Create protected companies page with:

- Auth check (redirect to sign-in if not authenticated)
- Page title and header
- "Add Company" button
- CompanyForm integration (modal or inline)
- Basic empty state message

### T019 - Add companies link to navigation [P]

**File**: `src/components/organisms/UnifiedSidebar/UnifiedSidebar.tsx`
**Story**: US1
**Description**: Add "Companies" link to the sidebar navigation. Icon: building or briefcase.

**⬛ CHECKPOINT: US1 Complete. User can add companies. MVP achieved.**

---

## Phase 4: User Story 2 - View and Filter Companies (P2)

**Goal**: User can view all companies in a table with filtering and search
**Independent Test**: With multiple companies, filters by status/priority work correctly

### T020 - Add getAll method to company service

**File**: `src/lib/companies/company-service.ts`
**Story**: US2
**Description**: Implement `getAll(filters?, sort?): Promise<Company[]>` method:

- Fetch from Supabase with RLS
- Apply filters (status, priority, route_id, is_active, search)
- Apply sorting
- Update IndexedDB cache
- Fallback to IndexedDB when offline

### T021 - Write getAll method tests

**File**: `src/lib/companies/company-service.test.ts`
**Story**: US2
**Depends**: T020
**Description**: Add tests for getAll method:

- Returns all companies for user
- Filter by status (single and multiple)
- Filter by priority
- Search across name, contact_name, notes
- Sorting by different columns
- Offline fallback

### T022 - Generate CompanyTable component scaffold [P]

**File**: `src/components/organisms/CompanyTable/`
**Story**: US2
**Description**: Run component generator for CompanyTable with 5-file pattern.

### T023 - Implement CompanyTable component

**File**: `src/components/organisms/CompanyTable/CompanyTable.tsx`
**Story**: US2
**Depends**: T022
**Description**: Implement company data grid with:

- DaisyUI table styling
- Sortable column headers
- CompanyRow rendering for each company
- Empty state message
- Loading skeleton
- Integration with CompanyFilters

### T024 - Generate CompanyRow component scaffold [P]

**File**: `src/components/molecular/CompanyRow/`
**Story**: US2
**Description**: Run component generator for CompanyRow with 5-file pattern.

### T025 - Implement CompanyRow component

**File**: `src/components/molecular/CompanyRow/CompanyRow.tsx`
**Story**: US2
**Depends**: T024
**Description**: Implement table row with:

- Company name, contact, status, priority display
- Status badge with color coding
- Priority indicator
- Extended range warning icon
- Action buttons (edit, delete, status change)

### T026 - Generate CompanyFilters component scaffold [P]

**File**: `src/components/molecular/CompanyFilters/`
**Story**: US2
**Description**: Run component generator for CompanyFilters with 5-file pattern.

### T027 - Implement CompanyFilters component

**File**: `src/components/molecular/CompanyFilters/CompanyFilters.tsx`
**Story**: US2
**Depends**: T026
**Description**: Implement filter controls:

- Status multi-select dropdown
- Priority multi-select dropdown
- Active/inactive toggle
- Search input with debounce
- Clear filters button
- Filter state management

### T028 - Write CompanyTable tests [P]

**File**: `src/components/organisms/CompanyTable/CompanyTable.test.tsx`
**Story**: US2
**Description**: Write tests:

- Renders company rows
- Sorting toggles direction
- Empty state displays
- Loading state displays

### T029 - Write CompanyFilters tests [P]

**File**: `src/components/molecular/CompanyFilters/CompanyFilters.test.tsx`
**Story**: US2
**Description**: Write tests:

- Filter selection updates state
- Search input debounces
- Clear filters resets all

### T030 - Integrate table and filters into companies page

**File**: `src/app/companies/page.tsx`
**Story**: US2
**Depends**: T023, T027
**Description**: Update companies page with:

- CompanyFilters above table
- CompanyTable with company data
- Filter state management
- Loading/error states

**⬛ CHECKPOINT: US2 Complete. User can view, filter, and search companies.**

---

## Phase 5: User Story 3 - Edit Company Information (P3)

**Goal**: User can edit an existing company's information
**Independent Test**: Edit company fields, verify changes persist

### T031 - Add update method to company service

**File**: `src/lib/companies/company-service.ts`
**Story**: US3
**Description**: Implement `update(data: CompanyUpdate): Promise<Company>` method:

- Validate company exists
- Re-geocode if address changed
- Update Supabase (online) or queue for sync (offline)
- Update IndexedDB mirror
- Return updated Company object

### T032 - Write update method tests

**File**: `src/lib/companies/company-service.test.ts`
**Story**: US3
**Depends**: T031
**Description**: Add tests for update method:

- Successful update
- Re-geocoding on address change
- Offline queuing
- Not found error

### T033 - Add edit mode to CompanyForm

**File**: `src/components/organisms/CompanyForm/CompanyForm.tsx`
**Story**: US3
**Description**: Extend CompanyForm to support edit mode:

- Accept optional `company` prop for pre-population
- Change submit button text (Add → Save)
- Call update method instead of create when editing
- Handle re-geocoding on address change

### T034 - Add edit action to CompanyRow

**File**: `src/components/molecular/CompanyRow/CompanyRow.tsx`
**Story**: US3
**Description**: Add edit button to row actions:

- Click opens CompanyForm in edit mode
- Pass company data to form

**⬛ CHECKPOINT: US3 Complete. User can edit companies.**

---

## Phase 6: User Story 4 - Update Application Status (P4)

**Goal**: User can update company status through the job hunt workflow
**Independent Test**: Cycle company through all status states

### T035 - Add quick status update to CompanyRow

**File**: `src/components/molecular/CompanyRow/CompanyRow.tsx`
**Story**: US4
**Description**: Add status dropdown/menu to row:

- Display current status with badge
- Dropdown to select new status
- Instant update via company service
- Status transition animation

### T036 - Write status update tests

**File**: `src/components/molecular/CompanyRow/CompanyRow.test.tsx`
**Story**: US4
**Description**: Write tests:

- Status dropdown renders all options
- Selection triggers update
- Updated status displays correctly

**⬛ CHECKPOINT: US4 Complete. User can track application status.**

---

## Phase 7: User Story 5 - Delete a Company (P5)

**Goal**: User can delete companies with confirmation
**Independent Test**: Delete company, verify it no longer appears

### T037 - Add delete method to company service

**File**: `src/lib/companies/company-service.ts`
**Story**: US5
**Description**: Implement `delete(id: string): Promise<void>` method:

- Delete from Supabase (online) or queue (offline)
- Remove from IndexedDB
- Handle pending sync items for deleted company

### T038 - Write delete method tests

**File**: `src/lib/companies/company-service.test.ts`
**Story**: US5
**Depends**: T037
**Description**: Add tests for delete method:

- Successful deletion
- Offline queuing
- Clears related sync queue items

### T039 - Add delete action with confirmation to CompanyRow

**File**: `src/components/molecular/CompanyRow/CompanyRow.tsx`
**Story**: US5
**Description**: Add delete button with confirmation:

- Click shows confirmation dialog (DaisyUI modal)
- Confirm triggers delete
- Cancel closes dialog
- Row removal animation

**⬛ CHECKPOINT: US5 Complete. User can delete companies.**

---

## Phase 8: User Story 6 - Bulk Import Companies (P6)

**Goal**: User can import companies from CSV
**Independent Test**: Import CSV with multiple companies, verify they appear

### T040 - Add importFromCSV method to company service

**File**: `src/lib/companies/company-service.ts`
**Story**: US6
**Description**: Implement `importFromCSV(file: File): Promise<ImportResult>` method:

- Parse CSV with column header detection
- Validate each row
- Geocode addresses with rate limiting
- Handle duplicates (skip with warning)
- Insert valid records
- Return summary with row-level errors

### T041 - Write import method tests

**File**: `src/lib/companies/company-service.test.ts`
**Story**: US6
**Depends**: T040
**Description**: Add tests for import method:

- Parse valid CSV
- Handle invalid rows
- Duplicate detection
- Geocoding queue integration
- Progress reporting

### T042 - Generate CompanyImport component scaffold [P]

**File**: `src/components/organisms/CompanyImport/`
**Story**: US6
**Description**: Run component generator for CompanyImport with 5-file pattern.

### T043 - Implement CompanyImport component

**File**: `src/components/organisms/CompanyImport/CompanyImport.tsx`
**Story**: US6
**Depends**: T042
**Description**: Implement import UI:

- File upload input (CSV only)
- Preview of parsed data (first 5 rows)
- Column mapping interface
- Import button
- Progress indicator
- Results summary (success/failed counts)
- Error details expandable

### T044 - Write CompanyImport tests [P]

**File**: `src/components/organisms/CompanyImport/CompanyImport.test.tsx`
**Story**: US6
**Description**: Write tests:

- File selection triggers preview
- Import button calls service
- Progress displays
- Results summary displays

**⬛ CHECKPOINT: US6 Complete. User can bulk import companies.**

---

## Phase 9: User Story 7 - Export Company Data (P7)

**Goal**: User can export company data to CSV/JSON/GPX and print field sheets
**Independent Test**: Export data in each format, verify files contain all companies

### T045 - Add export methods to company service

**File**: `src/lib/companies/company-service.ts`
**Story**: US7
**Description**: Implement export methods (Constitution §XI compliance):

- `exportToCSV(): Promise<Blob>` - CSV with all fields
- `exportToJSON(): Promise<Blob>` - JSON array of Company objects
- `exportToGPX(): Promise<Blob>` - GPX file with waypoints for cycling apps
- `exportToPrintable(): Promise<Blob>` - HTML/PDF field sheet with company details
- All use current filter state

### T046 - Write export method tests

**File**: `src/lib/companies/company-service.test.ts`
**Story**: US7
**Depends**: T045
**Description**: Add tests for export methods:

- CSV format correct
- JSON format correct
- GPX format valid (XML schema)
- Printable HTML contains all company details
- All companies included in each format
- Round-trip with import (CSV/JSON)

### T047 - Generate CompanyExport component scaffold [P]

**File**: `src/components/molecular/CompanyExport/`
**Story**: US7
**Description**: Run component generator for CompanyExport with 5-file pattern.

### T048 - Implement CompanyExport component

**File**: `src/components/molecular/CompanyExport/CompanyExport.tsx`
**Story**: US7
**Depends**: T047
**Description**: Implement export buttons (Constitution §XI compliance):

- "Export CSV" button
- "Export JSON" button
- "Export GPX" button (for cycling/navigation apps)
- "Print Field Sheet" button (opens printable view)
- Trigger download on click
- File naming with timestamp
- Dropdown menu or button group for format selection

### T049 - Write CompanyExport tests [P]

**File**: `src/components/molecular/CompanyExport/CompanyExport.test.tsx`
**Story**: US7
**Description**: Write tests:

- CSV button triggers download
- JSON button triggers download
- GPX button triggers download
- Print button opens printable view
- All formats available in dropdown/menu

**⬛ CHECKPOINT: US7 Complete. User can export company data.**

---

## Phase 10: Polish & Cross-Cutting Concerns

### T050 - Add OSM attribution to footer

**File**: `src/components/Footer.tsx`
**Story**: Polish
**Description**: Add OpenStreetMap attribution link per Nominatim terms of service:

```tsx
<a href="https://www.openstreetmap.org/copyright">Geocoding by OpenStreetMap</a>
```

### T051 - Implement sync conflict resolver

**File**: `src/components/organisms/ConflictResolver/`
**Story**: Polish
**Description**: Generate and implement ConflictResolver component:

- Display pending conflicts
- Show local vs server version diff
- "Keep Local" / "Keep Server" buttons
- Clear conflict on resolution

### T052 - Wire up offline sync on network events

**File**: `src/app/companies/page.tsx`
**Story**: Polish
**Description**: Add network event listeners:

- On 'online' event: trigger sync
- Display sync status indicator
- Show conflict count badge if any

**⬛ CHECKPOINT: Feature complete. All user stories implemented.**

---

## Dependencies

```
T001 ─┬─► T007 ─► T009 ─┬─► T011 (US1)
      │                 ├─► T020 (US2)
T002 ─► T003            ├─► T031 (US3)
                        ├─► T037 (US5)
T005 ─► T006            ├─► T040 (US6)
    └─► T009            └─► T045 (US7)

T004a ─► T004b (HomeLocationSettings)
T010a ─► T010b (CoordinateMap)

T010b ─► T014 (CompanyForm needs map)

US1 (T011-T019) ─► US2 (T020-T030) ─► US3 (T031-T034) ─► US4-US7 [parallel]
```

## Parallel Execution Opportunities

**Setup Phase** (T001-T004c):

- T001 (types) || T002 (schema) || T004 (barrel) || T004a (HomeLocationSettings scaffold)
- T003 depends on T002
- T004b depends on T004a

**Foundational Phase** (T005-T010d):

- T005 (geocoding) || T007 (offline-sync) || T010a (CoordinateMap scaffold) can start together
- T006 depends on T005; T008 depends on T007
- T010b depends on T010a; T010c/T010d depend on T010b

**Per User Story**:

- Component scaffold generation [P]
- Tests and stories [P] after implementation
- Accessibility tests [P] with unit tests

## Implementation Strategy

**MVP Scope**: Complete Phase 1-3 (Setup + Foundation + US1)

- User can set home location
- User can add companies with geocoding + map verification
- Data persists in Supabase + IndexedDB
- This alone is valuable and testable

**Incremental Delivery**:

1. MVP: US1 (Add Company + Home Settings + Map) - ~3 days
2. Core: US2 (View/Filter) + US3 (Edit) - ~2 days
3. Workflow: US4 (Status) + US5 (Delete) - ~1 day
4. Data: US6 (Import) + US7 (Export with GPX/Print) - ~3 days
5. Polish: Conflict resolver, sync - ~1 day

**Total Estimate**: ~10 days implementation time
