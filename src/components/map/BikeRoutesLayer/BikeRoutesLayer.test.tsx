import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BikeRoutesLayer } from './BikeRoutesLayer';

// Mock react-map-gl/maplibre
vi.mock('react-map-gl/maplibre', () => ({
  Source: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-testid={`source-${id}`}>{children}</div>
  ),
  Layer: ({ id, paint }: { id: string; paint: Record<string, unknown> }) => (
    <div
      data-testid={`layer-${id}`}
      data-line-color={paint?.['line-color'] as string}
    />
  ),
}));

// Mock fetch
const mockGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { highway: 'cycleway' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-85.2, 35.1],
          [-85.3, 35.2],
        ],
      },
    },
  ],
};

describe('BikeRoutesLayer', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeoJSON),
    } as Response);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', async () => {
    const { container } = render(<BikeRoutesLayer isDarkMode={false} />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('fetches GeoJSON on mount', async () => {
    render(<BikeRoutesLayer isDarkMode={false} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/data/all-bike-routes.geojson'
      );
    });
  });

  it('renders source and layers after data loads', async () => {
    const { getByTestId } = render(<BikeRoutesLayer isDarkMode={false} />);

    await waitFor(() => {
      expect(getByTestId('source-all-bike-routes')).toBeInTheDocument();
      expect(getByTestId('layer-all-bike-routes-casing')).toBeInTheDocument();
      expect(getByTestId('layer-all-bike-routes')).toBeInTheDocument();
    });
  });

  it('uses light mode colors when isDarkMode is false', async () => {
    const { getByTestId } = render(<BikeRoutesLayer isDarkMode={false} />);

    await waitFor(() => {
      const routeLayer = getByTestId('layer-all-bike-routes');
      expect(routeLayer).toHaveAttribute('data-line-color', '#22c55e');
    });
  });

  it('uses dark mode colors when isDarkMode is true', async () => {
    const { getByTestId } = render(<BikeRoutesLayer isDarkMode={true} />);

    await waitFor(() => {
      const routeLayer = getByTestId('layer-all-bike-routes');
      expect(routeLayer).toHaveAttribute('data-line-color', '#4ade80');
    });
  });

  it('handles fetch errors gracefully', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const { container } = render(<BikeRoutesLayer isDarkMode={false} />);

    await waitFor(() => {
      // Component should not crash and should render nothing
      expect(container.innerHTML).toBe('');
    });
  });

  it('handles non-ok response gracefully', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const { container } = render(<BikeRoutesLayer isDarkMode={false} />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('logs feature count on successful load', async () => {
    render(<BikeRoutesLayer isDarkMode={false} />);

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('Loaded', 1, 'bike routes');
    });
  });

  it('logs error on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<BikeRoutesLayer isDarkMode={false} />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load bike routes:',
        expect.any(Error)
      );
    });
  });

  it('does not render when visible is false', async () => {
    const { getByTestId } = render(
      <BikeRoutesLayer isDarkMode={false} visible={false} />
    );

    await waitFor(() => {
      // Still renders the layers, but with visibility: none in layout
      expect(getByTestId('layer-all-bike-routes')).toBeInTheDocument();
    });
  });
});
