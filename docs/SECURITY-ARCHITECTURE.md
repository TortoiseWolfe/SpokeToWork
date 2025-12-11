# Security Architecture

This document describes the security architecture of SpokeToWork.

## Overview

SpokeToWork implements defense-in-depth security across multiple layers:

- End-to-end encrypted messaging
- Password-derived key management
- Row-level security on all database tables
- OAuth CSRF protection
- Input sanitization with DOMPurify
- Rate limiting and audit logging

## Cryptography

### Message Encryption

Messages are encrypted client-side before transmission using industry-standard algorithms:

- **Key Exchange**: ECDH P-256 (secp256r1)
- **Symmetric Encryption**: AES-GCM-256
- **IV Generation**: 96-bit random per message
- **Implementation**: Web Crypto API (native browser crypto)

```
Sender → derive shared secret (ECDH) → encrypt (AES-GCM) → transmit ciphertext
Receiver → derive shared secret (ECDH) → decrypt (AES-GCM) → plaintext
```

### Password-Derived Keys

User encryption keys are derived from passwords using Argon2id:

- **Algorithm**: Argon2id (memory-hard, GPU-resistant)
- **Salt**: 16 bytes random per user (stored in database)
- **Time Cost**: 3 iterations
- **Memory Cost**: 64 MB
- **Parallelism**: 4 threads
- **Output**: 32-byte seed → reduced to P-256 scalar

**Key Properties**:

- Same password + salt always produces same key pair
- Users can decrypt on any device by re-deriving keys
- Password change triggers key rotation

### Key Storage

- **Private keys**: Memory only (never persisted to disk/IndexedDB)
- **Public keys**: Stored in `user_encryption_keys` table
- **Salt**: Stored in `user_encryption_keys` table (enables re-derivation)

**Files**:

- `src/lib/messaging/encryption.ts` - ECDH + AES-GCM
- `src/lib/messaging/key-derivation.ts` - Argon2id derivation
- `src/services/messaging/key-service.ts` - Key lifecycle management

## Authentication

### Session Management

- **Provider**: Supabase Auth (GoTrue)
- **Token Storage**: localStorage (implicit flow for static hosting)
- **Token Refresh**: Automatic via Supabase client
- **Session Timeout**: 24 hours with 1-minute warning before logout
- **Idle Detection**: User activity monitoring
- **Cross-Tab Detection**: Detects sign-outs in other browser tabs

### OAuth Security

OAuth flows include CSRF protection via state tokens:

1. Generate UUID v4 state token (`crypto.randomUUID()`)
2. Store state in database with:
   - Session ID (from sessionStorage)
   - Return URL
   - User agent
   - Provider type
   - 5-minute expiration
3. On callback:
   - Verify token exists and not used
   - Verify session ID matches (CSRF check)
   - Mark token as used

**File**: `src/lib/auth/oauth-state.ts`

### Password Requirements

- Minimum 8 characters
- Requires: uppercase, lowercase, number, special character
- Strength scoring based on length and complexity

**File**: `src/lib/auth/password-validator.ts`

## Input Validation

### HTML Sanitization

User-generated content is sanitized using DOMPurify:

```typescript
import DOMPurify from 'dompurify';

// Default: strip ALL HTML (plain text)
DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

// Rich text: allow safe tags
DOMPurify.sanitize(input, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});
```

**Handles**:

- Script injection (`<script>`)
- Event handler injection (`onclick`, `onerror`)
- Protocol injection (`javascript:` in href)
- Encoded payloads
- Mutation XSS

**File**: `src/lib/messaging/validation.ts`

### Schema Validation

Zod schemas validate all form inputs:

- Email: RFC 5322 compliant, TLD whitelist, disposable email blocking
- Password: Strength requirements
- Username: 3-30 chars, alphanumeric + underscore/hyphen
- Message: Max 10,000 characters

**Files**:

- `src/schemas/forms.ts`
- `src/schemas/contact.schema.ts`

## Database Security

### Row Level Security (RLS)

All Supabase tables have RLS policies enabled:

| Table                | Policy                                          |
| -------------------- | ----------------------------------------------- |
| `user_profiles`      | Users can view own + search authenticated users |
| `payment_intents`    | Users can view only own payments                |
| `audit_logs`         | Users can view only own logs                    |
| `user_subscriptions` | Users can view only own subscriptions           |
| `conversations`      | Participants only                               |
| `messages`           | Conversation participants only                  |

### Audit Logging

Auth events are logged to `audit_logs` table:

- `sign_in`, `sign_out`, `sign_up`
- `password_change`, `password_reset`
- `oauth_link`, `session_refresh`
- `failed_login`, `lockout`

**Retention**: 90 days (automated purge recommended)

**File**: `src/lib/auth/audit-logger.ts`

## Rate Limiting

- **Server-side**: Supabase RPC functions
- **Client-side**: localStorage-based (UX blocking, non-critical)
- **Behavior**: Fail-open (rate limit failures don't block users)

**File**: `src/lib/auth/rate-limiter.ts`

## Performance Security Trade-offs

### ECDH Caching

To prevent denial-of-service via expensive cryptographic operations, shared secrets are cached:

```typescript
// Module-level cache (cleared on page unload)
const sharedSecretCache = new Map<string, CryptoKey>();
```

- **Key**: `${conversationId}:${otherParticipantId}`
- **Value**: Derived CryptoKey
- **Invalidation**: Page unload, logout

This reduces per-message decryption from ~50ms to ~1ms.

**File**: `src/hooks/useConversationRealtime.ts`

## OWASP Top 10 Compliance

| Risk                           | Mitigation                                    |
| ------------------------------ | --------------------------------------------- |
| A01: Broken Access Control     | RLS on all tables, auth checks in services    |
| A02: Cryptographic Failures    | ECDH P-256 + AES-GCM-256, Argon2id            |
| A03: Injection                 | Parameterized queries, DOMPurify              |
| A04: Insecure Design           | Session timeouts, idle detection, audit logs  |
| A05: Security Misconfiguration | Environment variable separation, CSP headers  |
| A06: Vulnerable Components     | Regular `pnpm audit`, dependency updates      |
| A07: Authentication Failures   | Supabase Auth, OAuth CSRF protection          |
| A08: Integrity Failures        | HTTPS, webhook signatures                     |
| A09: Logging Failures          | Audit logs with retention                     |
| A10: SSRF                      | N/A (static hosting, no server-side requests) |

## Static Hosting Considerations

This app deploys to GitHub Pages (static hosting):

- **No API routes**: All server-side logic in Supabase
- **No secrets in browser**: Only `NEXT_PUBLIC_*` variables accessible
- **Edge Functions**: For server-side operations requiring secrets
- **Client-side encryption**: Messages encrypted before transmission

## Recommendations

### Short-term

1. ~~Implement CSP headers~~ ✅ Added via metadata in `src/app/layout.tsx`
2. ~~Add rate limit monitoring dashboard~~ ✅ Added to `/status` page
3. ~~Automate 90-day audit log purge~~ ✅ `cleanup_old_audit_logs()` function deployed

### Long-term

1. Consider WebAuthn/FIDO2 for passwordless auth
2. Add device fingerprinting for additional CSRF protection
3. Implement key rotation schedule reminders

## Related Documentation

- [Auth Setup](./AUTH-SETUP.md)
- [Messaging Quickstart](./messaging/QUICKSTART.md)
- [Security Policy](./project/SECURITY.md)
