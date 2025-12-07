# Multi-Tenant Company Data Model

> Transform SpokeToWork from single-user to multi-tenant while enabling community-driven company data curation

---

## Problem Statement

The current SpokeToWork data model duplicates company data per user. If 100 users all apply to Amazon, there are 100 separate Amazon records in the database. This creates several problems:

1. **Data duplication** - Wasted storage and inconsistent data quality
2. **No community benefit** - Users can't benefit from each other's research
3. **No seed data** - New users start with empty company lists
4. **No multi-location support** - Companies with multiple offices need different contact info per location

The platform needs to evolve from a personal tool to a community-powered job search platform while maintaining user data privacy and ownership.

## User Profiles

### Job Seeker (Primary User)

- Individual conducting job search in a metro area
- Wants to track their personal application status and notes
- Benefits from seeing companies other users have discovered
- May contribute new companies or data corrections to the community

### Admin (Platform Operator)

- Reviews user contributions before adding to shared registry
- Curates seed data for new users by metro area
- Ensures data quality and prevents spam/abuse

## Core Concepts

### Shared vs. Private Data

| Data Type         | Owned By | Visibility       | Examples                               |
| ----------------- | -------- | ---------------- | -------------------------------------- |
| Shared Companies  | Platform | All users (read) | Amazon, Whirlpool, local hospitals     |
| Company Locations | Platform | All users (read) | Amazon CHA2 fulfillment center address |
| User Tracking     | User     | Owner only       | "Applied 2024-01-15, interviewing"     |
| Private Companies | User     | Owner only       | Companies not yet in shared registry   |
| Job Applications  | User     | Owner only       | Position, status, interview dates      |

### Metro Areas

- Geographic regions organizing company data (e.g., "Cleveland, TN", "Chattanooga, TN")
- Each metro area has a center point and radius
- New users select their metro area on signup to receive relevant seed data
- Private companies auto-assigned to nearest metro area via coordinates

### Soft Addition (Contribution Workflow)

The inverse of soft delete - data starts private and only becomes shared after admin approval:

```
User adds company → Private (immediate use)
                  ↓
User submits to community → Pending review
                  ↓
Admin reviews → Approved: Added to shared registry
              → Rejected: Stays private only
              → Merged: Linked to existing shared company
```

## Core Workflows

### 1. Viewing Companies

The user sees a unified list combining:

- Shared companies they're tracking (with their personal status/notes)
- Private companies they've added

**User Experience**:

- No visible distinction between shared and private in main view
- Badge indicator for "Community" companies vs "Private" companies
- Filter by metro area, status, priority

### 2. Adding a New Company

When a user adds a company:

1. System searches shared registry for name matches
2. If match found: "Similar company exists - track this one or add new?"
3. If user tracks existing: Creates `user_company_tracking` record
4. If user adds new: Creates `private_companies` record

**Match Scenarios**:

- Same company, same location → Track the existing one
- Same company, different location → Track existing but may need location-specific contact
- Different company, similar name → Create new private company

### 3. Contributing to Community

Users can submit their private companies to the shared registry:

**Submit New Company**:

1. User clicks "Submit to Community" on private company
2. Company info copied to `company_contributions` (pending)
3. Admin reviews: Approve, Reject, or Merge with existing
4. If approved: Company added to `shared_companies`, user's tracking updated to point to shared version

**Submit Data Update**:

1. User notices incorrect info on shared company (e.g., new HR contact)
2. User submits edit via `company_edit_suggestions`
3. Admin reviews: Approve (updates shared) or Reject (discarded)
4. User's personal overrides remain regardless of admin decision

### 4. Starting as a New User

1. User selects metro area during onboarding
2. System populates `user_company_tracking` from metro area's seed data
3. User has immediate list of companies to explore
4. User can add private companies or contribute back to community

### 5. Multi-Location Companies

**Scenario**: Amazon has fulfillment centers in multiple cities.

**Data Model**:

- One `shared_companies` record for "Amazon"
- Multiple `company_locations` records (CHA1, CHA2, etc.)
- User tracks specific location via `user_company_tracking.location_id`
- Each location can have different contact info (HR representative at that facility)

## Data Requirements

### Schema Design Principles

