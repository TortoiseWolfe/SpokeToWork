# Feature Specification: Performance Optimization

**Feature Branch**: `049-performance-optimization`
**Created**: 2025-12-13
**Status**: Draft
**Priority**: P1 (High)
**Input**: Code review findings - missing memoization, polling patterns, duplicate listeners

## Execution Flow (main)

```
1. Parse input from performance code review
   → Feature: Optimize React rendering and event handling
2. Extract key performance issues
   → High: Missing useCallback in list components
   → Medium: Polling instead of Supabase realtime
   → Medium: Duplicate event listeners across components
3. Identify affected users
   → All users: Improved responsiveness and battery life
   → Mobile users: Reduced CPU/memory usage
4. Generate Functional Requirements
   → P0: Add memoization to list components
   → P1: Replace polling with realtime subscriptions
   → P2: Consolidate event listeners into hooks
5. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines

- Focus on WHAT performance outcomes are needed
- Avoid implementation specifics (let devs choose approach)
- Written for performance stakeholders

---

## Problem Statement

The application has several performance inefficiencies identified during code review:

### 1. Missing Memoization

List components pass new function references on every render, causing unnecessary child re-renders:

- `ConversationList.tsx` - search and click handlers
- `ConnectionManager.tsx` - accept/decline/block handlers

### 2. Polling Instead of Realtime

Timer-based polling creates unnecessary network requests when Supabase realtime could push updates:

- `useOfflineQueue.ts` - 30s polling for queue status
- `usePaymentButton.ts` - 5s polling for pending count
- `client.ts` - 30s connection status check

### 3. Duplicate Event Listeners

Same global events listened to in multiple components:

- 4 files with `online`/`offline` listeners
- 5+ components with click-outside detection
- 3 files with `visibilitychange` listeners

---

## User Scenarios & Testing

### Primary Performance Story

As a user on a mobile device, I need the app to be responsive and battery-efficient so that I can use it throughout the day without draining my phone.

### Critical Performance Scenarios

#### Scenario 1: List Rendering Efficiency

1. **Given** I have a conversation list with 50 items, **When** I type in the search box, **Then** only the search input and filtered results re-render
2. **Given** I'm viewing connections, **When** I click accept on one request, **Then** other connection items don't re-render
3. **Given** React Profiler is enabled, **When** I interact with lists, **Then** unnecessary re-renders are < 5% of total renders

**Acceptance Criteria:**

- List item components are memoized
- Handlers passed to list items are stable (useCallback)
- React Profiler shows minimal wasted renders

#### Scenario 2: Realtime Updates

1. **Given** my device is connected, **When** a new message arrives, **Then** I see it immediately (< 1s) without waiting for poll
2. **Given** the offline queue changes, **When** I'm viewing the queue status, **Then** count updates in realtime
3. **Given** I'm monitoring payments, **When** status changes on server, **Then** UI reflects change within 1 second

**Acceptance Criteria:**

- Updates arrive via WebSocket, not polling
- No setInterval for data that Supabase can push
- Battery usage reduced when app is idle

#### Scenario 3: Consolidated Event Handling

1. **Given** I go offline, **When** the event fires, **Then** only one listener processes it and shares state
2. **Given** I click outside a dropdown, **When** the event fires, **Then** a shared hook handles detection
3. **Given** the visibility changes, **When** the event fires, **Then** one hook notifies all subscribers

**Acceptance Criteria:**

- Single listener per global event type
- Shared hooks distribute state to consumers
- No duplicate `addEventListener` calls for same event

---

## Functional Requirements

### P0 - Critical (Must Have)

| ID     | Requirement                                 | Acceptance Criteria                                   |
| ------ | ------------------------------------------- | ----------------------------------------------------- |
| FR-001 | ConversationList handlers must be memoized  | React Profiler shows no wasted renders on child items |
| FR-002 | ConnectionManager handlers must be memoized | Accept/decline clicks don't re-render other items     |

### P1 - High Priority

| ID     | Requirement                                                    | Acceptance Criteria                |
| ------ | -------------------------------------------------------------- | ---------------------------------- |
| FR-003 | Offline queue status must use realtime subscription            | No setInterval in useOfflineQueue  |
| FR-004 | Payment pending count must use realtime subscription           | No setInterval in usePaymentButton |
| FR-005 | Connection status must use browser events + Supabase heartbeat | No 30s polling interval            |

### P2 - Medium Priority

| ID     | Requirement                                              | Acceptance Criteria            |
| ------ | -------------------------------------------------------- | ------------------------------ |
| FR-006 | Create `useOnlineStatus` hook for network status         | 4 files consolidated to 1 hook |
| FR-007 | Create `useClickOutside` hook for dropdown/modal closing | 5+ components use shared hook  |
| FR-008 | Create `useVisibilityChange` hook for tab focus          | 3 files consolidated to 1 hook |
| FR-009 | Create `useWindowResize` hook using useDeviceType        | Map components use shared hook |

---

## Files Affected

### Memoization (P0)

- `src/components/organisms/ConversationList/ConversationList.tsx`
- `src/components/organisms/ConnectionManager/ConnectionManager.tsx`

### Realtime Replacement (P1)

- `src/hooks/useOfflineQueue.ts`
- `src/hooks/usePaymentButton.ts`
- `src/lib/supabase/client.ts`
- `src/lib/payments/connection-listener.ts`

### Unified Hooks (P2)

- `src/hooks/useOnlineStatus.ts` (new)
- `src/hooks/useClickOutside.ts` (new)
- `src/hooks/useVisibilityChange.ts` (new)
- Refactor: `useOfflineStatus.ts`, `useNetworkStatus.ts`, multiple components

---

## Success Metrics

1. **Rendering**: React Profiler wasted renders < 5%
2. **Network**: 90% reduction in polling requests
3. **Battery**: Background CPU usage reduced (measure with Chrome DevTools)
4. **Code**: 4 duplicate event patterns consolidated to 4 reusable hooks

---

## Clarifications

### Session 2025-12-15

**Q1: Hook Testing Requirements**

- **Decision**: Unit tests only for new hooks (useOnlineStatus, useClickOutside, etc.)
- **Rationale**: Hooks are utilities, not UI components - they don't need Storybook or a11y tests
- **Pattern**: Create `src/hooks/useHookName.ts` with corresponding `src/hooks/__tests__/useHookName.test.ts`

**Q2: Realtime Fallback Behavior**

- **Decision**: Graceful degradation - fall back to polling only if realtime fails
- **Rationale**: Maintains functionality while logging warning for debugging
- **Pattern**: Try realtime subscription first, catch errors, fall back to setInterval with warning log

**Q3: Additional Hook - useEscapeKey**

- **Decision**: Add FR-010 for useEscapeKey hook
- **Rationale**: Found 5 components with duplicate Escape key handlers during exploration
- **Scope**: Consolidate Escape key handling in drawers and modals

### Additional Requirement

| ID     | Requirement                                       | Acceptance Criteria          |
| ------ | ------------------------------------------------- | ---------------------------- |
| FR-010 | Create `useEscapeKey` hook for modal/drawer close | 5 components use shared hook |
