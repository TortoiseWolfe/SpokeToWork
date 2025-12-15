# Research: Test Coverage Expansion

**Feature**: 052-test-coverage
**Date**: 2025-12-15

## Technical Decisions

### D1: Test Framework

**Decision**: Use Vitest with React Testing Library
**Rationale**: Already configured in project, fast execution, good React support
**Alternatives Considered**:

- Jest: Slower, more configuration needed
- Playwright: Overkill for unit tests

### D2: DOM Environment

**Decision**: Use happy-dom for most tests, jsdom for edge cases
**Rationale**: happy-dom is faster, already default in vitest.config.ts
**Alternatives Considered**:

- jsdom only: 2-3x slower
- Browser tests: Too slow for unit tests

### D3: Mocking Strategy

**Decision**: Use vi.mock() at module level, vi.fn() for function mocks
**Rationale**: Consistent with existing test patterns in codebase
**Alternatives Considered**:

- MSW (Mock Service Worker): Good for integration tests, overkill for units
- Manual mocks: More maintenance burden

## Testing Patterns by File Type

### Pure Logic Files (retry-utils.ts, route-export.ts)

```typescript
// No mocking needed - test inputs and outputs directly
describe('retryWithBackoff', () => {
  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    });

    const result = await retryWithBackoff(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
```

### Supabase Service Files (route-service.ts, osrm-service.ts)

```typescript
// Mock Supabase client at module level
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  },
}));

describe('RouteService', () => {
  it('should fetch routes for user', async () => {
    const routes = await RouteService.getRoutes('user-123');
    expect(routes).toEqual([]);
  });
});
```

### React Context Files (AuthContext.tsx, AccessibilityContext.tsx)

```typescript
// Test with renderHook from @testing-library/react
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const wrapper = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  it('should provide auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });
});
```

### Custom Hooks (useCompanies, useRoutes, etc.)

```typescript
// Mock dependencies, test hook behavior
vi.mock('@/lib/supabase/client');
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

describe('useCompanies', () => {
  it('should return companies list', () => {
    const { result } = renderHook(() => useCompanies());
    expect(result.current.companies).toEqual([]);
  });
});
```

### Event-Based Files (connection-listener.ts)

```typescript
// Mock window events and test handlers
describe('ConnectionListener', () => {
  it('should sync on reconnect', () => {
    const onSync = vi.fn();
    const listener = new ConnectionListener({ onSync });

    // Simulate offline -> online
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));

    expect(onSync).toHaveBeenCalled();
  });
});
```

## Coverage Targets by Priority

| Priority    | Files                            | Target Coverage |
| ----------- | -------------------------------- | --------------- |
| P0 Critical | retry-utils, connection-listener | >90%            |
| P1 High     | routing services, contexts       | >80%            |
| P2 Medium   | hooks                            | >70%            |

## Known Challenges

### C1: TanStack Query Hooks

Many hooks use `useQuery`/`useMutation`. Need to mock the query client.

**Solution**: Create shared QueryClientWrapper in test utils.

### C2: Supabase Realtime Subscriptions

Some hooks subscribe to realtime channels.

**Solution**: Mock the channel subscription, test callback handlers.

### C3: Browser APIs (geolocation, clipboard, etc.)

Some hooks use browser-specific APIs.

**Solution**: Mock via `Object.defineProperty` or happy-dom built-ins.

## Test File Naming Convention

```
src/lib/auth/__tests__/retry-utils.test.ts
src/hooks/__tests__/useCompanies.test.ts
src/contexts/__tests__/AuthContext.test.tsx
```

- Use `__tests__` directories adjacent to source
- Match source file name with `.test.ts(x)` suffix
- Use `.tsx` extension when testing React components/hooks
