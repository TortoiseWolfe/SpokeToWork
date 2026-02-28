import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DateChip from './DateChip';

const meta: Meta<typeof DateChip> = {
  title: 'Atomic Design/Atomic/DateChip',
  component: DateChip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof DateChip>;

export const FutureDate: Story = {
  args: { date: '2026-04-15T10:00:00Z' },
};

export const PastDate: Story = {
  args: { date: '2026-01-10T10:00:00Z' },
};

export const WithLabel: Story = {
  args: { date: '2026-03-05T14:00:00Z', label: 'Interview' },
};

export const Today: Story = {
  args: { date: new Date().toISOString() },
};
