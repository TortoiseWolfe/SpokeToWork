# Feature Specification: Bicycle Route Planning

**Feature Branch**: `041-bicycle-route-planning`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "bicycle route planning with cycling tiles, GreenWay overlays, start/end points defaulting to home address, company route associations, next ride planning checkbox, and saved routes management"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Save a Bicycle Route (Priority: P1)

As a job seeker who travels by bicycle, I want to create and save named routes with custom start and end points so I can plan efficient trips to visit multiple companies along familiar paths.

**Why this priority**: This is the foundational feature - without the ability to create and save routes, none of the other route-related functionality can work.

**Independent Test**: Can be fully tested by creating a new route, setting start/end points, and verifying the route persists after page refresh.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a home address configured, **When** they click "New Route", **Then** a route creation form appears with start and end points pre-filled with their home address
2. **Given** a user is creating a new route, **When** they enter a route name and save, **Then** the route is saved and appears in their route list
3. **Given** a user is editing route start/end points, **When** they enter a different address or click on the map, **Then** the point is updated with the new location
4. **Given** a user has saved routes, **When** they return to the application later, **Then** their saved routes are available and editable

---

### User Story 2 - Add Companies to Routes (Priority: P2)

As a job seeker, I want to associate companies with my routes so I can track which businesses are along each cycling path and plan my visits accordingly.

**Why this priority**: Routes become useful for job hunting only when companies can be associated with them. This builds on P1 to add core business value.

**Independent Test**: Can be tested by selecting an existing route and adding companies to it, then verifying they appear in the route's company list.

**Acceptance Scenarios**:

1. **Given** a user has a saved route, **When** they view a company in the company list, **Then** they can add that company to one or more routes
2. **Given** a company is on a route, **When** the user views the route details, **Then** they see all associated companies in sequence order
3. **Given** multiple companies are on a route, **When** the user drags to reorder them, **Then** the sequence is saved and persists
4. **Given** a company is on a route, **When** the user removes it, **Then** the company is no longer associated with that route

---

### User Story 3 - Mark Companies for Next Ride (Priority: P2)

As a job seeker planning my next cycling trip, I want to quickly mark which companies I intend to visit on my next ride so I can filter and focus on just those locations.

**Why this priority**: This provides immediate practical value for trip planning without requiring full route management.

**Independent Test**: Can be tested by toggling the "next ride" checkbox on several companies and verifying the filter shows only those companies.

**Acceptance Scenarios**:

1. **Given** a company in the company list, **When** the user clicks the "Next Ride" checkbox, **Then** the company is marked for the next ride
2. **Given** multiple companies are marked for next ride, **When** the user activates the "Next Ride" filter, **Then** only those companies are displayed
3. **Given** the map is visible with next-ride filter active, **When** viewing the map, **Then** only next-ride companies are highlighted
4. **Given** a company is marked for next ride, **When** the user unchecks it, **Then** it is removed from the next-ride list

---

### User Story 4 - View Cycling-Optimized Map (Priority: P3)

As a cyclist, I want to see the map with cycling-friendly tiles that show larger street labels and bike infrastructure so I can better plan my routes.

**Why this priority**: Improves usability but is not essential for core functionality. The default map tiles still work.

**Independent Test**: Can be tested by selecting a cycling tile provider and verifying the map displays with cycling-focused styling.

**Acceptance Scenarios**:

1. **Given** a user views the map, **When** they select "Cycling Map" from tile options, **Then** the map displays with cycling-optimized tiles showing bike lanes and larger street labels
2. **Given** the user has selected a tile preference, **When** they return later, **Then** their preference is remembered
3. **Given** no cycling tile provider is configured, **When** viewing the map, **Then** it falls back to standard tiles gracefully

---

### User Story 5 - View GreenWay and Trail Overlays (Priority: P3)

As a cyclist in the Cleveland area, I want to see the local GreenWay trail displayed on my map so I can plan routes that utilize dedicated cycling paths.

**Why this priority**: Provides local context but is specific to certain geographic areas. Core functionality works without it.

**Independent Test**: Can be tested by enabling the GreenWay overlay and verifying the trail path appears on the map.

**Acceptance Scenarios**:

