import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// This config is used for coverage settings and as fallback.
// Test environment configuration is in vitest.workspace.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: './tests/setup.ts',
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
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
        statements: 43,
        branches: 43,
        functions: 43,
        lines: 43,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
