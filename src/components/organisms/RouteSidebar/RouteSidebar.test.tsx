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
// NOTE: System routes (is_system_route: true) are deprecated and hidden by default
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
      is_system_route: true, // System route - hidden by default in sidebar
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

    // Only user routes shown - system routes hidden by default
    expect(screen.getByText('Morning Loop')).toBeInTheDocument();
  });

  it('displays route count in footer', () => {
    render(<RouteSidebar />);

    // Only counts visible routes (system routes hidden)
    expect(screen.getByText(/1 route/)).toBeInTheDocument();
  });

  it('shows active route indicator', () => {
    render(<RouteSidebar />);

    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  // DEPRECATED: System routes hidden - Feature 048 cancelled
  // Trail badge only shows for system routes which are now hidden by default
  it.skip('shows system route badge', () => {
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

  // DEPRECATED: System routes toggle removed - Feature 048 cancelled
  // System routes are now hidden by default with no toggle
  it.skip('can hide system routes (trails)', async () => {
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

    // Only user routes visible (system routes hidden)
    expect(screen.getByText('5.2 mi')).toBeInTheDocument();
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

// Feature 047: US1+US3 Tests
describe('RouteSidebar auto-open drawer callback (US1)', () => {
  const mockOnRouteSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('calls onRouteSelect with full route object when route is clicked', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar onRouteSelect={mockOnRouteSelect} />);

    await user.click(screen.getByText('Morning Loop'));

    expect(mockOnRouteSelect).toHaveBeenCalledTimes(1);
    expect(mockOnRouteSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        name: 'Morning Loop',
        color: '#3B82F6',
        distance_miles: 5.2,
      })
    );
  });

  it('calls onRouteSelect when route is activated via Enter key', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar onRouteSelect={mockOnRouteSelect} />);

    const routeItem = screen.getByRole('listitem', { name: /morning loop/i });
    routeItem.focus();
    await user.keyboard('{Enter}');

    expect(mockOnRouteSelect).toHaveBeenCalledTimes(1);
    expect(mockOnRouteSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morning Loop' })
    );
  });

  it('calls onRouteSelect when route is activated via Space key', async () => {
    const user = userEvent.setup();
    render(<RouteSidebar onRouteSelect={mockOnRouteSelect} />);

    const routeItem = screen.getByRole('listitem', { name: /morning loop/i });
    routeItem.focus();
    await user.keyboard(' ');

    expect(mockOnRouteSelect).toHaveBeenCalledTimes(1);
    expect(mockOnRouteSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morning Loop' })
    );
  });

  it('provides aria-current attribute on active route', () => {
    render(<RouteSidebar onRouteSelect={mockOnRouteSelect} />);

    // Morning Loop is the active route (id: '1' matches activeRouteId)
    const activeRoute = screen.getByRole('listitem', { name: /morning loop/i });
    expect(activeRoute).toHaveAttribute('aria-current', 'true');
  });
});

describe('RouteSidebar does not render inline company preview (US3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('does not render any company preview section', () => {
    render(<RouteSidebar />);

    // FR-004: RouteSidebar should NOT contain inline company preview elements
    expect(screen.queryByText('Companies on Route')).not.toBeInTheDocument();
    expect(screen.queryByText('View All')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No companies added yet')
    ).not.toBeInTheDocument();
  });

  it('does not render company names or counts in route items', () => {
    render(<RouteSidebar />);

    // Route items should only show route info, not company details
    // The company count badge exists but it shows route company counts, not inline preview
    expect(
      screen.queryByRole('list', { name: /companies/i })
    ).not.toBeInTheDocument();
  });

  it('only renders route-specific content in sidebar', () => {
    render(<RouteSidebar />);

    // Should have route list
    expect(
      screen.getByRole('list', { name: /route list/i })
    ).toBeInTheDocument();

    // Should have user route items (system routes hidden)
    expect(screen.getByText('Morning Loop')).toBeInTheDocument();

    // Should NOT have any inline company preview content
    expect(screen.queryByText(/click a marker/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/on next ride/i)).not.toBeInTheDocument();
  });
});

// Feature 047: US4 Tests - Tooltip for truncated route names
describe('RouteSidebar tooltip for truncated names (US4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('route names have title attribute with full name (FR-005)', () => {
    render(<RouteSidebar />);

    // User route names should have a title attribute for native tooltip fallback
    const morningLoopHeading = screen.getByText('Morning Loop');
    expect(morningLoopHeading).toHaveAttribute('title', 'Morning Loop');
  });

  it('route names have DaisyUI tooltip wrapper with data-tip', () => {
    render(<RouteSidebar />);

    // Find the tooltip wrappers with data-tip attribute
    const tooltipWrappers = document.querySelectorAll('[data-tip]');
    expect(tooltipWrappers.length).toBeGreaterThanOrEqual(1);

    // Verify the tooltip content matches user route names
    const dataTips = Array.from(tooltipWrappers).map((el) =>
      el.getAttribute('data-tip')
    );
    expect(dataTips).toContain('Morning Loop');
  });

  it('route names have truncate class for text overflow ellipsis', () => {
    render(<RouteSidebar />);

    const morningLoopHeading = screen.getByText('Morning Loop');
    expect(morningLoopHeading).toHaveClass('truncate');
  });

  it('tooltip wrapper has delay class for 300ms delay (NFR-003)', () => {
    render(<RouteSidebar />);

    // Find tooltip wrapper with delay class
    const tooltipWrappers = document.querySelectorAll('.tooltip');
    expect(tooltipWrappers.length).toBeGreaterThanOrEqual(1);

    // At least one should have the delay class
    const hasDelayClass = Array.from(tooltipWrappers).some((el) =>
      el.classList.contains('before:delay-300')
    );
    expect(hasDelayClass).toBe(true);
  });
});

// Feature 047: US2 Tests - Independent Scrolling
describe('RouteSidebar independent scrolling (US2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('has a scrollable route list container (FR-003)', () => {
    render(<RouteSidebar />);

    const routeList = screen.getByRole('list', { name: /route list/i });

    // Should have overflow-y-auto for independent scrolling
    expect(routeList).toHaveClass('overflow-y-auto');
  });

  it('has fixed header outside scroll container (FR-011)', () => {
    render(<RouteSidebar />);

    // Header should contain Routes title and New button
    const header = screen.getByText('Routes').closest('div');
    expect(header).toBeInTheDocument();

    // Header should have flex-shrink-0 to prevent shrinking
    const headerContainer = header?.parentElement;
    expect(headerContainer).toHaveClass('flex-shrink-0');
  });

  it('has scroll performance optimization (FR-012)', () => {
    render(<RouteSidebar />);

    const routeList = screen.getByRole('list', { name: /route list/i });

    // Should have will-change-transform for GPU acceleration
    expect(routeList).toHaveClass('will-change-transform');
    // Should have scroll-smooth for smooth scrolling
    expect(routeList).toHaveClass('scroll-smooth');
  });

  it('route list is keyboard focusable for scroll navigation', () => {
    render(<RouteSidebar />);

    const routeList = screen.getByRole('list', { name: /route list/i });

    // Should be focusable for keyboard navigation (Page Up/Down, arrow keys)
    expect(routeList).toHaveAttribute('tabIndex', '0');
  });

  it('maintains fixed footer outside scroll container', () => {
    render(<RouteSidebar />);

    // Footer shows visible route count (system routes hidden)
    const footer = screen.getByText(/1 route/);
    expect(footer).toBeInTheDocument();

    // Footer should have flex-shrink-0 to prevent shrinking
    expect(footer).toHaveClass('flex-shrink-0');
  });
});
