import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import StatusFunnel from './StatusFunnel';

const meta: Meta<typeof StatusFunnel> = {
  title: 'Atomic Design/Molecular/StatusFunnel',
  component: StatusFunnel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StatusFunnel>;

export const Default: Story = {
  args: {
    statusCounts: {
      not_applied: 2,
      applied: 8,
      screening: 5,
      interviewing: 3,
      offer: 1,
      closed: 4,
    },
    totalCount: 23,
    activeFilter: 'all',
    onFilterChange: () => {},
  },
};

export const FilteredToApplied: Story = {
  args: {
    ...Default.args,
    activeFilter: 'applied',
  },
};

export const Empty: Story = {
  args: {
    statusCounts: {},
    totalCount: 0,
    activeFilter: 'all',
    onFilterChange: () => {},
  },
};

export const HeavyPipeline: Story = {
  args: {
    statusCounts: {
      not_applied: 45,
      applied: 120,
      screening: 30,
      interviewing: 15,
      offer: 5,
      closed: 80,
    },
    totalCount: 295,
    activeFilter: 'all',
    onFilterChange: () => {},
  },
};
