import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BikeRoutesLayer } from './BikeRoutesLayer';

/**
 * BikeRoutesLayer displays OSM bike routes on a MapLibre map.
 *
 * This component uses react-map-gl's declarative Source/Layer components
 * which automatically persist across map style changes (theme toggles).
 * Colors are driven by DaisyUI semantic tokens via useDaisyColors, so all
 * 32 themes adapt automatically.
 *
 * **Note**: This component must be rendered inside a react-map-gl Map component.
 * The stories here show the component in isolation for documentation purposes.
 */
const meta: Meta<typeof BikeRoutesLayer> = {
  title: 'Features/Map/BikeRoutesLayer',
  component: BikeRoutesLayer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
BikeRoutesLayer renders OSM bike routes from a GeoJSON file.

## Features
- Theme-adaptive colors via DaisyUI semantic tokens (useDaisyColors hook)
- Automatic persistence across MapLibre style changes
- Casing layer for visibility against any background
- Zoom-responsive line widths

## Usage

\`\`\`tsx
import { BikeRoutesLayer } from '@/components/map/BikeRoutesLayer';

// Inside a react-map-gl Map component:
<Map mapStyle={mapStyle}>
  <BikeRoutesLayer />
</Map>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the layer is visible',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BikeRoutesLayer>;

/**
 * Default state with theme-adaptive colors from useDaisyColors.
 * Route color uses the `success` token, casing uses `base-100`.
 */
export const Default: Story = {
  args: {
    visible: true,
  },
  render: (args) => (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-base-content/75 text-sm">
        Component requires react-map-gl Map wrapper.
        <br />
        Colors adapt automatically via DaisyUI theme tokens.
      </div>
      <div className="border-base-300 bg-base-200 rounded-lg border p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Theme-Adaptive Props</h3>
        <pre className="text-sm">{JSON.stringify(args, null, 2)}</pre>
        <div className="mt-2 flex items-center gap-2">
          <div className="bg-success h-4 w-16 rounded" />
          <span className="text-sm">Route Color: success token</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="bg-base-100 h-4 w-16 rounded border" />
          <span className="text-sm">Casing Color: base-100 token</span>
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
    visible: false,
  },
  render: (args) => (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-base-content/75 text-sm">
        Layer is hidden (visible: false)
      </div>
      <div className="border-base-300 bg-base-200 rounded-lg border p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Hidden Layer Props</h3>
        <pre className="text-sm">{JSON.stringify(args, null, 2)}</pre>
        <p className="text-base-content/75 mt-2 text-sm">
          Layers have visibility: &apos;none&apos; in layout
        </p>
      </div>
    </div>
  ),
};
