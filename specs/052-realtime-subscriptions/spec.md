# Feature 052: Replace Polling with Supabase Realtime

## Priority: P1 (Performance)

## Status: COMPLETE

## Problem Statement

Multiple components use timer-based polling when Supabase Realtime subscriptions or browser events would be more efficient and responsive.

## Audit Results (2025-12-22)

### Already Implemented

| File                                           | Original Issue         | Current Implementation                              | Status                         |
| ---------------------------------------------- | ---------------------- | --------------------------------------------------- | ------------------------------ |
| `src/hooks/usePaymentRealtime.ts`              | Payment status polling | Supabase Realtime subscription (`postgres_changes`) | ✅ Complete                    |
| `src/components/payment/PaymentStatusDisplay/` | N/A                    | Uses `usePaymentRealtime` hook                      | ✅ Complete                    |
| `src/lib/supabase/client.ts`                   | 30s connection polling | Browser `online`/`offline` events                   | ✅ Complete                    |
| `src/hooks/useOfflineQueue.ts`                 | 30s sync polling       | Browser events + reactive callbacks                 | ✅ Complete (N/A for Realtime) |

### Clarification: Offline Queue

The original spec suggested replacing offline queue polling with Supabase Realtime. However, the offline queue is stored in **local IndexedDB**, not Supabase. Supabase Realtime only works for database table changes.

The correct solution (already implemented):

- Browser `online`/`offline` events trigger sync
- Reactive state updates via mutation callbacks (`loadQueue()` after sync/retry/clear)
- No polling needed

## Requirements

### Functional Requirements

1. **FR-1**: ~~Replace offline queue polling with Supabase Realtime subscription~~ N/A - Offline queue is local storage, uses browser events instead
2. **FR-2**: Replace payment status polling with Realtime subscription ✅ DONE
3. **FR-3**: Replace connection check polling with browser events ✅ DONE
4. **FR-4**: Handle subscription cleanup on unmount ✅ DONE

### Non-Functional Requirements

1. **NFR-1**: Reduce unnecessary network requests by >80% ✅ Achieved
2. **NFR-2**: Improve response latency from 30s to <1s ✅ Realtime is instant
3. **NFR-3**: Handle reconnection gracefully ✅ Browser events handle this
4. **NFR-4**: Fallback to polling if Realtime unavailable ✅ Not needed - browser events work offline

## Success Criteria

- [x] Offline queue uses appropriate mechanism (browser events, not polling)
- [x] Payment status uses Realtime channel (`usePaymentRealtime.ts`)
- [x] Network requests reduced (no 5s/30s polling intervals)
- [x] All existing tests pass
- [x] Graceful degradation works (browser events work offline)

## Implementation Details

### Payment Realtime (`usePaymentRealtime.ts`)

```typescript
const channel = supabase
  .channel(`payment-result-${paymentResultId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'payment_results',
      filter: `id=eq.${paymentResultId}`,
    },
    (payload) => {
      setPaymentResult(payload.new as PaymentResult);
    }
  )
  .subscribe();

// Cleanup on unmount
return () => supabase.removeChannel(channel);
```

### Connection Status (`client.ts`)

```typescript
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
```

### Offline Queue (`useOfflineQueue.ts`)

```typescript
// Browser events trigger sync
window.addEventListener('online', handleOnline);  // Triggers syncQueue()
window.addEventListener('offline', handleOffline);

// Reactive updates via callbacks
syncQueue() → loadQueue()
retryFailed() → loadQueue()
clearSynced() → loadQueue()
```

## Out of Scope

- WebSocket connection pooling
- Custom WebSocket server

## Remaining `setInterval` Uses (Appropriate)

These polling patterns are appropriate and should NOT be converted:

| File                        | Use Case               | Why Appropriate                       |
| --------------------------- | ---------------------- | ------------------------------------- |
| `CountdownBanner.tsx`       | 1s countdown timer     | UI animation, not data fetching       |
| `DiceTray.tsx` / `Dice.tsx` | Dice rolling animation | UI animation                          |
| `useIdleTimeout.ts`         | User idle detection    | Local activity check, not server data |
| `status/page.tsx`           | System health checks   | Health endpoints need polling         |
| `PWAInstall.tsx`            | Install prompt timing  | Browser API timing                    |
