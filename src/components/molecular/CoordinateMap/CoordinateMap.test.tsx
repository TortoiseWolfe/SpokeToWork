import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CoordinateMap from './CoordinateMap';

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
      <div data-testid="mock-map-inner">
        Mock Map at {latitude}, {longitude}
      </div>
    );
    MockComponent.displayName = 'MockMapInner';
    return MockComponent;
  },
}));

describe('CoordinateMap', () => {
  const defaultProps = {
    latitude: 40.7128,
    longitude: -74.006,
  };

  it('renders without crashing', () => {
    const { container } = render(<CoordinateMap {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with correct test id', () => {
    render(<CoordinateMap {...defaultProps} />);
    expect(screen.getByTestId('coordinate-map')).toBeInTheDocument();
  });

  it('renders with custom test id', () => {
    render(<CoordinateMap {...defaultProps} testId="custom-map" />);
    expect(screen.getByTestId('custom-map')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-test-class';
    const { container } = render(
      <CoordinateMap {...defaultProps} className={customClass} />
    );
    const element = container.querySelector('.custom-test-class');
    expect(element).toBeInTheDocument();
  });

  it('applies custom dimensions', () => {
    render(<CoordinateMap {...defaultProps} height="300px" width="400px" />);
    const mapContainer = screen.getByTestId('coordinate-map');
    expect(mapContainer).toHaveStyle({ height: '300px', width: '400px' });
  });

  it('has correct aria-label for interactive map', () => {
    render(<CoordinateMap {...defaultProps} interactive={true} />);
    const mapContainer = screen.getByTestId('coordinate-map');
    expect(mapContainer).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Click to update location')
    );
  });

  it('has correct aria-label for non-interactive map', () => {
    render(<CoordinateMap {...defaultProps} interactive={false} />);
    const mapContainer = screen.getByTestId('coordinate-map');
    expect(mapContainer).not.toHaveAttribute(
      'aria-label',
      expect.stringContaining('Click to update location')
    );
  });

  it('displays coordinates in aria-label', () => {
    render(<CoordinateMap {...defaultProps} />);
    const mapContainer = screen.getByTestId('coordinate-map');
    expect(mapContainer).toHaveAttribute(
      'aria-label',
      expect.stringContaining('40.7128')
    );
  });
});
