/**
 * lib/map — Pure map-related helpers (marker builders, geometry transforms).
 *
 * The tile-provider-service module is NOT re-exported here: it has Supabase
 * dependencies that would bloat bundles where only marker builders are needed.
 * Import it directly: import { ... } from '@/lib/map/tile-provider-service'
 */

export {
  buildCompanyMarkers,
  buildRouteEndpointMarkers,
  buildUserLocationMarker,
  buildWorkspaceCompanyMarkers,
} from './marker-builders';
export type { HomeCoords } from './marker-builders';

export { extendRoutesToHome } from './route-geometry';
export type { GeometryHomeCoords } from './route-geometry';

/** Default map center: Cleveland GreenWay trail midpoint. */
export const DEFAULT_MAP_CENTER: [number, number] = [35.175, -84.865];
