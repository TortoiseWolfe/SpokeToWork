import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmployeeList from './EmployeeList';
import type { TeamMember } from '@/types/company';

const createMember = (
  overrides: Partial<TeamMember> & { id: string }
): TeamMember => ({
  company_id: 'comp-1',
  user_id: null,
  name: 'Alice Smith',
  email: 'alice@example.com',
  role_title: 'Developer',
  start_date: '2026-01-15',
  added_by: 'user-1',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  ...overrides,
});

const sampleMembers: TeamMember[] = [
  createMember({
    id: 'tm-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    role_title: 'Frontend Developer',
    start_date: '2026-01-15',
  }),
  createMember({
    id: 'tm-2',
    name: 'Bob Jones',
    email: 'bob@example.com',
    role_title: 'Backend Engineer',
    start_date: '2026-02-01',
  }),
  createMember({
    id: 'tm-3',
    name: 'Carol Davis',
    email: 'carol@example.com',
    role_title: 'UX Designer',
    start_date: '2026-02-10',
  }),
];

const meta = {
  title: 'Atomic Design/Organism/EmployeeList',
  component: EmployeeList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onAdd: { action: 'add' },
    onUpdate: { action: 'update' },
    onRemove: { action: 'remove' },
    onRefresh: { action: 'refresh' },
  },
} satisfies Meta<typeof EmployeeList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithMembers: Story = {
  args: {
    members: sampleMembers,
    loading: false,
    error: null,
    onAdd: async (data) => {
      console.log('Add:', data);
    },
    onUpdate: async (id, data) => {
      console.log('Update:', id, data);
    },
    onRemove: async (id) => {
      console.log('Remove:', id);
    },
  },
};

export const Empty: Story = {
  args: {
    members: [],
    loading: false,
    error: null,
    onAdd: async () => {},
    onUpdate: async () => {},
    onRemove: async () => {},
  },
};

export const Loading: Story = {
  args: {
    members: [],
    loading: true,
    error: null,
    onAdd: async () => {},
    onUpdate: async () => {},
    onRemove: async () => {},
  },
};

export const Error: Story = {
  args: {
    members: [],
    loading: false,
    error: 'Failed to load team members. Please check your connection.',
    onAdd: async () => {},
    onUpdate: async () => {},
    onRemove: async () => {},
    onRefresh: async () => {
      console.log('Refresh');
    },
  },
};
