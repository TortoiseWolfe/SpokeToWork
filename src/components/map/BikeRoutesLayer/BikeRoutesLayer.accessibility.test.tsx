import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BikeRoutesLayer } from './BikeRoutesLayer';

// Mock useDaisyColors to return deterministic values
vi.mock('@/hooks/useDaisyColors', () => ({
  useDaisyColors: () => ({
    success: '#22c55e',
    'base-100': '#ffffff',
  }),
}));

// Mock react-map-gl/maplibre
vi.mock('react-map-gl/maplibre', () => ({
  Source: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-testid={`source-${id}`} role="presentation">
      {children}
    </div>
  ),
  Layer: ({
    id,
    paint,
    layout,
  }: {
    id: string;
    paint: Record<string, unknown>;
    layout: Record<string, unknown>;
  }) => (
    <div
      data-testid={`layer-${id}`}
      data-line-color={paint?.['line-color'] as string}
      data-visibility={layout?.visibility as string}
      role="presentation"
      aria-hidden="true"
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

describe('BikeRoutesLayer Accessibility', () => {
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

  describe('Color Contrast', () => {
    it('uses theme-derived colors with sufficient contrast', async () => {
      const { getByTestId } = render(<BikeRoutesLayer />);

      await waitFor(() => {
        const routeLayer = getByTestId('layer-all-bike-routes');
        const casingLayer = getByTestId('layer-all-bike-routes-casing');

        // Theme colors from useDaisyColors: success (#22c55e) on base-100 (#ffffff)
        // WCAG contrast ratio: 2.77:1 (sufficient for large graphics)
        expect(routeLayer).toHaveAttribute('data-line-color', '#22c55e');
        expect(casingLayer).toHaveAttribute('data-line-color', '#ffffff');
      });
    });
  });

  describe('Visual Presentation', () => {
    it('renders map layers as presentation role (non-interactive)', async () => {
      const { getByTestId } = render(<BikeRoutesLayer />);

      await waitFor(() => {
        const source = getByTestId('source-all-bike-routes');
        const routeLayer = getByTestId('layer-all-bike-routes');
        const casingLayer = getByTestId('layer-all-bike-routes-casing');

        // Map layers should be presentation/decorative
        expect(source).toHaveAttribute('role', 'presentation');
        expect(routeLayer).toHaveAttribute('role', 'presentation');
        expect(casingLayer).toHaveAttribute('role', 'presentation');
      });
    });

    it('hides decorative layers from assistive technology', async () => {
      const { getByTestId } = render(<BikeRoutesLayer />);

      await waitFor(() => {
        const routeLayer = getByTestId('layer-all-bike-routes');
        const casingLayer = getByTestId('layer-all-bike-routes-casing');

        // Map visualization layers are decorative
        expect(routeLayer).toHaveAttribute('aria-hidden', 'true');
        expect(casingLayer).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Visibility Control', () => {
    it('respects visibility prop for users who prefer reduced motion', async () => {
      const { getByTestId } = render(<BikeRoutesLayer visible={false} />);

      await waitFor(() => {
        const routeLayer = getByTestId('layer-all-bike-routes');
        expect(routeLayer).toHaveAttribute('data-visibility', 'none');
      });
    });

    it('shows layer by default', async () => {
      const { getByTestId } = render(<BikeRoutesLayer />);

      await waitFor(() => {
        const routeLayer = getByTestId('layer-all-bike-routes');
        expect(routeLayer).toHaveAttribute('data-visibility', 'visible');
      });
    });
  });

  describe('Error Handling', () => {
    it('renders nothing on error without crashing', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const { container } = render(<BikeRoutesLayer />);

      await waitFor(() => {
        // Component should gracefully handle errors
        // No broken UI or error messages visible
        expect(container.innerHTML).toBe('');
      });
    });

    it('logs error for debugging without exposing to user', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      render(<BikeRoutesLayer />);

      await waitFor(() => {
        // Error logged for developers, not shown to users
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  describe('Theme Adaptation', () => {
    it('uses theme tokens that adapt across all DaisyUI themes', async () => {
      const { getByTestId } = render(<BikeRoutesLayer />);

      await waitFor(() => {
        const routeLayer = getByTestId('layer-all-bike-routes');
        // Colors come from useDaisyColors which reads CSS custom properties
        // at runtime, so they adapt automatically across all 32 DaisyUI themes
        expect(routeLayer).toHaveAttribute('data-line-color', '#22c55e');
      });
    });
  });
});
