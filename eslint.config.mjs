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
      'test-results-ci/**',
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
  // Server/browser checks that ship wrong HTML from a static export (#88).
  // Node 21+ has a global `navigator`, so `typeof navigator` is "object" during
  // the build and the browser branch runs on the server (#86 rendered "You are
  // currently offline" for every visitor). `typeof window` is the real check.
  // Browser-only state in a useState initialiser is read on the server's first
  // render too, so it has to be read in an effect instead.
  {
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "UnaryExpression[operator='typeof'][argument.name='navigator']",
          message:
            "`typeof navigator` is not a server/browser check: Node 21+ defines navigator. Use `typeof window !== 'undefined'` (#88).",
        },
        {
          selector:
            "CallExpression[callee.name='useState'] > :not(ArrowFunctionExpression):not(FunctionExpression) MemberExpression[object.name=/^(window|navigator|document|localStorage|sessionStorage)$/]",
          message:
            'Browser-only state in a useState initialiser differs between server and client. Start from a fixed default and read the real value in useEffect (#88).',
        },
        {
          selector:
            "CallExpression[callee.name='useState'] > MemberExpression[object.name=/^(window|navigator|document|localStorage|sessionStorage)$/]",
          message:
            'Browser-only state in a useState initialiser differs between server and client. Start from a fixed default and read the real value in useEffect (#88).',
        },
      ],
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
