---
description: Run only hook tests (<1 min)
---

Run tests for React hooks:

```bash
docker compose exec spoketowork pnpm test 'src/hooks/' -- --run
```

**Expected Results**:

- All hook tests passing
- Exit code: 0

This runs tests for all custom React hooks in the project.
