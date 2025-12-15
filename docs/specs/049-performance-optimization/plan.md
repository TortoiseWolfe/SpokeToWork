# Implementation Plan: 049-performance-optimization

**Feature**: Performance Optimization
**Created**: 2025-12-15
**Status**: Ready for Implementation

---

## Technical Context

### Technology Stack

- **Frontend**: React 19, Next.js 15, TypeScript 5.x
- **State**: React hooks, TanStack Query
- **Realtime**: Supabase Realtime (WebSocket)
- **Testing**: Vitest, React Testing Library, Playwright

### Existing Patterns

- **Realtime**: `RealtimeService` singleton in `src/lib/messaging/realtime.ts`
- **Hooks**: Standard hook pattern with cleanup in `useEffect` return
- **Memoization**: `memo()` for components, `useCallback`/`useMemo` for functions

---

## Constitution Check

| Principle            | Compliance | Notes                                                  |
| -------------------- | ---------- | ------------------------------------------------------ |
| Proper Solutions     | ✅         | Using proper React patterns (useCallback, memo)        |
| Root Cause Analysis  | ✅         | Addressing underlying performance issues, not symptoms |
| Stability Over Speed | ✅         | Will include fallback for realtime failures            |
| Clean Architecture   | ✅         | Creating reusable hooks, following existing patterns   |
| No Technical Debt    | ✅         | Full implementation, no TODOs                          |
| Docker-First         | ✅         | All development through Docker                         |
| Component Structure  | N/A        | Hooks don't need 5-file pattern (per clarification)    |

---

## Implementation Phases

### Phase 1: P0 - Memoization (Critical)

**Goal**: Eliminate unnecessary re-renders in list components

#### 1.1 ConversationList Optimization

**File**: `src/components/organisms/ConversationList/ConversationList.tsx`

Changes:

1. Import `useCallback` from React
2. Wrap handlers with `useCallback`:
   - `handleSearchChange` - deps: `[setSearchQuery]`
   - `handleClearSearch` - deps: `[setSearchQuery]`
   - `handleConversationClick` - deps: `[router]`
3. Replace inline arrow functions in JSX:
   - Create memoized click handler factory
   - Use `data-id` attribute pattern or Map-based memoization

#### 1.2 ConnectionManager Optimization

**File**: `src/components/organisms/ConnectionManager/ConnectionManager.tsx`

Changes:

1. Import `useCallback` from React
2. Wrap handlers with `useCallback`:
   - `handleAccept` - deps: `[acceptRequest]`
   - `handleDecline` - deps: `[declineRequest]`
   - `handleBlock` - deps: `[blockUser]`
   - `handleRemove` - deps: `[removeConnection]`
3. Consider memoizing `renderConnectionItem` or extracting to component

### Phase 2: P1 - Replace Polling with Realtime

**Goal**: Eliminate setInterval polling for pushable data

#### 2.1 useOfflineQueue Realtime

**File**: `src/hooks/useOfflineQueue.ts`

Changes:

1. Remove `setInterval(loadQueue, 30000)` pattern
2. Add Supabase realtime subscription:
   ```typescript
   const channel = supabase
     .channel('offline-queue-changes')
     .on(
       'postgres_changes',
       {
         event: '*',
         schema: 'public',
         table: 'offline_queue',
         filter: `user_id=eq.${userId}`,
       },
       handleQueueChange
     )
     .subscribe();
   ```
3. Add fallback: If subscription fails, log warning and use polling

#### 2.2 usePaymentButton Realtime

**File**: `src/hooks/usePaymentButton.ts`

Changes:

1. Remove `setInterval(checkQueue, 5000)` pattern
2. Add realtime subscription for pending operations
3. Graceful degradation on failure

#### 2.3 Connection Status

**Files**:

- `src/lib/payments/connection-listener.ts`
- `src/lib/supabase/client.ts`

Changes:

1. Remove 30s polling interval
2. Use browser `online`/`offline` events as primary signal
3. Use Supabase channel connection state as secondary signal
4. Keep lightweight heartbeat only for edge cases

### Phase 3: P2 - Consolidated Hooks

**Goal**: Single listener per global event type

#### 3.1 useOnlineStatus Hook (FR-006)

**File**: `src/hooks/useOnlineStatus.ts` (new)

```typescript
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

**Refactor targets**:

- `useOfflineStatus.ts` → use `useOnlineStatus`
- `useNetworkStatus.ts` → use `useOnlineStatus`
- `useOfflineQueue.ts` → use `useOnlineStatus`
- `connection-listener.ts` → use `useOnlineStatus`

#### 3.2 useClickOutside Hook (FR-007)

**File**: `src/hooks/useClickOutside.ts` (new)

```typescript
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler, enabled]);
}
```

**Refactor targets**:

- ColorblindToggle
- FontSwitcher
- CompanyDetailDrawer
- RouteDetailDrawer
- TileLayerSelector

#### 3.3 useVisibilityChange Hook (FR-008)

**File**: `src/hooks/useVisibilityChange.ts` (new)

```typescript
export function useVisibilityChange(
  onVisible?: () => void,
  onHidden?: () => void
): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible && onVisible) onVisible();
      if (!visible && onHidden) onHidden();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onVisible, onHidden]);

  return isVisible;
}
```

**Refactor targets**:

- useUnreadCount.ts
- useReadReceipts.ts
- connection-listener.ts

#### 3.4 useWindowResize Hook (FR-009)

**File**: `src/hooks/useWindowResize.ts` (new)

Hook for window resize handling, integrating with existing `useDeviceType`.

**Refactor targets**:

- MapContainerInner.tsx (lines 141-153: window resize listener)

#### 3.5 useEscapeKey Hook (FR-010)

**File**: `src/hooks/useEscapeKey.ts` (new)

```typescript
export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handler, enabled]);
}
```

**Refactor targets**:

- CompanyDetailDrawer
- RouteDetailDrawer
- TileLayerSelector
- ReAuthModal
- ConsentModal

---

## Risk Mitigation

### Realtime Connection Failures

- **Risk**: Supabase realtime unavailable
- **Mitigation**: Graceful degradation to polling with warning log
- **Pattern**: Try/catch subscription, fall back to setInterval

### Memoization Dependencies

- **Risk**: Stale closures if dependencies wrong
- **Mitigation**: Use ESLint exhaustive-deps rule, test thoroughly
- **Pattern**: List all dependencies, prefer stable references

### Hook Migration Breaking Changes

- **Risk**: Components break during refactor
- **Mitigation**: Migrate one component at a time, test each
- **Pattern**: Keep old code until new hook verified

---

## Testing Strategy

### Unit Tests

- Test each new hook in isolation
- Mock browser APIs (navigator.onLine, document.hidden)
- Test cleanup functions

### Integration Tests

- Test realtime subscription with mock Supabase
- Test fallback behavior when subscription fails

### Manual Verification

- React Profiler for memoization (< 5% wasted renders)
- Network tab for polling elimination
- Performance tab for CPU usage

---

## Success Criteria

| Metric             | Target  | How to Measure  |
| ------------------ | ------- | --------------- |
| Wasted renders     | < 5%    | React Profiler  |
| Polling requests   | -90%    | Network tab     |
| CPU usage          | Reduced | Performance tab |
| Hook consolidation | 5 hooks | Code review     |
