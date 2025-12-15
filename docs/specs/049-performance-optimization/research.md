# Research: 049-performance-optimization

**Feature**: Performance Optimization
**Date**: 2025-12-15

---

## Investigation Summary

Comprehensive analysis of performance issues in the SpokeToWork codebase, focusing on React rendering optimization, Supabase realtime patterns, and event listener consolidation.

---

## Findings

### 1. Memoization Analysis (P0)

#### ConversationList.tsx

**Location**: `src/components/organisms/ConversationList/ConversationList.tsx`

**Current Issues**:

- Lines 274-276: Inline arrow functions create new references every render
  ```tsx
  onClick={() => handleConversationClick(conv.id)}
  onArchive={() => archiveConversation(conv.id)}
  onUnarchive={() => unarchiveConversation(conv.id)}
  ```
- Handlers `handleSearchChange`, `handleClearSearch`, `handleConversationClick` not wrapped in `useCallback`
- Child components (ConversationListItem) re-render unnecessarily

**Impact**: With 50+ conversations, every keystroke in search causes 50+ re-renders.

#### ConnectionManager.tsx

**Location**: `src/components/organisms/ConnectionManager/ConnectionManager.tsx`

**Current Issues**:

- Lines 51-86: `handleAccept`, `handleDecline`, `handleBlock`, `handleRemove` redefined every render
- `renderConnectionItem` function recreated each render

**Impact**: Accept/decline on one connection triggers re-render of all connection items.

---

### 2. Polling Pattern Analysis (P1)

#### useOfflineQueue.ts

**Location**: `src/hooks/useOfflineQueue.ts` (lines 172-206)

```typescript
// Current: Poll queue every 30 seconds
const interval = setInterval(loadQueue, 30000);
```

**Impact**: 2,880 unnecessary requests per day when app is open but idle.

#### usePaymentButton.ts

**Location**: `src/hooks/usePaymentButton.ts` (lines 76-84)

```typescript
// Current: Poll pending count every 5 seconds
const interval = setInterval(checkQueue, 5000);
```

**Impact**: 17,280 unnecessary requests per day for payment status.

#### connection-listener.ts

**Location**: `src/lib/payments/connection-listener.ts` (line 49)

```typescript
// Current: Check connection every 30 seconds
listenerInterval = setInterval(checkConnection, 30000);
```

**Impact**: Pings database every 30s just to check if online.

---

### 3. Existing Realtime Patterns

The codebase already has well-established realtime patterns to follow:

#### RealtimeService (Singleton Pattern)

**Location**: `src/lib/messaging/realtime.ts`

```typescript
export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToMessages(conversation_id: string, callback: Function): () => void {
    const channel = supabase
      .channel(`messages:${conversation_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation_id}`,
        },
        callback
      )
      .subscribe();

    return () => channel.unsubscribe();
  }
}
```

#### usePaymentRealtime (Hook Pattern)

**Location**: `src/hooks/usePaymentRealtime.ts`

```typescript
useEffect(() => {
  // Fetch initial data
  fetchInitialData();

  // Subscribe to updates
  const channel = supabase
    .channel(`payment-result-${id}`)
    .on('postgres_changes', {...}, handleUpdate)
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [id]);
```

---

### 4. Event Listener Duplication Analysis (P2)

#### Online/Offline Listeners (4 files)

| File                     | Lines   | Pattern                                       |
| ------------------------ | ------- | --------------------------------------------- |
| `useOfflineStatus.ts`    | 53-86   | `window.addEventListener('online'/'offline')` |
| `useNetworkStatus.ts`    | 21-41   | `window.addEventListener('online'/'offline')` |
| `useOfflineQueue.ts`     | 151-170 | `window.addEventListener('online'/'offline')` |
| `connection-listener.ts` | 52-65   | `window.addEventListener('online')`           |

#### Click-Outside Listeners (5 files)

| File                      | Lines   | Pattern                                  |
| ------------------------- | ------- | ---------------------------------------- |
| `ColorblindToggle.tsx`    | 19-35   | `document.addEventListener('mousedown')` |
| `FontSwitcher.tsx`        | 26-40   | `document.addEventListener('mousedown')` |
| `CompanyDetailDrawer.tsx` | ~274+   | `document.addEventListener('mousedown')` |
| `RouteDetailDrawer.tsx`   | 232-251 | `document.addEventListener('mousedown')` |
| `TileLayerSelector.tsx`   | 45-58   | `document.addEventListener('mousedown')` |

#### Visibility Change Listeners (3 files)

| File                     | Lines   | Pattern                                         |
| ------------------------ | ------- | ----------------------------------------------- |
| `useUnreadCount.ts`      | 94-108  | `document.addEventListener('visibilitychange')` |
| `useReadReceipts.ts`     | 150-163 | `document.addEventListener('visibilitychange')` |
| `connection-listener.ts` | 52-57   | `document.addEventListener('visibilitychange')` |

#### Escape Key Listeners (5 files)

| File                      | Lines   | Pattern                                |
| ------------------------- | ------- | -------------------------------------- |
| `CompanyDetailDrawer.tsx` | 254-268 | `document.addEventListener('keydown')` |
| `RouteDetailDrawer.tsx`   | 254-268 | `document.addEventListener('keydown')` |
| `TileLayerSelector.tsx`   | 61-70   | `document.addEventListener('keydown')` |
| `ReAuthModal.tsx`         | 125-138 | `document.addEventListener('keydown')` |
| `ConsentModal.tsx`        | 95-108  | `document.addEventListener('keydown')` |

---

## Technical Decisions

| Decision                                  | Rationale                                    | Alternatives Considered              |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------ |
| useCallback for handlers                  | Prevents child re-renders, stable references | useMemo (overkill for functions)     |
| Supabase realtime for polling replacement | Already in use, well-tested, WebSocket-based | Custom WebSocket (reinventing wheel) |
| Graceful degradation to polling           | Maintains functionality when realtime fails  | Hard failure (poor UX)               |
| Hooks for event consolidation             | Reusable, testable, follows React patterns   | Context (overkill), HOC (outdated)   |
| Unit tests only for hooks                 | Hooks are utilities, not UI components       | Full 5-file pattern (unnecessary)    |

---

## Performance Baseline

### Current State (to measure before implementation)

- React Profiler: Record interaction, note wasted render %
- Network tab: Count polling requests over 1 minute
- Performance tab: Record CPU usage during idle

### Target State (to verify after implementation)

- Wasted renders: < 5%
- Polling requests: -90%
- CPU usage: Reduced during idle

---

## References

- [React useCallback docs](https://react.dev/reference/react/useCallback)
- [Supabase Realtime docs](https://supabase.com/docs/guides/realtime)
- [React memo docs](https://react.dev/reference/react/memo)
