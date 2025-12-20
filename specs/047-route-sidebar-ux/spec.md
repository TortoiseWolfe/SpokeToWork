# Feature Specification: Route Sidebar UX Improvements

**Feature Branch**: `047-route-sidebar-ux`
**Created**: 2025-12-20
**Status**: Draft
**Input**: User description: "Route Sidebar UX improvements: Make the route list scrollable independently, add resizable sidebar width via drag handle, show full route names on hover/expand, auto-open drawer when clicking a route, and remove the cluttered inline company preview."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Auto-Open Drawer on Route Selection (Priority: P1)

As a user managing my bicycle routes, I want clicking a route in the sidebar to immediately open the route detail drawer, so I can quickly access route management functions without extra clicks.

**Why this priority**: This is the highest-impact change - it eliminates a wasted click ("View All") and provides immediate access to route details and company reordering. Every user will benefit from this streamlined workflow.

**Independent Test**: Can be tested by clicking any route in the sidebar and verifying the drawer opens automatically. Delivers immediate value by reducing steps to manage routes.

**Acceptance Scenarios**:

1. **Given** I am on the companies page with routes in the sidebar, **When** I click on a route, **Then** the route detail drawer opens automatically on the right side
2. **Given** the route detail drawer is open, **When** I click on a different route in the sidebar, **Then** the drawer updates to show the newly selected route
3. **Given** I have the drawer open, **When** I click the close button or outside the drawer, **Then** the drawer closes and I remain on the companies page

---

### User Story 2 - Independent Route List Scrolling (Priority: P1)

As a user with many routes, I want the route list to scroll independently from other sidebar content, so I can navigate through my routes without losing view of the header or controls.

**Why this priority**: Users with multiple routes currently struggle with navigation. Independent scrolling is essential for usability as the route count grows.

**Independent Test**: Can be tested by adding multiple routes and scrolling within the route list area. Delivers value by enabling route navigation at any scale.

**Acceptance Scenarios**:

1. **Given** I have more routes than can fit in the visible area, **When** I scroll within the route list, **Then** only the route list scrolls while the sidebar header remains fixed
2. **Given** I am scrolling the route list, **When** I reach the bottom, **Then** I can see all routes without the list overflowing into other UI areas
3. **Given** I am on a mobile device, **When** I touch-scroll the route list, **Then** the scrolling is smooth and stays within the route list container

---

### User Story 3 - Remove Inline Company Preview (Priority: P1)

As a user, I want the cluttered inline company preview removed from the sidebar, so the sidebar remains clean and usable as I add more routes.

**Why this priority**: The current inline preview consumes valuable screen space, runs off the screen, and doesn't scale. Removing it improves usability for all users.

**Independent Test**: Can be tested by selecting a route and verifying no inline company list appears in the sidebar. The drawer (from US1) provides the company details instead.

**Acceptance Scenarios**:

1. **Given** I select a route in the sidebar, **When** the route is selected, **Then** no inline company preview appears in the sidebar
2. **Given** the inline preview is removed, **When** I need to see companies on a route, **Then** I can view them in the auto-opened drawer
3. **Given** the sidebar has no inline preview, **When** I have many routes, **Then** the sidebar remains clean and scrollable

---

### User Story 4 - Full Route Names on Hover (Priority: P2)

As a user with long route names, I want to see the full name when I hover over a truncated route, so I can identify routes without guessing.

**Why this priority**: Truncated names cause confusion, but users can still function with truncation. This enhancement improves readability without blocking core functionality.

**Independent Test**: Can be tested by creating a route with a long name and hovering over it. Delivers value by eliminating guesswork.

**Acceptance Scenarios**:

1. **Given** a route name is truncated in the sidebar, **When** I hover over the route, **Then** a tooltip shows the full route name
2. **Given** I am on a touch device, **When** I long-press a truncated route name, **Then** the full name is revealed
3. **Given** the route name fits in the available space, **When** I hover over it, **Then** no tooltip appears (not needed)

---

### User Story 5 - Resizable Sidebar Width (Priority: P3)

As a user who prefers a wider or narrower sidebar, I want to drag the sidebar edge to resize it, so I can customize the layout to my preferences.

**Why this priority**: This is a "nice to have" enhancement. The sidebar works at a fixed width, but resizing adds personalization. Implemented last as it adds complexity.

**Independent Test**: Can be tested by dragging the sidebar edge and verifying the width changes. Delivers value through personalization.

**Acceptance Scenarios**:

