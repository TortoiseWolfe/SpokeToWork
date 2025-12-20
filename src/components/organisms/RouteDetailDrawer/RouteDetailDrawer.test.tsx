import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteDetailDrawer from './RouteDetailDrawer';
import type { BicycleRoute, RouteCompanyWithDetails } from '@/types/route';

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
    shared_company_id: null,
    private_company_id: 'private-1',
    tracking_id: null,
    sequence_order: 1,
    visit_on_next_ride: false,
    distance_from_start_miles: 2.5,
    created_at: '2024-01-01T00:00:00Z',
    company: {
      id: 'private-1',
      name: 'Tech Startup',
      address: '789 Pine Blvd',
      latitude: 35.1236,
      longitude: -84.568,
      source: 'private',
    },
  },
];

describe('RouteDetailDrawer', () => {
  const mockOnClose = vi.fn();
  const mockOnEditRoute = vi.fn();
  const mockOnDeleteRoute = vi.fn();
  const mockOnRemoveCompany = vi.fn();
  const mockOnToggleNextRide = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when route is null', () => {
    const { container } = render(
      <RouteDetailDrawer
        route={null}
        companies={[]}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders drawer with route details when open', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Morning Loop')).toBeInTheDocument();
    expect(screen.getByText('5.2 mi')).toBeInTheDocument();
    expect(screen.getByText('A nice morning ride')).toBeInTheDocument();
  });

  it('shows company count badge', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('2 companies')).toBeInTheDocument();
  });

  it('shows next ride count badge', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('1 on next ride')).toBeInTheDocument();
  });

  it('renders company list', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Tech Startup')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[0]);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onEditRoute when edit button clicked', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
        onEditRoute={mockOnEditRoute}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit route/i });
    fireEvent.click(editButton);

    expect(mockOnEditRoute).toHaveBeenCalledWith(mockRoute);
  });

  it('calls onToggleNextRide when next ride button clicked', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
        onToggleNextRide={mockOnToggleNextRide}
      />
    );

    const nextButtons = screen.getAllByRole('button', { name: /next ride/i });
    fireEvent.click(nextButtons[0]);

    expect(mockOnToggleNextRide).toHaveBeenCalledWith('rc-1');
  });

  it('calls onRemoveCompany when remove button clicked', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={mockCompanies}
        isOpen={true}
        onClose={mockOnClose}
        onRemoveCompany={mockOnRemoveCompany}
      />
    );

    const removeButtons = screen.getAllByRole('button', {
      name: /remove.*from route/i,
    });
    fireEvent.click(removeButtons[0]);

    expect(mockOnRemoveCompany).toHaveBeenCalledWith('rc-1');
  });

  it('shows loading state', () => {
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

  it('shows empty state when no companies', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={[]}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByText('No companies on this route yet')
    ).toBeInTheDocument();
  });

  it('hides edit button for system routes', () => {
    const systemRoute = { ...mockRoute, is_system_route: true };
    render(
      <RouteDetailDrawer
        route={systemRoute}
        companies={[]}
        isOpen={true}
        onClose={mockOnClose}
        onEditRoute={mockOnEditRoute}
      />
    );

    expect(
      screen.queryByRole('button', { name: /edit route/i })
    ).not.toBeInTheDocument();
  });

  it('shows Trail badge for system routes', () => {
    const systemRoute = { ...mockRoute, is_system_route: true };
    render(
      <RouteDetailDrawer
        route={systemRoute}
        companies={[]}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Trail')).toBeInTheDocument();
  });

  it('closes on escape key press', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={[]}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows optimize button when 2+ companies', () => {
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

  it('hides optimize button with 1 company', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={[mockCompanies[0]]}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.queryByRole('button', { name: /optimize route order/i })
    ).not.toBeInTheDocument();
  });

  it('hides optimize button with 0 companies', () => {
    render(
      <RouteDetailDrawer
        route={mockRoute}
        companies={[]}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.queryByRole('button', { name: /optimize route order/i })
    ).not.toBeInTheDocument();
  });
});
