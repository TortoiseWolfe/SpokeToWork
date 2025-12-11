---
description: Run only accessibility tests (Pa11y) (~1 min)
---

Run accessibility tests (requires dev server running):

```bash
docker compose exec spoketowork pnpm run test:a11y
```

**Expected Results**:

- WCAG 2.1 AA compliance check
- Exit code: 0

Note: Requires the dev server to be running first.
