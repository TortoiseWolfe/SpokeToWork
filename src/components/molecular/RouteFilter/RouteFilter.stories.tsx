import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import RouteFilter from './RouteFilter';

const meta: Meta<typeof RouteFilter> = {
  title: 'Molecular/RouteFilter',
  component: RouteFilter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onRouteChange: { action: 'route-changed' },
  },
};

export default meta;
type Story = StoryObj<typeof RouteFilter>;

/**
 * Default state - no route selected
 */
export const Default: Story = {
  args: {
    selectedRouteId: null,
  },
};

/**
 * With route selected
 */
export const WithSelection: Story = {
  args: {
    selectedRouteId: 'route-1',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows clear button when a route is selected.',
      },
    },
  },
};

/**
 * Including system routes
 */
export const WithSystemRoutes: Story = {
  args: {
    selectedRouteId: null,
    showSystemRoutes: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'System routes (trails) are shown with a "(Trail)" suffix.',
      },
    },
  },
};

/**
 * Custom placeholder
 */
export const CustomPlaceholder: Story = {
  args: {
    selectedRouteId: null,
    placeholder: 'Select a route to filter...',
  },
};

/**
 * Interactive controlled example
 */
export const Interactive: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <div className="space-y-4">
        <RouteFilter
          selectedRouteId={selectedId}
          onRouteChange={setSelectedId}
          showSystemRoutes={true}
        />
        <p className="text-base-content/70 text-sm">
          Selected: {selectedId ?? 'None'}
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive example with state management.',
      },
    },
  },
};
