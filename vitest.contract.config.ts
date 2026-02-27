/**
 * Vitest config for contract tests — real network calls to local Supabase.
 *
 * Differs from the main vitest.config.ts:
 * - No setup file (tests/setup.ts mocks @/lib/supabase/client — fatal for contract tests)
 * - Node environment (no DOM needed; avoids happy-dom URL parsing quirks)
 * - Only includes tests/contract/**
 * - Longer hook timeout (fixture seeding via network can take a few seconds)
 *
 * Usage:
 *   docker compose exec -T spoketowork pnpm vitest run -c vitest.contract.config.ts [file]
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/contract/**/*.contract.test.ts'],
    exclude: ['node_modules/**', '.next/**', 'out/**'],
    // Fixture seeding hits the DB — give it room
    hookTimeout: 30_000,
    testTimeout: 15_000,
    // Sequential: these tests mutate shared DB state
    fileParallelism: false,
  },
});
