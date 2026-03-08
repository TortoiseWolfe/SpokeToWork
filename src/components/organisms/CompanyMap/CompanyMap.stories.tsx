import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CompanyMap } from './CompanyMap';
import { CompanyWorkspaceProvider } from '@/contexts/CompanyWorkspaceContext';
import type { MapMarker } from '@/components/map/MapContainer';

const meta: Meta<typeof CompanyMap> = {
  title: 'Organisms/CompanyMap',
  component: CompanyMap,
  decorators: [
    (Story) => (
      <CompanyWorkspaceProvider companies={[]}>
        <div style={{ height: '600px', width: '100%' }}>
          <Story />
        </div>
      </CompanyWorkspaceProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CompanyMap>;

const demoMarkers: MapMarker[] = [
  {
    id: 'company-demo-1',
    position: [40.7128, -74.006],
    popup: 'NYC Co',
    variant: 'default',
  },
  {
    id: 'company-demo-2',
    position: [40.758, -73.9855],
    popup: 'Times Sq Co',
    variant: 'active-route',
  },
  {
    id: 'company-demo-3',
    position: [40.7484, -73.9857],
    popup: 'ESB Co',
    variant: 'next-ride',
  },
];

export const Default: Story = {
  args: {
    markers: demoMarkers,
    center: [40.7128, -74.006],
    zoom: 12,
  },
};

export const Empty: Story = {
  args: {
    markers: [],
    center: [40.7128, -74.006],
    zoom: 12,
  },
};
