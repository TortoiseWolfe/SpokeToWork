---
description: Run the comprehensive test suite to diagnose code quality issues and failures
---

Execute the full local test suite for complete coverage (~180 test files):

1. **Run the full test suite**:

   ```bash
   docker compose exec spoketowork pnpm run test:full-local
   ```

2. **Test batches executed** (sequential to avoid OOM):
   - **Atomic Components**: ~58 files (buttons, inputs, badges, etc.)
   - **Molecular Components**: ~36 files (composed components)
   - **Organisms (A-C)**: ~20 files (Admin, Application, Chat, Company, etc.)
   - **Organisms (Home, Next)**: ~4 files
   - **Organisms (Route, Unified)**: ~10 files (run per-file sequentially)
   - **Lib/Services/Hooks**: ~53 files

3. **Understanding the output**:
   - Each batch runs separately to stay under 4GB memory limit
   - Route/Unified tests run one file at a time (slower but complete)
   - ✅ **Passed**: Test batch completed without issues
   - ❌ **Failed**: Test batch has errors (details provided)

4. **Alternative test commands**:

   ```bash
   # Quick local tests (skips Route/Unified - faster)
   docker compose exec spoketowork pnpm run test:all-local

   # Individual test batches
   docker compose exec spoketowork pnpm run test:atomic      # Atomic components
   docker compose exec spoketowork pnpm run test:molecular   # Molecular components
   docker compose exec spoketowork pnpm run test:organisms   # Organisms A-C
   docker compose exec spoketowork pnpm run test:lib         # Lib/Services/Hooks

   # Other diagnostics
   docker compose exec spoketowork pnpm run type-check       # TypeScript analysis
   docker compose exec spoketowork pnpm run lint             # ESLint analysis
   docker compose exec spoketowork pnpm run test:coverage    # Coverage analysis
   ```

**Important**: This command runs the full test suite for thorough coverage. It takes longer (~3-5 minutes) but ensures all tests are executed without memory issues.

Note: Full test suite runs in batches to avoid OOM in Docker/WSL2 environments.
