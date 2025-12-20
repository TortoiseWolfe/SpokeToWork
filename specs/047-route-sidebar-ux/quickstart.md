# Quickstart: Route Sidebar UX Improvements

**Feature**: 047-route-sidebar-ux
**Date**: 2025-12-20

## Overview

This guide covers testing and development scenarios for the Route Sidebar UX improvements.

## Prerequisites

```bash
# Start development environment
docker compose up

# Navigate to companies page
# http://localhost:3000/companies
```

## Integration Scenarios

### Scenario 1: Auto-Open Drawer on Route Selection

**Steps**:

1. Navigate to `/companies`
2. Ensure at least one route exists in the sidebar
3. Click on a route in the sidebar

**Expected**:

- RouteDetailDrawer opens automatically on the right
- Selected route is highlighted in sidebar
- Drawer shows route name, companies, and management controls

**Test Command**:

```bash
docker compose exec spoketowork pnpm exec playwright test route-sidebar-ux --grep "auto-open"
```

### Scenario 2: Independent Route List Scrolling

**Steps**:

1. Navigate to `/companies`
2. Create enough routes to overflow the sidebar (5+ routes)
3. Scroll within the route list area

**Expected**:

- Only the route list scrolls
- Sidebar header remains fixed/visible
- Scroll is smooth (60fps)

**Test Command**:

```bash
docker compose exec spoketowork pnpm exec playwright test route-sidebar-ux --grep "scroll"
```

### Scenario 3: No Inline Company Preview

**Steps**:

1. Navigate to `/companies`
2. Click on a route with companies

**Expected**:

- No inline company list appears in the sidebar
- Companies are only visible in the RouteDetailDrawer
- Sidebar remains clean and compact

**Test Command**:

```bash
docker compose exec spoketowork pnpm exec playwright test route-sidebar-ux --grep "inline"
```

### Scenario 4: Route Name Tooltips

**Steps**:

1. Create a route with a long name (30+ characters)
2. Navigate to `/companies`
3. Hover over the truncated route name

**Expected**:

- Tooltip shows full route name after 300ms delay
- Tooltip disappears when mouse moves away
- On touch: long-press reveals full name

**Test Command**:

```bash
docker compose exec spoketowork pnpm exec playwright test route-sidebar-ux --grep "tooltip"
```

### Scenario 5: Resizable Sidebar

**Steps**:

1. Navigate to `/companies`
2. Hover near the right edge of the sidebar
3. Drag to resize

**Expected**:

- Cursor changes to resize indicator
- Sidebar width changes smoothly during drag
- Width persists after page refresh
- Width respects 200px min, 400px max limits

**Test Command**:

```bash
docker compose exec spoketowork pnpm exec playwright test route-sidebar-ux --grep "resize"
```

### Scenario 6: Mobile Behavior

**Steps**:

1. Open DevTools, enable mobile viewport (e.g., iPhone 12)
2. Navigate to `/companies`
3. Tap a route

**Expected**:

- Sidebar resize handle is hidden
- Drawer opens full-width over sidebar
- Touch scrolling works within route list

**Test Command**:

```bash
docker compose exec spoketowork pnpm exec playwright test route-sidebar-ux --project=mobile-chrome
```

## Development Quick Reference

### Key Files

| File                                                         | Purpose                               |
| ------------------------------------------------------------ | ------------------------------------- |
| `src/app/companies/page.tsx`                                 | Route selection handler, drawer state |
| `src/components/organisms/RouteSidebar/RouteSidebar.tsx`     | Route list, scrolling, tooltips       |
| `src/components/molecular/ResizablePanel/ResizablePanel.tsx` | Resize drag logic                     |
| `src/lib/storage/sidebar-preferences.ts`                     | localStorage helpers                  |

### Run All Tests

```bash
# Unit tests
docker compose exec spoketowork pnpm test --filter="RouteSidebar|ResizablePanel"

# E2E tests
docker compose exec spoketowork pnpm exec playwright test route-sidebar-ux

# Accessibility tests
docker compose exec spoketowork pnpm test --filter="accessibility"
```

### Storybook

```bash
docker compose exec spoketowork pnpm run storybook
# Open http://localhost:6006
# Navigate to: Organisms > RouteSidebar
# Navigate to: Molecular > ResizablePanel
```

## Troubleshooting

### Sidebar width not persisting

1. Check localStorage in DevTools → Application → Local Storage
2. Look for key `spoketowork:sidebar-preferences`
3. Clear and test again

### Drawer not opening

1. Check console for errors
2. Verify `onSelectRoute` callback is wired correctly
3. Ensure route data is loaded before selection

### Scroll not working

1. Check CSS `overflow-y: auto` on route list container
2. Verify `max-height` is set correctly
3. Ensure parent containers don't have `overflow: hidden`

### Resize not smooth

1. Check for heavy re-renders during drag
2. Ensure `requestAnimationFrame` is used
3. Verify `transition: none` during active resize
