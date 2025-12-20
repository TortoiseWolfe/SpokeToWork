import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NextRidePanel from './NextRidePanel';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

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
  {
    id: 'route-2',
    user_id: 'user-1',
    metro_area_id: null,
    name: 'Afternoon Ride',
    description: null,
    color: '#10B981',
    start_address: null,
    start_latitude: 35.16,
    start_longitude: -84.87,
    end_address: null,
    end_latitude: 35.16,
    end_longitude: -84.87,
    route_geometry: null,
    distance_miles: 3.8,
    estimated_time_minutes: null,
    is_system_route: false,
    source_name: null,
    is_active: true,
    start_type: 'home',
    end_type: 'home',
    is_round_trip: true,
    last_optimized_at: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
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
        created_at: '2024-01-01T00:00:00Z',
        company: {
          id: 'company-2',
          name: 'Beta Inc',
          address: '456 Oak Ave',
          latitude: 35.18,
          longitude: -84.85,
          source: 'shared',
        },
      },
    ],
  ],
  [
    'route-2',
    [
      {
        id: 'rc-3',
        route_id: 'route-2',
        user_id: 'user-1',
        shared_company_id: 'company-3',
        private_company_id: null,
        tracking_id: null,
        sequence_order: 0,
        visit_on_next_ride: true,
        distance_from_start_miles: null,
        created_at: '2024-01-02T00:00:00Z',
        company: {
          id: 'company-3',
          name: 'Gamma LLC',
          address: '789 Pine Rd',
          latitude: 35.19,
          longitude: -84.84,
          source: 'shared',
        },
      },
    ],
  ],
]);

describe('NextRidePanel', () => {
  it('renders empty state when no companies marked for next ride', () => {
    const emptyRouteCompanies = new Map<string, RouteCompanyWithDetails[]>();

    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={emptyRouteCompanies} />
    );

    expect(
      screen.getByText('No companies marked for next ride')
    ).toBeInTheDocument();
  });

  it('renders list of next ride companies', () => {
    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Gamma LLC')).toBeInTheDocument();
    // Beta Inc should not be shown (visit_on_next_ride: false)
    expect(screen.queryByText('Beta Inc')).not.toBeInTheDocument();
  });

  it('shows correct count badge', () => {
    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // badge count
    expect(screen.getByText('2 stops planned')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        isLoading={true}
      />
    );

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('calls onToggleNextRide when remove button clicked', () => {
    const onToggleNextRide = vi.fn();

    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        onToggleNextRide={onToggleNextRide}
      />
    );

    // Find and click the remove button for Acme Corp specifically
    const removeButton = screen.getByRole('button', {
      name: /Remove Acme Corp from next ride/i,
    });
    fireEvent.click(removeButton);

    expect(onToggleNextRide).toHaveBeenCalledWith('rc-1', 'route-1', false);
  });

  it('calls onClearAll when clear all button clicked', () => {
    const onClearAll = vi.fn();

    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        onClearAll={onClearAll}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Clear all next ride markers' })
    );

    expect(onClearAll).toHaveBeenCalled();
  });

  it('calls onCompanySelect when company clicked', () => {
    const onCompanySelect = vi.fn();

    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        onCompanySelect={onCompanySelect}
      />
    );

    fireEvent.click(screen.getByText('Acme Corp'));

    expect(onCompanySelect).toHaveBeenCalledWith(
      expect.objectContaining({
        routeCompanyId: 'rc-1',
        company: expect.objectContaining({ name: 'Acme Corp' }),
      })
    );
  });

  it('renders collapsed state correctly', () => {
    const onToggleCollapsed = vi.fn();

    render(
      <NextRidePanel
        routes={mockRoutes}
        routeCompanies={mockRouteCompanies}
        isCollapsed={true}
        onToggleCollapsed={onToggleCollapsed}
      />
    );

    // Should show badge count in collapsed state
    expect(screen.getByText('2')).toBeInTheDocument();
    // Should not show company list
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByRole('button', { name: /Next Ride/i }));
    expect(onToggleCollapsed).toHaveBeenCalled();
  });

  it('shows route name for each company', () => {
    render(
      <NextRidePanel routes={mockRoutes} routeCompanies={mockRouteCompanies} />
    );

    expect(screen.getByText('Morning Loop')).toBeInTheDocument();
    expect(screen.getByText('Afternoon Ride')).toBeInTheDocument();
  });
});
