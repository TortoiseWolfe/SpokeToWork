---
description: Clear test-results folder (project)
---

```bash
docker compose exec spoketowork bash -c "rm -rf /app/test-results/* /app/test-results/.[!.]* 2>/dev/null; chown node:node /app/test-results"
```
