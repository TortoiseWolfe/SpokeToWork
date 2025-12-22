---
description: Clear test-results folder
---

```bash
docker compose exec spoketowork rm -rf test-results && docker compose exec spoketowork mkdir test-results && docker compose exec spoketowork chown $(id -u):$(id -g) test-results
```
