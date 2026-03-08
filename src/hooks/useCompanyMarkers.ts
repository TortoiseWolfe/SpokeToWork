import { useMemo } from 'react';
import type { UnifiedCompany } from '@/types/company';
import type { MapMarker } from '@/components/map/MapContainer';
import { getUnifiedCompanyId } from '@/lib/companies/company-id';

export interface UseCompanyMarkersOptions {
  /**
   * Companies on the active route. These get the 'active-route' variant
   * (secondary fill). The CompanyWorkspaceContext already enriches this set
   * with both company_id and tracking_id forms for shared companies, so a
   * straight membership check against getUnifiedCompanyId works.
   */
  activeRouteIds?: Set<string>;
  /**
   * Companies flagged visit_on_next_ride. 'next-ride' variant (warning fill).
   * Wins over active-route — "visit next" is a stronger signal than
   * "on this route somewhere."
   */
  nextRideIds?: Set<string>;
}

export function useCompanyMarkers(
  companies: UnifiedCompany[],
  opts: UseCompanyMarkersOptions = {},
): MapMarker[] {
  const { activeRouteIds, nextRideIds } = opts;

  return useMemo(
    () =>
      companies
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => {
          const id = getUnifiedCompanyId(c);
          const variant = nextRideIds?.has(id)
            ? ('next-ride' as const)
            : activeRouteIds?.has(id)
              ? ('active-route' as const)
              : ('default' as const);
          return {
            // Prefixed so route-endpoint markers (start-*, end-*) never
            // collide when a future split view puts both on the same map.
            id: `company-${id}`,
            position: [c.latitude!, c.longitude!] as [number, number],
            popup: c.name,
            variant,
          };
        }),
    [companies, activeRouteIds, nextRideIds],
  );
}
