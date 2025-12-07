/**
 * Coordinate Validation Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T128 [INFRA] - Tests for metro area coordinate validation
 * Constitution VIII - Geographic Accuracy: Warn if coordinates >50 miles from metro area
 */

import { describe, it, expect } from 'vitest';
import {
  validateMetroAreaCoordinates,
  METRO_AREA_WARNING_THRESHOLD,
} from '@/lib/companies/geocoding';

// Cleveland, TN metro area center (from tasks.md T025)
const CLEVELAND_TN = {
  lat: 35.1595,
  lng: -84.8707,
  name: 'Cleveland, TN',
};

describe('validateMetroAreaCoordinates (T128)', () => {
  describe('within threshold', () => {
    it('returns valid for coordinates at metro center', () => {
      const result = validateMetroAreaCoordinates(
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(true);
      expect(result.distanceFromCenter).toBe(0);
      expect(result.warning).toBeNull();
    });

    it('returns valid for coordinates 10 miles from center', () => {
      // Chattanooga, TN is about 25 miles from Cleveland - use a closer point
      // Moving ~10 miles north (0.145 degrees latitude ~ 10 miles)
      const result = validateMetroAreaCoordinates(
        CLEVELAND_TN.lat + 0.145,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(true);
      expect(result.distanceFromCenter).toBeCloseTo(10, 0);
      expect(result.warning).toBeNull();
    });

    it('returns valid for coordinates near but within threshold (45 miles)', () => {
      // ~45 miles north (0.65 degrees latitude ~ 45 miles)
      const result = validateMetroAreaCoordinates(
        CLEVELAND_TN.lat + 0.65,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(true);
      expect(result.distanceFromCenter).toBeLessThanOrEqual(50);
      expect(result.warning).toBeNull();
    });
  });

  describe('beyond threshold - triggers warning', () => {
    it('returns warning for coordinates 60 miles from center', () => {
      // ~60 miles north (0.87 degrees latitude ~ 60 miles)
      const result = validateMetroAreaCoordinates(
        CLEVELAND_TN.lat + 0.87,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(false);
      expect(result.distanceFromCenter).toBeCloseTo(60, 0);
      expect(result.warning).toContain('Cleveland, TN');
      expect(result.warning).toContain('50 miles');
    });

    it('returns warning for coordinates 100 miles from center', () => {
      // ~100 miles (1.45 degrees latitude ~ 100 miles)
      const result = validateMetroAreaCoordinates(
        CLEVELAND_TN.lat + 1.45,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(false);
      expect(result.distanceFromCenter).toBeCloseTo(100, 0);
      expect(result.warning).not.toBeNull();
    });

    it('includes distance and metro name in warning message', () => {
      const result = validateMetroAreaCoordinates(
        40.0, // Far away
        -80.0,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(false);
      expect(result.warning).toMatch(
        /Coordinates are \d+\.?\d* miles from Cleveland, TN center/
      );
      expect(result.warning).toContain('threshold: 50 miles');
    });
  });

  describe('custom threshold', () => {
    it('uses custom threshold when provided', () => {
      // 30 miles north (0.435 degrees)
      const result = validateMetroAreaCoordinates(
        CLEVELAND_TN.lat + 0.435,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name,
        20 // 20 mile threshold instead of 50
      );

      expect(result.isValid).toBe(false);
      expect(result.warning).toContain('threshold: 20 miles');
    });

    it('validates against larger threshold', () => {
      // 60 miles north (0.87 degrees)
      const result = validateMetroAreaCoordinates(
        CLEVELAND_TN.lat + 0.87,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name,
        100 // 100 mile threshold
      );

      expect(result.isValid).toBe(true);
      expect(result.warning).toBeNull();
    });
  });

  describe('default threshold constant', () => {
    it('exports METRO_AREA_WARNING_THRESHOLD as 50 miles', () => {
      expect(METRO_AREA_WARNING_THRESHOLD).toBe(50);
    });
  });

  describe('real-world locations', () => {
    it('validates Chattanooga, TN (~25 miles from Cleveland)', () => {
      // Chattanooga, TN coordinates
      const chattanooga = { lat: 35.0456, lng: -85.3097 };

      const result = validateMetroAreaCoordinates(
        chattanooga.lat,
        chattanooga.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(true);
      expect(result.distanceFromCenter).toBeLessThan(30);
    });

    it('warns for Atlanta, GA (~100 miles from Cleveland)', () => {
      // Atlanta, GA coordinates
      const atlanta = { lat: 33.749, lng: -84.388 };

      const result = validateMetroAreaCoordinates(
        atlanta.lat,
        atlanta.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(false);
      expect(result.distanceFromCenter).toBeGreaterThan(90);
      expect(result.warning).not.toBeNull();
    });

    it('warns for Nashville, TN (~130 miles from Cleveland)', () => {
      // Nashville, TN coordinates
      const nashville = { lat: 36.1627, lng: -86.7816 };

      const result = validateMetroAreaCoordinates(
        nashville.lat,
        nashville.lng,
        CLEVELAND_TN.lat,
        CLEVELAND_TN.lng,
        CLEVELAND_TN.name
      );

      expect(result.isValid).toBe(false);
      expect(result.distanceFromCenter).toBeGreaterThan(100);
      expect(result.warning).not.toBeNull();
    });
  });
});
