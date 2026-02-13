import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useState } from 'react';
import RouteDrawingTool from './RouteDrawingTool';
import type { LatLngTuple } from 'leaflet';
import type { RouteGeometry } from '@/types/route';

// Sample waypoints for Cleveland, TN area
const sampleWaypoints: LatLngTuple[] = [
  [35.1595, -84.8767], // Downtown Cleveland
  [35.165, -84.87],
  [35.1667, -84.8667], // Mohawk Drive
];

const greenWayWaypoints: LatLngTuple[] = [
  [35.1333, -84.8833], // South terminus (Willow St)
  [35.14, -84.88],
  [35.145, -84.875],
  [35.15, -84.87],
  [35.155, -84.867],
  [35.1667, -84.8667], // North terminus (Mohawk Dr)
];

const MapDecorator = (Story: React.ComponentType) => (
  <div style={{ height: 500, width: '100%', position: 'relative' }}>
    <MapContainer
      center={[35.15, -84.87]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Story />
    </MapContainer>
  </div>
);

const meta: Meta<typeof RouteDrawingTool> = {
  title: 'Map/RouteDrawingTool',
  component: RouteDrawingTool,
  tags: ['autodocs'],
  decorators: [MapDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RouteDrawingTool>;

export const DrawingModeEmpty: Story = {
  args: {
    isDrawing: true,
    initialWaypoints: [],
  },
};

export const DrawingModeWithWaypoints: Story = {
  args: {
    isDrawing: true,
    initialWaypoints: sampleWaypoints,
  },
};

export const ViewingModeWithRoute: Story = {
  args: {
    isDrawing: false,
    initialWaypoints: sampleWaypoints,
  },
};

export const GreenWayRoute: Story = {
  args: {
    isDrawing: false,
    initialWaypoints: greenWayWaypoints,
    lineColor: '#10B981',
    lineWeight: 5,
  },
};

export const CustomColorRoute: Story = {
  args: {
    isDrawing: false,
    initialWaypoints: sampleWaypoints,
    lineColor: '#EF4444',
  },
};

export const ThickLineRoute: Story = {
  args: {
    isDrawing: false,
    initialWaypoints: sampleWaypoints,
    lineWeight: 8,
  },
};

// Interactive story with callback logging
export const InteractiveDrawing: Story = {
  render: () => {
    const [waypoints, setWaypoints] = useState<LatLngTuple[]>([]);
    const [isDrawing, setIsDrawing] = useState(true);
    const [savedGeometry, setSavedGeometry] = useState<RouteGeometry | null>(
      null
    );

    const handleComplete = (geometry: RouteGeometry, distance: number) => {
      console.log('Route completed:', { geometry, distance });
      setSavedGeometry(geometry);
      setIsDrawing(false);
    };

    return (
      <>
        <RouteDrawingTool
          isDrawing={isDrawing}
          initialWaypoints={waypoints}
          onWaypointsChange={setWaypoints}
          onComplete={handleComplete}
        />
        {/* Info panel for story */}
        <div className="bg-base-100 absolute top-4 right-4 z-[1000] max-w-xs rounded-lg p-3 shadow-lg">
          <h3 className="mb-2 font-bold">Instructions</h3>
          <p className="mb-2 text-sm">Click on the map to add waypoints</p>
          <p className="text-base-content/70 text-sm">
            {isDrawing
              ? 'Drawing mode active - click map to add points'
              : 'Route saved! Refresh to draw again'}
          </p>
          {savedGeometry && (
            <div className="mt-2 text-xs">
              <strong>Saved geometry:</strong>
              <pre className="bg-base-200 mt-1 max-h-32 overflow-auto rounded p-2">
                {JSON.stringify(savedGeometry, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </>
    );
  },
};

// Long route with many waypoints
export const LongRoute: Story = {
  args: {
    isDrawing: true,
    initialWaypoints: [
      [35.13, -84.89],
      [35.135, -84.885],
      [35.14, -84.88],
      [35.145, -84.875],
      [35.15, -84.87],
      [35.155, -84.865],
      [35.16, -84.86],
      [35.165, -84.855],
      [35.17, -84.85],
      [35.175, -84.845],
    ],
  },
};

// Minimal route (just 2 points)
export const MinimalRoute: Story = {
  args: {
    isDrawing: true,
    initialWaypoints: [
      [35.16, -84.87],
      [35.17, -84.86],
    ],
  },
};

// Single point (can't complete yet)
export const SinglePoint: Story = {
  args: {
    isDrawing: true,
    initialWaypoints: [[35.16, -84.87]],
  },
};
