import type { Meta, StoryObj } from '@storybook/nextjs';
import RouteSidebar from './RouteSidebar';

const meta: Meta<typeof RouteSidebar> = {
  title: 'Organisms/RouteSidebar',
  component: RouteSidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="flex h-screen">
        <Story />
        <div className="bg-base-100 flex-1 p-4">
          <p className="text-base-content/60">Map area placeholder</p>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RouteSidebar>;

/**
 * Default state with routes
 */
export const Default: Story = {
  args: {},
};

/**
 * With active route selected
 */
export const WithActiveRoute: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Shows the "Planning" badge on the currently active route.',
      },
    },
  },
};

/**
 * Empty state - no routes created yet
 */
export const EmptyState: Story = {
  args: {},
  parameters: {
    mockData: {
      routes: [],
    },
    docs: {
      description: {
        story: 'Displays helpful message when user has no routes.',
      },
    },
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {},
  parameters: {
    mockData: {
      isLoading: true,
    },
    docs: {
      description: {
        story: 'Shows spinner while routes are loading.',
      },
    },
  },
};

/**
 * Error state
 */
export const ErrorState: Story = {
  args: {},
  parameters: {
    mockData: {
      error: 'Failed to load routes',
    },
    docs: {
      description: {
        story: 'Shows error alert when routes fail to load.',
      },
    },
  },
};

/**
 * With limit warning
 */
export const WithLimitWarning: Story = {
  args: {},
  parameters: {
    mockData: {
      routes: Array.from({ length: 18 }, (_, i) => ({
        id: `route-${i}`,
        name: `Route ${i + 1}`,
        color: '#3B82F6',
        distance_miles: Math.random() * 10,
        is_system_route: false,
        is_active: true,
        updated_at: new Date().toISOString(),
      })),
      limitWarning:
        'You have 18 routes. Consider organizing or deleting unused routes.',
    },
    docs: {
      description: {
        story: 'Shows warning when approaching route limit.',
      },
    },
  },
};

/**
 * With system trails
 */
export const WithSystemTrails: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Shows system trails (like Cleveland GreenWay) with "Trail" badge.',
      },
    },
  },
};

/**
 * Interactive callbacks
 */
export const Interactive: Story = {
  args: {
    onRouteSelect: (route) => console.log('Selected route:', route.name),
    onCreateRoute: () => console.log('Create route clicked'),
    onEditRoute: (route) => console.log('Edit route:', route.name),
    onDeleteRoute: (route) => console.log('Delete route:', route.name),
  },
  parameters: {
    docs: {
      description: {
        story: 'All callbacks are connected - check the console for events.',
      },
    },
  },
};
