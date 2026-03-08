import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AdminStatsGrid from './AdminStatsGrid';

const meta: Meta<typeof AdminStatsGrid> = {
  title: 'Atomic Design/Organism/AdminStatsGrid',
  component: AdminStatsGrid,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof AdminStatsGrid>;

const base = {
  totalRoutes: 42,
  activeRoutes: 31,
  inactiveRoutes: 11,
  avgStopsPerRoute: 5.8,
  avgDistanceMiles: 14.2,
  routesPerMetro: [
    { metroId: 'm1', metroName: 'Cleveland', count: 18 },
    { metroId: 'm2', metroName: 'Bradley', count: 12 },
    { metroId: 'm3', metroName: 'Chattanooga', count: 9 },
    { metroId: null, metroName: 'Unassigned', count: 3 },
  ],
};

export const Default: Story = { args: base };

export const Loading: Story = { args: { ...base, isLoading: true } };

export const ErrorState: Story = {
  args: { ...base, error: new Error('Network request failed') },
};

export const ZeroRoutes: Story = {
  args: {
    totalRoutes: 0,
    activeRoutes: 0,
    inactiveRoutes: 0,
    avgStopsPerRoute: 0,
    avgDistanceMiles: 0,
    routesPerMetro: [],
  },
};

export const NoDistanceData: Story = {
  args: { ...base, avgDistanceMiles: 0 },
  parameters: {
    docs: {
      description: {
        story: 'All routes have null distance_miles — shows em-dash instead of "0.0 mi".',
      },
    },
  },
};
