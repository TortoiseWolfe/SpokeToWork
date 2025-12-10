import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import RouteDrawingTool from './RouteDrawingTool';
import type { LatLngTuple } from 'leaflet';

// Wrapper component for tests
const MapWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MapContainer
    center={[35.16, -84.87]}
    zoom={13}
    style={{ height: 400, width: 400 }}
  >
    {children}
  </MapContainer>
);

const sampleWaypoints: LatLngTuple[] = [
  [35.16, -84.87],
  [35.17, -84.86],
  [35.18, -84.85],
];

describe('RouteDrawingTool Accessibility', () => {
  it('drawing controls have proper role', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    const toolbar = screen.getByRole('toolbar', {
      name: /route drawing controls/i,
    });
    expect(toolbar).toBeInTheDocument();
  });

  it('all control buttons have accessible labels', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    // Undo button
    expect(
      screen.getByRole('button', { name: /undo last point/i })
    ).toBeInTheDocument();

    // Clear button
    expect(
      screen.getByRole('button', { name: /clear all points/i })
    ).toBeInTheDocument();

    // Done button
    expect(
      screen.getByRole('button', { name: /save route path/i })
    ).toBeInTheDocument();
  });

  it('stats region has aria-live for screen reader announcements', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    // Stats should be announced to screen readers when they change
    const statsRegion = screen
      .getByRole('toolbar')
      .querySelector('[aria-live="polite"]');
    expect(statsRegion).toBeInTheDocument();
  });

  it('disabled buttons have proper disabled state', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={[]} />
      </MapWrapper>
    );

    const undoButton = screen.getByRole('button', { name: /undo last point/i });
    const clearButton = screen.getByRole('button', {
      name: /clear all points/i,
    });
    const doneButton = screen.getByRole('button', { name: /save route path/i });

    expect(undoButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
    expect(doneButton).toBeDisabled();
  });

  it('buttons are keyboard accessible', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      // All buttons should be focusable (no negative tabindex)
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('waypoint count is visible and accessible', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    // Count should be visible with semantic context
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('points')).toBeInTheDocument();
  });

  it('distance is visible and accessible', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    // Distance should include unit for context
    expect(screen.getByText('mi')).toBeInTheDocument();
  });

  it('controls panel has sufficient z-index for visibility', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    const toolbar = screen.getByRole('toolbar');
    const styles = window.getComputedStyle(toolbar);

    // z-index should be high enough to appear above map tiles
    // Note: jsdom may not compute all styles, so we check the class instead
    expect(toolbar).toHaveClass('z-[1000]');
  });

  it('controls are not rendered when not drawing and no waypoints', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={false} initialWaypoints={[]} />
      </MapWrapper>
    );

    // No toolbar should be rendered
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('map container remains accessible during drawing', () => {
    const { container } = render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    // Map should still be present and accessible
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('button text is clear and action-oriented', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    // Button text should be clear actions
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('clear button has error styling for destructive action', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    const clearButton = screen.getByRole('button', {
      name: /clear all points/i,
    });
    expect(clearButton).toHaveClass('text-error');
  });

  it('done button has primary styling for main action', () => {
    render(
      <MapWrapper>
        <RouteDrawingTool isDrawing={true} initialWaypoints={sampleWaypoints} />
      </MapWrapper>
    );

    const doneButton = screen.getByRole('button', { name: /save route path/i });
    expect(doneButton).toHaveClass('btn-primary');
  });
});
