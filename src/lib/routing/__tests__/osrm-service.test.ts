/**
 * Unit Tests for osrm-service.ts
 * Feature 052 - Test Coverage Expansion
 *
 * Tests OSRM bicycle routing API integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBicycleRoute } from '../osrm-service';

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

describe('osrm-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getBicycleRoute()', () => {
    const mockOSRMResponse = {
      code: 'Ok',
      routes: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [
              [-85.255, 35.044],
              [-85.256, 35.045],
              [-85.257, 35.046],
            ],
          },
          distance: 1609, // ~1 mile in meters
          duration: 360, // 6 minutes
          legs: [
            {
              distance: 1609,
              duration: 360,
              summary: 'Main St',
              steps: [],
            },
          ],
        },
      ],
      waypoints: [
        { name: 'Start', location: [-85.255, 35.044], distance: 0 },
        { name: 'End', location: [-85.257, 35.046], distance: 0 },
      ],
    };

    it('should return route result for valid waypoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOSRMResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
      expect(result?.distanceMeters).toBe(1609);
      expect(result?.durationSeconds).toBe(360);
    });

    it('should return null for less than 2 waypoints', async () => {
      const result = await getBicycleRoute([[35.044, -85.255]]);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null for empty waypoints', async () => {
      const result = await getBicycleRoute([]);

      expect(result).toBeNull();
    });

    it('should return null for invalid coordinates', async () => {
      const waypoints: [number, number][] = [
        [91, -85.255], // Invalid latitude > 90
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null when OSRM returns error code', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 'NoRoute', routes: [] }),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).toBeNull();
    });

    it('should return null when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).toBeNull();
    });

    it('should return null when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).toBeNull();
    });

    it('should convert distance to miles correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOSRMResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      // 1609 meters ≈ 1 mile
      expect(result?.distanceMiles).toBeCloseTo(1, 1);
    });

    it('should convert duration to minutes correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOSRMResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      // 360 seconds = 6 minutes
      expect(result?.durationMinutes).toBe(6);
    });

    it('should handle multiple waypoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOSRMResponse),
      });

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.045, -85.256],
        [35.046, -85.257],
      ];

      await getBicycleRoute(waypoints);

      // Check that all waypoints are included in the URL
      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain('-85.255,35.044');
      expect(fetchUrl).toContain('-85.256,35.045');
      expect(fetchUrl).toContain('-85.257,35.046');
    });
  });
});
