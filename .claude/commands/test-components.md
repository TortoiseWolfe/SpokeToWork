---
description: Run only component tests (~5 min)
---

Run tests for React components:

```bash
docker compose exec spoketowork pnpm test 'src/components/' -- --run
```

**Expected Results**:

- All component tests passing
- Exit code: 0

This runs tests for all React components in the atomic design structure.
