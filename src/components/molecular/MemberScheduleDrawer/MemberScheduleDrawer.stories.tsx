import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MemberScheduleDrawer from './MemberScheduleDrawer';
import type { TeamShift } from '@/types/schedule';

const member = {
  user_id: 'u1',
  display_name: 'Alice Chen',
  avatar_url: null,
  joined_at: '2026-01-01',
};

const existingShifts: TeamShift[] = [
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
    user_id: 'u1',
    display_name: 'Alice Chen',
    avatar_url: null,
    shift_date: '2026-03-04',
    start_time: '10:00:00',
    end_time: '18:00:00',
    shift_type: 'regular',
    notes: null,
    created_by: 'u2',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

const meta: Meta<typeof MemberScheduleDrawer> = {
  title: 'Atomic Design/Molecular/MemberScheduleDrawer',
  component: MemberScheduleDrawer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MemberScheduleDrawer>;

export const NewSchedule: Story = {
  args: {
    member,
    existingShifts: [],
    weekStart: '2026-03-02',
    businessHours: { open: '08:00', close: '18:00' },
    onSave: async () => {},
    onClose: () => {},
  },
};

export const WithExistingShifts: Story = {
  args: {
    member,
    existingShifts,
    weekStart: '2026-03-02',
    businessHours: { open: '08:00', close: '18:00' },
    onSave: async () => {},
    onClose: () => {},
  },
};

export const Saving: Story = {
  args: {
    member,
    existingShifts,
    weekStart: '2026-03-02',
    businessHours: { open: '08:00', close: '18:00' },
    onSave: async () => {},
    onClose: () => {},
    saving: true,
  },
};