1. **Normalize shared data** - Company name/website/careers_url stored once
2. **Per-location details** - Address, phone, email can vary by location
3. **User-specific overrides** - Users can store their own contact_name/title per tracked company
4. **Audit trail** - Contributions and edits tracked for moderation

### Key Tables

| Table                      | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `metro_areas`              | City/region definitions with center coordinates                     |
| `shared_companies`         | Deduplicated company registry (name, website, careers_url)          |
| `company_locations`        | Physical locations per company (address, coordinates, phone, email) |
| `user_company_tracking`    | User's relationship to shared companies (status, priority, notes)   |
| `private_companies`        | User-owned companies not yet in shared registry                     |
| `company_contributions`    | New companies pending admin review                                  |
| `company_edit_suggestions` | Data updates pending admin review                                   |

### RLS (Row Level Security) Requirements

| Table                      | Policy                                 |
| -------------------------- | -------------------------------------- |
| `metro_areas`              | Public read                            |
| `shared_companies`         | Public read, admin write               |
| `company_locations`        | Public read, admin write               |
| `user_company_tracking`    | User owns their own rows               |
| `private_companies`        | User owns their own rows               |
| `company_contributions`    | User can insert, admin can read/update |
| `company_edit_suggestions` | User can insert, admin can read/update |

## User Interface Requirements

### Company List View

- Unified view of tracked (shared) + private companies
- Badge showing "Community" vs "Private" origin
- Quick-action: "Submit to Community" for private companies
- Filter by metro area (for admins viewing all data)

### Add Company Flow

1. Name input with auto-suggest from shared registry
2. "Match found" UI showing existing company with "Track this" button
3. "Add as new" option if no match or different location needed
4. Location fields with geocoding (address → coordinates)

### Contribution Review (Admin)

- Queue of pending contributions and edits
- Side-by-side comparison for edit suggestions
- Merge UI for duplicate detection
- Bulk approve/reject actions

### Metro Area Selection (Onboarding)

- Map-based or dropdown selection
- Shows count of companies per metro area
- Preview of seed data companies

## Migration Strategy

### Phase 1: Create New Tables (Non-Breaking)

- Add all new tables with RLS policies
- No changes to existing `companies` table

### Phase 2: Migrate Existing Data

- Create "Cleveland, TN" metro area
- Move 83 companies to `shared_companies` + `company_locations`
- Create `user_company_tracking` records for current user

### Phase 3: Update Application Queries

- Create unified view combining shared + private
- Update company service to use new model
- Update UI components

### Phase 4: Update Job Applications

- Add `tracking_id` and `private_company_id` columns
- Migrate existing `company_id` references
- Add validation (must have one or the other)

### Phase 5: Deprecate Old Model

- Remove `companies` table
- Update all remaining references

## Constraints

### Backward Compatibility

- Existing user's data must migrate seamlessly
- No data loss during transition
- Job applications continue working throughout migration

### Performance

- Unified view query must be efficient (< 100ms for 1000 companies)
- Metro area auto-assignment via PostGIS spatial queries
- Consider indexing strategies for frequent queries

### Scale

- Support 50+ metro areas eventually
- Support 10,000+ shared companies per metro area
- Support 100,000+ users with individual tracking records

## Success Criteria

1. **Data Deduplication**: Shared company registry eliminates per-user duplication
2. **User Experience**: Adding/tracking companies feels seamless
3. **Community Value**: Users benefit from each other's company research
4. **Data Quality**: Admin moderation maintains reliable shared data
5. **Migration Safety**: Zero data loss, no disruption to existing users
6. **Performance**: Page loads remain under 1 second

## Out of Scope (Future Considerations)

- User reputation/trust levels for contributions
- Automatic company data enrichment via APIs
- Cross-metro-area company linking
- Company verification badges
- Job posting aggregation from careers pages

## Glossary

- **Shared Company**: Company in the platform's curated registry, visible to all users
- **Private Company**: Company added by a user, visible only to them
- **User Tracking**: User's personal status/notes/priority for a company they're following
- **Metro Area**: Geographic region organizing company data and seed data
- **Contribution**: User submission of new company or data update for community
- **Soft Addition**: Pattern where data starts private and becomes shared after approval
- **Seed Data**: Pre-populated company list for new users based on metro area
