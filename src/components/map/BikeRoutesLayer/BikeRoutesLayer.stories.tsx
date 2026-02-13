import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BikeRoutesLayer } from './BikeRoutesLayer';

/**
 * BikeRoutesLayer displays OSM bike routes on a MapLibre map.
 *
 * This component uses react-map-gl's declarative Source/Layer components
 * which automatically persist across map style changes (theme toggles).
 *
 * **Note**: This component must be rendered inside a react-map-gl Map component.
 * The stories here show the component in isolation for documentation purposes.
 */
const meta: Meta<typeof BikeRoutesLayer> = {
  title: 'Map/BikeRoutesLayer',
  component: BikeRoutesLayer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
BikeRoutesLayer renders OSM bike routes from a GeoJSON file.

## Features
- Theme-adaptive colors (green-500 in light mode, green-400 in dark mode)
- Automatic persistence across MapLibre style changes
- Casing layer for visibility against any background
- Zoom-responsive line widths

## Usage

\`\`\`tsx
import { BikeRoutesLayer } from '@/components/map/BikeRoutesLayer';

// Inside a react-map-gl Map component:
<Map mapStyle={mapStyle}>
  <BikeRoutesLayer isDarkMode={isDarkMode} />
</Map>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isDarkMode: {
      control: 'boolean',
      description: 'Whether the current theme is dark mode',
    },
    visible: {
      control: 'boolean',
      description: 'Whether the layer is visible',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BikeRoutesLayer>;

/**
 * Light mode styling with green-500 (#22c55e) route color.
 */
export const LightMode: Story = {
  args: {
    isDarkMode: false,
    visible: true,
  },
  render: (args) => (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-sm text-gray-500">
        Component requires react-map-gl Map wrapper.
        <br />
        Showing props for documentation:
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Light Mode Props</h3>
        <pre className="text-sm">{JSON.stringify(args, null, 2)}</pre>
        <div className="mt-2 flex items-center gap-2">
          <div
            className="h-4 w-16 rounded"
            style={{ backgroundColor: '#22c55e' }}
          />
          <span className="text-sm">Route Color: #22c55e (green-500)</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-4 w-16 rounded border"
            style={{ backgroundColor: '#ffffff' }}
          />
          <span className="text-sm">Casing Color: #ffffff (white)</span>
        </div>
      </div>
    </div>
  ),
};

/**
 * Dark mode styling with green-400 (#4ade80) route color.
 */
export const DarkMode: Story = {
  args: {
    isDarkMode: true,
    visible: true,
  },
  render: (args) => (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-sm text-gray-500">
        Component requires react-map-gl Map wrapper.
        <br />
        Showing props for documentation:
      </div>
      <div className="rounded-lg border bg-gray-800 p-4 text-white shadow-sm">
        <h3 className="mb-2 font-semibold">Dark Mode Props</h3>
        <pre className="text-sm">{JSON.stringify(args, null, 2)}</pre>
        <div className="mt-2 flex items-center gap-2">
          <div
            className="h-4 w-16 rounded"
            style={{ backgroundColor: '#4ade80' }}
          />
          <span className="text-sm">Route Color: #4ade80 (green-400)</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-4 w-16 rounded"
            style={{ backgroundColor: '#1a1a2e' }}
          />
          <span className="text-sm">Casing Color: #1a1a2e (dark bg)</span>
        </div>
      </div>
    </div>
  ),
};

/**
 * Hidden layer (visible: false).
 */
export const Hidden: Story = {
  args: {
    isDarkMode: false,
    visible: false,
  },
  render: (args) => (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-sm text-gray-500">
        Layer is hidden (visible: false)
      </div>
      <div className="rounded-lg border bg-white p-4 opacity-50 shadow-sm">
        <h3 className="mb-2 font-semibold">Hidden Layer Props</h3>
        <pre className="text-sm">{JSON.stringify(args, null, 2)}</pre>
        <p className="mt-2 text-sm text-gray-500">
          Layers have visibility: &apos;none&apos; in layout
        </p>
      </div>
    </div>
  ),
};
