# Feature Specification: Route Optimization with Home Start/End

**Feature Branch**: `046-route-optimization`
**Created**: 2025-12-19
**Status**: Draft
**Input**: User description: "Route optimization feature: Add home location as configurable start/end points for routes (defaulting to user's home), and implement a TSP solver algorithm to automatically optimize the order of company visits. Include auto-suggest when companies are added plus a manual Optimize Order button."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Optimize Route Order (Priority: P1)

As a job hunter with multiple companies on my route, I want the system to automatically optimize the visit order so that I can minimize travel distance and visit more companies efficiently.

**Why this priority**: This is the core value proposition - users currently have no way to optimize their routes and must manually drag-and-drop companies into efficient order, which is tedious and error-prone.

**Independent Test**: Can be fully tested by adding 5+ companies to a route, clicking "Optimize Order", and verifying the total distance is reduced compared to random ordering.

**Acceptance Scenarios**:

1. **Given** a route with 5+ companies in random order, **When** user clicks "Optimize Order" button, **Then** companies are reordered to minimize total travel distance and the new order is displayed
2. **Given** an optimized route, **When** user views the route, **Then** estimated total distance and time are displayed
3. **Given** a route with 2 or fewer companies, **When** user clicks "Optimize Order", **Then** system informs them optimization requires 3+ stops

---

### User Story 2 - Configure Route Start/End Points (Priority: P1)

As a job hunter, I want my routes to start and end at my home location by default, but have the option to set custom start/end points for specific routes.

**Why this priority**: Equal priority to optimization because without proper start/end points, the optimized route won't reflect real-world usage where users depart from and return to home.

**Independent Test**: Can be tested by creating a new route and verifying it defaults to home, then changing start point to a custom location and verifying the change persists.

**Acceptance Scenarios**:

1. **Given** user has home location set in profile, **When** user creates a new route, **Then** route start and end points default to home location
2. **Given** a route with default home start/end, **When** user clicks "Edit Start/End", **Then** they can select custom locations via address search or map click
3. **Given** user has no home location set, **When** user creates a route, **Then** system prompts to set home location first or allows custom start/end entry
4. **Given** a route with custom start (not home), **When** user views route details, **Then** custom start location is clearly displayed with option to reset to home

---

### User Story 3 - Auto-Suggest Optimization (Priority: P2)

As a job hunter adding companies to my route, I want the system to suggest an optimized order so that I don't have to manually trigger optimization each time.

**Why this priority**: Enhances UX but not critical for MVP - manual optimization button provides core functionality.

**Independent Test**: Can be tested by adding a 4th company to a 3-company route and verifying an optimization suggestion appears.

**Acceptance Scenarios**:

1. **Given** a route with 3+ companies, **When** user adds another company, **Then** system suggests "Optimize route order?" with preview of distance savings
2. **Given** optimization suggestion is shown, **When** user clicks "Apply", **Then** route is reordered and suggestion dismissed
3. **Given** optimization suggestion is shown, **When** user clicks "Dismiss" or ignores it, **Then** suggestion disappears and original order is preserved
4. **Given** user has dismissed 3 suggestions in a session, **When** they add another company, **Then** suggestion appears with 50% probability
5. **Given** user has dismissed 6 suggestions in a session, **When** they add another company, **Then** suggestion appears with 25% probability
6. **Given** user has dismissed 10+ suggestions in a session, **When** they add another company, **Then** auto-suggest is disabled for the remainder of the session

---

### User Story 4 - Round-Trip vs One-Way Routes (Priority: P3)

As a job hunter, I want to choose between round-trip routes (return to start) and one-way routes (end at last company) to accommodate different planning needs.

**Why this priority**: Nice-to-have feature that adds flexibility but doesn't block core functionality.

**Independent Test**: Can be tested by toggling route type and verifying optimization accounts for return journey only when round-trip is selected.

**Acceptance Scenarios**:

1. **Given** route in round-trip mode (default), **When** optimization runs, **Then** algorithm optimizes for home->companies->home circuit
2. **Given** route in one-way mode, **When** optimization runs, **Then** algorithm optimizes for start->companies (no return to start)
3. **Given** a one-way route, **When** user toggles to round-trip, **Then** route is re-optimized including return journey

---

### Edge Cases

