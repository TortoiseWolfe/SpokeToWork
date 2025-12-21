# Feature 055: Test Coverage Expansion

## Priority: P2 (Quality)

## Problem Statement

~54% of lib/services/hooks files have tests. Critical paths lack coverage.

## Current State

**Overall Coverage**: ~54% of lib/services/hooks files have tests

## Critical Untested Files (Need Tests Immediately)

| File                                      | Risk               |
| ----------------------------------------- | ------------------ |
| `src/lib/payments/stripe.ts`              | Payment processing |
| `src/lib/payments/paypal.ts`              | Payment processing |
| `src/lib/auth/retry-utils.ts`             | Auth reliability   |
| `src/lib/auth/protected-route.tsx`        | Route security     |
| `src/lib/payments/connection-listener.ts` | Payment sync       |

## High Priority Untested Files

| File                                      | Area              |
| ----------------------------------------- | ----------------- |
| `src/lib/routing/osrm-service.ts`         | Route calculation |
| `src/lib/routes/route-service.ts`         | Route CRUD        |
| `src/lib/routes/route-export.ts`          | Route export      |
| `src/lib/messaging/database.ts`           | Message DB ops    |
| `src/services/messaging/group-service.ts` | Group messaging   |
| `src/contexts/AuthContext.tsx`            | Auth state        |
| `src/lib/supabase/client.ts`              | Supabase client   |
| `src/lib/supabase/server.ts`              | Server operations |
| `src/lib/supabase/middleware.ts`          | Middleware        |

## Untested Hooks (17 total)

- useOfflineStatus
- useReadReceipts
- useKeyboardShortcuts
- useIdleTimeout
- useMetroAreas
- useCompanies
- useConnections
- useGroupMembers
- useUnreadCount
- useUserProfile
- useTileProviders
- useRoutes
- And 5 more...

## Requirements

### Functional Requirements

1. **FR-1**: Add unit tests for all critical payment files
2. **FR-2**: Add unit tests for auth utilities
3. **FR-3**: Add unit tests for routing services
4. **FR-4**: Add unit tests for messaging database operations
5. **FR-5**: Add unit tests for untested hooks

### Non-Functional Requirements

1. **NFR-1**: Achieve >80% coverage for critical files
2. **NFR-2**: Achieve >70% overall coverage
3. **NFR-3**: Tests must be maintainable (no brittle mocks)

## Success Criteria

- [ ] All critical files have >80% coverage
- [ ] All high priority files have >70% coverage
- [ ] Hook coverage increased to >60%
- [ ] Overall coverage >70%

## Testing Approach

1. Use Vitest with happy-dom for unit tests
2. Mock Supabase client for database tests
3. Use MSW for API mocking where appropriate
4. Focus on edge cases and error handling

## Out of Scope

- E2E test expansion (separate effort)
- Visual regression testing
