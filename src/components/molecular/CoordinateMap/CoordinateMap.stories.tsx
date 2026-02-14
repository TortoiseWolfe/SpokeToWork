import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import CoordinateMap from './CoordinateMap';

const meta: Meta<typeof CoordinateMap> = {
  title: 'Atomic Design/Molecular/CoordinateMap',
  component: CoordinateMap,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Interactive map component for displaying and selecting coordinates. Used in company management for visual coordinate verification.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    latitude: {
      control: { type: 'number', min: -90, max: 90, step: 0.0001 },
      description: 'Latitude of the marker',
    },
    longitude: {
      control: { type: 'number', min: -180, max: 180, step: 0.0001 },
      description: 'Longitude of the marker',
    },
    zoom: {
      control: { type: 'number', min: 1, max: 18 },
      description: 'Initial zoom level',
    },
    height: {
      control: 'text',
      description: 'Map height',
    },
    width: {
      control: 'text',
      description: 'Map width',
    },
    interactive: {
      control: 'boolean',
      description: 'Whether clicking updates coordinates',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// New York City coordinates
export const Default: Story = {
  args: {
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 14,
    height: '300px',
    width: '100%',
    interactive: true,
  },
};

// Interactive story with state
const InteractiveTemplate = () => {
  const [coords, setCoords] = useState({ lat: 40.7128, lng: -74.006 });

  return (
    <div className="space-y-4">
      <CoordinateMap
        latitude={coords.lat}
        longitude={coords.lng}
        onCoordinateChange={(lat, lng) => setCoords({ lat, lng })}
        height="400px"
        interactive={true}
      />
      <div className="text-sm">
        <strong>Current Coordinates:</strong>
        <br />
        Latitude: {coords.lat.toFixed(6)}
        <br />
        Longitude: {coords.lng.toFixed(6)}
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveTemplate />,
  parameters: {
    docs: {
      description: {
        story: 'Click on the map to update the marker position.',
      },
    },
  },
};

// With home location marker
export const WithHomeLocation: Story = {
  args: {
    latitude: 40.758,
    longitude: -73.9855,
    homeLocation: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    zoom: 12,
    height: '350px',
    interactive: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows both the selected location (blue) and home location (green).',
      },
    },
  },
};

// Non-interactive (read-only)
export const ReadOnly: Story = {
  args: {
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 13,
    height: '250px',
    interactive: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Read-only map that cannot be clicked to update coordinates.',
      },
    },
  },
};

// Loading state placeholder
export const Loading: Story = {
  args: {
    latitude: 0,
    longitude: 0,
    height: '200px',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading spinner before the map loads.',
      },
    },
  },
};
