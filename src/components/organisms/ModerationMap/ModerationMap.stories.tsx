import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ModerationMap } from './ModerationMap';
import type { MapMarker } from '@/components/map/MapContainer';

const meta: Meta<typeof ModerationMap> = {
  title: 'Organisms/ModerationMap',
  component: ModerationMap,
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    onSelectPending: { action: 'selectPending' },
  },
};
export default meta;

type Story = StoryObj<typeof ModerationMap>;

const pending: MapMarker[] = [
  {
    id: 'pending-demo-1',
    position: [51.5, -0.1],
    popup: 'New Welding Co',
    variant: 'pending-contribution',
  },
  {
    id: 'pending-demo-2',
    position: [51.52, -0.08],
    popup: 'Fresh Fab Ltd',
    variant: 'pending-contribution',
  },
];

const approved: MapMarker[] = [
  {
    id: 'approved-demo-1',
    position: [51.505, -0.11],
    popup: 'Existing Weld Ltd\n2 Nearby Rd',
    variant: 'default',
  },
];

export const Default: Story = {
  args: {
    pendingMarkers: pending,
    approvedMarkers: approved,
    selectedContributionId: null,
  },
};

export const Selected: Story = {
  args: {
    pendingMarkers: pending,
    approvedMarkers: approved,
    selectedContributionId: 'demo-1',
  },
};

export const PendingOnly: Story = {
  args: {
    pendingMarkers: pending,
    approvedMarkers: [],
    selectedContributionId: null,
  },
};