- What happens when route has 0 companies? -> Show info message "Add companies to your route before optimizing" and disable optimize button
- What happens when home location coordinates are invalid or missing? -> Prompt user to set valid home location before route optimization
- How does system handle companies with missing/invalid coordinates? -> Exclude from optimization, show warning toast with edit link, allow manual positioning
- What happens with very large routes (50+ companies)? -> Show loading indicator, apply optimization in batches or warn about computation time
- How does optimization handle ties (equal distance options)? -> Maintain stable ordering, prefer existing order when distances are equal
- What if optimization takes too long (>5 seconds)? -> Show progress, allow cancellation, use approximate algorithm for large sets
- How does system handle network errors during optimization? -> Client-side algorithm, no network needed; graceful fallback for OSRM path generation

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to optimize route company order using TSP algorithm
- **FR-002**: System MUST default route start/end points to user's home location when available
- **FR-003**: System MUST allow custom start and/or end points per route (overriding home)
- **FR-004**: System MUST calculate and display total estimated distance in miles for optimized routes
- **FR-005**: System MUST calculate and display estimated cycling time for optimized routes
- **FR-006**: System MUST auto-suggest optimization when companies are added to routes with 3+ stops
- **FR-007**: System MUST provide manual "Optimize Order" button accessible from route detail view
- **FR-008**: System MUST support both round-trip (return to start) and one-way route modes
- **FR-009**: System MUST persist optimized order to database (update sequence_order field)
- **FR-010**: System MUST populate distance_from_start_miles for each company after optimization
- **FR-011**: System MUST handle optimization client-side (browser) without server API calls
- **FR-012**: System MUST handle companies with missing coordinates by: (a) displaying warning toast listing excluded companies, (b) excluding them from optimization, (c) showing edit link to add coordinates
- **FR-013**: System MUST show optimization preview with distance savings before applying changes
- **FR-014**: System MUST display comparison modal showing before/after routes with map preview
- **FR-015**: System MUST automatically generate OSRM bike path after optimization completes
- **FR-016**: System MUST store start_type and end_type ('home' | 'custom') in bicycle_routes table
- **FR-017**: System MUST disable optimize button and show info message when route has 0 companies
- **FR-018**: System MUST use exponential backoff for auto-suggest frequency (50% at 3 dismissals, 25% at 6, disabled at 10+)

### Non-Functional Requirements

- **NFR-001**: Optimization MUST complete within 5 seconds for routes with up to 20 companies
- **NFR-002**: Optimization MUST work offline (use cached coordinates, no external API for algorithm)
- **NFR-003**: UI MUST remain responsive during optimization (use Web Workers or chunked processing)
- **NFR-004**: Solution MUST work within static hosting constraints (no server-side computation)

### Key Entities

- **RouteStartEndPoint**: Represents a start or end location for a route
  - Location type: 'home' | 'custom'
  - Address (string)
  - Latitude/Longitude coordinates
  - Relationship: belongs to BicycleRoute

- **OptimizationResult**: Represents the result of a TSP optimization run
  - Optimized company order (sequence)
  - Total distance (miles)
  - Estimated time (minutes)
  - Distance savings vs original order
  - Relationship: temporary, applied to RouteCompany sequence_order

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can optimize a 10-company route in under 3 seconds
- **SC-002**: Optimized routes show at least 15% distance reduction compared to random ordering on average
- **SC-003**: 90% of route optimizations complete successfully without errors
- **SC-004**: Home location auto-populates for new routes when user has home set (100% of cases)
- **SC-005**: All route optimizations work offline after initial page load
- **SC-006**: Auto-suggest appears within 500ms of adding a company to eligible routes

## Assumptions

1. Users have already set their home location in profile settings (existing HomeLocationSettings component)
2. Companies have valid latitude/longitude coordinates (geocoded during creation)
3. Browser supports Web Workers for non-blocking computation
4. OSRM service is available for actual route path generation after ordering (existing integration)
5. Haversine distance is acceptable for optimization (actual road distance calculated post-optimization)

## Clarifications

### Session 2025-12-19

- **Q**: Should routes always use home as start/end, or configurable?
  - **A**: Configurable - default to home but allow custom start/end points per route

- **Q**: What level of optimization algorithm?
  - **A**: Full TSP solver (browser-compatible equivalent to OR-Tools)

- **Q**: How should optimization be triggered?
  - **A**: Both - auto-suggest on company add + manual "Optimize Order" button

- **Q**: Which browser-compatible TSP library should we use?
  - **A**: `@peerless/tsp` - Lightweight (~5KB), uses 2-opt + nearest neighbor hybrid, no dependencies, good for <50 stops

- **Q**: How should we store start/end point type in database?
  - **A**: Add `start_type` and `end_type` columns ('home' | 'custom' enum) to `bicycle_routes` table, reuse existing coordinate fields

- **Q**: After TSP optimization, should we auto-generate OSRM bike path?
  - **A**: Yes - automatically call OSRM after optimization to get real bike route geometry and update distance/time with actual values

- **Q**: What visual feedback after optimization completes?
  - **A**: Modal with comparison - show before/after with map preview comparing original vs optimized route
