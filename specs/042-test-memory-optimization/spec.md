# Feature Specification: Test Suite Memory Optimization

**Feature Branch**: `042-test-memory-optimization`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "Test suite memory optimization and redundancy reduction - Fix OOM crashes when running 2800 tests locally in Docker/WSL2 by: 1) Switching from jsdom to happy-dom environment, 2) Enabling sequential execution with memory limits, 3) Auditing and eliminating redundant tests, 4) Consolidating to 4 pre-seeded test users (PRIMARY, SECONDARY, TERTIARY, ADMIN) instead of creating dynamic users per test, 5) Organizing tests by user flow through the app"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Runs Full Test Suite Locally (Priority: P1)

A developer wants to run the complete test suite (~2800 tests) locally in a Docker/WSL2 environment with limited memory (4GB) to verify code changes before committing. Currently, tests crash with OOM (exit code 137) before completing.

**Why this priority**: Without this, developers cannot validate their changes locally and must rely solely on CI, slowing down the development cycle and increasing failed builds.

**Independent Test**: Can be fully tested by running `pnpm test` in Docker container and observing all tests complete without OOM crashes.

**Acceptance Scenarios**:

1. **Given** a developer is in the Docker container with 4GB memory limit, **When** they run `pnpm test`, **Then** all ~2800 tests execute to completion without OOM crashes
2. **Given** a developer runs the test suite, **When** tests complete, **Then** the total execution time is under 10 minutes
3. **Given** a developer runs tests, **When** any individual test fails, **Then** the failure is clearly reported with file location and error message (not masked by OOM)

---

### User Story 2 - Developer Identifies Redundant Tests (Priority: P2)

A developer or QA engineer wants to audit the test suite to identify and eliminate redundant tests that test the same functionality multiple times across different test types (unit, contract, integration, E2E), reducing maintenance burden and execution time.

**Why this priority**: Redundant tests waste execution time, create maintenance burden, and obscure real coverage gaps. Reducing redundancy makes the suite faster and more maintainable.

**Independent Test**: Can be tested by generating a test coverage matrix showing overlap between test types and identifying tests that can be safely removed.

**Acceptance Scenarios**:

1. **Given** a test matrix exists for each user flow, **When** a reviewer examines it, **Then** they can identify which test types cover each flow and where overlap exists
2. **Given** redundant tests are identified, **When** they are removed, **Then** overall test count decreases by at least 15% while maintaining code coverage above 40%
3. **Given** tests are deduplicated, **When** a bug is introduced, **Then** at least one test catches it (no coverage regression)

---

### User Story 3 - Tests Use Pre-Seeded Users (Priority: P2)

A developer wants tests to use the 4 pre-seeded test users defined in the `.env` file (PRIMARY, SECONDARY, TERTIARY, ADMIN) instead of creating new dynamic users for each test, reducing database clutter, Supabase rate limiting, and test flakiness.

**Why this priority**: Dynamic user creation causes rate limiting issues, orphaned database records, and flaky tests. Using consistent test users improves reliability and simplifies debugging.

**Independent Test**: Can be tested by running the full test suite and verifying only 4 test users exist in the database afterward.

**Acceptance Scenarios**:

1. **Given** integration tests need a user, **When** they execute, **Then** they use the PRIMARY user credentials from `.env` (not create new users)
2. **Given** multi-user tests need multiple users, **When** they execute, **Then** they use PRIMARY + SECONDARY (or TERTIARY) users from `.env`
3. **Given** the full test suite completes, **When** database is queried, **Then** only 4 test users exist (PRIMARY, SECONDARY, TERTIARY, ADMIN)
4. **Given** signup flow tests (Feature 027), **When** they execute, **Then** they are the ONLY tests allowed to create dynamic users (with cleanup)

---

### User Story 4 - Tests Organized by User Flow (Priority: P3)

A developer wants tests organized by user journey through the application rather than by technical type, making it easier to understand coverage and identify gaps for specific features.

**Why this priority**: Flow-based organization provides clearer coverage visibility and makes it easier to identify what's tested vs untested. Lower priority because it's organizational rather than functional.

**Independent Test**: Can be tested by examining the test directory structure and verifying tests are grouped by user flow.

**Acceptance Scenarios**:

1. **Given** a developer looks at the test directory, **When** they navigate to a flow folder (e.g., `01-onboarding`), **Then** they find all tests related to that user journey
2. **Given** a new feature is added, **When** a developer writes tests, **Then** they know exactly where to place them based on user flow
3. **Given** tests are reorganized by flow, **When** the test suite runs, **Then** test output is grouped by flow for easier debugging

---

### Edge Cases

- What happens when a test requires user state that conflicts with other tests using the same user?
- How does system handle tests that must run in isolation (e.g., password change tests)?
- What happens when a test accidentally modifies shared user data?
- How do we handle tests that legitimately need to create users (signup flow)?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Test suite MUST complete all ~2800 tests without OOM crashes in Docker/WSL2 with 4GB memory limit
- **FR-002**: Test configuration MUST use happy-dom instead of jsdom for lighter memory footprint
- **FR-003**: Test execution MUST use sequential (single-fork) mode to limit concurrent memory usage
- **FR-004**: Test scripts MUST set NODE_OPTIONS with max-old-space-size of 4096MB
- **FR-005**: Integration tests MUST use pre-seeded test users from `.env` instead of creating dynamic users
- **FR-006**: E2E tests MUST use pre-seeded test users except for signup flow tests
- **FR-007**: System MUST provide a test redundancy matrix showing coverage overlap by user flow
- **FR-008**: After test suite completion, database MUST contain only 4 test users (PRIMARY, SECONDARY, TERTIARY, ADMIN)
- **FR-009**: Signup flow tests MUST clean up any dynamically created users in afterAll hooks
- **FR-010**: Tests MUST be organized in directories by user flow (onboarding, authentication, profile, etc.)

### Key Entities

- **Test User (PRIMARY)**: Main test account for most single-user tests; credentials in `TEST_USER_PRIMARY_EMAIL/PASSWORD`
- **Test User (SECONDARY)**: Second user for multi-user scenarios (messaging, connections); credentials in `TEST_USER_SECONDARY_EMAIL/PASSWORD`
- **Test User (TERTIARY)**: Third user for group interactions (3+ member conversations); credentials in `TEST_USER_TERTIARY_EMAIL/PASSWORD`
- **Test User (ADMIN)**: System user for automated messages; fixed UUID with ECDH public key stored in database
- **Test Flow**: A user journey grouping (e.g., onboarding, authentication, profile) containing related tests across all test types

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All ~2800 tests complete without OOM crashes when running `pnpm test` in Docker with 4GB memory
- **SC-002**: Full test suite execution completes in under 10 minutes
- **SC-003**: Test count reduced by at least 15% through redundancy elimination while maintaining 40%+ code coverage
- **SC-004**: After full test suite run, database contains exactly 4 test users (no orphaned dynamic users)
- **SC-005**: 100% of integration tests use pre-seeded test user credentials from `.env`
- **SC-006**: Test redundancy matrix documents coverage for all 7 user flows with overlap analysis
- **SC-007**: Peak memory usage during test execution stays under 3.5GB (leaving headroom for system)

## Assumptions

- Docker container has at least 4GB memory allocated
- Pre-seeded test users (PRIMARY, SECONDARY, TERTIARY, ADMIN) already exist in Supabase
- happy-dom is compatible with all existing test mocks and assertions
- Sequential execution is acceptable trade-off for memory stability (slightly slower)
- Some tests may need refactoring to work with shared users instead of isolated users
