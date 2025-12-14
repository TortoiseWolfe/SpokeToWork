# Research: Test Security Hardening

**Feature**: 047-test-security
**Date**: 2025-12-14

## Technical Decisions

### 1. Pre-flight Validation Strategy

**Decision**: Use Vitest setupFile for pre-flight env var validation

**Rationale**:

- Runs before ANY test, ensuring consistent failure across all test types
- Single point of validation, not scattered across test files
- Clear error message with all missing vars listed upfront
- Aligns with existing setup.ts pattern in the codebase

**Alternatives Rejected**:

- Per-test validation: Would require changes to 67+ files, inconsistent behavior
- test-user.ts throw on import: Would fail at module load time, harder to debug
- CI-only validation: Developers would only discover issues after push

### 2. SQL Escaping Approach

**Decision**: Use string replacement escaping (`escapeSQL()`) with strict CI enforcement

**Rationale**:

- The codebase already has this pattern in welcome-message.spec.ts
- Simple, easy to audit visually
- Works with Supabase Management API raw SQL queries
- CI grep check can reliably detect violations

**escapeSQL Implementation**:

```typescript
function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}
```

**Alternatives Rejected**:

- Parameterized queries only: Supabase Management API used in E2E tests requires raw SQL
- pg-format library: Adds dependency, overkill for test code
- No escaping (trust internal values): Violates security principles, bad pattern for copy-paste

### 3. CI Check Implementation

**Decision**: Grep-based pattern detection with allowlist

**Rationale**:

- Fast execution (milliseconds)
- No additional dependencies
- Easy to understand and maintain
- Allowlist for `escapeSQL` prevents false positives

**Pattern**:

```bash
# Detect: '${variable}' in SQL context
# Allow: '${escapeSQL(variable)}'
grep -rn --include="*.spec.ts" --include="*.test.ts" "'\${" tests/ | grep -v "escapeSQL"
```

**Alternatives Rejected**:

- AST-based analysis: Complex, slow, overkill for test code
- Custom linting rule: Requires ESLint plugin development
- Manual code review only: Error-prone, doesn't scale

### 4. Environment Variable Schema

**Decision**: 8 required env vars for 4 test user types

| Variable                       | Purpose                           |
| ------------------------------ | --------------------------------- |
| `TEST_USER_PRIMARY_EMAIL`      | Main test user (pre-confirmed)    |
| `TEST_USER_PRIMARY_PASSWORD`   | Main test user password           |
| `TEST_USER_SECONDARY_EMAIL`    | Email verification tests          |
| `TEST_USER_SECONDARY_PASSWORD` | Email verification tests          |
| `TEST_USER_TERTIARY_EMAIL`     | Messaging E2E tests               |
| `TEST_USER_TERTIARY_PASSWORD`  | Messaging E2E tests               |
| `TEST_USER_ADMIN_EMAIL`        | Welcome message tests             |
| `TEST_USER_ADMIN_PASSWORD`     | Welcome message tests (if needed) |

**Rationale**:

- Explicit over implicit - all users require configuration
- Consistent pattern across all user types
- Easy to validate in pre-flight check
- Clear documentation in .env.example

### 5. Documentation Placeholder Format

**Decision**: Use `<your-password>` format consistently

**Rationale**:

- Clear indication it's a placeholder
- Consistent with common documentation patterns
- HTML-like angle brackets visually distinct from actual values
- Works in both markdown and code examples

**Alternative Formats Rejected**:

- `${ENV_VAR}` - Could be confused with actual shell/template syntax
- `YOUR_PASSWORD_HERE` - Less visually distinct
- `********` - Could be confused with redacted real password

## Existing Patterns Analysis

### Current test-user.ts Structure

```typescript
// PRIMARY - has fallback (to be removed)
export const TEST_EMAIL =
  process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com';
export const TEST_PASSWORD =
  process.env.TEST_USER_PRIMARY_PASSWORD || 'TestPassword123!';

// SECONDARY - NO fallback (correct pattern)
export const TEST_EMAIL_SECONDARY = process.env.TEST_USER_SECONDARY_EMAIL;
export const TEST_PASSWORD_SECONDARY = process.env.TEST_USER_SECONDARY_PASSWORD;

// TERTIARY - has fallback (to be removed)
export const TEST_EMAIL_TERTIARY =
  process.env.TEST_USER_TERTIARY_EMAIL || 'test-user-b@example.com';
export const TEST_PASSWORD_TERTIARY =
  process.env.TEST_USER_TERTIARY_PASSWORD || 'TestPassword456!';

// ADMIN - has fallback (to be removed)
export const TEST_EMAIL_ADMIN =
  process.env.TEST_USER_ADMIN_EMAIL || 'admin@spoketowork.example';
```

### Current Vitest Setup

The `vitest.config.ts` uses:

- `setupFiles: './tests/setup.ts'` - runs before each test file
- Three test projects: jsdom, happy-dom, node

The setup.ts already handles:

- Global mocks (Supabase, AuthContext, navigation)
- Cleanup after each test
- Browser API mocks (matchMedia, IntersectionObserver)

## Implementation Notes

### Pre-flight Validation Error Message Format

```typescript
const missingVars = [
  'TEST_USER_PRIMARY_EMAIL',
  'TEST_USER_PRIMARY_PASSWORD',
  // ... etc
].filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  throw new Error(`
Missing required test environment variables:
${missingVars.map((v) => `  - ${v}`).join('\n')}

To configure test environment:
1. Copy .env.example to .env
2. Fill in the TEST_USER_* variables
3. See CLAUDE.md: Test Users section for details
`);
}
```

### SQL Injection Pattern in Tests

Current pattern in welcome-message.spec.ts (line 35-36):

```typescript
function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}
```

This is used correctly for TEST_EMAIL but NOT for UUIDs:

- Line 77: `${escapeSQL(TEST_EMAIL)}` ✓
- Line 88: `'${testUserId}'` ✗ (needs escapeSQL)
