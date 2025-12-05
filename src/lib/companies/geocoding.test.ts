/**
 * Geocoding Service Tests - Feature 011
 *
 * @see specs/011-company-management/contracts/geocoding.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  geocode,
  geocodeBatch,
  haversineDistance,
  validateDistance,
  normalizeAddress,
  clearCache,
  getQueueLength,
} from './geocoding';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Geocoding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeAddress', () => {
    it('should trim whitespace', () => {
      expect(normalizeAddress('  123 Main St  ')).toBe('123 main st');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeAddress('123  Main   St')).toBe('123 main st');
    });

    it('should convert to lowercase', () => {
      expect(normalizeAddress('123 MAIN ST')).toBe('123 main st');
    });
  });

  describe('geocode', () => {
    it('should return coordinates for valid address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            lat: '40.7128',
            lon: '-74.006',
            display_name: 'New York, NY, USA',
          },
        ],
      });

      const result = await geocode('New York, NY');

      expect(result.success).toBe(true);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.006);
      expect(result.display_name).toBe('New York, NY, USA');
    });

    it('should return cached result on second call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            lat: '40.7128',
            lon: '-74.006',
            display_name: 'New York, NY, USA',
          },
        ],
      });

      // First call
      await geocode('New York, NY');
      // Second call should use cache
      const result = await geocode('New York, NY');

      expect(result.cached).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return error for no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await geocode('xyz123nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No results found for this address');
    });

    it('should handle rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = await geocode('Test Address');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await geocode('Test Address');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });

    it('should include User-Agent header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: '40', lon: '-74', display_name: 'Test' }],
      });

      await geocode('Test Address');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('SpokeToWork'),
          }),
        })
      );
    });
  });

  describe('geocodeBatch', () => {
    it('should geocode multiple addresses in order', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: '40', lon: '-74', display_name: 'NYC' }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: '34', lon: '-118', display_name: 'LA' }],
        });

      const results = await geocodeBatch(['New York', 'Los Angeles']);

      expect(results).toHaveLength(2);
      expect(results[0].latitude).toBe(40);
      expect(results[1].latitude).toBe(34);
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between two points', () => {
      // New York to Los Angeles is approximately 2,451 miles
      const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);

      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should return 0 for same coordinates', () => {
      const distance = haversineDistance(40.7128, -74.006, 40.7128, -74.006);

      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // ~1 mile apart (roughly)
      const distance = haversineDistance(40.7128, -74.006, 40.7272, -74.006);

      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });
  });

  describe('validateDistance', () => {
    it('should mark within radius when distance is less than threshold', () => {
      const result = validateDistance(40.72, -74.0, 40.71, -74.0, 20);

      expect(result.within_radius).toBe(true);
      expect(result.extended_range).toBe(false);
      expect(result.distance_miles).toBeLessThan(20);
    });

    it('should mark extended range when distance exceeds threshold', () => {
      // NYC to Boston is ~190 miles
      const result = validateDistance(42.3601, -71.0589, 40.7128, -74.006, 20);

      expect(result.within_radius).toBe(false);
      expect(result.extended_range).toBe(true);
      expect(result.distance_miles).toBeGreaterThan(20);
    });

    it('should round distance to 1 decimal place', () => {
      const result = validateDistance(40.72, -74.0, 40.71, -74.0, 20);

      const decimalPlaces = (
        result.distance_miles.toString().split('.')[1] || ''
      ).length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('getQueueLength', () => {
    it('should return 0 when queue is empty', () => {
      expect(getQueueLength()).toBe(0);
    });
  });
});
