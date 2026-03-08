import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteFilter from './RouteFilter';
import { useRoutes } from '@/hooks/useRoutes';

// Mock hooks
vi.mock('@/hooks/useRoutes', () => ({
  useRoutes: vi.fn(() => ({
    routes: [
      {
        id: 'route-1',
        name: 'Morning Loop',
        is_system_route: false,
        is_active: true,
      },
      {
        id: 'route-2',
        name: 'Evening Ride',
        is_system_route: false,
        is_active: true,
      },
      {
        id: 'route-3',
        name: 'Cleveland GreenWay',
        is_system_route: true,
        is_active: true,
      },
    ],
    isLoading: false,
  })),
}));

const mockUseRoutes = vi.mocked(useRoutes);

describe('RouteFilter', () => {
  const mockOnRouteChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dropdown with routes', () => {
    render(
      <RouteFilter selectedRouteId={null} onRouteChange={mockOnRouteChange} />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Filter by route')).toBeInTheDocument();
    expect(screen.getByText('Morning Loop')).toBeInTheDocument();
    expect(screen.getByText('Evening Ride')).toBeInTheDocument();
  });

  it('hides system routes by default', () => {
    render(
      <RouteFilter selectedRouteId={null} onRouteChange={mockOnRouteChange} />
    );

    expect(screen.queryByText('Cleveland GreenWay')).not.toBeInTheDocument();
  });

  it('shows system routes when enabled', () => {
    render(
      <RouteFilter
        selectedRouteId={null}
        onRouteChange={mockOnRouteChange}
        showSystemRoutes={true}
      />
    );

    expect(screen.getByText('Cleveland GreenWay (Trail)')).toBeInTheDocument();
  });

  it('calls onRouteChange when route selected', async () => {
    const user = userEvent.setup();
    render(
      <RouteFilter selectedRouteId={null} onRouteChange={mockOnRouteChange} />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'route-1');

    expect(mockOnRouteChange).toHaveBeenCalledWith('route-1');
  });

  it('calls onRouteChange with null when cleared', async () => {
    const user = userEvent.setup();
    render(
      <RouteFilter
        selectedRouteId="route-1"
        onRouteChange={mockOnRouteChange}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(mockOnRouteChange).toHaveBeenCalledWith(null);
  });

  it('shows clear button when route selected', () => {
    render(
      <RouteFilter
        selectedRouteId="route-1"
        onRouteChange={mockOnRouteChange}
      />
    );

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('hides clear button when no route selected', () => {
    render(
      <RouteFilter selectedRouteId={null} onRouteChange={mockOnRouteChange} />
    );

    expect(
      screen.queryByRole('button', { name: /clear/i })
    ).not.toBeInTheDocument();
  });

  it('uses custom placeholder', () => {
    render(
      <RouteFilter
        selectedRouteId={null}
        onRouteChange={mockOnRouteChange}
        placeholder="Select a route..."
      />
    );

    expect(screen.getByText('Select a route...')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(
      <RouteFilter selectedRouteId={null} onRouteChange={mockOnRouteChange} />
    );

    expect(
      screen.getByLabelText('Filter companies by route')
    ).toBeInTheDocument();
  });

  it('disables dropdown when loading', () => {
    mockUseRoutes.mockReturnValue({
      routes: [],
      isLoading: true,
      activeRouteId: null,
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
      <RouteFilter selectedRouteId={null} onRouteChange={mockOnRouteChange} />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
