import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import RouteBuilder from './RouteBuilder';

const meta: Meta<typeof RouteBuilder> = {
  title: 'Organisms/RouteBuilder',
  component: RouteBuilder,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onSave: { action: 'saved' },
    onClose: { action: 'closed' },
  },
};

export default meta;
type Story = StoryObj<typeof RouteBuilder>;

/**
 * Create mode - new route
 */
export const CreateMode: Story = {
  args: {
    isOpen: true,
    route: null,
  },
};

/**
 * Edit mode - existing route
 */
export const EditMode: Story = {
  args: {
    isOpen: true,
    route: {
      id: 'route-1',
      user_id: 'user-1',
      metro_area_id: null,
      name: 'Morning Loop',
      description: 'My daily commute through downtown',
      color: '#10B981',
      start_address: '123 Home St, Cleveland, TN',
      start_latitude: 35.1667,
      start_longitude: -84.8667,
      end_address: '123 Home St, Cleveland, TN',
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
    },
  },
};

/**
 * With validation errors
 */
export const WithErrors: Story = {
  args: {
    isOpen: true,
    route: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows validation errors when form is submitted with invalid data.',
      },
    },
  },
};

/**
 * No home location set
 */
export const NoHomeLocation: Story = {
  args: {
    isOpen: true,
    route: null,
  },
  parameters: {
    mockData: {
      profile: {
        home_address: null,
        home_latitude: null,
        home_longitude: null,
      },
    },
    docs: {
      description: {
        story: 'Shows prompt when user has no home address configured.',
      },
    },
  },
};

/**
 * One-way route (different start and end)
 */
export const OneWayRoute: Story = {
  args: {
    isOpen: true,
    route: {
      id: 'route-2',
      user_id: 'user-1',
      metro_area_id: null,
      name: 'GreenWay Commute',
      description: 'One-way trip to work via the GreenWay trail',
      color: '#3B82F6',
      start_address: '123 Home St, Cleveland, TN',
      start_latitude: 35.1667,
      start_longitude: -84.8667,
      end_address: '500 Office Park, Cleveland, TN',
      end_latitude: 35.1333,
      end_longitude: -84.8833,
      route_geometry: null,
      distance_miles: 4.2,
      estimated_time_minutes: 20,
      is_system_route: false,
      source_name: null,
      is_active: true,
      start_type: 'home',
      end_type: 'custom',
      is_round_trip: false,
      last_optimized_at: null,
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Route with different start and end points.',
      },
    },
  },
};

/**
 * Submitting state
 */
export const Submitting: Story = {
  args: {
    isOpen: true,
    route: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows loading spinner while saving.',
      },
    },
  },
};

/**
 * Delete confirmation
 */
export const DeleteConfirmation: Story = {
  args: {
    isOpen: true,
    route: {
      id: 'route-1',
      user_id: 'user-1',
      metro_area_id: null,
      name: 'Route to Delete',
      description: null,
      color: '#EF4444',
      start_address: null,
      start_latitude: 35.1667,
      start_longitude: -84.8667,
      end_address: null,
      end_latitude: 35.1667,
      end_longitude: -84.8667,
      route_geometry: null,
      distance_miles: null,
      estimated_time_minutes: null,
      is_system_route: false,
      source_name: null,
      is_active: true,
      start_type: 'home',
      end_type: 'home',
      is_round_trip: true,
      last_optimized_at: null,
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Click the Delete button to see the confirmation dialog.',
      },
    },
  },
};
