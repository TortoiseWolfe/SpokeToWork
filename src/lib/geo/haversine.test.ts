import { describe, it, expect } from 'vitest';
import { haversineM } from './haversine';

describe('haversineM', () => {
  it('returns 0 for identical points', () => {
    expect(haversineM({ lat: 40, lng: -74 }, { lat: 40, lng: -74 })).toBe(0);
  });

  it('returns ~111km for 1° latitude at the equator', () => {
    // 1° of latitude ≈ 111.19km everywhere (spherical Earth).
    const d = haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('is symmetric', () => {
    const a = { lat: 51.5074, lng: -0.1278 }; // London
    const b = { lat: 48.8566, lng: 2.3522 }; // Paris
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 5);
  });

  it('returns ~343km for London→Paris', () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };
    const d = haversineM(london, paris);
    expect(d).toBeGreaterThan(340_000);
    expect(d).toBeLessThan(346_000);
  });
});
