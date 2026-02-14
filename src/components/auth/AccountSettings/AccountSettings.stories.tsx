import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AccountSettings from './AccountSettings';

// Global preview.tsx provides mock AuthContext — no real AuthProvider needed
const meta: Meta<typeof AccountSettings> = {
  title: 'Features/Authentication/AccountSettings',
  component: AccountSettings,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Account settings management for authenticated users.',
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
    className: 'max-w-2xl',
  },
};
