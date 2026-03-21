'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Popup } from 'react-map-gl/maplibre';
import { MapContainer } from '@/components/map/MapContainer';
import type { MapMarker } from '@/components/map/MapContainer';
import { DEFAULT_MAP_CONFIG } from '@/utils/map-utils';

export interface ModerationMapProps {
  pendingMarkers: MapMarker[];
  approvedMarkers: MapMarker[];
  /** The contribution id (NOT prefixed). Null = nothing selected. */
  selectedContributionId: string | null;
  /** Fires with the stripped contribution id when a pending marker is clicked. */
  onSelectPending: (contributionId: string) => void;
  /** When set, pan to this contribution's marker. Cleared by caller after dispatch. */
  flyToContributionId?: string;
}

const PENDING_PREFIX = 'pending-';

/**
 * Moderation map. Wraps MapContainer directly — CompanyMap is off-limits
 * because it hardcodes useCompanyWorkspace().
 *
 * Click behavior is bimodal:
 *   pending marker  → lift to parent (opens detail panel), clear popup
 *   approved marker → local popup, parent never hears about it
 *
 * MapContainerInner's click handler is either/or (L469-475): when we
 * supply onMarkerClick, its internal popup never fires. So we render our
 * own <Popup> as a child. The children slot lands inside <Map> (L514)
 * which is exactly where react-map-gl expects <Popup>.
 */
export function ModerationMap({
  pendingMarkers,
  approvedMarkers,
  selectedContributionId,
  onSelectPending,
  flyToContributionId,
}: ModerationMapProps) {
  const [popupMarker, setPopupMarker] = useState<MapMarker | null>(null);

  const markers = useMemo(
    () => [...pendingMarkers, ...approvedMarkers],
    [pendingMarkers, approvedMarkers]
  );

  const handleMarkerClick = useCallback(
    (m: MapMarker) => {
      if (m.id.startsWith(PENDING_PREFIX)) {
        setPopupMarker(null);
        onSelectPending(m.id.slice(PENDING_PREFIX.length));
      } else {
        setPopupMarker(m);
      }
    },
    [onSelectPending]
  );

  const selectedMarkerId = selectedContributionId
    ? `${PENDING_PREFIX}${selectedContributionId}`
    : undefined;

  // FlyTo: resolve contribution ID → marker position, bump seq to re-fire
  const seqRef = useRef(0);
  const [flyToTarget, setFlyToTarget] = useState<{
    center: [number, number];
    zoom?: number;
    seq: number;
  } | null>(null);

  useEffect(() => {
    if (!flyToContributionId) {
      setFlyToTarget(null);
      return;
    }
    const target = markers.find(
      (m) => m.id === `${PENDING_PREFIX}${flyToContributionId}`
    );
    if (!target) {
      setFlyToTarget(null);
      return;
    }
    seqRef.current += 1;
    setFlyToTarget({ center: target.position, seq: seqRef.current });
  }, [flyToContributionId, markers]);

  const [lat, lng] = DEFAULT_MAP_CONFIG.center;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={DEFAULT_MAP_CONFIG.zoom}
      height="100%"
      markers={markers}
      selectedMarkerId={selectedMarkerId}
      onMarkerClick={handleMarkerClick}
      flyToTarget={flyToTarget}
    >
      {popupMarker && (
        <Popup
          longitude={popupMarker.position[1]}
          latitude={popupMarker.position[0]}
          onClose={() => setPopupMarker(null)}
          closeButton
          closeOnClick={false}
        >
          <div className="text-sm whitespace-pre-line">{popupMarker.popup}</div>
        </Popup>
      )}
    </MapContainer>
  );
}
