export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6_371_000; // Earth mean radius, meters
const toRad = (d: number) => (d * Math.PI) / 180;

/**
 * Great-circle distance between two points on a sphere, in meters.
 *
 * Accurate to ~0.5% (spherical Earth model). Good enough for "is this
 * company within 500m of that one?" — not for surveying.
 */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
