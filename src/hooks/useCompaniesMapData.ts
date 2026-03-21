'use client';

/**
 * useCompaniesMapData
 *
 * Bundles the map-related memos for the companies workspace:
 *   - markers (UnifiedCompany[] → MapMarker[])
 *   - displayRoutes (extendRoutesToHome, so user routes visually start at home)
 *   - mapCenter ([lat, lng] from home or DEFAULT_MAP_CONFIG fallback)
 *
 * Lets CompaniesPageInner stay under the 150-line budget.
 */

import { useMemo } from 'react';
import { useCompanyMarkers } from '@/hooks/useCompanyMarkers';
import { extendRoutesToHome } from '@/lib/map/route-geometry';
import { DEFAULT_MAP_CONFIG } from '@/utils/map-utils';
import type { MapMarker } from '@/components/map/MapContainer';
import type { BicycleRoute } from '@/types/route';
import type { HomeLocation, UnifiedCompany } from '@/types/company';

export interface UseCompaniesMapDataReturn {
  markers: MapMarker[];
  displayRoutes: BicycleRoute[];
  mapCenter: [number, number];
  mapZoom: number;
}

export function useCompaniesMapData(
  companies: UnifiedCompany[],
  activeRouteCompanyIds: Set<string>,
  routes: BicycleRoute[],
  homeLocation: HomeLocation | null
): UseCompaniesMapDataReturn {
  // Stable opts — fresh opts → fresh markers → CompanyMap fly-loop.
  const markerOpts = useMemo(
    () => ({ activeRouteIds: activeRouteCompanyIds }),
    [activeRouteCompanyIds]
  );
  const markers = useCompanyMarkers(companies, markerOpts);

  const displayRoutes = useMemo(
    () => extendRoutesToHome(routes, homeLocation),
    [routes, homeLocation]
  );

  const mapCenter = useMemo<[number, number]>(
    () =>
      homeLocation
        ? [homeLocation.latitude, homeLocation.longitude]
        : [DEFAULT_MAP_CONFIG.center[0], DEFAULT_MAP_CONFIG.center[1]],
    [homeLocation]
  );

  return {
    markers,
    displayRoutes,
    mapCenter,
    mapZoom: DEFAULT_MAP_CONFIG.zoom,
  };
}
