/**
 * Unit Tests for openrouteservice.ts
 * Feature 048 - OpenRouteService Bicycle Routing
 *
 * Tests ORS bicycle routing API integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getORSBicycleRoute, isORSAvailable } from '../openrouteservice';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('openrouteservice', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env = originalEnv;
  });

  describe('isORSAvailable()', () => {
    it('should return true when API key is set', () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';
      expect(isORSAvailable()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      delete process.env.NEXT_PUBLIC_ORS_API_KEY;
      expect(isORSAvailable()).toBe(false);
    });

    it('should return false when API key is empty', () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = '';
      expect(isORSAvailable()).toBe(false);
    });
  });

  describe('getORSBicycleRoute()', () => {
    const mockORSResponse = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-85.255, 35.044],
              [-85.256, 35.045],
              [-85.257, 35.046],
            ],
          },
          properties: {
            segments: [
              {
                distance: 1019,
                duration: 163,
                steps: [],
              },
            ],
            summary: {
              distance: 1019,
              duration: 163,
            },
            way_points: [0, 2],
          },
        },
      ],
    };

    it('should return null when API key is not set', async () => {
      delete process.env.NEXT_PUBLIC_ORS_API_KEY;

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getORSBicycleRoute(waypoints);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return route result for valid waypoints', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockORSResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getORSBicycleRoute(waypoints);

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
      expect(result?.distanceMeters).toBe(1019);
      expect(result?.durationSeconds).toBe(163);
    });

    it('should return null for less than 2 waypoints', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      const result = await getORSBicycleRoute([[35.044, -85.255]]);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null for more than 50 waypoints', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      // Create 51 waypoints
      const waypoints: [number, number][] = Array.from(
        { length: 51 },
        (_, i) => [35.0 + i * 0.001, -85.0] as [number, number]
      );

      const result = await getORSBicycleRoute(waypoints);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null for invalid coordinates', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      const waypoints: [number, number][] = [
        [91, -85.255], // Invalid latitude > 90
        [35.046, -85.257],
      ];

      const result = await getORSBicycleRoute(waypoints);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should convert coordinates from lat/lng to lng/lat for ORS', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockORSResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255], // [lat, lng]
        [35.046, -85.257],
      ];

      await getORSBicycleRoute(waypoints);

      // Verify the request body contains [lng, lat] order
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.coordinates[0]).toEqual([-85.255, 35.044]);
      expect(requestBody.coordinates[1]).toEqual([-85.257, 35.046]);
    });

    it('should use cycling-road profile by default', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockORSResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      await getORSBicycleRoute(waypoints);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('cycling-road');
    });

    it('should use specified profile', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockORSResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      await getORSBicycleRoute(waypoints, 'cycling-mountain');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('cycling-mountain');
    });

    it('should include API key in Authorization header', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'my-secret-key';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockORSResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      await getORSBicycleRoute(waypoints);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('my-secret-key');
    });

    it('should return null when ORS returns error status', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () =>
          Promise.resolve({
            error: { code: 401, message: 'Invalid API key' },
          }),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getORSBicycleRoute(waypoints);

      expect(result).toBeNull();
    });

    it('should retry on rate limit (429) with backoff', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      // First call returns 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockORSResponse),
        });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getORSBicycleRoute(waypoints);

      expect(result).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should convert distance to miles correctly', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockORSResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getORSBicycleRoute(waypoints);

      // 1019 meters ≈ 0.63 miles
      expect(result?.distanceMiles).toBeCloseTo(0.63, 1);
    });

    it('should convert duration to minutes correctly', async () => {
      process.env.NEXT_PUBLIC_ORS_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockORSResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getORSBicycleRoute(waypoints);

      // 163 seconds ≈ 3 minutes (rounded)
      expect(result?.durationMinutes).toBe(3);
    });
  });
});
