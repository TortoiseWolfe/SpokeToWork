import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import RouteDrawer from './RouteDrawer';
import type { BicycleRoute } from '@/types/route';

const meta: Meta<typeof RouteDrawer> = {
  title: 'Atomic Design/Organism/RouteDrawer',
  component: RouteDrawer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RouteDrawer>;

const sampleRoutes: BicycleRoute[] = [
  {
    id: 'r1',
    user_id: 'u1',
    name: 'Morning Loop',
    color: '#3B82F6',
    distance_miles: 5.2,
    is_system_route: false,
    is_active: true,
    description: 'My daily commute route',
    route_geometry: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'r2',
    user_id: 'u1',
    name: 'Eastside Sweep',
    color: '#10B981',
    distance_miles: 8.7,
    is_system_route: false,
    is_active: true,
    description: null,
    route_geometry: null,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
] as BicycleRoute[];

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    routes: sampleRoutes,
    activeRouteId: 'r1',
    isLoading: false,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    routes: sampleRoutes,
  },
};

/** Interactive: open/close toggle to see the slide animation. */
export const Interactive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="bg-base-200 h-screen p-4">
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          Open Routes
        </button>
        <RouteDrawer
          isOpen={open}
          onClose={() => setOpen(false)}
          routes={sampleRoutes}
          activeRouteId={null}
          isLoading={false}
        />
      </div>
    );
  },
};
