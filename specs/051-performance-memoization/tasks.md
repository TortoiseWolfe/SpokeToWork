# Tasks: Feature 051 - Performance Memoization

**Generated**: 2025-12-21 | **Status**: Ready for Implementation

## Phase 1: Setup & Audit

- [ ] T001 [P] Create feature branch from main
- [ ] T002 Start dev server and open React DevTools Profiler
- [ ] T003 Profile CompanyTable: trigger sort actions, record render counts for CompanyRow children
- [ ] T004 Document baseline: which components re-render unnecessarily and how often
- [ ] T005 Identify specific handlers/components causing unnecessary re-renders

## Phase 2: CompanyTable Optimization (if audit confirms need)

- [ ] T006 Add useCallback import to CompanyTable.tsx
- [ ] T007 Wrap handleSort in useCallback with empty `[]` dependency array (uses functional setSort)
- [ ] T008 Add defensive useCallback wrappers for callbacks passed to CompanyRow:
  - `handleCompanyClick` wrapping `onCompanyClick` prop
  - `handleEdit` wrapping `onEdit` prop
  - `handleDelete` wrapping `onDelete` prop
  - `handleStatusChange` wrapping `onStatusChange` prop
  - `handleAddToRoute` wrapping `onAddToRoute` prop
- [ ] T009 Verify CompanyTable tests pass after changes

## Phase 3: CompanyRow Optimization (if audit confirms need)

- [ ] T010 Add memo import to CompanyRow.tsx
- [ ] T011 Wrap CompanyRow export with React.memo
- [ ] T012 Verify CompanyRow tests pass after changes

## Phase 4: Post-Implementation Verification

- [ ] T013 Re-profile with React DevTools to verify render reduction
- [ ] T014 Create Playwright E2E test for CompanyTable sort (stale closure verification)
  - Sort by name column, verify alphabetical order
  - Sort again (reverse), verify reverse order
  - Sort by different column, verify that column's order
  - Run via: `docker compose exec spoketowork pnpm exec playwright test companies`
- [ ] T015 [P] Run full test suite to confirm no regressions
- [ ] T016 [P] Type-check and lint verification
- [ ] T017 Manual verification of sorting and row interactions

## Phase 5: Completion

- [ ] T018 Update spec.md success criteria checkboxes
- [ ] T019 Commit changes with descriptive message

---

## Task Dependencies

```
T001 → T002 → T003 → T004 → T005 (audit complete)
                              ↓
         T006 → T007 → T008 → T009 (CompanyTable)
                              ↓
              T010 → T011 → T012 (CompanyRow)
                              ↓
         T013 → T014 → T015/T016 → T017 → T018 → T019
```

## Decision Gate

After T005 (audit complete), evaluate findings:

- If no significant re-renders found → Skip to T018, document "no optimization needed"
- If re-renders confirmed → Proceed with T006+

## Parallel Opportunities

- T015 and T016 can run in parallel (test suite + lint/typecheck)

## Estimated Scope

- **Files Modified**: 2 (if optimization needed)
- **Lines Changed**: ~30 (increased due to defensive useCallback wrappers)
- **Risk Level**: Low (audit-driven, additive changes only)
