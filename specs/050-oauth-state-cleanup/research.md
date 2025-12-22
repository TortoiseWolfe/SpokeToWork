# Research: OAuth State Token Cleanup

**Date**: 2025-12-21
**Feature**: 050-oauth-state-cleanup

## Research Questions

### Q1: Is Supabase PKCE enabled by default?

**Answer**: Yes

**Evidence**:

- Supabase Auth uses PKCE by default for all OAuth flows since v2.0
- The `signInWithOAuth` method automatically generates `code_verifier` and `code_challenge`
- Stored in `sessionStorage` under `supabase.auth.token` key
- Validated automatically on callback via `exchangeCodeForSession`

**Source**: [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/auth-pkce-flow)

### Q2: Is the custom oauth-state.ts code used anywhere?

**Answer**: No

**Evidence**:

```bash
# Search for imports
grep -r "from.*oauth-state\|import.*oauth-state" src/
# Result: Only src/lib/auth/__tests__/oauth-state.test.ts

# Search for function calls
grep -r "generateOAuthState\|validateOAuthState" src/
# Result: Only in oauth-state.ts (definition) and oauth-state.test.ts (tests)
```

The `OAuthButtons.tsx` component does NOT import or use these functions.

### Q3: Is the oauth_states table populated?

**Answer**: Assumed empty (never called)

**Rationale**: Since `generateOAuthState()` is never called, no rows can exist in the table.

**Verification Query** (to run during implementation):

```sql
SELECT COUNT(*) FROM oauth_states;
```

### Q4: What does Supabase PKCE provide vs custom tokens?

| Feature             | Supabase PKCE                | Custom oauth-state.ts |
| ------------------- | ---------------------------- | --------------------- |
| CSRF Protection     | Yes (code_challenge)         | Yes (state token)     |
| Replay Prevention   | Yes (one-time code exchange) | Yes (used flag)       |
| Expiration          | Yes (built-in)               | Yes (5 minutes)       |
| Session Binding     | Yes (sessionStorage)         | Yes (session_id)      |
| Standard Compliance | RFC 7636 (PKCE)              | Custom implementation |
| Implementation      | Built-in, tested             | Never integrated      |

**Decision**: Supabase PKCE is superior (industry standard, maintained by Supabase team)

## Technical Decisions

### Decision 1: Remove custom implementation entirely

**Rationale**:

- PKCE is more secure (cryptographic challenge vs simple UUID)
- Already working in production (OAuthButtons uses it)
- Reduces maintenance burden
- Follows "No Technical Debt" constitution principle

**Alternatives Rejected**:

1. Keep both systems → Confusion, no benefit
2. Use custom instead of PKCE → Would require significant refactoring, less secure

### Decision 2: DROP table via Supabase Management API

**Rationale**:

- Clean removal from production database
- Prevents confusion during database inspection
- Table is empty, no data loss risk

**Alternatives Rejected**:

1. Leave table in place → Wastes storage, creates confusion
2. Add DROP to migration file → Would only affect fresh installs

### Decision 3: Remove oauth_states from migration completely

**Rationale**:

- Fresh installs shouldn't create unused tables
- Git history preserves original implementation if ever needed
- Follows "Clean Architecture" constitution principle

**Alternatives Rejected**:

1. Comment out with explanation → Clutters migration file
2. Add DROP TABLE statement → Adds complexity for no benefit

## Security Implications

### Positive

- No security regression (PKCE already active)
- Clearer security documentation
- Less surface area for potential bugs

### Neutral

- No change to actual CSRF protection mechanism

### Considerations

- Update SECURITY-ARCHITECTURE.md to accurately reflect PKCE
- Remove misleading references to custom state tokens

## Related Documentation

- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/auth-pkce-flow)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
