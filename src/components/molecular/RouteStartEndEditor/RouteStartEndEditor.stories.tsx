import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import RouteStartEndEditor from './RouteStartEndEditor';

const meta: Meta<typeof RouteStartEndEditor> = {
  title: 'Atomic Design/Molecular/RouteStartEndEditor',
  component: RouteStartEndEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onStartChange: { action: 'startChanged' },
    onEndChange: { action: 'endChanged' },
    onRoundTripChange: { action: 'roundTripChanged' },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RouteStartEndEditor>;

const mockHomeLocation = {
  address: '123 Home St, Cleveland, TN 37311',
  latitude: 35.1667,
  longitude: -84.8667,
};

/**
 * Default state with home location and round trip enabled
 */
export const Default: Story = {
  args: {
    homeLocation: mockHomeLocation,
    isRoundTrip: true,
  },
};

/**
 * No home location set - shows warning
 */
export const NoHomeLocation: Story = {
  args: {
    homeLocation: null,
    isRoundTrip: true,
    startPoint: {
      type: 'custom',
      address: '',
      latitude: null,
      longitude: null,
    },
  },
};

/**
 * Custom start location selected
 */
export const CustomStartLocation: Story = {
  args: {
    homeLocation: mockHomeLocation,
    isRoundTrip: true,
    startPoint: {
      type: 'custom',
      address: '456 Office Park, Chattanooga, TN',
      latitude: 35.0456,
      longitude: -85.3097,
    },
  },
};

/**
 * One-way route (non-round-trip) showing both start and end
 */
export const OneWayRoute: Story = {
  args: {
    homeLocation: mockHomeLocation,
    isRoundTrip: false,
    startPoint: {
      type: 'home',
      address: mockHomeLocation.address,
      latitude: mockHomeLocation.latitude,
      longitude: mockHomeLocation.longitude,
    },
    endPoint: {
      type: 'custom',
      address: '500 Business Center, Cleveland, TN',
      latitude: 35.1333,
      longitude: -84.8833,
    },
  },
};

/**
 * Both endpoints using home location
 */
export const BothEndpointsHome: Story = {
  args: {
    homeLocation: mockHomeLocation,
    isRoundTrip: false,
    startPoint: {
      type: 'home',
      address: null,
      latitude: null,
      longitude: null,
    },
    endPoint: {
      type: 'home',
      address: null,
      latitude: null,
      longitude: null,
    },
  },
};

/**
 * Both endpoints using custom locations
 */
export const BothEndpointsCustom: Story = {
  args: {
    homeLocation: mockHomeLocation,
    isRoundTrip: false,
    startPoint: {
      type: 'custom',
      address: 'Point A',
      latitude: 35.17,
      longitude: -84.87,
    },
    endPoint: {
      type: 'custom',
      address: 'Point B',
      latitude: 35.19,
      longitude: -84.89,
    },
  },
};

/**
 * Disabled state - all inputs are disabled
 */
export const Disabled: Story = {
  args: {
    homeLocation: mockHomeLocation,
    isRoundTrip: true,
    disabled: true,
  },
};

/**
 * With custom coordinates but no address
 */
export const CoordinatesOnly: Story = {
  args: {
    homeLocation: mockHomeLocation,
    isRoundTrip: true,
    startPoint: {
      type: 'custom',
      address: null,
      latitude: 35.2,
      longitude: -84.9,
    },
  },
};
