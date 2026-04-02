import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import WorkerShiftCard from './WorkerShiftCard';
import type { WorkerShift } from '@/types/schedule';

const PAST = new Date(Date.now() - 60_000).toISOString();
const FUTURE = new Date(Date.now() + 60 * 60_000).toISOString();

const baseShift: WorkerShift = {
  id: 's1',
  company_id: 'c1',
  company_name: "Joe's Pizza",
  shift_date: '2026-04-02',
  start_time: '09:00:00',
  end_time: '13:00:00',
  shift_type: 'regular',
  notes: null,
  metro_timezone: 'America/New_York',
  clock_in_opens_at: PAST,
  shift_end_at: FUTURE,
  active_entry_id: null,
  active_clock_in_at: null,
  active_entry_status: null,
};

const meta: Meta<typeof WorkerShiftCard> = {
  title: 'Atomic Design/Molecular/WorkerShiftCard',
  component: WorkerShiftCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WorkerShiftCard>;

export const ReadyToClockIn: Story = { args: { shift: baseShift } };

export const WindowNotYetOpen: Story = {
  args: { shift: { ...baseShift, clock_in_opens_at: FUTURE } },
};

export const ClockedIn: Story = {
  args: {
    shift: {
      ...baseShift,
      active_entry_id: 'te1',
      active_clock_in_at: PAST,
      active_entry_status: 'confirmed',
    },
  },
};

export const BlockedByOpenEntry: Story = {
  args: { shift: baseShift, blocked: true },
};

export const HasPaperOverlap: Story = {
  args: { shift: baseShift, hasOverlap: true },
};

export const Ended: Story = {
  args: {
    shift: { ...baseShift, clock_in_opens_at: PAST, shift_end_at: PAST },
  },
};