1. **Given** I am viewing the sidebar, **When** I drag the right edge of the sidebar, **Then** the sidebar width changes accordingly
2. **Given** I resize the sidebar, **When** I release the drag handle, **Then** my preferred width is remembered for future sessions
3. **Given** I am resizing, **When** I drag beyond minimum or maximum bounds, **Then** the sidebar stops at the limit (minimum: 200px, maximum: 400px)
4. **Given** I am on a mobile device, **When** I view the sidebar, **Then** resizing is disabled (mobile uses full-width drawer pattern)

---

### Edge Cases

**Zero/Empty States:**

- What happens when there are zero routes? Display "No routes yet - create one to get started" message centered in route list area with muted text styling
- What happens with empty route list scrolling? No scrollbar shown, just empty state message
- What happens with exactly 1 route? Route is shown without scrollbar, no scroll behavior needed

**Selection Behavior:**

- What happens when the drawer is already open for a route and user clicks the same route? Drawer remains open with no visual change (no flicker, no re-animation)
- What happens with rapid route selection clicks? Debounce at 100ms, only process the last selection
- What happens when route data fetch fails? Show error toast, keep drawer open with "Failed to load companies" message and retry button

**Resize Behavior:**

- What happens when sidebar is resized very narrow (200px)? Route names truncate with ellipsis at ~15 characters, tooltip shows full name
- What happens when sidebar is at exactly 200px or 400px? Visual indicator (subtle border highlight) shows boundary reached
- What happens when resizing during drawer animation? Resize takes precedence, animation continues unaffected
- What happens when localStorage is unavailable or private browsing? Use default sidebar width (280px), no persistence, no error shown

**Loading States:**

- What happens during slow network? Route selection and drawer opening are instant (local state change), company data loads with spinner in drawer content area

**Multi-Tab Scenarios:**

- What happens when width is changed in another tab? On tab focus, read localStorage and apply if different (no real-time sync)

**Boundary Conditions:**

- What happens at exactly 50 routes? Performance should match SC-002 criteria, virtual scrolling not needed
- What happens on orientation change (mobile)? Drawer repositions appropriately, sidebar state preserved

**Negative Test Scenarios:**

- Drawer should NOT open when clicking outside route items
- Resize handle should NOT respond on touch devices (<768px)
- Tooltip should NOT appear for non-truncated names

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST open the RouteDetailDrawer automatically when user clicks or activates (Enter/Space) a route in the sidebar
- **FR-002**: System MUST update the RouteDetailDrawer content when a different route is selected while drawer is open
- **FR-003**: System MUST provide independent scrolling for the route list within the sidebar (height: calc(100vh - 120px) for header)
- **FR-004**: System MUST NOT display the inline company preview section or "View All" button in the sidebar
- **FR-005**: System MUST display a tooltip with the full route name when user hovers over a truncated name (positioned above, auto-flip if near edge)
- **FR-006**: System MUST display the full route name on touch devices via long-press gesture (500ms hold duration)
- **FR-007**: System MUST allow users to resize the sidebar by dragging its right edge (4px wide handle, col-resize cursor)
- **FR-008**: System MUST persist the user's preferred sidebar width in localStorage (graceful fallback to default 280px on write failure)
- **FR-009**: System MUST enforce minimum (200px) and maximum (400px) sidebar width limits with visual feedback at boundaries
- **FR-010**: System MUST disable sidebar resizing on mobile/touch devices (breakpoint: <768px)
- **FR-011**: System MUST maintain the fixed sidebar header (60px height) while the route list scrolls
- **FR-012**: System MUST provide smooth, performant scrolling in the route list with native scrollbar (auto visibility)
- **FR-013**: System MUST visually indicate the selected route with a highlighted background (primary color at 20% opacity)
- **FR-014**: System MUST show loading spinner in drawer while route company data is being fetched
- **FR-015**: System MUST preserve scroll position when routes are added/removed from the list
- **FR-016**: System MUST support keyboard navigation with arrow keys within the route list

### Accessibility Requirements

