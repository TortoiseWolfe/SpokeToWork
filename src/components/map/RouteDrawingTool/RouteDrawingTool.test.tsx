import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import RouteDrawingTool from './RouteDrawingTool';
import type { LatLngTuple } from 'leaflet';

// Wrapper component for tests that need MapContainer
const MapWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MapContainer
    center={[35.16, -84.87]}
    zoom={13}
    style={{ height: 400, width: 400 }}
  >
    {children}
  </MapContainer>
);

describe('RouteDrawingTool', () => {
  it('renders nothing when not drawing and no waypoints', () => {
    const { container } = render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={false} />
      </MapWrapper>
    );

    // Should not render any waypoint markers
    expect(
      container.querySelector('[data-testid="mock-marker"]')
    ).not.toBeInTheDocument();
  });

  it('renders with initial waypoints', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
      [35.18, -84.85],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={false}
          initialWaypoints={initialWaypoints}
        />
      </MapWrapper>
    );

    // Should render markers for each waypoint
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(3);
  });

  it('renders polyline when 2+ waypoints exist', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={false}
          initialWaypoints={initialWaypoints}
        />
      </MapWrapper>
    );

    // Should render a polyline
    expect(screen.getByTestId('mock-polyline')).toBeInTheDocument();
  });

  it('shows drawing controls when drawing', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
        />
      </MapWrapper>
    );

    // Should show drawing controls toolbar
    expect(
      screen.getByRole('toolbar', { name: /route drawing controls/i })
    ).toBeInTheDocument();
  });

  it('displays waypoint count in controls', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
      [35.18, -84.85],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
        />
      </MapWrapper>
    );

    // Should display waypoint count
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('points')).toBeInTheDocument();
  });

  it('displays calculated distance in controls', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
        />
      </MapWrapper>
    );

    // Should display distance with 2 decimal places
    expect(screen.getByText('mi')).toBeInTheDocument();
  });

  it('calls onWaypointsChange when waypoints change', () => {
    const onWaypointsChange = vi.fn();
    const initialWaypoints: LatLngTuple[] = [[35.16, -84.87]];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
          onWaypointsChange={onWaypointsChange}
        />
      </MapWrapper>
    );

    // Should have been called with initial waypoints
    expect(onWaypointsChange).toHaveBeenCalledWith(initialWaypoints);
  });

  it('undo button removes last waypoint', () => {
    const onWaypointsChange = vi.fn();
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
      [35.18, -84.85],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
          onWaypointsChange={onWaypointsChange}
        />
      </MapWrapper>
    );

    const undoButton = screen.getByRole('button', { name: /undo last point/i });
    fireEvent.click(undoButton);

    // Should have called onWaypointsChange with one less waypoint
    expect(onWaypointsChange).toHaveBeenLastCalledWith([
      [35.16, -84.87],
      [35.17, -84.86],
    ]);
  });

  it('clear button removes all waypoints', () => {
    const onWaypointsChange = vi.fn();
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
          onWaypointsChange={onWaypointsChange}
        />
      </MapWrapper>
    );

    const clearButton = screen.getByRole('button', {
      name: /clear all points/i,
    });
    fireEvent.click(clearButton);

    // Should have called onWaypointsChange with empty array
    expect(onWaypointsChange).toHaveBeenLastCalledWith([]);
  });

  it('done button is disabled with less than 2 waypoints', () => {
    const initialWaypoints: LatLngTuple[] = [[35.16, -84.87]];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
        />
      </MapWrapper>
    );

    const doneButton = screen.getByRole('button', { name: /save route path/i });
    expect(doneButton).toBeDisabled();
  });

  it('done button is enabled with 2+ waypoints', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
        />
      </MapWrapper>
    );

    const doneButton = screen.getByRole('button', { name: /save route path/i });
    expect(doneButton).not.toBeDisabled();
  });

  it('calls onComplete with geometry when done is clicked', () => {
    const onComplete = vi.fn();
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={true}
          initialWaypoints={initialWaypoints}
          onComplete={onComplete}
        />
      </MapWrapper>
    );

    const doneButton = screen.getByRole('button', { name: /save route path/i });
    fireEvent.click(doneButton);

    // Should have called onComplete with GeoJSON geometry
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LineString',
        coordinates: expect.arrayContaining([
          [-84.87, 35.16], // GeoJSON format: [lng, lat]
          [-84.86, 35.17],
        ]),
      }),
      expect.any(Number) // distance in miles
    );
  });

  it('uses custom line color when provided', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={false}
          initialWaypoints={initialWaypoints}
          lineColor="#EF4444"
        />
      </MapWrapper>
    );

    // Component renders without error with custom color
    expect(screen.getByTestId('mock-polyline')).toBeInTheDocument();
  });

  it('uses custom line weight when provided', () => {
    const initialWaypoints: LatLngTuple[] = [
      [35.16, -84.87],
      [35.17, -84.86],
    ];

    render(
      <MapWrapper>
        <RouteDrawingTool
          isDrawing={false}
          initialWaypoints={initialWaypoints}
          lineWeight={8}
        />
      </MapWrapper>
    );

    // Component renders without error with custom weight
    expect(screen.getByTestId('mock-polyline')).toBeInTheDocument();
  });

  it('undo button is disabled when no waypoints', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={[]} />
      </MapWrapper>
    );

    const undoButton = screen.getByRole('button', { name: /undo last point/i });
    expect(undoButton).toBeDisabled();
  });

  it('clear button is disabled when no waypoints', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={[]} />
      </MapWrapper>
    );

    const clearButton = screen.getByRole('button', {
      name: /clear all points/i,
    });
    expect(clearButton).toBeDisabled();
  });
});
