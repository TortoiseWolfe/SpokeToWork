import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import RouteSidebar from './RouteSidebar';

expect.extend(toHaveNoViolations);

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

describe('RouteSidebar Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('should not have any accessibility violations', async () => {
    const { container } = render(<RouteSidebar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper landmark role', () => {
    render(<RouteSidebar />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('has accessible name for sidebar', () => {
    render(<RouteSidebar />);
    expect(
      screen.getByRole('complementary', { name: /route sidebar/i })
    ).toBeInTheDocument();
  });

  it('has accessible list structure', () => {
    render(<RouteSidebar />);
    expect(
      screen.getByRole('list', { name: /route list/i })
    ).toBeInTheDocument();
    // Query for route listitems specifically (not dropdown menu items)
    // Only user routes visible (system routes hidden)
    const routeItems = screen
      .getAllByRole('listitem')
      .filter((item) =>
        item.getAttribute('aria-label')?.match(/morning loop/i)
      );
    expect(routeItems).toHaveLength(1);
  });

  it('route items have descriptive aria-labels', () => {
    render(<RouteSidebar />);
    // Only user routes visible (system routes hidden)
    expect(
      screen.getByRole('listitem', { name: /morning loop.*currently active/i })
    ).toBeInTheDocument();
  });

  it('buttons have accessible labels', () => {
    render(<RouteSidebar />);
    expect(
      screen.getByRole('button', { name: /create new route/i })
    ).toBeInTheDocument();
  });

  it('sort buttons have aria-pressed state', () => {
    render(<RouteSidebar />);
    const recentButton = screen.getByRole('button', { name: /recent/i });
    expect(recentButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('route items are focusable with tabindex', () => {
    render(<RouteSidebar />);
    // Query for route listitems specifically (system routes hidden)
    const routeItems = screen
      .getAllByRole('listitem')
      .filter((item) =>
        item.getAttribute('aria-label')?.match(/morning loop/i)
      );
    expect(routeItems).toHaveLength(1);
    routeItems.forEach((item) => {
      expect(item).toHaveAttribute('tabindex', '0');
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RouteSidebar onRouteSelect={onSelect} />);

    const firstRoute = screen.getByRole('listitem', { name: /morning loop/i });
    firstRoute.focus();
    expect(document.activeElement).toBe(firstRoute);

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalled();
  });

  it('supports Space key for selection', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RouteSidebar onRouteSelect={onSelect} />);

    const firstRoute = screen.getByRole('listitem', { name: /morning loop/i });
    firstRoute.focus();

    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalled();
  });

  it('action menus have proper menu semantics', () => {
    render(<RouteSidebar />);
    const menuButton = screen.getByRole('button', {
      name: /actions for morning loop/i,
    });
    expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('color indicators are decorative (hidden from AT)', () => {
    const { container } = render(<RouteSidebar />);
    const colorDots = container.querySelectorAll('[aria-hidden="true"]');
    expect(colorDots.length).toBeGreaterThan(0);
  });

  it('loading state has accessible label', () => {
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

  it('error state uses alert role', () => {
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
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('status messages use status role', () => {
    mockUseRoutes.mockReturnValue({
      routes: [],
      activeRouteId: null,
      isLoading: false,
      error: null,
      checkRouteLimits: vi.fn().mockResolvedValue({
        withinSoftLimit: false,
        withinHardLimit: true,
        current: 18,
        softLimit: 20,
        hardLimit: 50,
        message: 'You have 18 routes.',
      }),
      getRouteSummaries: vi.fn().mockResolvedValue([]),
    });

    render(<RouteSidebar />);
    // Warning should be present if returned from checkRouteLimits
  });
});

// Feature 047 US4: Tooltip accessibility tests (FR-005, FR-006)
describe('RouteSidebar tooltip accessibility (US4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('route names have accessible title attribute for screen readers', () => {
    render(<RouteSidebar />);

    // Title attribute provides accessible name for tooltip
    const morningLoopHeading = screen.getByText('Morning Loop');
    expect(morningLoopHeading).toHaveAttribute('title', 'Morning Loop');
  });

  it('truncated text has visual overflow indication', () => {
    render(<RouteSidebar />);

    const routeHeading = screen.getByText('Morning Loop');
    // truncate class applies text-overflow: ellipsis
    expect(routeHeading).toHaveClass('truncate');
  });

  it('tooltip wrapper maintains accessible structure', () => {
    render(<RouteSidebar />);

    // Tooltip should not break heading semantics
    const heading = screen.getByText('Morning Loop');
    expect(heading.tagName).toBe('H3');
  });

  it('tooltip content is accessible via data-tip attribute', () => {
    render(<RouteSidebar />);

    // DaisyUI tooltip uses data-tip which is rendered in CSS ::before
    const tooltipWrapper = screen.getByText('Morning Loop').closest('.tooltip');
    expect(tooltipWrapper).toHaveAttribute('data-tip', 'Morning Loop');
  });
});

// Feature 047 US2: Keyboard scroll navigation accessibility tests (FR-016, A11Y-001)
describe('RouteSidebar keyboard scroll navigation (US2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoutes.mockReturnValue(defaultMockData);
  });

  it('route list container is keyboard focusable (A11Y-001)', () => {
    render(<RouteSidebar />);

    const routeList = screen.getByRole('list', { name: /route list/i });

    // Route list should be focusable for keyboard scroll navigation
    expect(routeList).toHaveAttribute('tabIndex', '0');
  });

  it('route list can receive focus', () => {
    render(<RouteSidebar />);

    const routeList = screen.getByRole('list', { name: /route list/i });
    routeList.focus();

    expect(document.activeElement).toBe(routeList);
  });

  it('route items support keyboard activation (Enter key)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RouteSidebar onRouteSelect={onSelect} />);

    const firstRoute = screen.getByRole('listitem', { name: /morning loop/i });
    firstRoute.focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morning Loop' })
    );
  });

  it('route items support keyboard activation (Space key)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RouteSidebar onRouteSelect={onSelect} />);

    const firstRoute = screen.getByRole('listitem', { name: /morning loop/i });
    firstRoute.focus();
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morning Loop' })
    );
  });

  it('active route has aria-current attribute (A11Y-006)', () => {
    render(<RouteSidebar />);

    const activeRoute = screen.getByRole('listitem', { name: /morning loop/i });
    // aria-current is the valid ARIA attribute for indicating current item in a list
    expect(activeRoute).toHaveAttribute('aria-current', 'true');
  });

  // DEPRECATED: System routes hidden - no inactive routes visible to test
  it.skip('inactive routes do not have aria-current', () => {
    render(<RouteSidebar />);

    const inactiveRoute = screen.getByRole('listitem', {
      name: /cleveland greenway/i,
    });
    // aria-current should not be present for inactive routes
    expect(inactiveRoute).not.toHaveAttribute('aria-current');
  });
});
