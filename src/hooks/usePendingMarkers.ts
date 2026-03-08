import { useMemo } from 'react';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';
import type { MapMarker } from '@/components/map/MapContainer';

/**
 * Queue items → pending-contribution markers.
 *
 * Filters:
 *   - edit_suggestion items (they belong to shared_companies, not
 *     private_companies, and have no coords on the queue row)
 *   - contributions with null lat/lng (no geocode)
 *
 * ID prefix `pending-` is how ModerationMap tells a click on a pending
 * marker from a click on an approved one — its onMarkerClick branches on
 * `marker.id.startsWith('pending-')`. Keep in sync with useApprovedMarkers
 * using `approved-`.
 */
export function usePendingMarkers(items: ModerationQueueItem[]): MapMarker[] {
  return useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.type === 'contribution' &&
            i.latitude != null &&
            i.longitude != null
        )
        .map((i) => ({
          id: `pending-${i.id}`,
          position: [i.latitude!, i.longitude!] as [number, number],
          popup: i.private_company_name ?? '(unnamed)',
          variant: 'pending-contribution' as const,
        })),
    [items]
  );
}
