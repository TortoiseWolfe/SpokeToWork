---
description: Run the comprehensive test suite to diagnose code quality issues and failures
---

Execute the full test suite using the batched testing script (~270 test files):

1. **Run the full test suite**:

   ```bash
   docker compose exec spoketowork ./scripts/test-batched-full.sh
   ```

2. **Test batches executed** (sequential to avoid OOM):
   - **Hooks**: Custom React hooks
   - **Atomic Components**: ~58 files (buttons, inputs, badges, etc.)
   - **Molecular Components**: ~36 files (composed components)
   - **Organisms (A-C, H-U)**: ~20 files (forms, modals, sidebars)
   - **Auth/Form/Map/Payment/Privacy**: Feature-specific components
   - **Lib**: Messaging, companies, auth, validation, etc.
   - **Services**: Welcome, connection, message, GDPR services
   - **Contexts/Config/Utils**: React contexts and utilities
   - **Unit/Integration/Contract Tests**: Test suite categories

3. **Understanding the output**:
   - Each batch runs in a separate vitest process that exits and frees memory
   - Uses `--no-file-parallelism` and `--pool forks --poolOptions.forks.singleFork`
   - Memory limit: 2048MB per batch
   - Shows pass/fail counts per batch and total summary
   - ✅ **Passed**: Test batch completed without issues
   - ❌ **Failed**: Test batch has errors (details provided)

4. **Alternative test commands**:

   ```bash
   # Standard vitest (watch mode)
   docker compose exec spoketowork pnpm test

   # Standard vitest (single run)
   docker compose exec spoketowork pnpm test -- --run

   # Quick validation (type-check + lint + tests)
   docker compose exec spoketowork pnpm run test:quick

   # Other diagnostics
   docker compose exec spoketowork pnpm run type-check       # TypeScript analysis
   docker compose exec spoketowork pnpm run lint             # ESLint analysis
   docker compose exec spoketowork pnpm run test:coverage    # Coverage analysis
   ```

**Important**: The batched script is designed for CI/Docker environments with memory constraints. It runs tests sequentially in batches to avoid OOM errors in WSL2/Docker.
