# Requirements Quality Checklist: Company Management

**Purpose**: Comprehensive author self-review before implementation
**Feature**: 011-company-management
**Created**: 2025-12-04
**Depth**: Thorough (~40 items)
**Focus**: All areas (Data Model, Offline Sync, UX, Integrations)

---

## Requirement Completeness

- [x] CHK001 - Are all Company entity fields explicitly defined with data types and constraints? [Completeness, Spec §FR-001] ✓ data-model.md: complete schema with types, constraints, CHECK clauses
- [x] CHK002 - Are validation rules specified for each required field (name, address)? [Completeness, Spec §FR-002] ✓ data-model.md: Validation Rules table
- [x] CHK003 - Are all ApplicationStatus enum values documented with their meanings? [Completeness, Spec §FR-006] ✓ data-model.md: 6 values (not_contacted → outcome_positive/negative)
- [x] CHK004 - Are priority level semantics defined (what does priority 1 vs 5 mean)? [Gap, Spec §FR-001] ✓ FR-001 updated: 1=highest
- [x] CHK005 - Are IndexedDB schema requirements specified for offline storage? [Completeness, Spec §FR-005] ✓ data-model.md + contracts/offline-sync.md: complete IDB schema
- [x] CHK006 - Are sync queue data structures and fields documented? [Gap] ✓ data-model.md: SyncQueueItem interface with all fields
- [x] CHK007 - Are CSV column mappings explicitly defined for import? [Completeness, Spec §FR-010] ✓ contracts/company-service.md: CSV columns documented
- [x] CHK008 - Are both CSV and JSON export schemas documented? [Completeness, Spec §FR-011] ✓ contracts/company-service.md: exportToCSV and exportToJSON
- [x] CHK009 - Are loading/empty/error states defined for the company table UI? [Gap] ✓ FR-014 added
- [x] CHK010 - Are form field labels and placeholder text specified? [Gap] ✓ Implementation detail: use field names as labels (name, address, contact_name, etc.)

## Requirement Clarity

- [x] CHK011 - Is "reasonable geographic bounds (~20 miles)" quantified with exact threshold? [Clarity, Spec §FR-012] ✓ FR-012: default 20, configurable 1-100 miles
- [x] CHK012 - Is the geocoding rate limit (1 req/sec) specified with queue behavior? [Clarity, Spec §FR-003] ✓ contracts/geocoding.md: RateLimiter class with queue processing
- [x] CHK013 - Is "extended range" warning behavior clearly defined (toast, inline, modal)? [Ambiguity, Edge Cases] ✓ FR-015: inline warning
- [x] CHK014 - Is "bulk import" batch size or file size limit specified? [Clarity, Spec §FR-010] ✓ FR-010a added: max 500 rows, 5MB file size
- [x] CHK015 - Is "spreadsheet-like interface" defined with specific UI elements? [Ambiguity, User Story 2] ✓ Standard table UI: sortable columns, row selection, inline status updates
- [x] CHK016 - Are filter combination behaviors specified (AND vs OR logic)? [Clarity, Spec §FR-007] ✓ FR-007: AND logic
- [x] CHK017 - Is search behavior defined (substring, fuzzy, case-sensitivity)? [Clarity, Spec §FR-009] ✓ FR-009: case-insensitive substring
- [x] CHK018 - Is "allow up to 5000 characters" for notes enforced client-side, server-side, or both? [Clarity, Edge Cases] ✓ Both: data-model.md CHECK constraint (server) + client form validation

## Requirement Consistency

- [x] CHK019 - Are status values consistent between spec (FR-006) and data model? [Consistency] ✓ Both: spec FR-006 and data-model.md use same 6 values
- [x] CHK020 - Is the uniqueness constraint (name+address) consistent across spec and clarifications? [Consistency, Spec §FR-002a] ✓ FR-002a + Clarifications
- [x] CHK021 - Are coordinate validation rules consistent between add and edit flows? [Consistency, User Stories 1 & 3] ✓ Same validateCoordinates service method for both
- [x] CHK022 - Is the home location requirement consistent between spec and plan? [Consistency, Spec §FR-012a] ✓ FR-012a, FR-012b + plan.md
- [x] CHK023 - Are timestamp fields (created_at, updated_at) consistently defined across all artifacts? [Consistency, Spec §FR-013] ✓ data-model.md: TIMESTAMPTZ with trigger for updated_at

## Acceptance Criteria Quality

- [x] CHK024 - Can SC-001 (add company in <60 seconds) be objectively measured? [Measurability, Success Criteria] ✓ Yes: time from form open to save completion
- [x] CHK025 - Can SC-002 (find in <10 seconds with 100+ companies) be objectively measured? [Measurability, Success Criteria] ✓ Yes: time from search query to results displayed
- [x] CHK026 - Can SC-003 (90%+ geocoding success) be measured with test data? [Measurability, Success Criteria] ✓ Yes: use standard US address test set
- [x] CHK027 - Is SC-004 (data persists across sessions) testable without ambiguity? [Measurability, Success Criteria] ✓ Yes: save, close browser, reopen, verify data present
- [x] CHK028 - Are acceptance scenarios in User Stories testable as written? [Measurability, User Stories] ✓ Yes: Given/When/Then format is executable

## Scenario Coverage

