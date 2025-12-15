# Implementation Plan: Test Coverage Expansion

**Branch**: `052-test-coverage` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/052-test-coverage/spec.md`

## Summary

Expand test coverage for 25 untested files (9 core + 16 hooks) to achieve 70%+ lib/services/hooks coverage. Focus on unit tests with mocked external dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x with React 19
**Primary Dependencies**: Vitest 3.2.4, @testing-library/react, happy-dom
**Storage**: Supabase (mocked in tests)
**Testing**: Vitest with React Testing Library
**Target Platform**: Browser (Next.js 15)
**Project Type**: Web application
**Performance Goals**: Tests complete in <2 minutes total
**Constraints**: No network calls in unit tests, mock all external services
**Scale/Scope**: 25 new test files, ~500-800 test cases

## Constitution Check

| Principle                | Status  | Notes                                          |
| ------------------------ | ------- | ---------------------------------------------- |
| Docker-first development | ✅ Pass | All tests run via `docker compose exec`        |
| 5-file component pattern | N/A     | Testing existing code, not creating components |
| No technical debt        | ✅ Pass | Tests reduce debt by covering gaps             |

## Project Structure

### Documentation (this feature)

```text
docs/specs/052-test-coverage/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Testing patterns research
├── tasks.md             # Implementation tasks
└── checklists/
    └── requirements.md  # Quality checklist
```

### Test Files to Create

```text
# Core Files (9)
src/lib/auth/__tests__/retry-utils.test.ts
src/lib/payments/__tests__/connection-listener.test.ts
src/lib/routing/__tests__/osrm-service.test.ts
src/lib/routes/__tests__/route-service.test.ts
src/lib/routes/__tests__/route-export.test.ts
src/contexts/__tests__/AuthContext.test.tsx
src/lib/supabase/__tests__/client.test.ts
src/lib/supabase/__tests__/middleware.test.ts
src/contexts/__tests__/AccessibilityContext.test.tsx

# Hooks (16)
src/hooks/__tests__/useCodeBlockPreferences.test.ts
src/hooks/__tests__/useCompanies.test.ts
src/hooks/__tests__/useConnections.test.ts
src/hooks/__tests__/useGroupMembers.test.ts
src/hooks/__tests__/useIdleTimeout.test.ts
src/hooks/__tests__/useKeyboardShortcuts.test.ts
src/hooks/__tests__/useMetroAreas.test.ts
src/hooks/__tests__/useOfflineStatus.test.ts
src/hooks/__tests__/usePaymentButton.test.ts
src/hooks/__tests__/usePaymentConsent.test.ts
src/hooks/__tests__/usePaymentRealtime.test.ts
src/hooks/__tests__/useReadReceipts.test.ts
src/hooks/__tests__/useRoutes.test.ts
src/hooks/__tests__/useTileProviders.test.ts
src/hooks/__tests__/useUnreadCount.test.ts
src/hooks/__tests__/useUserProfile.test.ts
```

## Implementation Phases

### Phase 1: Setup (T001-T002)

- Verify test infrastructure
- Create shared test utilities if needed

### Phase 2: Critical Tests - Auth/Payments (T003-T006)

- retry-utils.ts - Pure logic, no mocking needed
- connection-listener.ts - Mock online/offline events
- AuthContext.tsx - Mock Supabase auth
- Supabase client/middleware - Mock createClient

### Phase 3: Service Tests - Routing (T007-T009)

- osrm-service.ts - Mock fetch calls
- route-service.ts - Mock Supabase queries
- route-export.ts - Test export formats

### Phase 4: Context Tests (T010)

- AccessibilityContext.tsx - Test state changes

### Phase 5: Hook Tests (T011-T026)

- 16 hooks with mocked dependencies
- Focus on happy paths and error cases

### Phase 6: Verification (T027-T028)

- Run full test suite
- Verify coverage targets met

## Dependencies

```
Vitest (installed)
@testing-library/react (installed)
@testing-library/user-event (installed)
happy-dom (installed)
```

## Mocking Strategy

| Dependency     | Mock Approach                                |
| -------------- | -------------------------------------------- |
| Supabase       | `vi.mock('@/lib/supabase/client')`           |
| Fetch/API      | `vi.fn()` with resolved values               |
| Online/Offline | `Object.defineProperty(navigator, 'onLine')` |
| localStorage   | happy-dom built-in                           |
| React Context  | Wrapper components                           |

## Success Criteria

1. All 25 test files created
2. Each file has >80% coverage of its target
3. All tests pass in CI
4. No flaky tests
5. Total test runtime <2 minutes
