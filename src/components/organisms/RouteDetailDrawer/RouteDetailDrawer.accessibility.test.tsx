import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import RouteDetailDrawer from './RouteDetailDrawer';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

expect.extend(toHaveNoViolations);

const mockRoute: BicycleRoute = {
  id: 'route-1',
  user_id: 'user-1',
  metro_area_id: null,
  name: 'Morning Loop',
  description: 'A nice morning ride',
  color: '#3B82F6',
  start_address: '123 Main St',
  start_latitude: 35.1234,
  start_longitude: -84.5678,
  end_address: '123 Main St',
  end_latitude: 35.1234,
  end_longitude: -84.5678,
  route_geometry: null,
  distance_miles: 5.2,
  estimated_time_minutes: 30,
  is_system_route: false,
  source_name: null,
  is_active: true,
  start_type: 'home',
  end_type: 'home',
  is_round_trip: true,
  last_optimized_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCompanies: RouteCompanyWithDetails[] = [
  {
    id: 'rc-1',
    route_id: 'route-1',
    user_id: 'user-1',
    shared_company_id: 'company-1',
    private_company_id: null,
    tracking_id: null,
    sequence_order: 0,
    visit_on_next_ride: true,
    distance_from_start_miles: 1.2,
    created_at: '2024-01-01T00:00:00Z',
    company: {
      id: 'company-1',
      name: 'Acme Corp',
      address: '456 Oak Ave',
      latitude: 35.1235,
      longitude: -84.5679,
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
    distance_from_start_miles: 2.5,
    created_at: '2024-01-01T00:00:00Z',
    company: {
      id: 'company-2',
      name: 'Tech Startup',
      address: '789 Pine Blvd',
      latitude: 35.1236,
      longitude: -84.568,
      source: 'shared',
    },
  },
];

describe('RouteDetailDrawer Accessibility', () => {
  const mockOnClose = vi.fn();

  it('should not have any accessibility violations when open', async () => {
    const { container } = render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have violations with empty companies', async () => {
    const { container } = render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={[]}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper dialog role and aria attributes', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'route-drawer-title');
  });

  it('close button has accessible label', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByRole('button', { name: /close drawer/i })
    ).toBeInTheDocument();
  });

  it('edit button has accessible label', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
        onEditRoute={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /edit route/i })
    ).toBeInTheDocument();
  });

  it('remove company buttons have accessible labels', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
        onRemoveCompany={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /remove acme corp from route/i })
    ).toBeInTheDocument();
  });

  it('next ride toggle buttons have accessible labels', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
        onToggleNextRide={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /remove from next ride/i })
    ).toBeInTheDocument();
  });

  it('supports keyboard navigation to close', async () => {
    const user = userEvent.setup();
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    await user.keyboard('{Escape}');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('loading state is announced to screen readers', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={[]}
        isOpen={true}
        isLoading={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByLabelText('Loading companies')).toBeInTheDocument();
  });

  it('backdrop is hidden from screen readers', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const backdrop = screen.getByTestId('route-detail-drawer-backdrop');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  });

  it('title is properly associated with dialog', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const title = screen.getByRole('heading', { name: 'Morning Loop' });
    expect(title).toHaveAttribute('id', 'route-drawer-title');
  });

  it('optimize button has accessible label when visible', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByRole('button', { name: /optimize route order/i })
    ).toBeInTheDocument();
  });
});
