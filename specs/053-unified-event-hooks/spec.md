# Feature 053: Unified Browser Event Hooks

## Priority: P1 (Performance)

## Status: COMPLETE

## Problem Statement

Same browser events are listened to in multiple places, causing:

- Duplicate event registrations
- Inconsistent behavior
- Memory overhead
- Harder maintenance

## Audit Results (2025-12-22)

### Unified Hooks (Already Implemented)

| Hook                  | File                               | Purpose                       | Status      |
| --------------------- | ---------------------------------- | ----------------------------- | ----------- |
| `useOnlineStatus`     | `src/hooks/useOnlineStatus.ts`     | Browser online/offline status | ✅ Complete |
| `useClickOutside`     | `src/hooks/useClickOutside.ts`     | Click-outside detection       | ✅ Complete |
| `useVisibilityChange` | `src/hooks/useVisibilityChange.ts` | Document visibility tracking  | ✅ Complete |

### Migration Status

| File                    | Before               | After                  | Status      |
| ----------------------- | -------------------- | ---------------------- | ----------- |
| `ColorblindToggle.tsx`  | Inline click-outside | `useClickOutside` hook | ✅ Migrated |
| `FontSwitcher.tsx`      | Inline click-outside | `useClickOutside` hook | ✅ Migrated |
| `TileLayerSelector.tsx` | Inline click-outside | `useClickOutside` hook | ✅ Migrated |

### Non-Hook Code (Appropriate As-Is)

These files use event listeners but are NOT React components, so hooks don't apply:

| File                     | Events                       | Reason                                                   |
| ------------------------ | ---------------------------- | -------------------------------------------------------- |
| `useOfflineQueue.ts`     | `online`/`offline`           | Triggers syncQueue on reconnect - custom behavior needed |
| `connection-listener.ts` | `online`, `visibilitychange` | Non-React module for payment sync                        |
| `client.ts`              | `online`/`offline`           | Utility function `onConnectionChange`                    |

## Requirements

### Functional Requirements

1. **FR-1**: Create `useOnlineStatus` hook ✅ EXISTS
2. **FR-2**: Create `useClickOutside` hook ✅ EXISTS
3. **FR-3**: Create `useVisibilityChange` hook ✅ EXISTS
4. **FR-4**: Migrate existing implementations to use unified hooks ✅ DONE
5. **FR-5**: Remove duplicate event listener code ✅ DONE

### Non-Functional Requirements

1. **NFR-1**: Single event listener per event type globally ✅ Via hooks
2. **NFR-2**: No breaking changes to existing behavior ✅ Verified
3. **NFR-3**: Hooks must be tree-shakeable ✅ Named exports

## Success Criteria

- [x] `useOnlineStatus` hook created and documented
- [x] `useClickOutside` hook created and documented
- [x] `useVisibilityChange` hook created and documented
- [x] All duplicate implementations removed (3 components migrated)
- [x] All existing tests pass
- [ ] Storybook stories for each hook (hooks don't need stories - they're utilities)

## Hook API Design

```typescript
// useOnlineStatus
const isOnline = useOnlineStatus();

// useClickOutside
const ref = useRef<HTMLDivElement>(null);
useClickOutside(ref, () => setIsOpen(false), isOpen);

// useVisibilityChange
const isVisible = useVisibilityChange(
  () => console.log('Tab active'),
  () => console.log('Tab hidden')
);
```

## Out of Scope

- Global state management for events
- Cross-tab event synchronization
- Converting non-React modules to use hooks
