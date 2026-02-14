import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SignUpForm from './SignUpForm';

// Global preview.tsx provides mock AuthContext — no real AuthProvider needed
const meta: Meta<typeof SignUpForm> = {
  title: 'Features/Authentication/SignUpForm',
  component: SignUpForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'User registration form with email verification.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSuccess: {
      action: 'sign-up-success',
    },
    className: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
