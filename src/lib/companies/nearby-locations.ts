import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A company_locations row joined with its parent shared_company name.
 * One row per physical location — a company can appear more than once
 * if it has multiple locations inside the bounding box. Callers that
 * need one-per-company (the merge list) dedup by shared_company_id.
 */
export interface NearbyLocation {
  id: string;                 // company_locations.id
  shared_company_id: string;
  shared_company_name: string;
  latitude: number;           // non-null — query filters nulls
  longitude: number;
  address: string | null;
  is_headquarters: boolean;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Union of per-point bounding boxes.
 *
 * Lat: 1° ≈ 111 km everywhere.
 * Lng: 1° ≈ 111·cos(lat) km, so the box widens toward the equator.
 *
 * Union over-fetches when pending contributions are far apart — at 5km
 * and a realistic queue this is cheap, and the panel's client-side
 * haversine filter trims to true radius anyway. Revisit if a queue ever
 * spans continents.
 */
export function computeBoundingBox(
  points: Array<{ latitude: number | null; longitude: number | null }>,
  radiusKm: number,
): BoundingBox | null {
  const valid = points.filter(
    (p): p is { latitude: number; longitude: number } =>
      p.latitude != null && p.longitude != null,
  );
  if (valid.length === 0) return null;

  const dLat = radiusKm / 111;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of valid) {
    const cosLat = Math.cos((p.latitude * Math.PI) / 180);
    const dLng = radiusKm / (111 * Math.max(cosLat, 0.01)); // clamp near poles
    minLat = Math.min(minLat, p.latitude - dLat);
    maxLat = Math.max(maxLat, p.latitude + dLat);
    minLng = Math.min(minLng, p.longitude - dLng);
    maxLng = Math.max(maxLng, p.longitude + dLng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Fetch shared-company locations inside the union box around `points`.
 * Filters null lat/lng at the query level so `NearbyLocation.latitude`
 * can be typed non-null.
 *
 * Not unit-tested — it's a thin Supabase wrapper. The box math above
 * is what carries risk and that IS tested.
 */
export async function getNearbyCompanyLocations(
  supabase: SupabaseClient,
  points: Array<{ latitude: number | null; longitude: number | null }>,
  radiusKm: number,
): Promise<NearbyLocation[]> {
  const box = computeBoundingBox(points, radiusKm);
  if (!box) return [];

  const { data, error } = await supabase
    .from('company_locations')
    .select(`
      id,
      shared_company_id,
      latitude,
      longitude,
      address,
      is_headquarters,
      shared_companies(name)
    `)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const joined = row.shared_companies as
      | { name: string }
      | { name: string }[]
      | null;
    const name = Array.isArray(joined) ? joined[0]?.name : joined?.name;
    return {
      id: row.id,
      shared_company_id: row.shared_company_id,
      shared_company_name: name ?? '(unnamed)',
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      address: row.address,
      is_headquarters: row.is_headquarters,
    };
  });
}
