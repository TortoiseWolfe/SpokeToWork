import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import TileLayerSelector from './TileLayerSelector';
import type { MapTileProvider } from '@/types/route';

const mockProviders: MapTileProvider[] = [
  {
    id: '1',
    name: 'osm',
    display_name: 'OpenStreetMap',
    url_template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    max_zoom: 19,
    is_cycling_optimized: false,
    requires_api_key: false,
    is_enabled: true,
    priority: 1,
  },
  {
    id: '2',
    name: 'opencyclemap',
    display_name: 'OpenCycleMap',
    url_template:
      'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apikey}',
    attribution: '© Thunderforest',
    max_zoom: 22,
    is_cycling_optimized: true,
    requires_api_key: true,
    is_enabled: true,
    priority: 2,
  },
  {
    id: '3',
    name: 'outdoors',
    display_name: 'Thunderforest Outdoors',
    url_template:
      'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}',
    attribution: '© Thunderforest',
    max_zoom: 22,
    is_cycling_optimized: true,
    requires_api_key: true,
    is_enabled: true,
    priority: 3,
  },
  {
    id: '4',
    name: 'transport',
    display_name: 'Transport',
    url_template:
      'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey={apikey}',
    attribution: '© Thunderforest',
    max_zoom: 22,
    is_cycling_optimized: false,
    requires_api_key: true,
    is_enabled: true,
    priority: 4,
  },
];

const meta: Meta<typeof TileLayerSelector> = {
  title: 'Map/TileLayerSelector',
  component: TileLayerSelector,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="bg-base-100 p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TileLayerSelector>;

export const Default: Story = {
  args: {
    providers: mockProviders,
    selected: mockProviders[0],
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const CyclingOptimizedSelected: Story = {
  args: {
    providers: mockProviders,
    selected: mockProviders[1], // OpenCycleMap
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const NoProviderSelected: Story = {
  args: {
    providers: mockProviders,
    selected: null,
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const WithApiKey: Story = {
  args: {
    providers: mockProviders,
    selected: mockProviders[1],
    hasApiKey: true,
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const WithoutApiKey: Story = {
  args: {
    providers: mockProviders,
    selected: mockProviders[0],
    hasApiKey: false,
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const Loading: Story = {
  args: {
    providers: [],
    selected: null,
    isLoading: true,
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const WithResetOption: Story = {
  args: {
    providers: mockProviders,
    selected: mockProviders[1],
    onSelect: (name) => console.log('Selected:', name),
    onReset: () => console.log('Reset'),
  },
};

export const EmptyProviders: Story = {
  args: {
    providers: [],
    selected: null,
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const SingleProvider: Story = {
  args: {
    providers: [mockProviders[0]],
    selected: mockProviders[0],
    onSelect: (name) => console.log('Selected:', name),
  },
};

export const WithAvailabilityCheck: Story = {
  args: {
    providers: mockProviders,
    selected: mockProviders[0],
    onSelect: (name) => console.log('Selected:', name),
    isProviderAvailable: (name) => name === 'osm', // Only OSM available
  },
};
