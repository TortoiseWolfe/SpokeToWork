import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import RouteCompanyList from './RouteCompanyList';
import type { BicycleRoute, RouteCompany } from '@/types/route';

const mockRoute: BicycleRoute = {
  id: 'route-1',
  user_id: 'user-1',
  metro_area_id: null,
  name: 'Morning Loop',
  description: 'My daily commute',
  color: '#3B82F6',
  start_address: '123 Home St',
  start_latitude: 35.1667,
  start_longitude: -84.8667,
  end_address: '123 Home St',
  end_latitude: 35.1667,
  end_longitude: -84.8667,
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
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
};

const mockCompanies: RouteCompany[] = [
  {
    id: 'rc-1',
    route_id: 'route-1',
    user_id: 'user-1',
    shared_company_id: 'company-1',
    private_company_id: null,
    tracking_id: null,
    sequence_order: 0,
    visit_on_next_ride: true,
    distance_from_start_miles: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rc-2',
    route_id: 'route-1',
    user_id: 'user-1',
    shared_company_id: 'company-2',
    private_company_id: null,
    tracking_id: null,
    sequence_order: 1,
    visit_on_next_ride: false,
    distance_from_start_miles: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rc-3',
    route_id: 'route-1',
    user_id: 'user-1',
    shared_company_id: 'company-3',
    private_company_id: null,
    tracking_id: null,
    sequence_order: 2,
    visit_on_next_ride: true,
    distance_from_start_miles: null,
    created_at: '2025-01-01T00:00:00Z',
  },
];

const meta: Meta<typeof RouteCompanyList> = {
  title: 'Organisms/RouteCompanyList',
  component: RouteCompanyList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="bg-base-200 w-80 rounded-lg p-4">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onRemove: { action: 'removed' },
    onToggleNextRide: { action: 'toggled-next-ride' },
    onReorder: { action: 'reordered' },
  },
};

export default meta;
type Story = StoryObj<typeof RouteCompanyList>;

/**
 * Default state with companies
 */
export const Default: Story = {
  args: {
    route: mockRoute,
    companies: mockCompanies,
  },
};

/**
 * Empty state - no companies on route
 */
export const EmptyState: Story = {
  args: {
    route: mockRoute,
    companies: [],
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    route: mockRoute,
    companies: [],
    isLoading: true,
  },
};

/**
 * Many companies on route
 */
export const ManyCompanies: Story = {
  args: {
    route: mockRoute,
    companies: Array.from({ length: 10 }, (_, i) => ({
      id: `rc-${i}`,
      route_id: 'route-1',
      user_id: 'user-1',
      shared_company_id: `company-${i}`,
      private_company_id: null,
      tracking_id: null,
      sequence_order: i,
      visit_on_next_ride: i % 3 === 0,
      distance_from_start_miles: null,
      created_at: '2025-01-01T00:00:00Z',
    })),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows scrollable list with many companies.',
      },
    },
  },
};

/**
 * Non-draggable mode
 */
export const NonDraggable: Story = {
  args: {
    route: mockRoute,
    companies: mockCompanies,
    isDraggable: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Drag handles are hidden when dragging is disabled.',
      },
    },
  },
};

/**
 * All marked for next ride
 */
export const AllNextRide: Story = {
  args: {
    route: mockRoute,
    companies: mockCompanies.map((c) => ({ ...c, visit_on_next_ride: true })),
  },
  parameters: {
    docs: {
      description: {
        story: 'All companies marked for the next ride.',
      },
    },
  },
};

/**
 * Interactive demo
 */
export const Interactive: Story = {
  args: {
    route: mockRoute,
    companies: mockCompanies,
    onRemove: (id) => console.log('Remove:', id),
    onToggleNextRide: (id, next) => console.log('Toggle:', id, next),
    onReorder: (companies) => console.log('Reorder:', companies),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Drag items to reorder, toggle checkboxes, or remove companies. Check console for events.',
      },
    },
  },
};
