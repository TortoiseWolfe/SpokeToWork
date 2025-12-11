---
description: Clean build artifacts and restart development environment
---

Run the clean start script to reset the development environment:

```bash
./scripts/clean-start.sh
```

This script will:

1. Stop any running Docker containers
2. Remove `.next` build cache
3. Remove `node_modules/.cache`
4. Start fresh containers
5. Wait for dev server to be ready at http://localhost:3000

**Use when**: Build cache issues, stale state, or need a fresh environment.
