import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import NextRidePanel from './NextRidePanel';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

expect.extend(toHaveNoViolations);

const mockRoutes: BicycleRoute[] = [
  {
    id: 'route-1',
    user_id: 'user-1',
    metro_area_id: null,
    name: 'Morning Loop',
    description: null,
    color: '#3B82F6',
    start_address: null,
    start_latitude: 35.16,
    start_longitude: -84.87,
    end_address: null,
    end_latitude: 35.16,
    end_longitude: -84.87,
    route_geometry: null,
    distance_miles: 5.2,
    estimated_time_minutes: null,
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
];

const mockRouteCompanies = new Map<string, RouteCompanyWithDetails[]>([
  [
    'route-1',
    [
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
        created_at: '2024-01-01T00:00:00Z',
        company: {
          id: 'company-1',
          name: 'Acme Corp',
          address: '123 Main St',
          latitude: 35.17,
          longitude: -84.86,
          source: 'shared',
        },
      },
    ],
  ],
]);

describe('NextRidePanel Accessibility', () => {
  it('has no accessibility violations in default state', async () => {
    const { container } = render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    const { container } = render(
      <NextRidePanel routes={mockRoutes} routeCompanies={new Map()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in collapsed state', async () => {
    const { container } = render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        isCollapsed={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in loading state', async () => {
    const { container } = render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={new Map()}
        isLoading={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper ARIA region role', () => {
    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    expect(
      screen.getByRole('region', { name: 'Next ride panel' })
    ).toBeInTheDocument();
  });

  it('has proper list role for companies', () => {
    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    expect(
      screen.getByRole('list', { name: 'Companies for next ride' })
    ).toBeInTheDocument();
  });

  it('toggle button has proper aria-expanded', () => {
    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        isCollapsed={false}
      />
    );

    const toggleButton = screen.getByRole('button', { expanded: true });
    expect(toggleButton).toHaveAttribute('aria-controls', 'next-ride-list');
  });

  it('toggle button shows aria-expanded false when collapsed', () => {
    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        isCollapsed={true}
      />
    );

    const toggleButton = screen.getByRole('button', { expanded: false });
    expect(toggleButton).toBeInTheDocument();
  });

  it('company items are keyboard navigable', () => {
    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    // Both the company name button and remove button should be focusable
    const companyButton = screen.getByRole('button', {
      name: /View Acme Corp details/i,
    });
    const removeButton = screen.getByRole('button', {
      name: /Remove Acme Corp from next ride/i,
    });
    expect(companyButton).toBeInTheDocument();
    expect(removeButton).toBeInTheDocument();
  });

  it('remove buttons have descriptive labels', () => {
    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    expect(
      screen.getByRole('button', { name: 'Remove Acme Corp from next ride' })
    ).toBeInTheDocument();
  });

  it('clear all button has descriptive label', () => {
    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        onClearAll={() => {}}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Clear all next ride markers' })
    ).toBeInTheDocument();
  });
});
