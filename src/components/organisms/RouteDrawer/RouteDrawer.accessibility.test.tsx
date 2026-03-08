import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import RouteDrawer from './RouteDrawer';
import type { BicycleRoute } from '@/types/route';

expect.extend(toHaveNoViolations);

const { mockUseRoutes } = vi.hoisted(() => ({ mockUseRoutes: vi.fn() }));
vi.mock('@/hooks/useRoutes', () => ({ useRoutes: mockUseRoutes }));

// Non-empty routes list avoids a pre-existing RouteSidebar a11y issue where
// the empty-state div sits inside role="list" with no listitems. The
// RouteDrawer shell itself is what we're testing here.
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

describe('RouteDrawer accessibility', () => {
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

  it('has dialog role, aria-modal, and aria-labelledby pointing to title', () => {
    const { container } = render(
      <RouteDrawer isOpen onClose={() => {}} routes={routes} />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'route-drawer-title');
    // RouteSidebar also renders <h2>Routes</h2>, so query by id directly.
    const title = container.querySelector('#route-drawer-title');
    expect(title).toHaveTextContent('Routes');
  });

  it('close button has an accessible name', () => {
    render(<RouteDrawer isOpen onClose={() => {}} routes={routes} />);
    expect(
      screen.getByRole('button', { name: /close routes/i })
    ).toBeInTheDocument();
  });

  it('has no axe violations when open', async () => {
    const { container } = render(
      <RouteDrawer isOpen onClose={() => {}} routes={routes} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
