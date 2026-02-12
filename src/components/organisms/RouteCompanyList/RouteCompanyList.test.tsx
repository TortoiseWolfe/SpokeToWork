import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteCompanyList from './RouteCompanyList';
import type { BicycleRoute, RouteCompany } from '@/types/route';
import { useRoutes } from '@/hooks/useRoutes';

// Minimal RouteCompany returned by toggleNextRide mock
const toggledCompany = {
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
};

// Mock hooks
vi.mock('@/hooks/useRoutes', () => ({
  useRoutes: vi.fn(() => ({
    reorderCompanies: vi.fn().mockResolvedValue(undefined),
    toggleNextRide: vi.fn().mockResolvedValue(toggledCompany),
    removeCompanyFromRoute: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockedUseRoutes = vi.mocked(useRoutes);

describe('RouteCompanyList', () => {
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
    {
      id: 'rc-3',
      route_id: 'route-1',
      user_id: 'user-1',
      shared_company_id: 'company-3',
      private_company_id: null,
      tracking_id: null,
      sequence_order: 2,
      visit_on_next_ride: false,
      distance_from_start_miles: null,
      created_at: '2025-01-01T00:00:00Z',
    },
  ];

  const mockOnRemove = vi.fn();
  const mockOnToggleNextRide = vi.fn();
  const mockOnReorder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders company list', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    expect(screen.getByText('3 companies')).toBeInTheDocument();
    expect(screen.getByText('1 next ride')).toBeInTheDocument();
  });

  it('shows empty state when no companies', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={[]}
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    expect(screen.getByText('No companies on this route')).toBeInTheDocument();
    expect(
      screen.getByText('Add companies from the map or company list')
    ).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        isLoading={true}
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    expect(screen.getByLabelText('Loading companies')).toBeInTheDocument();
  });

  it('displays sequence numbers', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('can toggle next ride checkbox', async () => {
    const user = userEvent.setup();
    const mockToggleNextRide = vi.fn().mockResolvedValue(toggledCompany);
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
      toggleNextRide: mockToggleNextRide,
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
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Toggle first company

    await waitFor(() => {
      // Hook's toggleNextRide takes just the routeCompanyId
      expect(mockToggleNextRide).toHaveBeenCalledWith('rc-1');
    });
  });

  it('can remove company from route', async () => {
    const user = userEvent.setup();
    const mockRemoveCompany = vi.fn().mockResolvedValue(undefined);
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
      removeCompanyFromRoute: mockRemoveCompany,
      reorderCompanies: vi.fn(),
      getRouteCompanies: vi.fn(),
      toggleNextRide: vi.fn(),
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
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      // Hook's removeCompanyFromRoute takes just the routeCompanyId
      expect(mockRemoveCompany).toHaveBeenCalledWith('rc-1');
    });
  });

  it('has drag handles when draggable', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        isDraggable={true}
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    const dragHandles = screen.getAllByRole('button', { name: /drag/i });
    expect(dragHandles).toHaveLength(3);
  });

  it('hides drag handles when not draggable', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        isDraggable={false}
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    const dragHandles = screen.queryAllByRole('button', { name: /drag/i });
    expect(dragHandles).toHaveLength(0);
  });

  it('shows keyboard navigation hint when draggable', () => {
    render(
      <RouteCompanyList
        route={mockRoute}
        companies={mockCompanies}
        isDraggable={true}
        onRemove={mockOnRemove}
        onToggleNextRide={mockOnToggleNextRide}
        onReorder={mockOnReorder}
      />
    );

    expect(screen.getByText(/ctrl\+arrow/i)).toBeInTheDocument();
  });
});
