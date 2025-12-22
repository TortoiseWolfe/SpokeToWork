# Feature 051: Performance - Component Memoization

## Priority: P1 (Performance)

## Problem Statement

Event handlers in list components without `useCallback` cause unnecessary child re-renders. List item components without `React.memo` re-render even when props haven't changed.

## Audit Results (2025-12-21)

### Originally Identified - Already Optimized ✅

The components originally flagged in the initial spec **already have optimizations**:

- `ConversationList.tsx` - All handlers use `useCallback` (lines 95, 112, 120, 128, 135)
- `ConnectionManager.tsx` - All handlers use `useCallback` (lines 51, 63, 75, 88, 100)
- `ConversationListItem.tsx` - Uses `memo()` (line 288)

### Actual Issues Found

| Component          | Issue                                     |
| ------------------ | ----------------------------------------- |
| `CompanyTable.tsx` | `handleSort` not wrapped in `useCallback` |
| `CompanyRow.tsx`   | No `React.memo` wrapper                   |

## Affected Files

- `src/components/organisms/CompanyTable/CompanyTable.tsx`
- `src/components/molecular/CompanyRow/CompanyRow.tsx`

## Requirements

### Functional Requirements

1. **FR-1**: Wrap `handleSort` in CompanyTable with `useCallback`
2. **FR-2**: Add defensive `useCallback` wrappers for callbacks passed to CompanyRow (onClick, onEdit, onDelete, onStatusChange, onAddToRoute) - ensures memo() effectiveness regardless of parent
3. **FR-3**: Add `React.memo` to CompanyRow component
4. **FR-4**: Verify no stale closure bugs introduced

### Non-Functional Requirements

1. **NFR-1**: Prevent unnecessary re-renders in CompanyTable/CompanyRow (verified via React DevTools Profiler)
2. **NFR-2**: No functional regression in company list interactions
3. **NFR-3**: Existing tests continue to pass

## Success Criteria

- [x] Audit completed with React DevTools Profiler (baseline documented)
- [x] CompanyTable.handleSort uses useCallback (if audit confirms need)
- [x] Defensive useCallback wrappers for callbacks passed to CompanyRow (if audit confirms need)
- [x] CompanyRow wrapped in React.memo (if audit confirms need)
- [x] All existing tests pass (3631 tests passing)
- [x] No stale closure bugs verified via:
  - [x] Playwright E2E test: sort by each column, verify order updates correctly
  - [x] Manual verification during implementation
- [ ] Re-profile shows behavioral correctness: sorting doesn't trigger re-render of all CompanyRow components (only header/state changes highlighted, not row list)

## Testing Approach

1. **Audit first**: Use React DevTools Profiler to identify actual re-render bottlenecks BEFORE implementing changes
2. Implement only optimizations that address measured problems
3. Re-profile after changes to verify improvement
4. Run existing unit tests to confirm no regression
5. Verify sorting and row interactions work correctly

## Out of Scope

- Virtual scrolling for large lists
- Server-side pagination
- Components already optimized (ConversationList, ConnectionManager, etc.)

## Assumptions

- The performance impact is measurable in development mode
- Standard React memoization patterns are sufficient (no need for custom comparators)

## Clarifications

### Session 2025-12-21

1. **Audit-first approach**: Use React DevTools Profiler BEFORE implementing changes to identify actual bottlenecks, not assumptions
2. **Stale closure verification**: Both Playwright E2E test (automated) + manual verification during implementation
3. **Defensive memoization**: Add useCallback wrappers inside CompanyTable for all callbacks passed to CompanyRow, ensuring memo() effectiveness regardless of parent component behavior
4. **Completion signal**: Behavioral correctness - sorting should not trigger re-render of all CompanyRow components (verified via Profiler highlights)
