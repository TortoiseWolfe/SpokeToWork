// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import noSecrets from 'eslint-plugin-no-secrets';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'coverage/**',
      'scripts/**',
      'storybook-static/**',
      'playwright-report/**',
      'test-results/**',
      '.pnpm-store/**',
      'dist/**',
      'public/mockServiceWorker.js',
      '*.min.js',
      '**/*.min.js',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react/no-children-prop': 'off',
    },
  },
  // Secret detection - catches hardcoded API keys and credentials
  {
    plugins: {
      'no-secrets': noSecrets,
    },
    rules: {
      'no-secrets/no-secrets': [
        'error',
        {
          tolerance: 4.5,
          ignoreContent: [
            'example.com',
            'test@example.com',
            'YOUR_.*_HERE',
            'PLACEHOLDER_.*',
            'localhost',
          ],
        },
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
];

export default eslintConfig;
