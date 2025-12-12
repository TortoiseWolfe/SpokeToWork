# Quickstart: Fix CI OOM Crashes

## Problem

CI crashes with `ERR_IPC_CHANNEL_CLOSED` in the utils test batch due to memory exhaustion.

## Solution

Split the "Utils (rest)" batch into individual test file batches.

## Implementation

Edit `scripts/test-batched-full.sh`:

**Remove lines 73-86** (the inline utils batch command)

**Replace with individual batches** (after line 71):

```bash
# Utils - individual batches to prevent OOM
run_batch "Utils (error-handler)" "src/utils/error-handler.test.ts"
run_batch "Utils (font-loader)" "src/utils/font-loader.test.ts"
run_batch "Utils (web3forms)" "src/utils/web3forms.test.ts"
run_batch "Utils (background-sync)" "src/utils/background-sync.test.ts"
run_batch "Utils (performance)" "src/utils/performance.test.ts"
run_batch "Utils (consent)" "src/utils/consent.test.ts"
run_batch "Utils (email)" "src/utils/email/email-service.test.ts"
run_batch "Utils (consent-types)" "src/utils/consent-types.test.ts"
run_batch "Utils (map-utils)" "src/utils/__tests__/map-utils.test.ts"
run_batch "Utils (analytics)" "src/utils/analytics.test.ts"
run_batch "Utils (colorblind)" "src/utils/__tests__/colorblind.test.ts"
```

## Verification

```bash
# Test locally
docker compose exec spoketowork ./scripts/test-batched-full.sh

# Expected: All batches pass, no OOM errors
# Push to trigger CI
```

## Why This Works

- Each `run_batch` call spawns a fresh vitest process
- Memory is freed when each process exits
- No memory accumulation across test files
