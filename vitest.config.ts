import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/postcss';

// Tests that require jsdom environment
const jsdomTests = [
  '**/privacy.test.ts',
  '**/consent-history.test.ts',
  '**/useGeolocation.test.ts',
  '**/useFontFamily.test.ts',
  '**/useColorblindMode.test.ts',
  '**/useDeviceType.test.ts',
  '**/performance.test.ts',
  '**/privacy-utils.test.ts',
  '**/offline-queue.browser.test.ts',
  '**/offline-sync.test.ts',
  '**/useOfflineQueue.test.ts',
  '**/offline-integration.test.tsx',
  '**/encryption.test.ts',
  '**/group-key-service.test.ts',
  '**/key-derivation.test.ts',
  '**/usePaymentConsent.test.ts',
  '**/rate-limiter.test.ts',
  '**/oauth-state.test.ts',
  '**/Card.accessibility.test.tsx',
  '**/Card.test.tsx',
  '**/CodeBlock.test.tsx',
];

// Tests that require pure node environment (no DOM - crashes in happy-dom)
const nodeTests = ['**/email-service.test.ts'];

// Shared test configuration
const sharedTestConfig = {
  globals: true,
  setupFiles: './tests/setup.ts',
  css: {
    modules: {
      classNameStrategy: 'non-scoped' as const,
    },
  },
  exclude: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'scripts/**/*.test.js',
    'scripts/__tests__/**',
    'tests/e2e/**',
    '**/.component-backup-*/**',
    // TDD placeholder tests
    'tests/contract/email-notifications.test.ts',
    'tests/contract/stripe-webhook.test.ts',
    'tests/contract/paypal-webhook.test.ts',
    // Contract/integration tests requiring real Supabase
    'tests/contract/auth/oauth.contract.test.ts',
    'tests/contract/auth/password-reset.contract.test.ts',
    'tests/contract/auth/sign-in.contract.test.ts',
    'tests/contract/auth/sign-up.contract.test.ts',
    'tests/contract/profile/delete-account.contract.test.ts',
    'tests/contract/profile/get-profile.contract.test.ts',
    'tests/contract/profile/update-profile.contract.test.ts',
    'tests/integration/auth/oauth-flow.test.ts',
    'tests/integration/auth/password-reset-flow.test.ts',
    'tests/integration/auth/protected-routes.test.ts',
    'tests/integration/auth/sign-in-flow.test.ts',
    'tests/integration/auth/sign-up-flow.test.ts',
    'tests/integration/auth/rate-limiting.integration.test.ts',
    'tests/integration/messaging/connections.test.ts',
    'src/tests/integration/payment-isolation.test.ts',
    'src/hooks/__tests__/useConversationRealtime.test.ts',
    'src/hooks/__tests__/useTypingIndicator.test.ts',
    'src/services/messaging/__tests__/gdpr-service.test.ts',
    'src/lib/avatar/__tests__/image-processing.test.ts',
    'src/lib/avatar/__tests__/validation.test.ts',
    'tests/integration/avatar/upload-flow.integration.test.ts',
    'tests/integration/messaging/database-setup.test.ts',
  ],
};

// Test-specific module aliases to prevent OOM during heavy component tests
// These redirect heavy hooks to lightweight mocks during Vite transformation
// See: docs/specs/051-ci-test-memory/spec.md
const testAliases = {
  '@/hooks/useRoutes': path.resolve(
    __dirname,
    './src/hooks/__mocks__/useRoutes.ts'
  ),
  '@/hooks/useUserProfile': path.resolve(
    __dirname,
    './src/hooks/__mocks__/useUserProfile.ts'
  ),
};

// Shared configuration for plugins and resolve
const sharedConfig = {
  plugins: [react()],
  resolve: {
    alias: {
      // IMPORTANT: Specific aliases MUST come before general ones
      // Vite checks aliases in definition order, not specificity
      // See: docs/specs/051-ci-test-memory/spec.md
      ...testAliases,
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
  // Override postcss config for Vite 7 (requires function import, not string)
  // Next.js uses postcss.config.mjs with string format
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
};

export default defineConfig({
  ...sharedConfig,
  test: {
    // Projects replace the deprecated workspace config (vitest 4.0)
    projects: [
      {
        ...sharedConfig,
        test: {
          ...sharedTestConfig,
          name: 'jsdom',
          environment: 'jsdom',
          include: jsdomTests,
        },
      },
      {
        ...sharedConfig,
        test: {
          ...sharedTestConfig,
          name: 'happy-dom',
          environment: 'happy-dom',
          include: ['**/*.test.{ts,tsx}'],
          exclude: [...sharedTestConfig.exclude, ...jsdomTests, ...nodeTests],
        },
      },
      {
        ...sharedConfig,
        test: {
          ...sharedTestConfig,
          name: 'node',
          environment: 'node',
          include: nodeTests,
          isolate: false, // Run in main thread - prevents tinypool IPC cleanup crash in CI
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '**/*.stories.tsx',
        '**/*.config.*',
        '.next/**',
        'out/**',
        'public/**',
        '.storybook/**',
        'storybook-static/**',
        '**/*.bundle.js',
        '**/mockServiceWorker.js',
        '**/sw.js',
        '**/__mocks__/**',
        '**/test/**',
        '**/*.test.*',
        '**/*.accessibility.test.*',
        'tests/**',
        'scripts/**',
      ],
      thresholds: {
        statements: 58,
        branches: 58,
        functions: 58,
        lines: 58,
      },
    },
  },
});
