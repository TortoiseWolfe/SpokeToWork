# Feature 052: Replace Polling with Supabase Realtime

## Priority: P1 (Performance)

## Problem Statement

Multiple components use timer-based polling when Supabase Realtime subscriptions would be more efficient and responsive.

## Affected Files

| File                               | Current Polling  | Interval |
| ---------------------------------- | ---------------- | -------- |
| `src/hooks/useOfflineQueue.ts:203` | Sync check       | 30s      |
| `src/hooks/usePaymentButton.ts:82` | Status check     | 5s       |
| `src/lib/supabase/client.ts:131`   | Connection check | 30s      |

## Current State

```typescript
// Current - wasteful polling
useEffect(() => {
  const interval = setInterval(() => {
    checkStatus();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

## Requirements

### Functional Requirements

1. **FR-1**: Replace offline queue polling with Supabase Realtime subscription
2. **FR-2**: Replace payment status polling with Realtime subscription
3. **FR-3**: Keep connection check as polling (appropriate for health checks)
4. **FR-4**: Handle subscription cleanup on unmount

### Non-Functional Requirements

1. **NFR-1**: Reduce unnecessary network requests by >80%
2. **NFR-2**: Improve response latency from 30s to <1s
3. **NFR-3**: Handle reconnection gracefully
4. **NFR-4**: Fallback to polling if Realtime unavailable

## Success Criteria

- [ ] Offline queue uses Realtime channel
- [ ] Payment status uses Realtime channel
- [ ] Network requests reduced (verify in DevTools)
- [ ] All existing tests pass
- [ ] Graceful degradation works

## Architecture

```
Supabase Realtime Channel
    ↓
useRealtimeSubscription hook (new)
    ↓
Component state update
```

## Out of Scope

- WebSocket connection pooling
- Custom WebSocket server
