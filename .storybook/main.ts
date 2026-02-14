import type { StorybookConfig } from '@storybook/nextjs-vite';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env files
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-themes', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  staticDirs: ['../public'],
  env: (config) => ({
    ...config,
    // Pass through all NEXT_PUBLIC_ env vars to Storybook
    ...Object.keys(process.env)
      .filter((key) => key.startsWith('NEXT_PUBLIC_'))
      .reduce(
        (env, key) => {
          env[key] = process.env[key];
          return env;
        },
        {} as Record<string, string>
      ),
  }),
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};

    // Mock modules that make real network requests (Supabase, crypto services).
    // Specific aliases must come BEFORE the generic @/ alias so Vite matches them first.
    const mockAliases = [
      {
        find: '@/lib/supabase/client',
        replacement: path.resolve(__dirname, 'mocks/supabase-client.ts'),
      },
      {
        find: '@/services/messaging/key-service',
        replacement: path.resolve(__dirname, 'mocks/key-service.ts'),
      },
    ];

    const existing = config.resolve.alias;
    if (Array.isArray(existing)) {
      config.resolve.alias = [...mockAliases, ...existing];
    } else {
      // Convert object aliases to array form so we control ordering
      const entries = existing
        ? Object.entries(existing).map(([find, replacement]) => ({
            find,
            replacement: replacement as string,
          }))
        : [];
      config.resolve.alias = [...mockAliases, ...entries];
    }

    return config;
  },
};

export default config;