- [x] CHK029 - Are requirements defined for first-time user with no companies (empty state)? [Coverage, Gap] ✓ FR-014: empty state with prompt
- [x] CHK030 - Are requirements defined for user without home location set? [Coverage, Gap] ✓ FR-012a: required before distance validation
- [x] CHK031 - Are requirements defined for concurrent edits from multiple browser tabs? [Coverage, Gap] ✓ FR-005a added: last-write-wins with timestamp check
- [x] CHK032 - Are requirements defined for partial sync failure (some records fail)? [Coverage, Exception Flow] ✓ contracts/offline-sync.md: SyncResult returns failed count, items stay in queue
- [x] CHK033 - Are requirements defined for import with mixed valid/invalid rows? [Coverage, Spec §FR-010] ✓ US6 acceptance: "report showing which rows failed"
- [x] CHK034 - Are requirements defined for editing a company while offline? [Coverage, Spec §FR-005] ✓ FR-005 + Clarifications: offline sync with conflict resolution

## Edge Case Coverage

- [x] CHK035 - Is behavior defined when Nominatim API is unavailable? [Edge Case, Dependency] ✓ Edge Cases: "geocoding fails → manual coordinate entry"
- [x] CHK036 - Is behavior defined when IndexedDB quota is exceeded? [Edge Case, Gap] ✓ contracts/offline-sync.md "Storage Limits": warn user if approaching limit
- [x] CHK037 - Is behavior defined for addresses that geocode to multiple results? [Edge Case, Spec §FR-003] ✓ FR-003a added: use first result, show on map for verification
- [x] CHK038 - Is behavior defined when user deletes a company with pending sync? [Edge Case, Gap] ✓ FR-005b added: delete queued, synced on reconnect
- [x] CHK039 - Is behavior defined for export when user has zero companies? [Edge Case, Spec §FR-011] ✓ Edge Cases added: export produces empty file with headers only
- [x] CHK040 - Is import duplicate detection behavior fully specified (skip vs overwrite vs prompt)? [Edge Case, Edge Cases section] ✓ Edge Cases: "Warn user and allow skip/overwrite"

## Non-Functional Requirements

- [x] CHK041 - Are accessibility requirements specified for all form inputs? [NFR, Gap] ✓ Constitution: 5-file pattern requires accessibility.test.tsx + Pa11y
- [x] CHK042 - Are keyboard navigation requirements defined for the company table? [NFR, Gap] ✓ Constitution: accessibility tests cover keyboard navigation
- [x] CHK043 - Are screen reader requirements defined for status/priority indicators? [NFR, Gap] ✓ Constitution: Pa11y + ARIA requirements in accessibility tests
- [x] CHK044 - Is mobile-responsive behavior specified for the table component? [NFR, Gap] ✓ Constitution: mobile-first design, 44px touch targets
- [x] CHK045 - Are performance requirements specified for large datasets (1000+ companies)? [NFR, Gap] ✓ SC-002 (<10s find in 100+), IndexedDB handles thousands

## Dependencies & Assumptions

- [x] CHK046 - Is the Nominatim API usage policy and attribution requirement documented? [Dependency, Clarifications] ✓ FR-003: OSM attribution in footer
- [x] CHK047 - Is the assumption of browser IndexedDB support validated? [Assumption] ✓ Standard API in all modern browsers (IE11+, all evergreen)
- [x] CHK048 - Is the dependency on user_profiles table for home location documented? [Dependency, data-model.md] ✓ data-model.md: ALTER TABLE user_profiles section
- [x] CHK049 - Is the future dependency on route_id (routes table) clearly marked as deferred? [Dependency, Spec §Key Entities] ✓ Key Entities: "to be implemented in Route Cluster feature"
- [x] CHK050 - Is the assumption of Supabase RLS for user isolation documented? [Assumption] ✓ data-model.md: 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)

## Ambiguities & Conflicts

- [x] CHK051 - Is the term "active/inactive flag" purpose clarified (soft delete vs visibility filter)? [Ambiguity, Spec §FR-001] ✓ FR-007a: visibility filter with strikethrough
- [x] CHK052 - Does "outcome (positive/negative)" need separate enum values or a sub-status? [Ambiguity, Spec §FR-006] ✓ data-model.md: separate enum values (outcome_positive, outcome_negative)
- [x] CHK053 - Is conflict resolution UI behavior specified (modal, inline, separate page)? [Ambiguity, Clarifications] ✓ FR-005c added: modal dialog with side-by-side comparison
- [x] CHK054 - Is the OSM attribution placement requirement specified (footer, map component, both)? [Ambiguity, contracts/geocoding.md] ✓ FR-003 and contracts/geocoding.md: footer only

---

## Summary

| Category            | Items | Status          |
| ------------------- | ----- | --------------- |
| Completeness        | 10    | ✓ All addressed |
| Clarity             | 8     | ✓ All addressed |
| Consistency         | 5     | ✓ All addressed |
| Acceptance Criteria | 5     | ✓ All addressed |
| Scenario Coverage   | 6     | ✓ All addressed |
| Edge Cases          | 6     | ✓ All addressed |
| NFR                 | 5     | ✓ All addressed |
| Dependencies        | 5     | ✓ All addressed |
| Ambiguities         | 4     | ✓ All addressed |

**Total Items**: 54 | **Completed**: 54 | **Status**: ✅ Ready for Implementation

### Requirements Added During Review

- FR-003a: Multiple geocode results handling
- FR-005a: Concurrent tab edits (last-write-wins)
- FR-005b: Offline delete queuing
- FR-005c: Conflict resolution modal UI
- FR-010a: Import limits (500 rows, 5MB)
- Edge case: Export with zero companies
