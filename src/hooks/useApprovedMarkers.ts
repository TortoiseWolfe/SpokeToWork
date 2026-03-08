import { useMemo } from 'react';
import type { NearbyLocation } from '@/lib/companies/nearby-locations';
import type { MapMarker } from '@/components/map/MapContainer';

/**
 * Nearby approved-company locations → default-variant markers.
 *
 * One marker per LOCATION, not per company. A shared_company with two
 * offices inside the box shows as two dots. The detail panel dedups by
 * shared_company_id for its merge list — the map doesn't.
 *
 * `popup` doubles as aria-label (CustomMarker reads it at
 * MapContainerInner.tsx:~114) and as the content ModerationMap's own
 * <Popup> displays on click. Multi-line is fine — the popup wraps with
 * white-space: pre-line.
 *
 * NearbyLocation.latitude/longitude are typed non-null because
 * getNearbyCompanyLocations filters nulls at the query level, so no
 * coord filter here.
 */
export function useApprovedMarkers(locations: NearbyLocation[]): MapMarker[] {
  return useMemo(
    () =>
      locations.map((l) => ({
        id: `approved-${l.id}`,
        position: [l.latitude, l.longitude] as [number, number],
        popup: l.address
          ? `${l.shared_company_name}\n${l.address}`
          : l.shared_company_name,
        variant: 'default' as const,
      })),
    [locations],
  );
}
