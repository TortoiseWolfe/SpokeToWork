import type { Meta, StoryObj } from '@storybook/nextjs';
import NextRidePanel from './NextRidePanel';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

const mockRoutes: BicycleRoute[] = [
  {
    id: 'route-1',
    user_id: 'user-1',
    metro_area_id: null,
    name: 'Morning Loop',
    description: 'My daily morning route',
    color: '#3B82F6',
    start_address: '123 Home St',
    start_latitude: 35.16,
    start_longitude: -84.87,
    end_address: '123 Home St',
    end_latitude: 35.16,
    end_longitude: -84.87,
    route_geometry: null,
    distance_miles: 5.2,
    estimated_time_minutes: 25,
    is_system_route: false,
    source_name: null,
    is_active: true,
    start_type: 'home',
    end_type: 'home',
    is_round_trip: true,
    last_optimized_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'route-2',
    user_id: 'user-1',
    metro_area_id: null,
    name: 'Afternoon Ride',
    description: null,
    color: '#10B981',
    start_address: null,
    start_latitude: 35.16,
    start_longitude: -84.87,
    end_address: null,
    end_latitude: 35.16,
    end_longitude: -84.87,
    route_geometry: null,
    distance_miles: 3.8,
    estimated_time_minutes: null,
    is_system_route: false,
    source_name: null,
    is_active: true,
    start_type: 'home',
    end_type: 'home',
    is_round_trip: true,
    last_optimized_at: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const createMockRouteCompanies = (
  nextRideCount: number
): Map<string, RouteCompanyWithDetails[]> => {
  const companies: RouteCompanyWithDetails[] = [];

  for (let i = 0; i < nextRideCount; i++) {
    const routeId = i % 2 === 0 ? 'route-1' : 'route-2';
    companies.push({
      id: `rc-${i}`,
      route_id: routeId,
      user_id: 'user-1',
      shared_company_id: `company-${i}`,
      private_company_id: null,
      tracking_id: null,
      sequence_order: Math.floor(i / 2),
      visit_on_next_ride: true,
      distance_from_start_miles: i * 0.5,
      created_at: '2024-01-01T00:00:00Z',
      company: {
        id: `company-${i}`,
        name: `Company ${i + 1}`,
        address: `${100 + i} Main Street`,
        latitude: 35.16 + i * 0.01,
        longitude: -84.87 + i * 0.01,
        source: 'shared',
      },
    });
  }

  const map = new Map<string, RouteCompanyWithDetails[]>();
  map.set(
    'route-1',
    companies.filter((c) => c.route_id === 'route-1')
  );
  map.set(
    'route-2',
    companies.filter((c) => c.route_id === 'route-2')
  );
  return map;
};

const meta: Meta<typeof NextRidePanel> = {
  title: 'Organisms/NextRidePanel',
  component: NextRidePanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="bg-base-100 w-80 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NextRidePanel>;

export const Empty: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: new Map(),
  },
};

export const SingleCompany: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: createMockRouteCompanies(1),
  },
};

export const FewCompanies: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: createMockRouteCompanies(3),
  },
};

export const ManyCompanies: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: createMockRouteCompanies(10),
  },
};

export const Loading: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: new Map(),
    isLoading: true,
  },
};

export const Collapsed: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: createMockRouteCompanies(5),
    isCollapsed: true,
  },
};

export const CollapsedEmpty: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: new Map(),
    isCollapsed: true,
  },
};

export const WithInteractions: Story = {
  args: {
    routes: mockRoutes,
    routeCompanies: createMockRouteCompanies(4),
    onToggleNextRide: (id, routeId, value) => {
      console.log('Toggle next ride:', { id, routeId, value });
    },
    onClearAll: () => {
      console.log('Clear all');
    },
    onCompanySelect: (company) => {
      console.log('Company selected:', company);
    },
    onToggleCollapsed: () => {
      console.log('Toggle collapsed');
    },
  },
};
