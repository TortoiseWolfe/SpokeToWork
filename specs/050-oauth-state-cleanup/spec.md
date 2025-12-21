# Feature 050: OAuth State Token Cleanup

## Priority: P1 (Security)

## Problem Statement

Custom CSRF state tokens exist in the codebase but aren't used - the app relies on Supabase PKCE instead. This creates:

- Dead code confusion
- Potential security misconfiguration
- Maintenance burden

## Current State

**Files**:

- `src/components/auth/OAuthButtons/OAuthButtons.tsx`
- `src/lib/auth/oauth-state.ts`

Custom tokens are generated but Supabase handles PKCE internally, making them redundant.

## Requirements

### Functional Requirements

1. **FR-1**: Audit current OAuth flow to confirm PKCE is active
2. **FR-2**: Remove unused custom CSRF token generation if redundant
3. **FR-3**: OR implement custom tokens consistently if PKCE insufficient
4. **FR-4**: Document the OAuth security model clearly

### Non-Functional Requirements

1. **NFR-1**: Zero regression in OAuth login flow
2. **NFR-2**: Clear security documentation for future maintainers

## Success Criteria

- [ ] No dead OAuth security code remains
- [ ] OAuth flow documented with security rationale
- [ ] All OAuth E2E tests pass
- [ ] Security review confirms CSRF protection adequate

## Investigation Required

1. Confirm Supabase PKCE implementation details
2. Check if custom tokens add any value beyond PKCE
3. Review OAuth provider-specific requirements (Google, GitHub, etc.)

## Out of Scope

- Adding new OAuth providers
- Implementing custom OAuth server
