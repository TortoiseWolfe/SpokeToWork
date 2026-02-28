import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import WeekScheduleGrid from './WeekScheduleGrid';
import type { TeamShift } from '@/types/schedule';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const members: TeamMember[] = [
  {
    user_id: 'u1',
    display_name: 'Alice Chen',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
  {
    user_id: 'u2',
    display_name: 'Bob Ramirez',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
  {
    user_id: 'u3',
    display_name: 'Carol Davis',
    avatar_url: null,
    joined_at: '2026-02-15',
  },
];

const shifts: TeamShift[] = [
  {
    id: 's1',
    company_id: 'c1',
    user_id: 'u1',
    display_name: 'Alice Chen',
    avatar_url: null,
    shift_date: '2026-03-02',
    start_time: '09:00:00',
    end_time: '17:00:00',
    shift_type: 'regular',
    notes: null,
    created_by: 'u2',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 's2',
    company_id: 'c1',
    user_id: 'u1',
    display_name: 'Alice Chen',
    avatar_url: null,
    shift_date: '2026-03-03',
    start_time: '09:00:00',
    end_time: '17:00:00',
    shift_type: 'regular',
    notes: null,
    created_by: 'u2',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 's3',
    company_id: 'c1',
    user_id: 'u2',
    display_name: 'Bob Ramirez',
    avatar_url: null,
    shift_date: '2026-03-03',
    start_time: '10:00:00',
    end_time: '18:00:00',
    shift_type: 'regular',
    notes: null,
    created_by: 'u2',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 's4',
    company_id: 'c1',
    user_id: 'u3',
    display_name: 'Carol Davis',
    avatar_url: null,
    shift_date: '2026-03-04',
    start_time: '14:00:00',
    end_time: '16:00:00',
    shift_type: 'interview',
    notes: 'Candidate meeting',
    created_by: 'u2',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 's5',
    company_id: 'c1',
    user_id: null,
    display_name: null,
    avatar_url: null,
    shift_date: '2026-03-02',
    start_time: '08:00:00',
    end_time: '12:00:00',
    shift_type: 'on_call',
    notes: 'Coverage needed',
    created_by: 'u2',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

const meta: Meta<typeof WeekScheduleGrid> = {
  title: 'Atomic Design/Organism/WeekScheduleGrid',
  component: WeekScheduleGrid,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WeekScheduleGrid>;

export const Default: Story = {
  args: {
    shifts,
    members,
    weekStart: '2026-03-02',
    loading: false,
    error: null,
    businessHours: { open: '08:00', close: '18:00' },
    onPrevWeek: () => {},
    onNextWeek: () => {},
    onToday: () => {},
    onAddShift: () => {},
    onEditShift: () => {},
  },
};

export const Loading: Story = {
  args: { ...Default.args, loading: true },
};

export const Error: Story = {
  args: {
    ...Default.args,
    error: 'Failed to load schedule',
    onRefresh: () => {},
  },
};

export const Empty: Story = {
  args: { ...Default.args, shifts: [], members: [] },
};

export const EditableBusinessHours: Story = {
  args: {
    ...Default.args,
    onUpdateBusinessHours: async () => {},
  },
};

export const WithCopyLastWeek: Story = {
  args: {
    ...Default.args,
    onCopyLastWeek: async () => 5,
    onUpdateBusinessHours: async () => {},
  },
};
