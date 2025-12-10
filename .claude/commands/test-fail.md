---
description: Run only the known failing tests to investigate isolation issues
---

Run only the 27 tests with known isolation failures:

```bash
docker compose exec spoketowork pnpm test -- --run \
  src/hooks/useOfflineQueue.test.ts \
  src/hooks/useGeolocation.test.ts \
  src/hooks/useColorblindMode.test.ts \
  src/tests/offline-integration.test.tsx
```

**Individual test runs** (all should pass when run individually):

```bash
# These pass individually but fail in full suite
docker compose exec spoketowork pnpm test src/hooks/useOfflineQueue.test.ts -- --run
docker compose exec spoketowork pnpm test src/hooks/useGeolocation.test.ts -- --run
docker compose exec spoketowork pnpm test src/hooks/useColorblindMode.test.ts -- --run
docker compose exec spoketowork pnpm test src/tests/offline-integration.test.tsx -- --run
```

**Root Cause**: Test isolation issues with `singleFork: true` mode.
State leaks between tests when running sequentially.

See `specs/042-test-memory-optimization/tasks.md` Phase 7 for full inventory.
