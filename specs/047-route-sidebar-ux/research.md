# Research: Route Sidebar UX Improvements

**Feature**: 047-route-sidebar-ux
**Date**: 2025-12-20
**Status**: Complete

## Summary

This feature is a frontend-only refactoring of existing React components. No new external dependencies are required. All unknowns from Technical Context have been resolved through codebase analysis and established patterns.

## Research Findings

### R1: Auto-Open Drawer Pattern

**Decision**: Set `showRouteDetailDrawer(true)` in `handleSelectRoute` callback

**Rationale**: The RouteDetailDrawer component already exists and functions correctly. The current implementation requires clicking "View All" after selecting a route. Simply triggering the drawer open state on route selection eliminates this extra step.

**Alternatives Considered**:

- Inline expansion panel (rejected - doesn't scale with many companies)
- Modal dialog (rejected - drawer pattern already established)

### R2: Independent Scrolling Implementation

**Decision**: Use CSS `overflow-y-auto` with `max-height: calc(100vh - header-height)` on route list container

**Rationale**: Pure CSS solution, no JavaScript required. The sidebar header remains fixed while only the route list scrolls. This pattern is already used elsewhere in the codebase (e.g., RouteDetailDrawer company list).

**Alternatives Considered**:

- Virtual scrolling with react-window (deferred - overkill for <100 routes)
- Sticky positioning (rejected - less reliable across browsers)

### R3: Tooltip Implementation

**Decision**: Use native `title` attribute for basic tooltips, with DaisyUI tooltip component for styled display

**Rationale**:

- Native `title` provides accessibility for free
- DaisyUI tooltip adds consistent styling with existing design system
- Touch devices: long-press gesture already supported by mobile browsers

**Alternatives Considered**:

- Custom tooltip component (rejected - reinventing the wheel)
- Radix UI Tooltip (rejected - adds dependency, DaisyUI already available)

### R4: Resizable Panel Implementation

**Decision**: Create custom ResizablePanel component using pointer events (pointerdown, pointermove, pointerup)

**Rationale**:

- No npm dependencies required
- Pointer events work for both mouse and touch
- localStorage persistence uses existing `useLocalStorage` hook
- Min/max constraints (200px-400px) prevent unusable states

**Alternatives Considered**:

- react-resizable-panels (rejected - adds dependency for simple use case)
- CSS resize property (rejected - limited control over constraints and styling)
- react-split-pane (rejected - outdated, adds dependency)

### R5: Inline Preview Removal

**Decision**: Simply remove the conditional rendering block that shows companies in the sidebar

**Rationale**: The RouteDetailDrawer already provides complete company information. The inline preview is redundant and causes the UX issues identified in the spec.

**Alternatives Considered**:

- Collapse/expand toggle (rejected - adds complexity, drawer is better)
- Summary-only view (rejected - still clutters sidebar)

## Performance Considerations

### Scrolling Performance

- Use `will-change: transform` on scrollable container (CSS)
- Avoid layout thrashing during scroll events
- Virtual scrolling deferred unless >50 routes causes visible lag

### Resize Performance

- Use `requestAnimationFrame` for smooth resize updates
- Debounce localStorage writes (save on pointerup, not during drag)
- CSS `transition: none` during active resize to prevent jank

## Browser Compatibility

All implementations use standard web APIs supported in:

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

No polyfills required.

## Existing Patterns to Follow

| Pattern                    | Example Location                         | Apply To                 |
| -------------------------- | ---------------------------------------- | ------------------------ |
| 5-file component structure | `src/components/organisms/RouteSidebar/` | ResizablePanel           |
| useLocalStorage hook       | `src/hooks/useLocalStorage.ts`           | Sidebar width preference |
| DaisyUI tooltip            | Various components                       | Route name tooltips      |
| Drawer pattern             | `RouteDetailDrawer.tsx`                  | Auto-open behavior       |
| Overflow scrolling         | `RouteDetailDrawer.tsx` (company list)   | Route list               |

## Conclusion

No external research or dependencies required. All solutions use existing patterns and standard web APIs. Implementation can proceed directly to Phase 1 artifacts.
