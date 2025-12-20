import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import RouteCompanyList from './RouteCompanyList';
import type { BicycleRoute, RouteCompany } from '@/types/route';
import { useRoutes } from '@/hooks/useRoutes';

expect.extend(toHaveNoViolations);

// Mock hooks
vi.mock('@/hooks/useRoutes', () => ({
  useRoutes: vi.fn(() => ({
    reorderCompanies: vi.fn().mockResolvedValue(undefined),
    toggleNextRide: vi.fn().mockResolvedValue(undefined),
    removeCompanyFromRoute: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockedUseRoutes = vi.mocked(useRoutes);

describe('RouteCompanyList Accessibility', () => {
  const mockRoute: BicycleRoute = {
    id: 'route-1',
    user_id: 'user-1',
    metro_area_id: null,
    name: 'Test Route',
    description: null,
    color: '#3B82F6',
    start_address: null,
    start_latitude: 35.1,
    start_longitude: -84.8,
    end_address: null,
    end_latitude: 35.2,
    end_longitude: -84.9,
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
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
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
      visit_on_next_ride: false,
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
      visit_on_next_ride: true,
      distance_from_start_miles: null,
      created_at: '2025-01-01T00:00:00Z',
    },
  ];

  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper list role', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    expect(
      screen.getByRole('list', { name: /companies on route/i })
    ).toBeInTheDocument();
  });

  it('has listitem roles for each company', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  it('drag handles have accessible labels', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        isDraggable={true}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    const dragHandles = screen.getAllByRole('button', {
      name: /drag.*press ctrl/i,
    });
    expect(dragHandles).toHaveLength(2);
  });

  it('remove buttons have accessible labels', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    const removeButtons = screen.getAllByRole('button', {
      name: /remove.*from route/i,
    });
    expect(removeButtons).toHaveLength(2);
  });

  it('checkboxes have accessible labels', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox', {
      name: /mark.*for next ride/i,
    });
    expect(checkboxes).toHaveLength(2);
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        isDraggable={true}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    // Tab through focusable elements
    // First tab: Drag handle
    await user.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/drag/i);

    // Second tab: Next ride checkbox
    await user.tab();
    expect(document.activeElement?.getAttribute('type')).toBe('checkbox');

    // Third tab: Remove button
    await user.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(
      /remove/i
    );
  });

  it('loading state has accessible spinner', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={[]}
        isLoading={true}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    expect(screen.getByLabelText('Loading companies')).toBeInTheDocument();
  });

  it('shows keyboard navigation hint', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        isDraggable={true}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    expect(screen.getByText(/ctrl\+arrow keys/i)).toBeInTheDocument();
  });

  it('checkbox toggle is keyboard accessible', async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn().mockResolvedValue(undefined);
    mockedUseRoutes.mockReturnValue({
      routes: [],
      activeRouteId: null,
      isLoading: false,
      error: null,
      createRoute: vi.fn(),
      updateRoute: vi.fn(),
      deleteRoute: vi.fn(),
      getRouteById: vi.fn(),
      getRouteWithCompanies: vi.fn(),
      getSystemRoutes: vi.fn(),
      addCompanyToRoute: vi.fn(),
      removeCompanyFromRoute: vi.fn(),
      reorderCompanies: vi.fn(),
      getRouteCompanies: vi.fn(),
      toggleNextRide: mockToggle,
      getNextRideCompanies: vi.fn(),
      clearAllNextRide: vi.fn(),
      setActiveRoute: vi.fn(),
      clearActiveRoute: vi.fn(),
      checkRouteLimits: vi.fn(),
      checkRouteCompanyLimits: vi.fn(),
      getRouteSummaries: vi.fn(),
      generateRouteGeometry: vi.fn(),
      getActiveRouteCompanyIds: vi.fn().mockResolvedValue(new Set()),
      refetch: vi.fn(),
      invalidateCache: vi.fn(),
    });

    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={() => {}}
        onToggleNextRide={() => {}}
        onReorder={() => {}}
      />
    );

    const checkbox = screen.getAllByRole('checkbox')[0];
    checkbox.focus();
    await user.keyboard(' '); // Space to toggle checkbox

    expect(mockToggle).toHaveBeenCalled();
  });
});
