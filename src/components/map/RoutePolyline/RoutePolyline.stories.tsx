import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import RoutePolyline, { RoutePolylines } from './RoutePolyline';
import type { BicycleRoute, RouteGeometry } from '@/types/route';

// Cleveland GreenWay approximate coordinates
const clevelandGreenWayGeometry: RouteGeometry = {
  type: 'LineString',
  coordinates: [
    [-84.8833, 35.1333], // South terminus (Willow St)
    [-84.88, 35.14],
    [-84.875, 35.145],
    [-84.87, 35.15],
    [-84.867, 35.155],
    [-84.8667, 35.1667], // North terminus (Mohawk Dr)
  ],
};

const userRouteGeometry: RouteGeometry = {
  type: 'LineString',
  coordinates: [
    [-84.87, 35.16],
    [-84.865, 35.165],
    [-84.86, 35.17],
    [-84.855, 35.168],
    [-84.85, 35.165],
  ],
};

const mockUserRoute: BicycleRoute = {
  id: 'user-route-1',
  user_id: 'user-1',
  metro_area_id: null,
  name: 'Morning Loop',
  description: 'My daily morning ride through the neighborhood',
  color: '#3B82F6',
  start_address: '123 Home St',
  start_latitude: 35.16,
  start_longitude: -84.87,
  end_address: '123 Home St',
  end_latitude: 35.165,
  end_longitude: -84.85,
  route_geometry: userRouteGeometry,
  distance_miles: 3.2,
  estimated_time_minutes: 18,
  is_system_route: false,
  source_name: null,
  is_active: true,
  start_type: 'home',
  end_type: 'home',
  is_round_trip: true,
  last_optimized_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSystemRoute: BicycleRoute = {
  id: 'system-route-1',
  user_id: 'system',
  metro_area_id: 'metro-1',
  name: 'Cleveland GreenWay',
  description:
    'A 4.2-mile paved trail connecting Mohawk Drive to Willow Street',
  color: '#10B981',
  start_address: 'Willow Street Trailhead',
  start_latitude: 35.1333,
  start_longitude: -84.8833,
  end_address: 'Mohawk Drive Trailhead',
  end_latitude: 35.1667,
  end_longitude: -84.8667,
  route_geometry: clevelandGreenWayGeometry,
  distance_miles: 4.2,
  estimated_time_minutes: 25,
  is_system_route: true,
  source_name: 'Cleveland Parks',
  is_active: true,
  start_type: 'custom',
  end_type: 'custom',
  is_round_trip: false,
  last_optimized_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// MapLibre decorator — RoutePolyline uses react-map-gl/maplibre, not react-leaflet
const MapDecorator = (Story: React.ComponentType) => (
  <div style={{ height: 500, width: '100%' }}>
    <Map
      initialViewState={{
        longitude: -84.87,
        latitude: 35.15,
        zoom: 13,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    >
      <Story />
    </Map>
  </div>
);

const meta: Meta<typeof RoutePolyline> = {
  title: 'Features/Map/RoutePolyline',
  component: RoutePolyline,
  tags: ['autodocs'],
  decorators: [MapDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RoutePolyline>;

export const UserRoute: Story = {
  args: {
    route: mockUserRoute,
  },
};

export const UserRouteActive: Story = {
  args: {
    route: mockUserRoute,
    isActive: true,
  },
};

export const SystemRoute: Story = {
  args: {
    route: mockSystemRoute,
    isSystemRoute: true,
  },
};

export const SystemRouteActive: Story = {
  args: {
    route: mockSystemRoute,
    isSystemRoute: true,
    isActive: true,
  },
};

export const CustomColor: Story = {
  args: {
    route: mockUserRoute,
    color: '#EF4444', // Red
  },
};

export const CustomWeight: Story = {
  args: {
    route: mockUserRoute,
    weight: 8,
  },
};

export const NoPopup: Story = {
  args: {
    route: mockUserRoute,
    showPopup: false,
  },
};

export const MultipleRoutes: StoryObj<typeof RoutePolylines> = {
  render: () => (
    <RoutePolylines
      routes={[mockUserRoute, mockSystemRoute]}
      onRouteClick={(route) => console.log('Clicked:', route.name)}
    />
  ),
};

export const MultipleRoutesWithActive: StoryObj<typeof RoutePolylines> = {
  render: () => (
    <RoutePolylines
      routes={[mockUserRoute, mockSystemRoute]}
      activeRouteId="user-route-1"
      onRouteClick={(route) => console.log('Clicked:', route.name)}
    />
  ),
};

export const SystemRoutesOnly: StoryObj<typeof RoutePolylines> = {
  render: () => (
    <RoutePolylines
      routes={[mockUserRoute, mockSystemRoute]}
      showUserRoutes={false}
      showSystemRoutes={true}
    />
  ),
};

export const UserRoutesOnly: StoryObj<typeof RoutePolylines> = {
  render: () => (
    <RoutePolylines
      routes={[mockUserRoute, mockSystemRoute]}
      showUserRoutes={true}
      showSystemRoutes={false}
    />
  ),
};
