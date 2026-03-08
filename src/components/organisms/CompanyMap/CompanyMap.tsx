'use client';

/**
 * CompanyMap — domain wrapper over MapContainer for the companies workspace.
 *
 * Owns the wiring between CompanyWorkspaceContext's selection state and
 * MapContainer's marker props. Does NOT own marker data — caller transforms
 * UnifiedCompany[] with useCompanyMarkers and passes the result in.
 *
 * Select ≠ fly: clicking a marker selects but does not pan (the user is
 * already looking at what they clicked). Panning is driven by the
 * flyToCompanyId prop, which the split view sets from table-row clicks.
 *
 * Design: docs/plans/2026-03-06-company-map-extraction-design.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import type { MapMarker } from '@/components/map/MapContainer';
import { useCompanyWorkspace } from '@/contexts/CompanyWorkspaceContext';

const MARKER_PREFIX = 'company-';

export interface CompanyMapProps {
  /** Pre-transformed markers. Build with useCompanyMarkers(). */
  markers: MapMarker[];
  /** Initial map center, [lat, lng]. */
  center: [number, number];
  /** Initial zoom. */
  zoom: number;
  /**
   * When set, pan to this company's marker. Split view sets this from
   * table-row clicks. Component resolves id → marker position internally.
   *
   * Caller owns clearing: holding this steady across a `markers` rebuild
   * (e.g. route-membership change) re-fires the fly. Clear after dispatch.
   */
  flyToCompanyId?: string;
  /** Passed through for full-screen vs panel layout. */
  className?: string;
  /** Route polylines etc., rendered inside the MapContainer. */
  children?: React.ReactNode;
}

export function CompanyMap({
  markers,
  center,
  zoom,
  flyToCompanyId,
  className,
  children,
}: CompanyMapProps) {
  const { selectedCompanyId, selectCompany } = useCompanyWorkspace();

  const selectedMarkerId = selectedCompanyId
    ? `${MARKER_PREFIX}${selectedCompanyId}`
    : undefined;

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      if (!marker.id.startsWith(MARKER_PREFIX)) return;
      selectCompany(marker.id.slice(MARKER_PREFIX.length));
    },
    [selectCompany]
  );

  // Seq counter: every time flyToCompanyId transitions to a value that
  // resolves to a marker, we bump seq. MapContainerInner checks seq to decide
  // whether to re-fire flyTo on re-render — this lets the split view re-click
  // the same row and still trigger a pan (after the user has manually moved
  // the map away).
  const seqRef = useRef(0);
  const [flyToTarget, setFlyToTarget] = useState<{
    center: [number, number];
    zoom?: number;
    seq: number;
  } | null>(null);

  useEffect(() => {
    if (!flyToCompanyId) {
      setFlyToTarget(null);
      return;
    }
    const target = markers.find(
      (m) => m.id === `${MARKER_PREFIX}${flyToCompanyId}`
    );
    if (!target) {
      setFlyToTarget(null);
      return;
    }
    seqRef.current += 1;
    setFlyToTarget({
      center: target.position,
      seq: seqRef.current,
    });
  }, [flyToCompanyId, markers]);

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        markers={markers}
        selectedMarkerId={selectedMarkerId}
        onMarkerClick={handleMarkerClick}
        flyToTarget={flyToTarget}
        height="100%"
      >
        {children}
      </MapContainer>
    </div>
  );
}
