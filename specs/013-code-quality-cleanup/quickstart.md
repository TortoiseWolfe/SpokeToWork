# Quickstart: Code Quality Cleanup

**Feature**: 013-code-quality-cleanup
**Branch**: `013-code-quality-cleanup`

## Overview

This is a refactoring feature - no new functionality, just code quality improvements.

## Prerequisites

- Docker and Docker Compose running
- On branch `013-code-quality-cleanup`
- All tests currently passing

## Validation Commands

Run these after each change to ensure no regressions:

```bash
# Type checking (must pass with zero errors)
docker compose exec spoketowork pnpm type-check

# Run all tests (2655+ must pass)
docker compose exec spoketowork pnpm test

# Lint check
docker compose exec spoketowork pnpm lint

# Full build
docker compose exec spoketowork pnpm build
```

## Quick Reference

### Finding Issues

```bash
# Find as any casts
docker compose exec spoketowork grep -r "as any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."

# Find TODO comments
docker compose exec spoketowork grep -rn "TODO" src/ --include="*.ts" --include="*.tsx"

# Check hook dependencies
docker compose exec spoketowork pnpm lint | grep "react-hooks"

# Find deprecated Stripe usage
docker compose exec spoketowork grep -r "redirectToCheckout" src/
```

### Implementation Order

1. **P1**: `as any` in stripe.ts, connection-service.ts, welcome-service.ts
2. **P1**: Hook dependencies in AuthContext.tsx
3. **P2**: Stripe API migration
4. **P2**: TODO cleanup
5. **P3**: Pattern standardization

## Success Criteria Checklist

- [ ] Zero `as any` casts in src/ (excluding tests)
- [ ] TypeScript type-check passes
- [ ] ESLint react-hooks/exhaustive-deps passes
- [ ] No deprecated Stripe APIs
- [ ] TODOs reduced from 40+ to <10
- [ ] All 2655+ tests pass
- [ ] Build completes successfully

## Notes

- Make atomic commits for each logical change
- Run validation commands after each commit
- If a type fix reveals a bug, fix the bug and document in commit message
