import { describe, it, expect } from 'vitest';
import { computeBoundingBox, type NearbyLocation } from './nearby-locations';

describe('computeBoundingBox', () => {
  it('produces a box per point, unioned', () => {
    const box = computeBoundingBox(
      [
        { latitude: 51.5, longitude: -0.1 },
        { latitude: 51.6, longitude: 0.0 },
      ],
      5
    );
    // 5km ≈ 0.045° lat; the two points' boxes should union to cover both
    expect(box).not.toBeNull();
    expect(box!.minLat).toBeCloseTo(51.5 - 5 / 111, 3);
    expect(box!.maxLat).toBeCloseTo(51.6 + 5 / 111, 3);
    // lng delta depends on latitude — widest at the lower lat (51.5)
    // cos(51.5°) ≈ 0.6225, so 5km ≈ 0.0723° lng at that latitude
    expect(box!.minLng).toBeLessThan(-0.1);
    expect(box!.maxLng).toBeGreaterThan(0.0);
  });

  it('returns null for empty input', () => {
    expect(computeBoundingBox([], 5)).toBeNull();
  });

  it('returns null when every point lacks coordinates', () => {
    expect(
      computeBoundingBox([{ latitude: null, longitude: null }], 5)
    ).toBeNull();
  });

  it('filters null-coord points but keeps valid ones', () => {
    const box = computeBoundingBox(
      [
        { latitude: null, longitude: null },
        { latitude: 51.5, longitude: -0.1 },
      ],
      5
    );
    expect(box).not.toBeNull();
    expect(box!.minLat).toBeCloseTo(51.5 - 5 / 111, 3);
  });

  it('clamps the lng correction near the poles', () => {
    // cos(89.9°) ≈ 0.00175 — unclamped dLng would be ~25.7° for 5km,
    // which is silly but mathematically fine. The clamp at 0.01 caps
    // dLng at 5/(111*0.01) ≈ 4.5°. We don't really care about polar
    // company locations but divide-by-near-zero is a smell.
    const box = computeBoundingBox([{ latitude: 89.9, longitude: 0 }], 5);
    expect(box).not.toBeNull();
    const dLng = box!.maxLng - box!.minLng;
    expect(dLng).toBeLessThan(10); // clamped, not 50+
  });
});
