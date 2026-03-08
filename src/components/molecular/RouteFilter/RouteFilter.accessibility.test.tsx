import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import RouteFilter from './RouteFilter';
import { useRoutes } from '@/hooks/useRoutes';

expect.extend(toHaveNoViolations);

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

describe('RouteFilter Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <RouteFilter selectedRouteId={null} onRouteChange={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have violations with selection', async () => {
    const { container } = render(
      <RouteFilter selectedRouteId="route-1" onRouteChange={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has accessible label on select', () => {
    render(<RouteFilter selectedRouteId={null} onRouteChange={() => {}} />);

    expect(
      screen.getByLabelText('Filter companies by route')
    ).toBeInTheDocument();
  });

  it('clear button has accessible label', () => {
    render(<RouteFilter selectedRouteId="route-1" onRouteChange={() => {}} />);

    expect(
      screen.getByRole('button', { name: /clear route filter/i })
    ).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<RouteFilter selectedRouteId={null} onRouteChange={mockOnChange} />);

    const select = screen.getByRole('combobox');

    // Tab to focus
    await user.tab();
    expect(document.activeElement).toBe(select);

    // Select an option using selectOptions (jsdom doesn't support arrow key navigation for select)
    await user.selectOptions(select, 'route-1');

    expect(mockOnChange).toHaveBeenCalledWith('route-1');
  });

  it('clear button is keyboard accessible', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(
      <RouteFilter selectedRouteId="route-1" onRouteChange={mockOnChange} />
    );

    // Tab to clear button
    await user.tab(); // Select
    await user.tab(); // Clear button

    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(document.activeElement).toBe(clearButton);

    // Activate with Enter
    await user.keyboard('{Enter}');
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('select element is focusable', () => {
    render(<RouteFilter selectedRouteId={null} onRouteChange={() => {}} />);

    const select = screen.getByRole('combobox');
    select.focus();
    expect(document.activeElement).toBe(select);
  });

  it('options are readable by screen readers', () => {
    render(
      <RouteFilter
        selectedRouteId={null}
        onRouteChange={() => {}}
        showSystemRoutes={true}
      />
    );

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    // Check that trail designation is in text
    const trailOption = options.find((opt) =>
      opt.textContent?.includes('Trail')
    );
    expect(trailOption).toBeTruthy();
  });

  it('disabled state is communicated', () => {
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

    render(<RouteFilter selectedRouteId={null} onRouteChange={() => {}} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute('disabled');
  });
});
