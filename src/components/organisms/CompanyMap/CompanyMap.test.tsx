import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MapMarker } from '@/components/map/MapContainer';

// Stub the context — CompanyMap pulls selectedCompanyId/selectCompany from it.
const selectCompanySpy = vi.fn();
let mockSelectedCompanyId: string | null = null;

vi.mock('@/contexts/CompanyWorkspaceContext', () => ({
  useCompanyWorkspace: () => ({
    selectedCompanyId: mockSelectedCompanyId,
    selectCompany: selectCompanySpy,
    clearSelection: vi.fn(),
    activeRouteCompanyIds: new Set<string>(),
    refreshRouteCompanyIds: vi.fn(),
  }),
}));

// Stub MapContainer — we only care that CompanyMap passes the right props.
// Capture them via a module-scope let we can assert against.
let lastMapProps: {
  selectedMarkerId?: string;
  onMarkerClick?: (m: MapMarker) => void;
  flyToTarget?: {
    center: [number, number];
    zoom?: number;
    seq?: number;
  } | null;
  markers?: MapMarker[];
} = {};

vi.mock('@/components/map/MapContainer', () => ({
  MapContainer: (
    props: typeof lastMapProps & { children?: React.ReactNode }
  ) => {
    lastMapProps = props;
    return (
      <div data-testid="mock-map-container">
        {props.markers?.map((m) => (
          <button
            key={m.id}
            data-testid={`marker-${m.id}`}
            onClick={() => props.onMarkerClick?.(m)}
          >
            {m.id}
          </button>
        ))}
      </div>
    );
  },
}));

import { CompanyMap } from './CompanyMap';

const markers: MapMarker[] = [
  { id: 'company-pc-1', position: [40.7, -74.0], variant: 'default' },
  { id: 'company-pc-2', position: [40.8, -74.1], variant: 'default' },
];

beforeEach(() => {
  selectCompanySpy.mockClear();
  mockSelectedCompanyId = null;
  lastMapProps = {};
});

describe('CompanyMap — selection', () => {
  it('passes selectedMarkerId with the company- prefix', () => {
    mockSelectedCompanyId = 'pc-1';
    render(<CompanyMap markers={markers} center={[40.7, -74.0]} zoom={10} />);
    expect(lastMapProps.selectedMarkerId).toBe('company-pc-1');
  });

  it('passes undefined selectedMarkerId when nothing is selected', () => {
    render(<CompanyMap markers={markers} center={[40.7, -74.0]} zoom={10} />);
    expect(lastMapProps.selectedMarkerId).toBeUndefined();
  });

  it('calls selectCompany with the unprefixed id on marker click', async () => {
    const user = userEvent.setup();
    render(<CompanyMap markers={markers} center={[40.7, -74.0]} zoom={10} />);
    await user.click(screen.getByTestId('marker-company-pc-2'));
    expect(selectCompanySpy).toHaveBeenCalledTimes(1);
    expect(selectCompanySpy).toHaveBeenCalledWith('pc-2');
  });

  it('marker click does NOT set flyToTarget — select is not fly', async () => {
    const user = userEvent.setup();
    render(<CompanyMap markers={markers} center={[40.7, -74.0]} zoom={10} />);
    await user.click(screen.getByTestId('marker-company-pc-1'));
    // After click, the flyToTarget prop should still be null/undefined.
    // User is already looking at the thing they clicked.
    expect(lastMapProps.flyToTarget).toBeNull();
  });
});

describe('CompanyMap — flyToCompanyId', () => {
  it('resolves flyToCompanyId to the marker position and sets flyToTarget', () => {
    render(
      <CompanyMap
        markers={markers}
        center={[40.7, -74.0]}
        zoom={10}
        flyToCompanyId="pc-2"
      />
    );
    expect(lastMapProps.flyToTarget).toMatchObject({
      center: [40.8, -74.1],
    });
  });

  it('increments seq on repeated flyToCompanyId to the same company', () => {
    const { rerender } = render(
      <CompanyMap
        markers={markers}
        center={[40.7, -74.0]}
        zoom={10}
        flyToCompanyId="pc-1"
      />
    );
    const firstSeq = lastMapProps.flyToTarget?.seq;

    // Clear, then set again — split-view will do this when the table
    // row is re-clicked.
    rerender(
      <CompanyMap
        markers={markers}
        center={[40.7, -74.0]}
        zoom={10}
        flyToCompanyId={undefined}
      />
    );
    rerender(
      <CompanyMap
        markers={markers}
        center={[40.7, -74.0]}
        zoom={10}
        flyToCompanyId="pc-1"
      />
    );
    const secondSeq = lastMapProps.flyToTarget?.seq;
    expect(secondSeq).toBeGreaterThan(firstSeq!);
  });

  it('passes null flyToTarget when flyToCompanyId is not in markers', () => {
    render(
      <CompanyMap
        markers={markers}
        center={[40.7, -74.0]}
        zoom={10}
        flyToCompanyId="nonexistent"
      />
    );
    expect(lastMapProps.flyToTarget).toBeNull();
  });
});