1. **Given** a user views the map in the Cleveland metro area, **When** they enable trail overlays, **Then** the Cleveland/Bradley County GreenWay is displayed as a colored line
2. **Given** the GreenWay overlay is visible, **When** the user clicks on it, **Then** they see information about the trail (name, length, access points)
3. **Given** a user is creating a route, **When** they click on a GreenWay access point, **Then** they can use it as a start or end point

---

### User Story 6 - Draw Custom Route Path (Priority: P4)

As a job seeker, I want to draw the actual path I'll take between my start and end points so I can accurately track my planned route.

**Why this priority**: Nice-to-have enhancement. Routes work with just start/end points; full path drawing adds precision but complexity.

**Independent Test**: Can be tested by entering drawing mode, clicking waypoints on the map, and saving the resulting path.

**Acceptance Scenarios**:

1. **Given** a user is creating/editing a route, **When** they click "Draw Path", **Then** the map enters drawing mode
2. **Given** drawing mode is active, **When** the user clicks on the map, **Then** waypoints are added forming a path line
3. **Given** a path is drawn, **When** the user saves, **Then** the full path geometry is stored with the route
4. **Given** a route has a drawn path, **When** viewing it on the map, **Then** the complete path is displayed as a colored line

---

### Edge Cases

- What happens when a user tries to create a route without a home address configured? System prompts user to set home address first before creating routes.
- How does the system handle routes when associated companies are deleted? Company is automatically removed from route; route remains valid.
- What happens if the cycling tile provider is unavailable? System falls back to standard OpenStreetMap tiles.
- How are routes handled for users in areas without system trail data? Routes work without overlays; trail overlays only appear where data exists.
- What happens when a user's home address changes? Existing routes keep their original start/end points; only new routes use updated home address.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create named bicycle routes with a designated start point and end point
- **FR-002**: System MUST pre-fill new route start and end points with the user's configured home address
- **FR-003**: System MUST allow users to change start and end points by entering an address or clicking on the map
- **FR-004**: System MUST allow users to save, edit, and delete their routes
- **FR-005**: System MUST allow users to associate companies with routes, maintaining a sequence order
- **FR-006**: System MUST allow users to reorder companies within a route via drag-and-drop
- **FR-007**: System MUST provide a "Next Ride" toggle for each company-route association (stored per route-company pair in `route_companies.visit_on_next_ride`; a company can be marked for next ride on Route A but not Route B)
- **FR-008**: System MUST allow filtering the company list/map to show only "next ride" companies
- **FR-009**: System MUST allow users to select from available map tile providers, including cycling-optimized options
- **FR-010**: System MUST persist user's tile provider preference
- **FR-011**: System MUST display system-defined trail routes (like GreenWay) as overlays on the map when available for the user's area
- **FR-012**: System MUST store route path geometry when users draw a custom path
- **FR-013**: System MUST display saved routes as colored polylines on the map
- **FR-014**: System MUST allow only one route to be in "active planning" mode at a time
- **FR-015**: System MUST warn users at 80% of soft limits (16 routes, 40 companies per route) and enforce hard limits (50 routes, 100 companies per route)
- **FR-016**: System MUST support exporting route data in GPX, CSV, JSON, and printable (HTML) formats

### Key Entities

- **BicycleRoute**: A user-defined or system-defined cycling route with name, start point (address + coordinates), end point (address + coordinates), optional path geometry, color, and calculated distance
- **RouteCompany**: An association between a route and a company, with sequence order and "visit on next ride" flag
- **MapTileProvider**: Configuration for available map tile sources, including name, URL template, and cycling-optimized flag
- **ActiveRoutePlanning**: Tracks which route a user is currently planning/editing (one per user)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a new route with start/end points in under 60 seconds (measured from clicking "New Route" button to seeing "Route saved" confirmation)
- **SC-002**: Users can add a company to a route in under 3 clicks from the company list
- **SC-003**: Users can filter to see only "next ride" companies in under 2 clicks
- **SC-004**: Map tiles switch between standard and cycling views without page reload
- **SC-005**: Saved routes persist and load correctly across browser sessions
- **SC-006**: Route data (name, points, companies) can be exported for offline reference
- **SC-007**: System displays trail overlays within 2 seconds of map `load` event firing when GeoJSON data is available for user's metro area
- **SC-008**: Users can complete a full route planning workflow (create route, add 3 companies, mark for next ride) in under 5 minutes

