import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BicycleRoute, RouteGeometry } from '@/types/route';

// Mock react-map-gl/maplibre components since MapLibre doesn't work in happy-dom
vi.mock('react-map-gl/maplibre', () => ({
  Source: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-source">{children}</div>
  ),
  Layer: ({ id, paint }: { id: string; paint?: Record<string, unknown> }) => (
    <div data-testid={`mock-layer-${id}`} data-paint={JSON.stringify(paint)} />
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-popup" role="dialog">
      {children}
    </div>
  ),
  useMap: () => ({ current: null }),
}));

// Import component after mocks are set up
import RoutePolyline from './RoutePolyline';

// Mock route geometry
const mockGeometry: RouteGeometry = {
  type: 'LineString',
  coordinates: [
    [-84.87, 35.16],
    [-84.86, 35.17],
    [-84.85, 35.18],
  ],
};

const mockRoute: BicycleRoute = {
  id: 'route-1',
  user_id: 'user-1',
  metro_area_id: null,
  name: 'Test Route',
  description: 'A test route',
  color: '#3B82F6',
  start_address: null,
  start_latitude: 35.16,
  start_longitude: -84.87,
  end_address: null,
  end_latitude: 35.18,
  end_longitude: -84.85,
  route_geometry: mockGeometry,
  distance_miles: 2.5,
  estimated_time_minutes: 15,
  is_system_route: false,
  source_name: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSystemRoute: BicycleRoute = {
  ...mockRoute,
  id: 'system-route-1',
  name: 'Cleveland GreenWay',
  is_system_route: true,
  source_name: 'Cleveland Parks',
};

describe('RoutePolyline Accessibility', () => {
  it('renders source and layer elements', () => {
    render(<RoutePolyline route={mockRoute} showPopup={true} />);

    expect(screen.getByTestId('mock-source')).toBeInTheDocument();
    expect(screen.getByTestId('mock-layer-route-route-1')).toBeInTheDocument();
  });

  it('renders glow layer when active', () => {
    render(<RoutePolyline route={mockRoute} isActive={true} />);

    // Active routes should have a glow layer
    expect(
      screen.getByTestId('mock-layer-route-route-1-glow')
    ).toBeInTheDocument();
  });

  it('renders dash layer for system routes', () => {
    render(<RoutePolyline route={mockSystemRoute} isSystemRoute={true} />);

    // System routes have a dashed overlay
    expect(
      screen.getByTestId('mock-layer-route-system-route-1-dash')
    ).toBeInTheDocument();
  });

  it('renders without crashing for null geometry', () => {
    const routeWithNullGeometry = { ...mockRoute, route_geometry: null };

    const { container } = render(
      <RoutePolyline route={routeWithNullGeometry} />
    );

    // Should render nothing when geometry is null
    expect(container.querySelector('[data-testid="mock-source"]')).toBeNull();
  });

  it('different route types have visually distinct styling', () => {
    const { rerender } = render(<RoutePolyline route={mockRoute} />);

    // User route layer
    const userLayer = screen.getByTestId('mock-layer-route-route-1');
    const userPaint = JSON.parse(userLayer.getAttribute('data-paint') || '{}');

    rerender(<RoutePolyline route={mockSystemRoute} isSystemRoute={true} />);

    // System route layer - should have dash layer
    expect(
      screen.getByTestId('mock-layer-route-system-route-1-dash')
    ).toBeInTheDocument();

    // Check that paint properties exist
    expect(userPaint).toHaveProperty('line-color');
    expect(userPaint).toHaveProperty('line-width');
  });

  it('active route has increased visual weight', () => {
    const { rerender } = render(
      <RoutePolyline route={mockRoute} isActive={false} />
    );

    const inactiveLayer = screen.getByTestId('mock-layer-route-route-1');
    const inactivePaint = JSON.parse(
      inactiveLayer.getAttribute('data-paint') || '{}'
    );

    rerender(<RoutePolyline route={mockRoute} isActive={true} />);

    const activeLayer = screen.getByTestId('mock-layer-route-route-1');
    const activePaint = JSON.parse(
      activeLayer.getAttribute('data-paint') || '{}'
    );

    // Active route should have wider line width (10 vs 6)
    expect(activePaint['line-width']).toBeGreaterThan(
      inactivePaint['line-width']
    );
  });

  it('active route has brighter color when no custom color', () => {
    // Use route without custom color to test default color behavior
    const routeNoColor = { ...mockRoute, color: null };

    const { rerender } = render(
      <RoutePolyline route={routeNoColor} isActive={false} />
    );

    const inactiveLayer = screen.getByTestId('mock-layer-route-route-1');
    const inactivePaint = JSON.parse(
      inactiveLayer.getAttribute('data-paint') || '{}'
    );

    rerender(<RoutePolyline route={routeNoColor} isActive={true} />);

    const activeLayer = screen.getByTestId('mock-layer-route-route-1');
    const activePaint = JSON.parse(
      activeLayer.getAttribute('data-paint') || '{}'
    );

    // Colors should differ between active and inactive when no custom color
    expect(activePaint['line-color']).not.toBe(inactivePaint['line-color']);
  });
});
