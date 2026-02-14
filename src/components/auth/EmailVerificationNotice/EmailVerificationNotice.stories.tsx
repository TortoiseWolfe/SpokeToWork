import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import EmailVerificationNotice from './EmailVerificationNotice';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/contexts/AuthContext';

// Mock unverified user — email_confirmed_at is null so the notice renders
const mockUnverifiedUser = {
  id: 'mock-user-id',
  email: 'user@example.com',
  email_confirmed_at: null,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as any;

const mockAuthValue: AuthContextType = {
  user: mockUnverifiedUser,
  session: null,
  isLoading: false,
  isAuthenticated: true,
  error: null,
  retryCount: 0,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshSession: async () => {},
  retry: async () => {},
  clearError: () => {},
};

const withMockAuth = (Story: any) => (
  <AuthContext.Provider value={mockAuthValue}>
    <Story />
  </AuthContext.Provider>
);

const meta: Meta<typeof EmailVerificationNotice> = {
  title: 'Features/Authentication/EmailVerificationNotice',
  component: EmailVerificationNotice,
  decorators: [withMockAuth],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Notice banner for users who need to verify their email address.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithCustomClass: Story = {
  args: {
    className: 'max-w-md',
  },
};
