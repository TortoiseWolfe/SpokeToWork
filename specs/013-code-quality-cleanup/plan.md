# Implementation Plan: Code Quality Cleanup

**Branch**: `013-code-quality-cleanup` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-code-quality-cleanup/spec.md`

## Summary

Refactoring initiative to eliminate type safety issues (`as any` casts), fix React hook dependencies, migrate deprecated Stripe API, clean up TODO comments, and standardize code patterns. This is a code quality improvement with no functional changes - all 2655+ existing tests must pass after completion.

## Technical Context

**Language/Version**: TypeScript 5.x with React 19, Next.js 15.5+
**Primary Dependencies**: React, Stripe.js, Supabase client, ESLint with react-hooks plugin
**Storage**: N/A (no database changes - refactoring only)
**Testing**: Vitest for unit tests, Playwright for E2E, ESLint for static analysis
**Target Platform**: Web browser (static export to GitHub Pages)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Maintain current performance; no regression from refactoring
**Constraints**: Zero functional behavior changes; all tests must continue passing
**Scale/Scope**: ~30 `as any` casts, 40+ TODOs, 1 deprecated API migration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Status | Notes                                                |
| --------------------------------- | ------ | ---------------------------------------------------- |
| I. Component Structure Compliance | PASS   | No new components - refactoring only                 |
| II. Test-First Development        | PASS   | Existing tests validate refactoring; no new features |
| III. PRP Methodology              | PASS   | Following PRP → spec → plan → tasks workflow         |
| IV. Docker-First Development      | PASS   | All commands run via Docker                          |
| V. Progressive Enhancement        | PASS   | No UX changes                                        |
| VI. Privacy & Compliance First    | PASS   | No data handling changes                             |
| VII-XII. Product Principles       | N/A    | Refactoring does not affect product functionality    |

**Build Requirements Check**:

- TypeScript compilation: VERIFY after each phase (must have zero errors)
- All tests passing: VERIFY after each phase (2655+ tests)
- No new warnings: VERIFY build output

**Gate Result**: PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```
specs/013-code-quality-cleanup/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── checklists/
│   └── requirements.md  # Quality checklist (complete)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (files to modify)

```
src/
├── lib/
│   ├── payments/
│   │   └── stripe.ts           # T001, T007: as any + deprecated API
│   └── messaging/
│       └── validation.ts       # T012: centralize regexes
├── services/
│   └── messaging/
│       ├── connection-service.ts  # T002: as any cast
│       ├── welcome-service.ts     # T003: as any cast
│       └── group-service.ts       # T009: TODO cleanup
├── contexts/
│   └── AuthContext.tsx         # T005: useEffect dependencies
├── hooks/
│   └── useConnections.ts       # T013: error handling pattern
├── types/
│   └── messaging.ts            # T011: union types
├── utils/
│   └── web3forms.ts            # T012: validation regex
└── components/
    └── organisms/
        └── ConversationList/   # T015: React.memo
```

**Structure Decision**: Existing Next.js App Router structure. Modifications only - no new directories or files except potentially a shared validation constants file.

## Complexity Tracking

_No constitution violations - refactoring scope is appropriate._

| Aspect                | Justification                                              |
| --------------------- | ---------------------------------------------------------- |
| Multiple file changes | Required to fix issues where they exist; grouped by theme  |
| Stripe API migration  | User Story P2; uses current Stripe patterns per their docs |

## Phase Summaries

### Phase 0: Research Complete

No significant unknowns for this refactoring task:

- TypeScript proper typing: Use existing type definitions or create inline types
- React hook dependencies: Follow eslint-plugin-react-hooks guidance
- Stripe migration: Follow official Stripe migration guide
- TODO cleanup: Manual review and categorization

### Phase 1: Design

This is a refactoring feature with no new data model or API contracts needed.

**Key Design Decisions**:

1. **Type Fixes Strategy**:
   - Prefer inline type definitions over `as any`
   - Use Supabase generated types where available
   - Create interface types for complex objects

2. **Hook Dependency Strategy**:
   - Wrap functions in `useCallback` when needed in dependency arrays
   - Use refs for values that shouldn't trigger re-renders
   - Follow exhaustive-deps rule strictly

3. **Stripe Migration Strategy**:
   - Replace `redirectToCheckout` with modern `stripe.checkout.sessions` approach
   - Use Stripe Elements or hosted Checkout page per current best practices

4. **TODO Cleanup Strategy**:
   - Implement: If the work is small and within scope
   - Remove: If stale or no longer relevant
   - Track: Create GitHub issue for larger items

5. **Pattern Standardization Strategy**:
   - Create union types for all status strings
   - Centralize validation in `src/lib/validation/patterns.ts`
   - Document chosen error handling pattern

## Implementation Order

1. **Type Safety (Critical)** - T001-T004
   - Fix `as any` casts starting with most critical files
   - Verify type-check passes after each file

2. **Hook Dependencies (High)** - T005-T006
   - Fix AuthContext first (security-related)
   - Audit and fix other hooks

3. **Stripe Migration (High)** - T007
   - Research current Stripe best practices
   - Migrate payment flow

4. **TODO Cleanup (Medium)** - T008-T010
   - Audit and categorize all TODOs
   - Process in priority order

5. **Pattern Standardization (Medium)** - T011-T013
   - Create shared types and validation
   - Apply consistently across codebase

6. **Minor Improvements (Low)** - T014-T015
   - Replace `!!` patterns
   - Add React.memo where beneficial

## Validation Checkpoints

After each implementation phase:

1. Run `pnpm type-check` - must pass with zero errors
2. Run `pnpm test` - all 2655+ tests must pass
3. Run `pnpm lint` - no new ESLint warnings
4. Run `pnpm build` - must complete successfully

## Risk Mitigation

| Risk                              | Mitigation                                                  |
| --------------------------------- | ----------------------------------------------------------- |
| Type fix reveals runtime bug      | Fix the bug as part of the type fix; document in commit     |
| Test mocks need updating          | Update mocks to match new types; preserve test coverage     |
| Stripe migration breaks payments  | Test with Stripe test mode; verify checkout flow end-to-end |
| Refactoring introduces regression | Run full test suite after each logical change               |
