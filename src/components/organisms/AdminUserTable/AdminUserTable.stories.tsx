import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AdminUserTable from './AdminUserTable';
import type { AdminUser } from '@/hooks/useAdminUsers';

const meta: Meta<typeof AdminUserTable> = {
  title: 'Atomic Design/Organism/AdminUserTable',
  component: AdminUserTable,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof AdminUserTable>;

const users: AdminUser[] = [
  {
    id: 'u1',
    email: 'alice@example.com',
    display_name: 'Alice Chen',
    username: 'alice',
    role: 'admin',
    is_admin: true,
    created_at: '2025-10-01T10:00:00Z',
    last_sign_in_at: '2026-03-18T14:22:00Z',
    company_names: [],
  },
  {
    id: 'u2',
    email: 'bob@acme.example.com',
    display_name: 'Bob Martinez',
    username: 'bob',
    role: 'employer',
    is_admin: false,
    created_at: '2025-11-12T09:30:00Z',
    last_sign_in_at: '2026-03-17T08:15:00Z',
    company_names: ['Acme Co', 'Globex'],
  },
  {
    id: 'u3',
    email: 'carol@example.com',
    display_name: null,
    username: 'carol_w',
    role: 'worker',
    is_admin: false,
    created_at: '2026-01-05T16:45:00Z',
    last_sign_in_at: null,
    company_names: [],
  },
];

export const Default: Story = { args: { users } };

export const Loading: Story = { args: { users: [], isLoading: true } };

export const ErrorState: Story = {
  args: { users: [], error: new Error('Admin access required') },
};

export const Empty: Story = { args: { users: [] } };
