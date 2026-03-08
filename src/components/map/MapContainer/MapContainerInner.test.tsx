/**
 * MapContainerInner tests.
 *
 * Unlike MapContainer.test.tsx (which stubs this whole file via next/dynamic),
 * these tests mock react-map-gl/maplibre directly so we can test the marker
 * rendering, selection ring, and flyToTarget effect.
 *
 * WebGL is unavailable in happy-dom — the Map mock is a div that forwards a
 * ref with the subset of MapRef we actually call.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the CSS import (happy-dom can't parse it)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

// Spy shared across tests. Assigned fresh in the Map mock's render so each
// test sees the instance the component actually holds a ref to.
const flyToSpy = vi.fn();
const getZoomSpy = vi.fn(() => 10);

vi.mock('react-map-gl/maplibre', async () => {
  const ReactModule = await import('react');
  const R = ReactModule.default ?? ReactModule;
  const MockMap = R.forwardRef(function MockMap(
    props: { children?: React.ReactNode },
    ref: React.Ref<unknown>,
  ) {
    R.useImperativeHandle(ref, () => ({
      flyTo: flyToSpy,
      getZoom: getZoomSpy,
    }));
    return <div data-testid="mock-map">{props.children}</div>;
  });
  return {
    __esModule: true,
    default: MockMap,
    Marker: ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: (e: { originalEvent: MouseEvent }) => void;
    }) => (
      <div
        data-testid="mock-marker"
        onClick={(e) =>
          onClick?.({ originalEvent: e.nativeEvent as MouseEvent })
        }
      >
        {children}
      </div>
    ),
    Popup: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-popup">{children}</div>
    ),
    NavigationControl: () => null,
    GeolocateControl: () => null,
  };
});

// BikeRoutesLayer hits MapLibre internals; stub it.
vi.mock('@/components/map/BikeRoutesLayer', () => ({
  BikeRoutesLayer: () => null,
}));

// useMapTheme reads DOM attributes; give it a stable answer.
vi.mock('@/hooks/useMapTheme', () => ({
  useMapTheme: () => 'light',
}));

// Replace useThemeColors with a fixture so we can assert the variant→token
// mapping without depending on happy-dom's CSS resolution. Sentinel rgb()
// values — happy-dom's CSSStyleDeclaration silently drops oklch() as an
// unrecognized color, so we use values it will round-trip. The real hook's
// oklch output is covered by useThemeColors.test.ts; this test proves
// CustomMarker picks the right token for each variant.
vi.mock('@/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    primary: 'rgb(1, 1, 1)',
    secondary: 'rgb(2, 2, 2)',
    accent: 'rgb(3, 3, 3)',
    success: 'rgb(4, 4, 4)',
    warning: 'rgb(5, 5, 5)',
    error: 'rgb(6, 6, 6)',
    info: 'rgb(7, 7, 7)',
  }),
}));

import MapContainerInner, { CustomMarker } from './MapContainerInner';
import type { MapMarker } from './MapContainerInner';

describe('CustomMarker', () => {
  const baseMarker: MapMarker = {
    id: 'm1',
    position: [40.7, -74.0],
    variant: 'default',
  };

  it('renders a selection ring when isSelected is true', () => {
    const { container } = render(
      <CustomMarker marker={baseMarker} isSelected />,
    );
    expect(container.querySelector('.ring-4')).not.toBeNull();
  });

  it('renders no ring when isSelected is false', () => {
    const { container } = render(
      <CustomMarker marker={baseMarker} isSelected={false} />,
    );
    expect(container.querySelector('.ring-4')).toBeNull();
  });

  it('renders no ring when isSelected is omitted (backward compat)', () => {
    const { container } = render(<CustomMarker marker={baseMarker} />);
    expect(container.querySelector('.ring-4')).toBeNull();
  });
});

describe('MapContainerInner — onMarkerClick', () => {
  beforeEach(() => {
    flyToSpy.mockClear();
    getZoomSpy.mockClear();
  });

  const markers: MapMarker[] = [
    { id: 'a', position: [40.7, -74.0], variant: 'default' },
    { id: 'b', position: [40.8, -74.1], variant: 'default' },
  ];

  it('fires onMarkerClick with the clicked marker when prop is provided', async () => {
    const onMarkerClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MapContainerInner
        center={[40.7, -74.0]}
        zoom={10}
        markers={markers}
        onMarkerClick={onMarkerClick}
      />,
    );
    const rendered = screen.getAllByTestId('mock-marker');
    await user.click(rendered[1]);
    expect(onMarkerClick).toHaveBeenCalledTimes(1);
    expect(onMarkerClick).toHaveBeenCalledWith(markers[1]);
  });

  it('does not throw when onMarkerClick is omitted (backward compat)', async () => {
    const user = userEvent.setup();
    render(
      <MapContainerInner center={[40.7, -74.0]} zoom={10} markers={markers} />,
    );
    const rendered = screen.getAllByTestId('mock-marker');
    await expect(user.click(rendered[0])).resolves.not.toThrow();
  });
});

describe('MapContainerInner — flyToTarget', () => {
  beforeEach(() => {
    flyToSpy.mockClear();
    getZoomSpy.mockClear();
  });

  it('calls mapRef.flyTo with [lng, lat] when flyToTarget is set', () => {
    render(
      <MapContainerInner
        center={[40.7, -74.0]}
        zoom={10}
        flyToTarget={{ center: [51.5, -0.12], zoom: 14 }}
      />,
    );
    expect(flyToSpy).toHaveBeenCalledTimes(1);
    expect(flyToSpy).toHaveBeenCalledWith({
      center: [-0.12, 51.5],
      zoom: 14,
      duration: 800,
    });
  });

  it('falls back to current zoom when flyToTarget.zoom is omitted', () => {
    getZoomSpy.mockReturnValue(7);
    render(
      <MapContainerInner
        center={[40.7, -74.0]}
        zoom={10}
        flyToTarget={{ center: [51.5, -0.12] }}
      />,
    );
    expect(flyToSpy).toHaveBeenCalledWith({
      center: [-0.12, 51.5],
      zoom: 7,
      duration: 800,
    });
  });

  it('does not re-fly on unrelated re-render when seq is unchanged', () => {
    const { rerender } = render(
      <MapContainerInner
        center={[40.7, -74.0]}
        zoom={10}
        flyToTarget={{ center: [51.5, -0.12], seq: 1 }}
      />,
    );
    expect(flyToSpy).toHaveBeenCalledTimes(1);
    rerender(
      <MapContainerInner
        center={[40.7, -74.0]}
        zoom={10}
        flyToTarget={{ center: [51.5, -0.12], seq: 1 }}
      />,
    );
    expect(flyToSpy).toHaveBeenCalledTimes(1);
  });

  it('re-flies when seq increments (same coords)', () => {
    const { rerender } = render(
      <MapContainerInner
        center={[40.7, -74.0]}
        zoom={10}
        flyToTarget={{ center: [51.5, -0.12], seq: 1 }}
      />,
    );
    rerender(
      <MapContainerInner
        center={[40.7, -74.0]}
        zoom={10}
        flyToTarget={{ center: [51.5, -0.12], seq: 2 }}
      />,
    );
    expect(flyToSpy).toHaveBeenCalledTimes(2);
  });

  it('does nothing when flyToTarget is null', () => {
    render(
      <MapContainerInner center={[40.7, -74.0]} zoom={10} flyToTarget={null} />,
    );
    expect(flyToSpy).not.toHaveBeenCalled();
  });

  it('does nothing when flyToTarget is omitted (backward compat)', () => {
    render(<MapContainerInner center={[40.7, -74.0]} zoom={10} />);
    expect(flyToSpy).not.toHaveBeenCalled();
  });
});

describe('CustomMarker — theme colors', () => {
  const marker = (variant: MapMarker['variant']): MapMarker => ({
    id: 'x',
    position: [0, 0],
    variant,
  });

  // The pin div is the first element with both inline backgroundColor
  // and the border-white class. All five variants share this shape.
  const pinBg = (container: HTMLElement) =>
    (container.querySelector('.border-white') as HTMLElement | null)?.style
      .backgroundColor;

  it('default variant uses primary', () => {
    const { container } = render(<CustomMarker marker={marker('default')} />);
    expect(pinBg(container)).toBe('rgb(1, 1, 1)');
  });

  it('next-ride uses warning', () => {
    const { container } = render(<CustomMarker marker={marker('next-ride')} />);
    expect(pinBg(container)).toBe('rgb(5, 5, 5)');
  });

  it('active-route uses secondary', () => {
    const { container } = render(
      <CustomMarker marker={marker('active-route')} />,
    );
    expect(pinBg(container)).toBe('rgb(2, 2, 2)');
  });

  it('start-point uses success', () => {
    const { container } = render(
      <CustomMarker marker={marker('start-point')} />,
    );
    expect(pinBg(container)).toBe('rgb(4, 4, 4)');
  });

  it('end-point uses accent', () => {
    const { container } = render(<CustomMarker marker={marker('end-point')} />);
    expect(pinBg(container)).toBe('rgb(3, 3, 3)');
  });
});