- **A11Y-001**: System MUST support keyboard activation of routes (Enter or Space key opens drawer)
- **A11Y-002**: System MUST close drawer when Escape key is pressed
- **A11Y-003**: System MUST move focus to drawer heading when drawer opens
- **A11Y-004**: System MUST return focus to the selected route when drawer closes
- **A11Y-005**: System MUST provide ARIA role="navigation" for sidebar and role="dialog" for drawer
- **A11Y-006**: System MUST provide aria-selected="true" on the currently selected route
- **A11Y-007**: System MUST provide aria-label on resize handle ("Resize sidebar")
- **A11Y-008**: System MUST announce drawer open/close via aria-live="polite" region
- **A11Y-009**: System MUST provide minimum 44x44px touch targets for route items on mobile
- **A11Y-010**: System MUST support resize handle via keyboard (arrow keys when focused, 10px increments)
- **A11Y-011**: System MUST respect prefers-reduced-motion for drawer transitions
- **A11Y-012**: System MUST maintain WCAG 2.1 AA color contrast (4.5:1) for selected route state
- **A11Y-013**: System MUST provide visible focus indicators on all interactive elements
- **A11Y-014**: System MUST support tab order: route list items → resize handle → drawer content

### Non-Functional Requirements

- **NFR-001**: Sidebar resize operation MUST feel smooth (60fps, no visual lag)
- **NFR-002**: Route selection and drawer opening MUST be instant (under 100ms for UI response)
- **NFR-003**: Tooltip appearance MUST have a 300ms delay to avoid flickering during quick mouse movements (industry standard UX pattern)
- **NFR-004**: Drawer open/close animation MUST complete in 200ms (use CSS transition)
- **NFR-005**: Memory usage MUST remain under 50MB for 50+ routes
- **NFR-006**: System MUST support Chrome 88+, Firefox 78+, Safari 14+, Edge 88+

### Responsive Breakpoints

- **Desktop** (≥1024px): Full sidebar with resize handle, drawer slides from right
- **Tablet** (768px-1023px): Sidebar visible, resize handle enabled, drawer overlays content
- **Mobile** (<768px): Sidebar hidden by default, drawer is full-width modal, resize disabled

### Key Entities

- **Sidebar**: The left-side panel containing route list, header, and navigation controls
- **Route List**: Scrollable container within sidebar displaying all user routes
- **Route Detail Drawer**: Right-side panel showing full route details and company list
- **Sidebar Width Preference**: User preference for sidebar width, persisted in localStorage

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can access route management functions in 1 click (down from 2 clicks with "View All")
- **SC-002**: Route list supports 50+ routes without UI degradation (no jank, no layout shift, no overflow outside container)
- **SC-003**: 100% of route names are readable either directly or via tooltip
- **SC-004**: Sidebar width preference persists across browser sessions
- **SC-005**: Scrolling performance maintains 60fps on mid-range devices (4GB RAM, 2018+ mobile or 2015+ desktop)
- **SC-006**: Mobile users experience no degradation in route management workflow

## Assumptions

- The RouteDetailDrawer component already exists and functions correctly (verified: exists at src/components/organisms/RouteDetailDrawer/)
- localStorage is available in all target browsers (fallback: use default width, no persistence - see FR-008)
- Touch devices will use a full-width drawer pattern, not a resizable sidebar (see FR-010, breakpoint <768px)
- The existing RouteSidebar component can be refactored without breaking changes to parent components (verified: props interface is stable)
- Route selection state is already managed in the parent component (companies/page.tsx) (verified: selectedRouteId state exists)

## Dependencies

### Internal Dependencies

- **useLocalStorage hook**: Existing hook at src/hooks/useLocalStorage.ts - used for width preference persistence
- **DaisyUI tooltip**: Built-in DaisyUI component - used for styled route name tooltips
- **@dnd-kit**: Existing drag-and-drop library - must remain functional for company reordering in drawer

### External Dependencies

- **localStorage API**: Web Storage API for preference persistence (graceful degradation if unavailable)
- **Pointer Events API**: For cross-platform resize handle interactions
- **CSS Custom Properties**: For theme-aware selected route highlighting

## Visual Specifications

### Resize Handle

- Width: 4px
- Color: transparent (visible on hover: base-300 from DaisyUI theme)
- Cursor: col-resize
- Hover state: background transitions to visible (200ms ease)
- Active state: primary color accent line

### Tooltip Styling

- Background: base-100 with 1px base-300 border
- Text: base-content
- Shadow: shadow-md (DaisyUI)
- Max width: 300px
- Padding: 8px 12px
- Border radius: rounded-md (DaisyUI)

### Selected Route Indicator

- Background: primary color at 20% opacity
- Border-left: 3px solid primary color
- Transition: background 150ms ease

## Clarifications

_(All requirements have been specified with measurable criteria based on standard UI patterns and accessibility guidelines)_
