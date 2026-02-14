import React from 'react';
import type { Preview } from '@storybook/nextjs-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { ConsentProvider } from '../src/contexts/ConsentContext';
import { AuthContext } from '../src/contexts/AuthContext';
import type { AuthContextType } from '../src/contexts/AuthContext';
import { ActiveRouteContext } from '../src/contexts/ActiveRouteContext';
import type { ActiveRouteContextValue } from '../src/contexts/ActiveRouteContext';
import '../src/app/globals.css';

// Initialize MSW (non-blocking — don't let failures prevent story rendering)
if (typeof window !== 'undefined') {
  import('../src/mocks/browser')
    .then(({ worker }) => {
      worker.start({
        onUnhandledRequest: 'bypass',
        quiet: true,
      });
    })
    .catch(() => {
      // MSW init failed — stories still render, just without mocked APIs
    });
}

// Mock auth context for Storybook — no Supabase dependency
const mockAuthValue: AuthContextType = {
  user: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  retryCount: 0,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshSession: async () => {},
  retry: async () => {},
  clearError: () => {},
};

// Mock active route context for Storybook — no Supabase dependency
const mockActiveRouteValue: ActiveRouteContextValue = {
  activeRouteId: null,
  isLoading: false,
  setActiveRoute: async () => {},
  clearActiveRoute: async () => {},
  refresh: async () => {},
};

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'wcag2aa', enabled: true },
          { id: 'best-practice', enabled: true },
        ],
      },
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa', 'best-practice'],
        },
      },
    },
  },
  decorators: [
    // Global providers — mock contexts to avoid Supabase dependency
    (Story) => (
      <ConsentProvider>
        <AuthContext.Provider value={mockAuthValue}>
          <ActiveRouteContext.Provider value={mockActiveRouteValue}>
            <Story />
          </ActiveRouteContext.Provider>
        </AuthContext.Provider>
      </ConsentProvider>
    ),
    // Theme decorator
    withThemeByDataAttribute({
      themes: {
        'spoketowork-dark': 'spoketowork-dark',
        'spoketowork-light': 'spoketowork-light',
        light: 'light',
        dark: 'dark',
        cupcake: 'cupcake',
        bumblebee: 'bumblebee',
        emerald: 'emerald',
        corporate: 'corporate',
        synthwave: 'synthwave',
        retro: 'retro',
        cyberpunk: 'cyberpunk',
        valentine: 'valentine',
        halloween: 'halloween',
        garden: 'garden',
        forest: 'forest',
        aqua: 'aqua',
        lofi: 'lofi',
        pastel: 'pastel',
        fantasy: 'fantasy',
        wireframe: 'wireframe',
        black: 'black',
        luxury: 'luxury',
        dracula: 'dracula',
        cmyk: 'cmyk',
        autumn: 'autumn',
        business: 'business',
        acid: 'acid',
        lemonade: 'lemonade',
        night: 'night',
        coffee: 'coffee',
        winter: 'winter',
        dim: 'dim',
        nord: 'nord',
        sunset: 'sunset',
      },
      defaultTheme: 'spoketowork-dark',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
