import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import RouteDetailDrawer from './RouteDetailDrawer';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

const mockRoute: BicycleRoute = {
  id: 'route-1',
  user_id: 'user-1',
  metro_area_id: null,
  name: 'Morning Loop',
  description: 'A nice morning ride through the neighborhood',
  color: '#3B82F6',
  start_address: '123 Main St',
  start_latitude: 35.1234,
  start_longitude: -84.5678,
  end_address: '123 Main St',
  end_latitude: 35.1234,
  end_longitude: -84.5678,
  route_geometry: null,
  distance_miles: 5.2,
  estimated_time_minutes: 30,
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

const mockCompanies: RouteCompanyWithDetails[] = [
  {
    id: 'rc-1',
    route_id: 'route-1',
    user_id: 'user-1',
    shared_company_id: 'company-1',
    private_company_id: null,
    tracking_id: null,
    sequence_order: 0,
    visit_on_next_ride: true,
    distance_from_start_miles: 1.2,
    created_at: '2024-01-01T00:00:00Z',
    company: {
      id: 'company-1',
      name: 'Acme Corporation',
      address: '456 Oak Avenue',
      latitude: 35.1235,
      longitude: -84.5679,
      source: 'shared',
    },
  },
  {
    id: 'rc-2',
    route_id: 'route-1',
    user_id: 'user-1',
    shared_company_id: null,
    private_company_id: 'private-1',
    tracking_id: null,
    sequence_order: 1,
    visit_on_next_ride: false,
    distance_from_start_miles: 2.5,
    created_at: '2024-01-01T00:00:00Z',
    company: {
      id: 'private-1',
      name: 'Tech Startup Inc',
      address: '789 Pine Boulevard',
      latitude: 35.1236,
      longitude: -84.568,
      source: 'private',
    },
  },
  {
    id: 'rc-3',
    route_id: 'route-1',
    user_id: 'user-1',
    shared_company_id: 'company-2',
    private_company_id: null,
    tracking_id: null,
    sequence_order: 2,
    visit_on_next_ride: true,
    distance_from_start_miles: 3.8,
    created_at: '2024-01-01T00:00:00Z',
    company: {
      id: 'company-2',
      name: 'Digital Solutions LLC',
      address: '321 Elm Street',
      latitude: 35.1237,
      longitude: -84.5681,
      source: 'shared',
    },
  },
];

const meta: Meta<typeof RouteDetailDrawer> = {
  title: 'Organisms/RouteDetailDrawer',
  component: RouteDetailDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof RouteDetailDrawer>;

export const Default: Story = {
  args: {
    route: mockRoute,
    companies: mockCompanies,
    isOpen: true,
    onClose: () => console.log('Close clicked'),
    onEditRoute: (route) => console.log('Edit route:', route.name),
    onDeleteRoute: (route) => console.log('Delete route:', route.name),
    onRemoveCompany: (id) => console.log('Remove company:', id),
    onToggleNextRide: (id) => console.log('Toggle next ride:', id),
  },
};

export const Empty: Story = {
  args: {
    route: mockRoute,
    companies: [],
    isOpen: true,
    onClose: () => console.log('Close clicked'),
    onEditRoute: (route) => console.log('Edit route:', route.name),
  },
};

export const Loading: Story = {
  args: {
    route: mockRoute,
    companies: [],
    isOpen: true,
    isLoading: true,
    onClose: () => console.log('Close clicked'),
  },
};

export const SystemRoute: Story = {
  args: {
    route: {
      ...mockRoute,
      name: 'Cleveland GreenWay',
      is_system_route: true,
      description: 'A 4.2 mile paved trail connecting neighborhoods',
      color: '#10B981',
    },
    companies: mockCompanies.slice(0, 1),
    isOpen: true,
    onClose: () => console.log('Close clicked'),
  },
};

export const NoDescription: Story = {
  args: {
    route: {
      ...mockRoute,
      description: null,
    },
    companies: mockCompanies,
    isOpen: true,
    onClose: () => console.log('Close clicked'),
    onEditRoute: (route) => console.log('Edit route:', route.name),
  },
};

export const ManyCompanies: Story = {
  args: {
    route: mockRoute,
    companies: [
      ...mockCompanies,
      {
        ...mockCompanies[0],
        id: 'rc-4',
        company: {
          ...mockCompanies[0].company,
          id: 'c-4',
          name: 'Company Four',
        },
      },
      {
        ...mockCompanies[1],
        id: 'rc-5',
        company: {
          ...mockCompanies[1].company,
          id: 'c-5',
          name: 'Company Five',
        },
      },
      {
        ...mockCompanies[0],
        id: 'rc-6',
        company: {
          ...mockCompanies[0].company,
          id: 'c-6',
          name: 'Company Six',
        },
      },
    ],
    isOpen: true,
    onClose: () => console.log('Close clicked'),
    onEditRoute: (route) => console.log('Edit route:', route.name),
    onRemoveCompany: (id) => console.log('Remove company:', id),
    onToggleNextRide: (id) => console.log('Toggle next ride:', id),
  },
};

export const Closed: Story = {
  args: {
    route: mockRoute,
    companies: mockCompanies,
    isOpen: false,
    onClose: () => console.log('Close clicked'),
  },
};
