# Feature Specification: Code Quality Cleanup

**Feature Branch**: `013-code-quality-cleanup`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "Code Quality Cleanup - Eliminate as any casts, fix React hook dependencies, migrate deprecated Stripe API, clean up TODO comments, and standardize patterns across the codebase per PRP at docs/prp-docs/013-code-quality-cleanup-prp.md"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Type-Safe Development Experience (Priority: P1)

Developers working on the codebase need type safety guarantees so that TypeScript can catch errors at compile time rather than runtime. Currently, 30+ `as any` casts bypass the type system and hide potential bugs.

**Why this priority**: Type safety is the foundation of maintainable TypeScript code. Without it, bugs slip through to production, refactoring becomes risky, and IDE assistance (autocomplete, error detection) is degraded.

**Independent Test**: Can be fully tested by running `grep -r "as any" src/` and verifying zero matches (excluding test files), then running `pnpm type-check` with no errors.

**Acceptance Scenarios**:

1. **Given** a developer searches for `as any` in src/, **When** they run the search, **Then** zero occurrences are found (excluding test files)
2. **Given** the codebase after type fixes, **When** a developer runs `pnpm type-check`, **Then** it completes with zero errors
3. **Given** a developer modifies a previously `as any` location, **When** they introduce a type error, **Then** the compiler catches it immediately

---

### User Story 2 - Predictable React Component Behavior (Priority: P1)

Users interacting with the application expect consistent behavior. React hooks with incorrect dependencies can cause stale closures, infinite loops, or missed updates that manifest as unpredictable UI behavior.

**Why this priority**: Incorrect hook dependencies can cause subtle bugs that are hard to reproduce and debug. They can lead to security issues (stale auth state) and poor user experience (UI not updating).

**Independent Test**: Can be tested by running eslint with react-hooks/exhaustive-deps rule and verifying zero warnings in production code.

**Acceptance Scenarios**:

1. **Given** AuthContext with session retry logic, **When** the session changes, **Then** the component re-renders with fresh state
2. **Given** any useEffect hook in src/, **When** a developer adds ESLint exhaustive-deps check, **Then** no dependency warnings are produced
3. **Given** a component with window focus listener, **When** dependencies change, **Then** the listener is properly cleaned up and recreated

---

### User Story 3 - Modern Payment Processing (Priority: P2)

Users making payments need a reliable, supported payment flow. The deprecated Stripe `redirectToCheckout` API may stop working without notice, potentially blocking all payments.

**Why this priority**: Payment functionality is business-critical. Using deprecated APIs risks sudden breakage and blocks access to new Stripe features and security updates.

**Independent Test**: Can be tested by initiating a payment flow and verifying it uses the current Stripe Checkout or Payment Element API without deprecation warnings.

**Acceptance Scenarios**:

1. **Given** a user initiates payment, **When** they proceed to checkout, **Then** they are directed to a modern Stripe payment interface
2. **Given** the payment module, **When** a developer checks for deprecated API usage, **Then** no `redirectToCheckout` calls are found
3. **Given** Stripe's API updates, **When** developers review the codebase, **Then** all Stripe integration uses currently supported methods

---

### User Story 4 - Clean and Maintainable Codebase (Priority: P2)

Developers maintaining the codebase need clear, actionable code without stale TODO comments. Currently 40+ TODO comments create noise and hide potentially important work items.

**Why this priority**: TODO comments that linger become invisible technical debt. Either the work should be done, tracked in an issue tracker, or removed if no longer relevant.

**Independent Test**: Can be tested by running `grep -rn "TODO" src/` and verifying the count is reduced by at least 80% from the baseline of 40+.

**Acceptance Scenarios**:

1. **Given** a TODO for a critical feature, **When** reviewed during cleanup, **Then** it is either implemented or converted to a tracked issue
2. **Given** a stale TODO that is no longer relevant, **When** reviewed during cleanup, **Then** it is removed
3. **Given** the cleaned codebase, **When** counting remaining TODOs, **Then** fewer than 10 remain (80% reduction from 40+)

---

### User Story 5 - Consistent Code Patterns (Priority: P3)

Developers reading and writing code need consistent patterns for common operations. Inconsistent patterns (different error handling, duplicated regexes, magic strings) increase cognitive load and bug risk.

**Why this priority**: Consistency reduces onboarding time, makes code reviews faster, and prevents bugs from inconsistent handling of edge cases.

**Independent Test**: Can be tested by verifying union types exist for status enums, validation regexes are centralized, and error handling follows a single pattern.

**Acceptance Scenarios**:

1. **Given** connection status values, **When** a developer uses them, **Then** they use a typed union (`'pending' | 'accepted' | 'blocked'`) not magic strings
2. **Given** email validation needed, **When** a developer implements it, **Then** they import from a centralized validation module
3. **Given** an error in a hook, **When** handling it, **Then** the pattern (setError + throw or setError only) is consistent across all hooks

---

### Edge Cases

- What happens when a type fix reveals an actual runtime bug? (Document and fix the bug as part of the type fix)
- How does the codebase handle partial migration of Stripe API? (Ensure all payment paths are migrated together to avoid mixed behavior)
- What if a TODO references code that no longer exists? (Remove the stale TODO)
- What if removing `as any` requires significant refactoring? (Prefer minimal changes that maintain type safety; document complex cases for future refactoring)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST have zero `as any` type casts in production source code (src/ excluding files matching `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `__tests__/`, `__mocks__/`)
- **FR-002**: System MUST pass TypeScript strict mode type checking with no errors
- **FR-003**: All React useEffect and useCallback hooks MUST have correct dependency arrays that satisfy react-hooks/exhaustive-deps
- **FR-004**: Payment processing MUST use current (non-deprecated) Stripe APIs
- **FR-005**: TODO comments MUST be reduced by at least 80% from the current baseline
- **FR-006**: Status strings (connection status, contribution status, etc.) MUST use TypeScript union types
- **FR-007**: Validation patterns (email, UUID) MUST be centralized in a shared module
- **FR-008**: Error handling in hooks MUST follow a consistent pattern throughout the codebase
- **FR-009**: All existing tests (2655+) MUST continue to pass after refactoring
- **FR-010**: No functional behavior changes MUST occur as a result of these refactoring changes

### Key Entities

- **Type Cast**: Location in code where `as any` bypasses TypeScript's type system; must be replaced with proper typing
- **Hook Dependency**: Values referenced inside React hooks that must be declared in dependency arrays
- **TODO Comment**: Code annotation marking incomplete or planned work; must be resolved or tracked externally
- **Validation Pattern**: Regex or function used to validate user input; must be shared to ensure consistency

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero `as any` casts remain in src/ directory (excluding test files)
- **SC-002**: TypeScript type-check passes with zero errors
- **SC-003**: ESLint react-hooks/exhaustive-deps produces zero warnings on production code
- **SC-004**: No deprecated Stripe API calls exist in the codebase
- **SC-005**: TODO count reduced from 40+ to fewer than 10 (80%+ reduction)
- **SC-006**: All 2655+ existing tests pass after refactoring
- **SC-007**: Build completes successfully with no new warnings introduced
- **SC-008**: Developers can identify the single source of truth for validation patterns
