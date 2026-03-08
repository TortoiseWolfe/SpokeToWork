import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MapMarker } from '@/components/map/MapContainer';
import { ModerationMap } from './ModerationMap';

// MapContainer boots MapLibre GL — doesn't work in happy-dom. Mock it.
// Expose markers as buttons and render children so we can probe popup.
vi.mock('@/components/map/MapContainer', () => ({
  MapContainer: ({
    markers,
    onMarkerClick,
    selectedMarkerId,
    children,
  }: {
    markers: MapMarker[];
    onMarkerClick?: (m: MapMarker) => void;
    selectedMarkerId?: string;
    children?: React.ReactNode;
  }) => (
    <div data-testid="map-mock">
      {markers.map((m) => (
        <button
          key={m.id}
          data-testid={`marker-${m.id}`}
          data-selected={selectedMarkerId === m.id}
          onClick={() => onMarkerClick?.(m)}
        >
          {m.popup}
        </button>
      ))}
      {children}
    </div>
  ),
}));

vi.mock('react-map-gl/maplibre', () => ({
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
}));

const pending: MapMarker[] = [
  {
    id: 'pending-c1',
    position: [51.5, -0.1],
    popup: 'Pending Co',
    variant: 'pending-contribution',
  },
];
const approved: MapMarker[] = [
  {
    id: 'approved-l1',
    position: [51.51, -0.11],
    popup: 'Approved Co\n1 St',
    variant: 'default',
  },
];

describe('ModerationMap', () => {
  let onSelectPending: Mock;

  beforeEach(() => {
    onSelectPending = vi.fn();
  });

  it('merges pending + approved markers into one MapContainer', () => {
    render(
      <ModerationMap
        pendingMarkers={pending}
        approvedMarkers={approved}
        selectedContributionId={null}
        onSelectPending={onSelectPending}
      />
    );
    expect(screen.getByTestId('marker-pending-c1')).toBeInTheDocument();
    expect(screen.getByTestId('marker-approved-l1')).toBeInTheDocument();
  });

  it('pending click → onSelectPending with stripped id, no popup', () => {
    render(
      <ModerationMap
        pendingMarkers={pending}
        approvedMarkers={approved}
        selectedContributionId={null}
        onSelectPending={onSelectPending}
      />
    );
    fireEvent.click(screen.getByTestId('marker-pending-c1'));
    expect(onSelectPending).toHaveBeenCalledWith('c1');
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
  });

  it('approved click → popup, no onSelectPending', () => {
    render(
      <ModerationMap
        pendingMarkers={pending}
        approvedMarkers={approved}
        selectedContributionId={null}
        onSelectPending={onSelectPending}
      />
    );
    fireEvent.click(screen.getByTestId('marker-approved-l1'));
    expect(onSelectPending).not.toHaveBeenCalled();
    expect(screen.getByTestId('popup')).toHaveTextContent('Approved Co');
  });

  it('pending click clears an open approved popup', () => {
    render(
      <ModerationMap
        pendingMarkers={pending}
        approvedMarkers={approved}
        selectedContributionId={null}
        onSelectPending={onSelectPending}
      />
    );
    fireEvent.click(screen.getByTestId('marker-approved-l1'));
    expect(screen.getByTestId('popup')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('marker-pending-c1'));
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
  });

  it('passes selectedContributionId through as prefixed selectedMarkerId', () => {
    render(
      <ModerationMap
        pendingMarkers={pending}
        approvedMarkers={approved}
        selectedContributionId="c1"
        onSelectPending={onSelectPending}
      />
    );
    expect(screen.getByTestId('marker-pending-c1').dataset.selected).toBe(
      'true'
    );
  });
});
