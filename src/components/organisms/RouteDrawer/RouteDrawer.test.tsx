import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteDrawer from './RouteDrawer';
import type { BicycleRoute } from '@/types/route';

// RouteDrawer wraps RouteSidebar, which internally calls useRoutes as a
// fallback. Mock it so the wrapped sidebar renders with prop-supplied data.
const { mockUseRoutes } = vi.hoisted(() => ({
  mockUseRoutes: vi.fn(),
}));
vi.mock('@/hooks/useRoutes', () => ({ useRoutes: mockUseRoutes }));

const routes: BicycleRoute[] = [
  {
    id: 'r1',
    user_id: 'u1',
    name: 'Morning Loop',
    color: '#3B82F6',
    distance_miles: 5.2,
    is_system_route: false,
    is_active: true,
    description: null,
    route_geometry: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
] as BicycleRoute[];

describe('RouteDrawer', () => {
  beforeEach(() => {
    mockUseRoutes.mockReturnValue({
      routes: [],
      activeRouteId: null,
      isLoading: false,
      error: null,
      checkRouteLimits: vi.fn().mockResolvedValue({
        withinSoftLimit: true,
        withinHardLimit: true,
        current: 0,
        softLimit: 20,
        hardLimit: 50,
      }),
      getRouteSummaries: vi.fn().mockResolvedValue([]),
    });
  });

  it('renders RouteSidebar content when open', () => {
    render(
      <RouteDrawer
        isOpen
        onClose={() => {}}
        routes={routes}
        activeRouteId={null}
        isLoading={false}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Morning Loop')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<RouteDrawer isOpen onClose={onClose} routes={[]} />);
    fireEvent.click(screen.getByTestId('route-drawer-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<RouteDrawer isOpen onClose={onClose} routes={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /close routes/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('is slid off-screen when closed', () => {
    render(<RouteDrawer isOpen={false} onClose={() => {}} routes={[]} />);
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('-translate-x-full');
    expect(screen.getByTestId('route-drawer-backdrop')).toHaveClass(
      'pointer-events-none'
    );
  });

  it('passes onRouteSelect through to RouteSidebar', () => {
    const onRouteSelect = vi.fn();
    render(
      <RouteDrawer
        isOpen
        onClose={() => {}}
        routes={routes}
        activeRouteId={null}
        isLoading={false}
        onRouteSelect={onRouteSelect}
      />
    );
    fireEvent.click(screen.getByText('Morning Loop'));
    expect(onRouteSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1' })
    );
  });
});
