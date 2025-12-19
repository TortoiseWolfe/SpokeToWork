# Feature Specification: Simplify Next Ride Feature

**Feature Branch**: `044-simplify-next-ride`
**Created**: 2025-12-18
**Status**: Draft
**Input**: User description: "Simplify Next Ride feature to show companies from the active route. Current implementation is over-engineered with unused NextRidePanel and per-company cherry-picking across routes. User needs: (1) Next Ride filter in CompanyFilters that shows companies on active route, (2) Visual indicator in CompanyTable showing which companies are on active route, (3) No new panels - use existing UI only."

## Background

The SpokeToWork application is a job hunting tool that helps users plan bicycle routes to visit multiple companies. The existing "Next Ride" feature was designed with unnecessary complexity:

- A `visit_on_next_ride` flag per company-route association for cherry-picking across multiple routes
- A `NextRidePanel` component that was built but never integrated into the UI
- No clear connection between "Next Ride" and the user's active route

**User's actual mental model**: "Next Ride" simply means the companies on the route they're currently planning to ride - their active route. Nothing more complex is needed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Filter Companies to Active Route (Priority: P1)

As a job hunter, I want to filter the company list to show only companies on my active route, so I can quickly see what I'll be visiting on my next bicycle trip.

**Why this priority**: This is the core functionality that delivers immediate value. Users need to quickly identify which companies they'll visit on their planned route.

**Independent Test**: Can be fully tested by setting an active route and checking the "On Active Route" filter - the company list should show only companies belonging to that route.

**Acceptance Scenarios**:

1. **Given** a user has an active route with 5 companies, **When** they check the "On Active Route" filter checkbox, **Then** only those 5 companies appear in the company list
2. **Given** a user has no active route set, **When** they check the "On Active Route" filter checkbox, **Then** the company list shows no companies and displays a helpful message
3. **Given** a user has the "On Active Route" filter active, **When** they change their active route to a different route, **Then** the company list updates to show companies from the new active route

---

### User Story 2 - Visual Indicator for Active Route Companies (Priority: P2)

As a job hunter, I want to see at a glance which companies in my list are on my active route, even when viewing all companies, so I can quickly identify my upcoming visits without switching views.

**Why this priority**: This enhances discoverability and provides context without requiring the user to toggle filters.

**Independent Test**: Can be tested by having an active route and viewing the full company list - companies on the active route should have a visible indicator.

**Acceptance Scenarios**:

1. **Given** a user has an active route with companies A, B, and C, **When** they view the full company list (filter off), **Then** companies A, B, and C display a visual indicator (icon or badge) showing they're on the active route
2. **Given** a user has no active route, **When** they view the company list, **Then** no companies display the active route indicator
3. **Given** a company is removed from the active route, **When** the user views the company list, **Then** that company no longer shows the active route indicator

---

### User Story 3 - Deprecate Unused Complexity (Priority: P3)

As a developer/maintainer, I want the unused NextRidePanel component and complex cross-route cherry-picking logic removed or deprecated, so the codebase is simpler and easier to maintain.

**Why this priority**: This is cleanup work that improves code quality but doesn't directly impact users.

**Independent Test**: Can be tested by verifying the NextRidePanel component is not rendered anywhere and unused exports are removed or marked deprecated.

**Acceptance Scenarios**:

1. **Given** the feature is implemented, **When** reviewing the codebase, **Then** NextRidePanel is either removed or clearly marked as deprecated
2. **Given** the feature is implemented, **When** the app runs, **Then** no additional panels or drawers are added to the UI

---

### Edge Cases

- What happens when the user has an active route with zero companies? Display empty state with message "No companies on this route yet"
- What happens when a company on the active route is deleted? The indicator disappears and filter updates automatically
- What happens when the user logs out? Active route state is cleared, indicators are removed
- What happens on mobile where screen space is limited? Visual indicator should be compact (icon only, no text)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an "On Active Route" filter option in the company filters that shows only companies belonging to the user's currently active route
- **FR-002**: System MUST display a visual indicator (icon or badge) on companies that belong to the active route when viewing the full company list
- **FR-003**: System MUST update the filtered view and visual indicators in real-time when the active route changes
- **FR-004**: System MUST show an appropriate empty state message when the "On Active Route" filter is active but no companies are on the active route
- **FR-005**: System MUST NOT introduce any new panels, drawers, or navigation elements - all functionality uses existing UI components
- **FR-006**: Visual indicators MUST be accessible (color-independent, screen reader compatible)

### Key Entities

- **Active Route**: The single route the user has selected as their current planning focus. One per user at a time.
- **Route Companies**: Companies associated with a specific route, with sequence order for visit planning.
- **Company**: A business entity that can be tracked and added to routes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can identify companies on their active route within 2 seconds of viewing the company list (via filter or visual indicator)
- **SC-002**: Filtering to "On Active Route" reduces the displayed company count to only those on the active route with 100% accuracy
- **SC-003**: 95% of users can successfully use the "On Active Route" filter on first attempt without documentation
- **SC-004**: No increase in page load time or UI complexity (same number of panels/drawers as before)
- **SC-005**: Visual indicators meet WCAG AA accessibility standards (not color-only, labeled for screen readers)

## Assumptions

- Users understand the concept of an "active route" from the existing route sidebar
- The existing route sidebar and company table components can be extended without major refactoring
- The `visit_on_next_ride` database column can remain in place (no migration needed) but its usage will be deprecated in favor of the simpler active-route-based approach
- Mobile users have the same needs as desktop users, just with more compact visual presentation

## Out of Scope

- Combining multiple routes into a single "next ride" view
- Per-company cherry-picking across different routes
- New panels, drawers, or navigation elements
- Changes to the route creation or editing workflow
- Route optimization or re-ordering features

## Clarifications

### Session 2025-12-18

- Q: Should the UI terminology be "Next Ride" or "Active Route"? → A: Use "On Active Route" as the UI label for the filter checkbox. Standardize terminology throughout to "Active Route".
