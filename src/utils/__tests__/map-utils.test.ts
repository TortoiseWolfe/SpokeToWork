import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MAP_CONFIG,
  calculateDistance,
  isValidLatitude,
  isValidLongitude,
  isValidLatLng,
  isValidZoom,
  formatCoordinates,
  getGeolocationErrorMessage,
  createMapError,
  MapErrorCode,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
} from '../map-utils';

describe('map-utils', () => {
  describe('DEFAULT_MAP_CONFIG', () => {
    it('should have correct default center (London)', () => {
      expect(DEFAULT_MAP_CONFIG.center).toEqual([51.505, -0.09]);
    });

    it('should have correct zoom settings', () => {
      expect(DEFAULT_MAP_CONFIG.zoom).toBe(13);
      expect(DEFAULT_MAP_CONFIG.minZoom).toBe(1);
      expect(DEFAULT_MAP_CONFIG.maxZoom).toBe(18);
    });

    it('should have accessibility-friendly defaults', () => {
      expect(DEFAULT_MAP_CONFIG.scrollWheelZoom).toBe(false);
      expect(DEFAULT_MAP_CONFIG.keyboardNavigation).toBe(true);
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same points', () => {
      const point: [number, number] = [51.505, -0.09];
      expect(calculateDistance(point, point)).toBeCloseTo(0);
    });

    it('should calculate distance between London and Paris', () => {
      const london: [number, number] = [51.5074, -0.1278];
      const paris: [number, number] = [48.8566, 2.3522];
      const distance = calculateDistance(london, paris);
      // Should be approximately 343 km
      expect(distance).toBeGreaterThan(340000);
      expect(distance).toBeLessThan(350000);
    });

    it('should calculate distance between New York and Los Angeles', () => {
      const nyc: [number, number] = [40.7128, -74.006];
      const la: [number, number] = [34.0522, -118.2437];
      const distance = calculateDistance(nyc, la);
      // Should be approximately 3935 km
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });
  });

  describe('isValidLatitude', () => {
    it('should return true for valid latitudes', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(45)).toBe(true);
      expect(isValidLatitude(-45)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
    });

    it('should return false for invalid latitudes', () => {
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
      expect(isValidLatitude(NaN)).toBe(false);
    });
  });

  describe('isValidLongitude', () => {
    it('should return true for valid longitudes', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(90)).toBe(true);
      expect(isValidLongitude(-90)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
    });

    it('should return false for invalid longitudes', () => {
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
      expect(isValidLongitude(NaN)).toBe(false);
    });
  });

  describe('isValidLatLng', () => {
    it('should return true for valid LatLng tuple', () => {
      expect(isValidLatLng([51.505, -0.09])).toBe(true);
      expect(isValidLatLng([0, 0])).toBe(true);
      expect(isValidLatLng([-90, 180])).toBe(true);
    });

    it('should return false for invalid inputs', () => {
      expect(isValidLatLng(null)).toBe(false);
      expect(isValidLatLng(undefined)).toBe(false);
      expect(isValidLatLng({})).toBe(false);
      expect(isValidLatLng([51.505])).toBe(false);
      expect(isValidLatLng([51.505, -0.09, 100])).toBe(false);
      expect(isValidLatLng([91, 0])).toBe(false);
      expect(isValidLatLng([0, 181])).toBe(false);
    });
  });

  describe('isValidZoom', () => {
    it('should return true for valid zoom levels', () => {
      expect(isValidZoom(1)).toBe(true);
      expect(isValidZoom(10)).toBe(true);
      expect(isValidZoom(18)).toBe(true);
    });

    it('should return false for invalid zoom levels', () => {
      expect(isValidZoom(0)).toBe(false);
      expect(isValidZoom(19)).toBe(false);
      expect(isValidZoom(10.5)).toBe(false);
      expect(isValidZoom(NaN)).toBe(false);
    });

    it('should respect custom min/max', () => {
      expect(isValidZoom(5, 5, 15)).toBe(true);
      expect(isValidZoom(4, 5, 15)).toBe(false);
      expect(isValidZoom(16, 5, 15)).toBe(false);
    });
  });

  describe('formatCoordinates', () => {
    it('should format positive coordinates correctly', () => {
      expect(formatCoordinates(51.5074, 0.1278)).toBe('51.5074°N, 0.1278°E');
    });

    it('should format negative coordinates correctly', () => {
      expect(formatCoordinates(-33.8688, -151.2093)).toBe(
        '33.8688°S, 151.2093°W'
      );
    });

    it('should handle zero coordinates', () => {
      expect(formatCoordinates(0, 0)).toBe('0.0000°N, 0.0000°E');
    });
  });

  describe('getGeolocationErrorMessage', () => {
    it('should return correct message for PERMISSION_DENIED', () => {
      const error = { code: 1 } as GeolocationPositionError;
      Object.defineProperty(error, 'PERMISSION_DENIED', { value: 1 });
      expect(getGeolocationErrorMessage(error)).toContain('denied');
    });

    it('should return correct message for POSITION_UNAVAILABLE', () => {
      const error = { code: 2 } as GeolocationPositionError;
      Object.defineProperty(error, 'POSITION_UNAVAILABLE', { value: 2 });
      expect(getGeolocationErrorMessage(error)).toContain(
        'could not be determined'
      );
    });

    it('should return correct message for TIMEOUT', () => {
      const error = { code: 3 } as GeolocationPositionError;
      Object.defineProperty(error, 'TIMEOUT', { value: 3 });
      expect(getGeolocationErrorMessage(error)).toContain('timed out');
    });

    it('should return default message for unknown errors', () => {
      const error = { code: 99 } as GeolocationPositionError;
      expect(getGeolocationErrorMessage(error)).toContain('unknown error');
    });
  });

  describe('createMapError', () => {
    it('should create error with code and message', () => {
      const error = createMapError(
        MapErrorCode.INVALID_COORDINATES,
        'Invalid coordinates provided'
      );
      expect(error.message).toBe('Invalid coordinates provided');
      expect((error as Error & { code: MapErrorCode }).code).toBe(
        MapErrorCode.INVALID_COORDINATES
      );
    });

    it('should include details when provided', () => {
      const details = { lat: 999, lng: -999 };
      const error = createMapError(
        MapErrorCode.INVALID_COORDINATES,
        'Invalid',
        details
      );
      expect((error as Error & { details: unknown }).details).toEqual(details);
    });
  });

  describe('constants', () => {
    it('should have valid OSM tile URL', () => {
      expect(OSM_TILE_URL).toContain('openstreetmap.org');
    });

    it('should have valid OSM attribution', () => {
      expect(OSM_ATTRIBUTION).toContain('OpenStreetMap');
    });
  });
});
