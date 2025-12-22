# Implementation Plan: Performance - Component Memoization

**Branch**: `051-performance-memoization` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)

## Summary

Add `useCallback` and `React.memo` optimizations to list components to prevent unnecessary re-renders. **Note**: The originally identified components (ConversationList, ConnectionManager) already have these optimizations. The audit revealed other components that need attention.

## Audit Results

### Already Optimized (No Work Needed)

| Component                | useCallback     | React.memo                       |
| ------------------------ | --------------- | -------------------------------- |
| ConversationList.tsx     | ✅ All handlers | N/A (parent)                     |
| ConnectionManager.tsx    | ✅ All handlers | N/A (parent)                     |
| ConversationListItem.tsx | N/A             | ✅ memo()                        |
| MessageBubble.tsx        | N/A             | ✅ memo() with custom comparator |
| GlobalNav.tsx            | N/A             | ✅ memo()                        |
| CompanyForm.tsx          | N/A             | ✅ memo()                        |
| ApplicationForm.tsx      | N/A             | ✅ memo()                        |
| CompanyDetailDrawer.tsx  | N/A             | ✅ memo()                        |
| AccountSettings.tsx      | N/A             | ✅ memo()                        |

### Needs Optimization

| Component        | Issue                           | Fix                                                      |
| ---------------- | ------------------------------- | -------------------------------------------------------- |
| CompanyTable.tsx | `handleSort` not in useCallback | Add useCallback with `[]` deps (uses functional setSort) |
| CompanyRow.tsx   | No memo() wrapper               | Add React.memo                                           |

### Deprecated (Skip)

| Component         | Reason                           |
| ----------------- | -------------------------------- |
| NextRidePanel.tsx | Marked @deprecated, not rendered |

## Technical Context

**Language/Version**: TypeScript 5.9, React 19
**Primary Dependencies**: React hooks (useCallback, useMemo, memo)
**Storage**: N/A
**Testing**: Vitest with React Testing Library
**Target Platform**: Web (Next.js 15 static export)
**Project Type**: Web application
**Performance Goals**: Reduce unnecessary re-renders by >50%
**Constraints**: No functional regression, maintain test coverage

## Constitution Check

| Principle                         | Status | Notes                                          |
| --------------------------------- | ------ | ---------------------------------------------- |
| Proper Solutions Over Quick Fixes | ✅     | Using standard React patterns                  |
| Root Cause Analysis               | ✅     | Audited actual codebase vs spec assumptions    |
| Stability Over Speed              | ✅     | Changes are low-risk performance optimizations |
| Clean Architecture                | ✅     | Following established memoization patterns     |
| No Technical Debt                 | ✅     | Complete implementation, no TODOs              |

## Project Structure

### Documentation (this feature)

```text
specs/051-performance-memoization/
├── spec.md              # Requirements
├── plan.md              # This file
└── tasks.md             # Implementation tasks (to be generated)
```

### Source Code Changes

```text
src/components/
├── organisms/
│   └── CompanyTable/
│       └── CompanyTable.tsx      # Add useCallback to handleSort
└── molecular/
    └── CompanyRow/
        └── CompanyRow.tsx        # Add React.memo wrapper
```

## Implementation Approach

### Phase 1: CompanyTable Optimization

1. Import `useCallback` from React
2. Wrap `handleSort` in `useCallback` with `[]` empty dependency array (uses functional `setSort(prev => ...)` pattern)
3. Verify callbacks passed to CompanyRow are stable (already memoized by parent `companies/page.tsx`)

### Phase 2: CompanyRow Optimization

1. Import `memo` from React
2. Wrap component export with `memo()`
3. Consider custom comparator if complex props cause issues

### Phase 3: Verification

1. Run existing tests to ensure no regression
2. Use React DevTools Profiler to measure render reduction
3. Check for stale closure bugs in callbacks

## Risk Assessment

| Risk             | Likelihood | Impact | Mitigation                                   |
| ---------------- | ---------- | ------ | -------------------------------------------- |
| Stale closures   | Low        | Medium | Careful dependency arrays                    |
| Over-memoization | Low        | Low    | Only memo components that actually re-render |
| Test failures    | Low        | Low    | Changes are additive, not behavioral         |

## Complexity Tracking

No constitution violations requiring justification.
