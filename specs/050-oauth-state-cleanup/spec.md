# Feature Specification: OAuth State Token Cleanup

**Feature Branch**: `050-oauth-state-cleanup`
**Created**: 2025-12-21
**Status**: Clarified
**Priority**: P1 (Security/Code Quality)
**Input**: User description: "specs/050-oauth-state-cleanup"

## Problem Statement

Custom CSRF state tokens exist in the codebase (`src/lib/auth/oauth-state.ts`) but are **never called** by any production code. The `OAuthButtons` component relies solely on Supabase's built-in PKCE flow for CSRF protection. This creates:

1. **Dead code confusion** - 210 lines of unused oauth-state.ts code
2. **Wasted database resources** - `oauth_states` table created but never populated
3. **Maintenance burden** - Test file with 309 lines testing dead code
4. **Security misconception** - Documentation suggests custom CSRF when PKCE handles it

## Current State Analysis

### Files Affected

| File                                                         | Lines | Status                                        |
| ------------------------------------------------------------ | ----- | --------------------------------------------- |
| `src/lib/auth/oauth-state.ts`                                | 210   | Dead code - never imported by production code |
| `src/lib/auth/__tests__/oauth-state.test.ts`                 | 309   | Tests dead code                               |
| `src/components/auth/OAuthButtons/OAuthButtons.tsx`          | 90    | Uses Supabase PKCE (correct)                  |
| `supabase/migrations/20251006_complete_monolithic_setup.sql` | ~50   | Creates unused `oauth_states` table           |
| `src/lib/supabase/types.ts`                                  | ~10   | Contains `oauth_states` types                 |

### Why Custom Tokens Are Redundant

The `OAuthButtons.tsx` component (line 31-38) shows the correct implementation:

```typescript
// Supabase handles CSRF protection via built-in state parameter (PKCE flow)
// No need to manually manage state tokens
await supabase.auth.signInWithOAuth({
  provider,
  options: {
    redirectTo: `${window.location.origin}${basePath}/auth/callback`,
  },
});
```

Supabase's PKCE (Proof Key for Code Exchange) flow:

1. Generates a cryptographic code verifier and challenge
2. Stores verifier in sessionStorage
3. Validates on callback - preventing CSRF attacks
4. Is industry-standard (RFC 7636) and more secure than simple state tokens

---

## User Scenarios & Testing

### User Story 1 - Developer Code Clarity (Priority: P1)

Developers working on authentication should find clean, understandable code without dead code artifacts.

**Why this priority**: Dead code confuses developers about the security model and creates maintenance burden.

**Independent Test**: After cleanup, `grep -r "generateOAuthState\|validateOAuthState" src/` returns no results except for any migration/cleanup documentation.

**Acceptance Scenarios**:

1. **Given** a developer reviewing auth code, **When** they look at OAuth implementation, **Then** they see only the Supabase PKCE pattern without confusing custom token code
2. **Given** a developer searching for OAuth state handling, **When** they search the codebase, **Then** they find clear documentation explaining PKCE is used

---

### User Story 2 - Database Schema Cleanliness (Priority: P1)

The database schema should only contain tables that are actively used.

**Why this priority**: Unused tables waste resources and create confusion during schema reviews.

**Independent Test**: Query `SELECT count(*) FROM oauth_states;` returns 0 (table either empty or removed), and application OAuth flow still works.

**Acceptance Scenarios**:

1. **Given** the oauth_states table exists, **When** it's confirmed unused in production, **Then** it's dropped from the migration file
2. **Given** the table is dropped, **When** a user performs OAuth login, **Then** authentication succeeds using Supabase PKCE

---

### User Story 3 - Security Documentation (Priority: P2)

Maintainers should understand the OAuth security model without confusion.

**Why this priority**: Clear security documentation prevents future developers from reintroducing redundant code.

**Independent Test**: Documentation clearly states "PKCE" and explains why custom tokens aren't needed.

**Acceptance Scenarios**:

1. **Given** the cleanup is complete, **When** a developer reads auth documentation, **Then** they understand Supabase PKCE provides CSRF protection
2. **Given** someone asks "why no custom CSRF tokens?", **When** they check docs, **Then** they find the rationale documented

---

### Edge Cases

- **E2E tests using OAuth**: Must continue to pass after cleanup
- **Supabase PKCE verification**: Need to confirm PKCE is actually active (not just assumed)
- **Types cleanup**: `src/lib/supabase/types.ts` may reference oauth_states

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST remove the `src/lib/auth/oauth-state.ts` file
- **FR-002**: System MUST remove the `src/lib/auth/__tests__/oauth-state.test.ts` file
- **FR-003**: System MUST DROP the `oauth_states` table via Supabase Management API
- **FR-003a**: System MUST remove `oauth_states` table definition completely from monolithic migration file (no comments, clean removal)
- **FR-004**: System MUST remove `oauth_states` type definitions from Supabase types
- **FR-005**: System MUST update TECHNICAL-DEBT.md to mark this issue as resolved
- **FR-006**: System MUST document in SECURITY-ARCHITECTURE.md that Supabase PKCE handles CSRF

### Non-Functional Requirements

- **NFR-001**: Zero regression in OAuth login flow (E2E tests pass)
- **NFR-002**: No remaining references to removed code in codebase
- **NFR-003**: Documentation clearly explains the security model

### Key Entities

- **oauth_states table** (TO BE REMOVED): Previously designed for CSRF tokens, never used
- **Supabase PKCE**: Built-in CSRF protection via code_verifier/code_challenge

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: `grep -r "oauth-state\|oauth_states" src/` returns no results
- **SC-002**: All OAuth E2E tests pass after cleanup
- **SC-003**: `oauth_states` table no longer exists in migration file
- **SC-004**: SECURITY-ARCHITECTURE.md contains PKCE explanation
- **SC-005**: TECHNICAL-DEBT.md shows this issue as FIXED

---

## Assumptions

1. Supabase PKCE is enabled by default for OAuth flows (to be verified)
2. No production code actually calls the oauth-state.ts functions
3. The oauth_states database table is empty in production
4. Removing the table won't affect any database triggers or foreign keys

---

## Out of Scope

- Adding new OAuth providers
- Implementing custom OAuth server
- Modifying Supabase PKCE configuration
- Adding additional CSRF protection layers

---

## Clarifications

### Session 2025-12-21

**Q1: How should the oauth_states database table be handled in production?**

**Answer**: DROP table via Supabase Management API

**Rationale**: Complete removal ensures no unused artifacts remain. The table was never populated in production, so dropping it is safe and provides a clean slate.

**Q2: After dropping the table, how should the monolithic migration file be updated?**

**Answer**: Remove table definition completely (no comments)

**Rationale**: Following the project's "No Technical Debt" principle, dead code should be removed cleanly. The git history preserves the original implementation for reference if ever needed.

### Coverage Summary

| Category                   | Status   |
| -------------------------- | -------- |
| Functional Scope           | Clear    |
| Domain & Data Model        | Resolved |
| Interaction & UX Flow      | Clear    |
| Non-Functional Quality     | Clear    |
| Integration & Dependencies | Clear    |
| Edge Cases & Failure       | Clear    |
| Constraints & Tradeoffs    | Resolved |
| Terminology & Consistency  | Clear    |
| Completion Signals         | Clear    |
