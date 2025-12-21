# Feature 053: Unified Browser Event Hooks

## Priority: P1 (Performance)

## Problem Statement

Same browser events are listened to in multiple places, causing:

- Duplicate event registrations
- Inconsistent behavior
- Memory overhead
- Harder maintenance

## Current State

**Online/Offline Listeners**: 4 files with duplicate implementations
**Click Outside Pattern**: 5+ files with similar logic
**Visibility Change**: Multiple implementations

## Requirements

### Functional Requirements

1. **FR-1**: Create `useOnlineStatus` hook - single source of truth for online/offline
2. **FR-2**: Create `useClickOutside` hook - reusable click-outside detection
3. **FR-3**: Create `useVisibilityChange` hook - document visibility tracking
4. **FR-4**: Migrate existing implementations to use unified hooks
5. **FR-5**: Remove duplicate event listener code

### Non-Functional Requirements

1. **NFR-1**: Single event listener per event type globally
2. **NFR-2**: No breaking changes to existing behavior
3. **NFR-3**: Hooks must be tree-shakeable

## Success Criteria

- [ ] `useOnlineStatus` hook created and documented
- [ ] `useClickOutside` hook created and documented
- [ ] `useVisibilityChange` hook created and documented
- [ ] All duplicate implementations removed
- [ ] All existing tests pass
- [ ] Storybook stories for each hook

## Hook API Design

```typescript
// useOnlineStatus
const isOnline = useOnlineStatus();

// useClickOutside
const ref = useClickOutside<HTMLDivElement>(() => {
  setIsOpen(false);
});

// useVisibilityChange
useVisibilityChange((isVisible) => {
  if (isVisible) refetch();
});
```

## Files to Consolidate

1. Find all `addEventListener('online'` / `addEventListener('offline'`
2. Find all click-outside implementations
3. Find all `visibilitychange` listeners

## Out of Scope

- Global state management for events
- Cross-tab event synchronization
