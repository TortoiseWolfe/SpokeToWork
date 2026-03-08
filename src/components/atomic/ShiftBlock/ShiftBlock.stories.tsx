import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ShiftBlock from './ShiftBlock';
import type { TeamShift } from '@/types/schedule';

const baseShift: TeamShift = {
  id: '1',
  company_id: 'c1',
  user_id: 'u1',
  display_name: 'Alice',
  avatar_url: null,
  shift_date: '2026-03-02',
  start_time: '09:00:00',
  end_time: '17:00:00',
  shift_type: 'regular',
  notes: null,
  created_by: 'u2',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const meta: Meta<typeof ShiftBlock> = {
  title: 'Atomic Design/Atomic/ShiftBlock',
  component: ShiftBlock,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ShiftBlock>;

export const Regular: Story = {
  args: { shift: baseShift },
};

export const OnCall: Story = {
  args: {
    shift: {
      ...baseShift,
      shift_type: 'on_call',
      start_time: '18:00:00',
      end_time: '22:00:00',
    },
  },
};

export const Interview: Story = {
  args: {
    shift: {
      ...baseShift,
      shift_type: 'interview',
      start_time: '14:00:00',
      end_time: '15:00:00',
    },
  },
};

export const Training: Story = {
  args: {
    shift: {
      ...baseShift,
      shift_type: 'training',
      start_time: '10:00:00',
      end_time: '12:00:00',
    },
  },
};

export const Compact: Story = {
  args: { shift: baseShift, compact: true },
};
