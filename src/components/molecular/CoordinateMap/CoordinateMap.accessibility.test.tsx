import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CoordinateMap from './CoordinateMap';

expect.extend(toHaveNoViolations);

// Mock the dynamic import since Leaflet doesn't work well in tests
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) => {
    const MockComponent = ({
      latitude,
      longitude,
    }: {
      latitude: number;
      longitude: number;
    }) => (
      <div data-testid="mock-map-inner" role="img" aria-label="Map">
        Mock Map at {latitude}, {longitude}
      </div>
    );
    MockComponent.displayName = 'MockMapInner';
    return MockComponent;
  },
}));

describe('CoordinateMap Accessibility', () => {
  const defaultProps = {
    latitude: 40.7128,
    longitude: -74.006,
  };

  it('should have no accessibility violations', async () => {
    const { container } = render(<CoordinateMap {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA attributes', () => {
    render(<CoordinateMap {...defaultProps} />);
    const mapContainer = screen.getByTestId('coordinate-map');

    expect(mapContainer).toHaveAttribute('role', 'application');
    expect(mapContainer).toHaveAttribute('aria-label');
  });

  it('should include coordinates in aria-label', () => {
    render(<CoordinateMap {...defaultProps} />);
    const mapContainer = screen.getByTestId('coordinate-map');
    const ariaLabel = mapContainer.getAttribute('aria-label');

    expect(ariaLabel).toContain('40.7128');
    expect(ariaLabel).toContain('-74.0060');
  });

  it('should indicate interactivity in aria-label when interactive', () => {
    render(<CoordinateMap {...defaultProps} interactive={true} />);
    const mapContainer = screen.getByTestId('coordinate-map');
    const ariaLabel = mapContainer.getAttribute('aria-label');

    expect(ariaLabel).toContain('Click to update location');
  });

  it('should not mention click when non-interactive', () => {
    render(<CoordinateMap {...defaultProps} interactive={false} />);
    const mapContainer = screen.getByTestId('coordinate-map');
    const ariaLabel = mapContainer.getAttribute('aria-label');

    expect(ariaLabel).not.toContain('Click to update location');
  });

  it('should have proper semantic HTML structure', () => {
    const { container } = render(<CoordinateMap {...defaultProps} />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Map container should have application role for interactive maps
    const mapElement = screen.getByRole('application');
    expect(mapElement).toBeInTheDocument();
  });
});
