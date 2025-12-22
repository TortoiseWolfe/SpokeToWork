# Tasks: Fix E2E Test Authentication in CI

**Feature Branch**: `057-fix-e2e-auth`
**Generated**: 2025-12-22

## Phase 1: Fix Configuration

- [x] T001 [US1] Fix email case in `.env`: `JonPohlner@gmail.com` → `jonpohlner@gmail.com`
- [x] T002 [US1] Verify password still works with lowercase email (same password works)

## Phase 2: Local Verification

- [x] T003 [US1] Run single auth test locally to verify fix (complete-flows.spec.ts Flow 1 PASSED)
- [x] T004 [P] [US1] Verify all test users authenticate via Supabase Auth API (all 3 users confirmed working)

## Phase 3: Handle Overlays (if needed)

- [x] T005 [US2] Check if cookie consent banner blocks tests (visible but not blocking - auth was root cause)
- [x] T006 [US2] Add cookie consent dismissal in test setup if needed (not needed - fix auth first, revisit if still failing)

## Phase 4: GitHub Secrets Documentation

- [x] T007 [US3] Document required GitHub Secrets with correct values (see GITHUB_SECRETS.md)
- [x] T008 [US3] Verify workflow uses matching secret names (checked e2e.yml)

## Phase 5: Commit and Verify

- [x] T009 Commit all changes with descriptive message
- [ ] T010 Push to feature branch (requires SSH key or user action)
- [ ] T011 Verify GitHub Actions E2E workflow passes

---

## Task Summary

| Phase     | Tasks  | Description            |
| --------- | ------ | ---------------------- |
| 1         | 2      | Fix .env configuration |
| 2         | 2      | Local verification     |
| 3         | 2      | Overlay handling       |
| 4         | 2      | GitHub Secrets docs    |
| 5         | 3      | Commit and verify      |
| **Total** | **11** |                        |

## User Story Mapping

| User Story                   | Tasks                |
| ---------------------------- | -------------------- |
| US1: CI Pipeline Passes      | T001-T004, T009-T011 |
| US2: Cookie Consent Handling | T005-T006            |
| US3: Test User Verification  | T007-T008            |