## Clarifications

### Session 2025-12-08

- Q: Should there be limits on routes per user or companies per route? → A: Soft limits with warnings at 20 routes / 50 companies per route; hard limits at 50 routes / 100 companies per route; premium tier for higher limits possible in future.
- Q: What export format(s) should be supported for route data? → A: All four formats: GPX (cycling apps), CSV (spreadsheets), JSON (data backup), and printable format (paper handouts for the ride).

## Assumptions

- Users have already configured their home address in their profile (existing functionality from HomeLocationSettings)
- The Cleveland/Bradley County GreenWay coordinates are available from public data sources (user provided detailed trail info)
- Cycling tile providers (Thunderforest/OpenCycleMap) may require API keys which have usage limits on free tier
- Routes are private to each user (no sharing between users in this version)
- Distance calculations use the existing Haversine formula implementation from geocoding.ts
- The existing multi-tenant company system (shared + private companies) will be the source for route-company associations

---

## Technical Clarifications

### UI States

**Loading States**:

- Route list: Skeleton loader (3 placeholder items) while fetching routes
- Map components: Spinner overlay with "Loading map..." text during tile load
- Route details: Inline skeleton for route name, company count while loading

**Empty States**:

- No routes: "No routes yet. Create your first route to start planning!" with prominent "New Route" button
- No companies on route: "No companies added to this route. Add companies from the company list."
- No next-ride companies: "No companies marked for your next ride."

**Error States**:

- Route save failed: Toast notification "Failed to save route. Please try again." with retry button
- Route load failed: Inline error "Unable to load routes. Check your connection." with refresh link
- Tile provider failed: Silent fallback to OSM; no user-facing error unless all providers fail

### Validation Rules

**Route Name**:

- Minimum length: 1 character (required field)
- Maximum length: 100 characters (enforced by DB constraint)
- Allowed characters: All Unicode characters (no restrictions)
- Duplicate names: Allowed per user (routes distinguished by ID)
- Validation timing: On blur and on submit

**Route Color**:

- Format: 7-character hex string including # (e.g., "#3B82F6")
- Default: "#3B82F6" (blue) if not specified
- Predefined palette: 8 colors available in ROUTE_COLORS constant
- Custom colors: Allowed via color picker input

**Coordinates**:

- Latitude: -90 to 90, precision 8 decimal places
- Longitude: -180 to 180, precision 8 decimal places
- Invalid coordinates: Show "Invalid location" error, prevent save

### Sequence Order

- Company sequence uses **0-based indexing** in the database (`sequence_order` column)
- Display to users as **1-based** (Company 1, Company 2, etc.)
- New companies added to end of list (max existing sequence_order + 1)
- Reordering updates all affected sequence_order values atomically

### Concurrency

- **No concurrent editing prevention**: Last write wins (single-user feature)
- If same route edited in two tabs, last save overwrites previous
- Future enhancement: Optimistic locking with `updated_at` timestamp check

### Offline/PWA Behavior

- **Read operations**: Cached routes available offline via Service Worker
- **Write operations**: Require network connection; show "You're offline" if attempted
- **Map tiles**: Previously loaded tiles cached; unvisited areas show blank
- Future enhancement: Offline queue for route edits

### Bulk Operations

- **Delete multiple routes**: Not supported in v1 (single delete only)
- **Clear all next-ride**: Supported via "Clear All" button in NextRidePanel
- **Bulk add to route**: Not supported (add companies one at a time)

### Active Planning Mode

- **Definition**: One route at a time can be in "active planning" mode per user
- **Visual indicator**: Active route highlighted in sidebar with "Planning" badge
- **Behavior**: Active route receives new companies when "Add to Route" is clicked without route selection
- **Activation**: Click route in sidebar or start editing
- **Deactivation**: Click "Done Planning" or select different route

### Cycling-Optimized Tiles

Cycling tiles (OpenCycleMap/Thunderforest) provide:

- Bike lanes and cycle paths highlighted in distinct colors
- Street labels at larger font sizes than standard OSM
- Elevation shading for route planning
- Points of interest relevant to cyclists (bike shops, repair stations)

### Success Criteria Measurements

