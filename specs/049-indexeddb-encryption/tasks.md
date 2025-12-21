# Tasks: Password Change Key Rotation

**Branch**: `049-indexeddb-encryption` | **Date**: 2025-12-21

## Phase 1: Setup

- [x] T001 [P] Verify branch exists and spec/plan are in place
- [x] T002 [P] Confirm keyManagementService.rotateKeys() exists and works

## Phase 2: UI Enhancement

- [x] T003 [US1] Add `currentPassword` state variable in AccountSettings.tsx
- [x] T004 [US1] Add "Current Password" input field before "New Password" field
- [x] T005 [US1] Clear currentPassword field on successful password change

## Phase 3: Key Rotation Integration

- [x] T006 [US2] Import keyManagementService and error types in AccountSettings.tsx
- [x] T007 [US2] Add current password validation (required field check)
- [x] T008 [US2] Call deriveKeys(currentPassword) to verify current password
- [x] T009 [US2] Call rotateKeys(newPassword) before updateUser()
- [x] T010 [US2] Handle KeyMismatchError with "Current password is incorrect" message
- [x] T011 [US2] Handle ConnectionError with "Failed to update encryption keys" message
- [x] T012 [US2] Ensure rotateKeys failure aborts password change (no updateUser call)

## Phase 4: Testing

- [x] T013 [P] [US3] Add test: current password field is rendered
- [x] T014 [P] [US3] Add test: empty current password shows error
- [x] T015 [P] [US3] Add test: wrong current password shows "incorrect" error
- [x] T016 [P] [US3] Add test: key rotation failure aborts password change
- [x] T017 [P] [US3] Add test: successful change clears all password fields

## Phase 5: Verification

- [x] T018 [US4] Run existing messaging tests to verify no regressions (213 tests pass)
- [ ] T019 [US4] Manual test: password change with key rotation
- [ ] T020 [US4] Verify messages still decrypt after password change

---

## User Stories

**US1**: As a user, I want to enter my current password when changing passwords, so that my encryption keys can be verified.

**US2**: As a user, I want my encryption keys to automatically rotate when I change my password, so that I don't lose access to my messages.

**US3**: As a developer, I want comprehensive tests for the password change flow, so that key rotation is reliable.

**US4**: As a QA tester, I want to verify the complete flow works end-to-end, so that users don't experience silent failures.

---

## Dependencies

```
T003 → T004 → T005 (sequential UI changes)
T006 → T007 → T008 → T009 → T010 → T011 → T012 (sequential logic)
T003-T012 → T013-T017 (tests after implementation)
T013-T017 → T018-T020 (verification after tests)
```

## Parallel Opportunities

- T003, T006 can run in parallel (state vs imports)
- T013-T017 can run in parallel (independent test cases)

## Effort Estimate

| Phase        | Tasks  | Effort       |
| ------------ | ------ | ------------ |
| Setup        | 2      | 10 min       |
| UI           | 3      | 20 min       |
| Integration  | 7      | 45 min       |
| Testing      | 5      | 30 min       |
| Verification | 3      | 20 min       |
| **Total**    | **20** | **~2 hours** |
