# Research: Code Quality Cleanup

**Feature**: 013-code-quality-cleanup
**Date**: 2025-12-06

## Overview

This document captures research findings for the code quality cleanup feature. Since this is primarily a refactoring effort with established best practices, research is focused on specific technical decisions.

## Topic 1: TypeScript `as any` Replacement Strategies

### Decision

Replace `as any` casts with proper TypeScript types using a combination of:

1. Existing Supabase generated types
2. Inline type assertions with specific types
3. New interface definitions where needed

### Rationale

- `as any` bypasses TypeScript's type checking entirely
- Proper types enable IDE autocomplete and error detection
- Type safety prevents runtime errors from reaching production

### Alternatives Considered

| Alternative          | Rejected Because                                           |
| -------------------- | ---------------------------------------------------------- |
| `as unknown as Type` | Still bypasses checking; prefer direct typing              |
| Type guards          | Overkill for simple cases; use where type narrowing needed |
| `// @ts-ignore`      | Worse than `as any`; hides errors completely               |

### Implementation Pattern

```typescript
// Before: (stripe as any).redirectToCheckout
// After: stripe.redirectToCheckout as Stripe.RedirectToCheckoutResult

// Before: (msgClient as any).from('conversations')
// After: Define proper Supabase client type with schema
```

## Topic 2: React Hook Dependency Best Practices

### Decision

Follow ESLint `react-hooks/exhaustive-deps` rule strictly with these patterns:

1. Wrap callback functions in `useCallback`
2. Use refs for values that shouldn't trigger re-renders
3. Add all referenced values to dependency arrays

### Rationale

- Stale closures cause subtle bugs that are hard to debug
- Inconsistent state can lead to security issues (auth state)
- ESLint rule catches 95%+ of dependency issues

### Alternatives Considered

| Alternative               | Rejected Because                              |
| ------------------------- | --------------------------------------------- |
| Disable rule per-line     | Hides real bugs; creates maintenance burden   |
| Empty deps `[]` with refs | Sometimes appropriate, but audit case-by-case |
| Custom hooks              | Adds complexity; standard patterns sufficient |

### Implementation Pattern

```typescript
// Before: useEffect with empty deps referencing state
useEffect(() => {
  doSomething(someState);
}, []);

// After: Add deps or wrap in useCallback
const handleSomething = useCallback(() => {
  doSomething(someState);
}, [someState]);

useEffect(() => {
  handleSomething();
}, [handleSomething]);
```

## Topic 3: Stripe API Migration

### Decision

Migrate from deprecated `redirectToCheckout` to server-initiated Checkout Sessions.

### Rationale

- `redirectToCheckout` is deprecated by Stripe
- Server-initiated sessions are more secure
- Provides better error handling and customization

### Alternatives Considered

| Alternative            | Rejected Because                                |
| ---------------------- | ----------------------------------------------- |
| Stripe Payment Element | More complex; requires embedded form UI changes |
| Keep deprecated API    | Risk of sudden breakage; no security updates    |

### Implementation Approach

Since this is a static export (GitHub Pages), the Stripe integration uses:

1. Client-side Stripe.js for secure card handling
2. Supabase Edge Functions for server-side session creation
3. Redirect to Stripe-hosted checkout page

**Note**: Actual implementation depends on existing payment flow structure.

## Topic 4: TODO Comment Triage

### Decision

Categorize TODOs using this triage process:

1. **Implement Now**: Small scope, within refactoring context
2. **Create Issue**: Larger scope, needs separate feature work
3. **Remove**: Stale, completed, or no longer relevant

### Rationale

- TODOs lose context over time and become noise
- GitHub issues provide better tracking and visibility
- Some TODOs are actually completed but not cleaned up

### Triage Criteria

| Category  | Criteria                             | Action              |
| --------- | ------------------------------------ | ------------------- |
| Implement | <30 min, no new tests needed         | Fix inline          |
| Issue     | >30 min or needs design              | Create GitHub issue |
| Remove    | References deleted code              | Delete comment      |
| Remove    | Says "TODO" but is actually complete | Delete comment      |

## Topic 5: Pattern Standardization

### Decision

1. **Union Types**: Create string literal unions for all status enums
2. **Validation**: Centralize regex patterns in `src/lib/validation/`
3. **Error Handling**: Standardize on `setError` without throwing

### Rationale

- Union types provide compile-time checking for valid values
- Centralized validation ensures consistency and single update point
- Consistent error handling reduces cognitive load

### Pattern Definitions

**Status Union Types**:

```typescript
type ConnectionStatus = 'pending' | 'accepted' | 'blocked';
type ContributionStatus = 'pending' | 'approved' | 'rejected';
```

**Centralized Validation**:

```typescript
// src/lib/validation/patterns.ts
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

**Error Handling Pattern**:

```typescript
// Chosen pattern: setError without throwing (for hooks)
try {
  const result = await someAsyncOperation();
  return result;
} catch (err) {
  setError(err instanceof Error ? err : new Error('Operation failed'));
  return null; // or appropriate fallback
}
```

## Research Complete

All NEEDS CLARIFICATION items have been resolved. Ready for `/speckit.tasks` to generate implementation tasks.