- **SC-002 "3 clicks"**: Measured from company row in table: (1) Open row menu, (2) Click "Add to Route", (3) Select route from dropdown
- **SC-003 "2 clicks"**: Measured from any page state: (1) Click filter dropdown, (2) Select "Next Ride Only"
- **SC-005 "correctly"**: Route name, color, start/end coordinates, and company associations all match after page refresh
- **SC-006 export**: Each format produces valid, downloadable file with all route data
- **SC-008 "full workflow"**: Create route (name + save) → Add 3 companies → Toggle next-ride on each

---

## User Flow Clarifications

### Route Creation Cancel/Abandon

- **Cancel button**: Discards unsaved changes, closes RouteBuilder modal
- **Click outside modal**: Same as cancel (discard and close)
- **Browser back**: Warns "Unsaved changes will be lost. Continue?" if route modified
- **No auto-save**: Routes only saved on explicit "Save" click

### Editing Route Membership

- To change which route a company belongs to:
  1. Remove from current route (click X in RouteCompanyList)
  2. Add to new route (from CompanyTable or CompanyDetailDrawer)
- A company can belong to multiple routes simultaneously

### Changing Route Color

- **During creation**: Select from color picker before saving
- **After creation**: Open route in RouteBuilder (edit mode), change color, save
- Color changes apply immediately to polyline on map after save

### Route Deletion Confirmation

- **Delete button**: Shows confirmation modal "Delete route '[name]'? This action cannot be undone."
- **Confirm**: Soft-deletes route (is_active = false), removes from list
- **Cancel**: Returns to route list without changes
- **Company associations**: Cascade deleted (removed from route_companies table)

### Start/Stop Planning Mode

- **Start planning**: Click route in sidebar → route becomes active, highlighted
- **Stop planning**: Click "Done Planning" button or select different route
- **Auto-stop**: Creating new route deactivates previous active route

---

## Additional Edge Cases

### Invalid/Malformed GeoJSON

- **On save**: Validate route_geometry is valid GeoJSON LineString before saving
- **Invalid format**: Show error "Invalid route path. Please redraw." reject save
- **On load**: If stored geometry is corrupted, route loads without path (start/end only)

### Geocoding Failures

- **Invalid address entry**: Show "Address not found. Try a different search." in address input
- **Fallback**: Allow user to click on map to set location manually
- **Partial match**: Show suggestions dropdown for ambiguous addresses

### Long Routes (>1000 waypoints)

- **Prevention**: Drawing tool stops accepting new waypoints at 1000
- **Warning**: At 900 waypoints, show "Approaching waypoint limit (1000 max)"
- **On load**: Routes with >1000 waypoints (from migration errors) render first 1000 only

### Hard Limit Mid-Operation

- **Creating route at limit**: "Save Route" disabled with message "Route limit reached (50/50)"
- **Adding company at limit**: "Add" disabled with message "Company limit reached for this route (100/100)"
- **Display**: Limit indicator always visible: "15 / 50 routes" in sidebar header

---

## Data Model Clarifications

### BicycleRoute Required Fields

| Field           | Type          | Required | Default           |
| --------------- | ------------- | -------- | ----------------- |
| id              | UUID          | Yes      | gen_random_uuid() |
| user_id         | UUID          | Yes      | auth.uid()        |
| name            | VARCHAR(100)  | Yes      | -                 |
| color           | VARCHAR(7)    | No       | '#3B82F6'         |
| start_latitude  | DECIMAL(10,8) | No       | NULL              |
| start_longitude | DECIMAL(11,8) | No       | NULL              |
| end_latitude    | DECIMAL(10,8) | No       | NULL              |
| end_longitude   | DECIMAL(11,8) | No       | NULL              |
| is_system_route | BOOLEAN       | Yes      | FALSE             |
| is_active       | BOOLEAN       | Yes      | TRUE              |

### RouteCompany Foreign Keys

- `route_id` → `bicycle_routes.id` (ON DELETE CASCADE)
- `user_id` → `auth.users.id` (ON DELETE CASCADE)
- `shared_company_id` → `shared_companies.id` (ON DELETE CASCADE, nullable)
- `private_company_id` → `private_companies.id` (ON DELETE CASCADE, nullable)
- **Constraint**: Exactly one of shared_company_id or private_company_id must be NOT NULL

### Route Name Uniqueness

