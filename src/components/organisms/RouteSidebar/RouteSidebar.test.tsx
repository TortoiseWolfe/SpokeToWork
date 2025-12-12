import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteSidebar from './RouteSidebar';

// Use vi.hoisted to create a configurable mock (vitest 4.0 pattern)
const { mockUseRoutes } = vi.hoisted(() => ({
  mockUseRoutes: vi.fn(),
}));

// Mock the useRoutes hook
vi.mock('@/hooks/useRoutes', () => ({
  useRoutes: mockUseRoutes,
}));

// Default mock data
const defaultMockData = {
  routes: [
    {
      id: '1',
      name: 'Morning Loop',
      color: '#3B82F6',
      distance_miles: 5.2,
      is_system_route: false,
      is_active: true,
      description: 'My daily commute route',
      updated_at: '2025-01-01T10:00:00Z',
    },
    {
      id: '2',
      name: 'Cleveland GreenWay',
      color: '#10B981',
      distance_miles: 4.2,
      is_system_route: true,
      is_active: true,
      description: 'Paved multi-use trail',
      updated_at: '2025-01-01T09:00:00Z',
    },
  ],
  activeRouteId: '1',
  isLoading: false,
  error: null,
  checkRouteLimits: vi.fn().mockResolvedValue({
    withinSoftLimit: true,
    withinHardLimit: true,
    current: 2,
    softLimit: 20,
    hardLimit: 50,
  }),
  getRouteSummaries: vi.fn().mockResolvedValue([
    { id: '1', company_count: 3 },
    { id: '2', company_count: 5 },
  ]),
};

describe('RouteSidebar', () => {
  const mockOnRouteSelect = vi.fn();
  const mockOnCreateRoute = vi.fn();
  const mockOnEditRoute = vi.fn();
  const mockOnDeleteRoute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock data
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('renders route list', () => {
    render(<RouteSidebar />);

    expect(screen.getByText('Morning Loop')).toBeInTheDocument();
    expect(screen.getByText('Cleveland GreenWay')).toBeInTheDocument();
  });

  it('displays route count in footer', () => {
    render(<RouteSidebar />);

    expect(screen.getByText(/2 routes/)).toBeInTheDocument();
  });

  it('shows active route indicator', () => {
    render(<RouteSidebar />);

    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('shows system route badge', () => {
    render(<RouteSidebar />);

    expect(screen.getByText('Trail')).toBeInTheDocument();
  });

  it('calls onCreateRoute when New button is clicked', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar onCreateRoute={mockOnCreateRoute} />);

    await user.click(screen.getByRole('button', { name: /create new route/i }));

    expect(mockOnCreateRoute).toHaveBeenCalled();
  });

  it('calls onRouteSelect when route is clicked', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar onRouteSelect={mockOnRouteSelect} />);

    await user.click(screen.getByText('Morning Loop'));

    expect(mockOnRouteSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morning Loop' })
    );
  });

  it('can sort routes by name', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar />);

    await user.click(screen.getByRole('button', { name: /name/i }));

    // Verify sort button is pressed
    expect(screen.getByRole('button', { name: /name/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('can hide system routes (trails)', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar />);

    await user.click(screen.getByRole('button', { name: /hide trails/i }));

    // After hiding, only user routes should show
    expect(screen.getByText('Morning Loop')).toBeInTheDocument();
    // Cleveland GreenWay should still be in the DOM but filtered
    expect(screen.getByText(/1 trails hidden/)).toBeInTheDocument();
  });

  it('displays distance for routes', () => {
    render(<RouteSidebar />);

    expect(screen.getByText('5.2 mi')).toBeInTheDocument();
    expect(screen.getByText('4.2 mi')).toBeInTheDocument();
  });

  it('displays route description', () => {
    render(<RouteSidebar />);

    expect(screen.getByText('My daily commute route')).toBeInTheDocument();
  });

  it('has accessible role and labels', () => {
    render(<RouteSidebar />);

    expect(
      screen.getByRole('complementary', { name: /route sidebar/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: /route list/i })
    ).toBeInTheDocument();
  });

  it('route items are keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar onRouteSelect={mockOnRouteSelect} />);

    const routeItem = screen.getByRole('listitem', { name: /morning loop/i });
    routeItem.focus();

    await user.keyboard('{Enter}');

    expect(mockOnRouteSelect).toHaveBeenCalled();
  });
});

describe('RouteSidebar loading state', () => {
  it('shows loading spinner when loading', () => {
    mockUseRoutes.mockReturnValue({
      routes: [],
      activeRouteId: null,
      isLoading: true,
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

    render(<RouteSidebar />);

    expect(screen.getByLabelText(/loading routes/i)).toBeInTheDocument();
  });
});

describe('RouteSidebar empty state', () => {
  it('shows empty message when no routes', () => {
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

    render(<RouteSidebar />);

    expect(screen.getByText(/no routes yet/i)).toBeInTheDocument();
  });
});

describe('RouteSidebar error state', () => {
  it('shows error message when error occurs', () => {
    mockUseRoutes.mockReturnValue({
      routes: [],
      activeRouteId: null,
      isLoading: false,
      error: new Error('Failed to load'),
      checkRouteLimits: vi.fn().mockResolvedValue({
        withinSoftLimit: true,
        withinHardLimit: true,
        current: 0,
        softLimit: 20,
        hardLimit: 50,
      }),
      getRouteSummaries: vi.fn().mockResolvedValue([]),
    });

    render(<RouteSidebar />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /failed to load routes/i
    );
  });
});
