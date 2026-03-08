import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import HomeLocationSettings from './HomeLocationSettings';

const meta: Meta<typeof HomeLocationSettings> = {
  title: 'Atomic Design/Organism/HomeLocationSettings',
  component: HomeLocationSettings,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Settings component for configuring user home location. Used for distance calculations in company management. Includes address geocoding, map preview, and radius configuration.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    initialLocation: {
      description: 'Initial home location if already set',
    },
    onSave: {
      description: 'Callback when location is saved',
      action: 'saved',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSave: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty form for first-time setup. User enters address and geocodes it.',
      },
    },
  },
};

export const WithInitialLocation: Story = {
  args: {
    initialLocation: {
      address: '350 5th Ave, New York, NY 10118',
      latitude: 40.7484,
      longitude: -73.9857,
      radius_miles: 25,
    },
    onSave: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pre-filled with an existing home location (Empire State Building).',
      },
    },
  },
};

export const WithLargeRadius: Story = {
  args: {
    initialLocation: {
      address: '1 Infinite Loop, Cupertino, CA 95014',
      latitude: 37.3318,
      longitude: -122.0312,
      radius_miles: 75,
    },
    onSave: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Configured with a large 75-mile radius.',
      },
    },
  },
};

export const WithSmallRadius: Story = {
  args: {
    initialLocation: {
      address: '1600 Pennsylvania Avenue NW, Washington, DC',
      latitude: 38.8977,
      longitude: -77.0365,
      radius_miles: 5,
    },
    onSave: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Configured with a small 5-mile radius for urban areas.',
      },
    },
  },
};