- Route names are **NOT unique** (per user or globally)
- Users may have multiple routes with same name (distinguished by color, companies, ID)
- Future enhancement: Warn when creating route with duplicate name

### Soft Delete vs Hard Delete

- **Routes**: Soft delete (is_active = FALSE), data preserved for potential recovery
- **Route-company associations**: Hard delete (removed from table on removal)
- **System routes**: Cannot be deleted by users

### Cascade Behavior

- Delete route → All route_companies for that route deleted (CASCADE)
- Delete company → All route_companies referencing that company deleted (CASCADE)
- Route remains valid with 0 companies after cascade

---

## Integration Clarifications

### Thunderforest API

- **Rate limit**: 150,000 tiles/month on free tier
- **Key storage**: localStorage key `thunderforest_api_key` (user-provided)
- **Fallback**: If no key or rate limited, automatically switch to OSM tiles
- **Key validation**: Test tile request on key entry, show error if invalid

### HomeLocationSettings Integration

- **Component**: `/src/components/organisms/HomeLocationSettings/`
- **Data source**: `user_profiles.home_latitude`, `user_profiles.home_longitude`
- **Integration point**: RouteBuilder reads home coordinates on mount for pre-fill
- **Missing home**: RouteBuilder shows prompt linking to Settings page

### Multi-tenant Company Integration

- **Shared companies**: `shared_companies` table (global, all users can see)
- **Private companies**: `private_companies` table (user-specific)
- **Route association**: `route_companies` references via `shared_company_id` OR `private_company_id`
- **Company source**: Both shared and private companies can be added to routes

### CompanyFilters Integration

- **Component**: `/src/components/molecular/CompanyFilters/CompanyFilters.tsx`
- **New filter**: Add "Route" dropdown after existing filters
- **Options**: "All Routes", "No Route", list of user's routes, "Next Ride Only"
- **Filter logic**: Filter company list based on route_companies associations

---

## Export Format Specifications

### GPX Export

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SpokeToWork">
  <trk>
    <name>Route Name</name>
    <trkseg>
      <trkpt lat="35.1667" lon="-84.8667">
        <name>Start: Home</name>
      </trkpt>
      <!-- waypoints from route_geometry -->
      <trkpt lat="35.1333" lon="-84.8833">
        <name>End: Home</name>
      </trkpt>
    </trkseg>
  </trk>
  <wpt lat="35.15" lon="-84.87">
    <name>Company Name</name>
    <desc>123 Main St</desc>
  </wpt>
