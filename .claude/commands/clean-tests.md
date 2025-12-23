---
description: Clear test-results and test-results-ci folders (project)
---

```bash
docker compose exec spoketowork bash -c "rm -rf /app/test-results/* /app/test-results/.[!.]* /app/test-results-ci/* /app/test-results-ci/.[!.]* 2>/dev/null; chown node:node /app/test-results /app/test-results-ci 2>/dev/null || true"
```