</gpx>
```

### CSV Export

| Column       | Description              |
| ------------ | ------------------------ |
| route_name   | Name of the route        |
| company_name | Company name             |
| address      | Company address          |
| latitude     | Company latitude         |
| longitude    | Company longitude        |
| sequence     | Order in route (1-based) |
| next_ride    | TRUE/FALSE               |

### JSON Export

```json
{
  "route": {
    "id": "uuid",
    "name": "Route Name",
    "color": "#3B82F6",
    "start": { "address": "...", "lat": 35.1667, "lng": -84.8667 },
    "end": { "address": "...", "lat": 35.1333, "lng": -84.8833 },
    "geometry": { "type": "LineString", "coordinates": [...] },
    "distance_miles": 4.2
  },
  "companies": [
    { "name": "...", "address": "...", "lat": ..., "lng": ..., "sequence": 1, "next_ride": true }
  ],
  "exported_at": "2025-12-08T12:00:00Z"
}
```

### HTML/Print Export

- **Page size**: Letter (8.5" x 11"), portrait orientation
- **Content**:
  - Header: Route name, date, total distance
  - Static map thumbnail (600x400px) showing route path
  - Company list table with sequence, name, address
  - Next-ride companies highlighted
- **Filename pattern**: `{route_name}_{YYYY-MM-DD}.{format}`

---

## Accessibility Requirements

### Keyboard Navigation

- **Drag-and-drop reorder**: Tab to focus item, Ctrl+Up/Down to move, Enter to confirm
- **Route list**: Arrow keys to navigate, Enter to select, Delete to remove
- **Map controls**: Tab through controls, Enter/Space to activate
- **Modal dialogs**: Focus trapped, Escape to close

### Screen Reader Announcements

- Route created: "Route [name] created successfully"
- Company added: "Company [name] added to route at position [n]"
- Company reordered: "[Company name] moved to position [n]"
- Filter applied: "Showing [n] companies matching [filter]"

### Color Contrast

- Route polylines: Minimum 4.5:1 contrast against map background
- Route colors: All 8 predefined colors meet WCAG AA contrast
- Text on colored backgrounds: White or black auto-selected for contrast

### Focus Management

- Modal open: Focus moves to first interactive element
- Modal close: Focus returns to triggering element
- Route delete: Focus moves to next route in list (or "New Route" if last)

### ARIA Requirements

- Route list: `role="listbox"`, items have `role="option"`
- Company reorder list: `aria-label="Reorder companies"`, items have `aria-grabbed`
- Filter dropdowns: `aria-expanded`, `aria-haspopup="listbox"`
- Loading states: `aria-busy="true"`, `aria-live="polite"` for updates

---

## Performance Requirements

### Map Performance

- **Initial load**: Map interactive within 2 seconds on 3G connection
- **Measurement**: From `DOMContentLoaded` to map `load` event
- **Tile caching**: Browser cache + Service Worker cache for offline

### Route Operations

| Operation       | Target | Measurement                      |
| --------------- | ------ | -------------------------------- |
| Create route    | <500ms | Click save to confirmation toast |
| Load route list | <300ms | API response time                |
| Add company     | <200ms | Click to UI update               |
| Reorder         | <100ms | Drop to visual update            |
| Delete route    | <500ms | Confirm to removal from list     |

### Slow Network Handling

- **Timeout**: 10 second timeout for API calls, show error on timeout
- **Retry**: Automatic retry (1x) for failed GET requests
- **Offline detection**: Check `navigator.onLine`, show offline banner if false

---

## Security Requirements

### Row-Level Security (RLS)

- **SELECT**: `user_id = auth.uid() OR is_system_route = TRUE`
- **INSERT**: `auth.uid() = user_id AND is_system_route = FALSE`
- **UPDATE**: `auth.uid() = user_id AND is_system_route = FALSE`
- **DELETE**: `auth.uid() = user_id AND is_system_route = FALSE`

### Privacy Model

- Routes are **private by default** (only visible to owner)
- System routes (is_system_route = TRUE) visible to all users in metro area
- No route sharing between users in this version
- Route data not exposed in any public API

### API Key Storage

- **Thunderforest key**: localStorage (user-provided, client-side only)
- **Supabase keys**: Environment variables (not in client bundle)
- **Key rotation**: User can update/remove tile provider key in Settings

---

## Dependency Validation

### Home Address Dependency

- **Validation**: Check `user_profiles.home_latitude IS NOT NULL` on route creation
- **If missing**: Show inline prompt "Set your home address to use as default start/end point"
- **Link**: Direct link to HomeLocationSettings component
- **Workaround**: User can manually set start/end points without home address

### GreenWay Data Availability

- **Source**: Hardcoded GeoJSON in database seed (user-provided coordinates)
- **Coordinates verified**: North terminus 35.1667°N, 84.8667°W; South terminus 35.1333°N, 84.8833°W
- **Metro area**: Linked to Cleveland, TN metro_area_id

### Supabase Free Tier Limitations

- **Database size**: 500MB (routes use minimal storage, ~1KB per route)
- **API requests**: 50,000/month (well within typical usage)
- **Realtime**: 200 concurrent connections (not used for routes)
- **No impact**: Route feature fits comfortably within free tier limits

---

## Terminology Standardization

| Term                   | Definition                                                         | Usage                                  |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **Route**              | A user-defined path with start/end points and associated companies | Primary term for user-created paths    |
| **Path**               | The drawn line between waypoints (route_geometry)                  | Technical term for GeoJSON LineString  |
| **Trail**              | A system-defined route (is_system_route = TRUE)                    | Used for GreenWay and similar overlays |
| **Overlay**            | Visual layer displayed on top of map tiles                         | Used for trail display                 |
| **Next ride**          | Flag indicating intent to visit on upcoming trip                   | UI label (short form)                  |
| **visit_on_next_ride** | Database column storing next ride flag                             | Code/DB only                           |
| **Active route**       | Route currently being planned/edited                               | UI state indicator                     |
| **System route**       | Admin-created trail visible to all users                           | Database flag                          |
