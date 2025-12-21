/**
 * Unit Tests for routing-service.ts
 * Feature 048 - OpenRouteService Bicycle Routing
 *
 * Tests unified routing service with ORS primary and OSRM fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBicycleRoute } from '../routing-service';

// Mock the ORS and OSRM modules
vi.mock('../openrouteservice', () => ({
  getORSBicycleRoute: vi.fn(),
  isORSAvailable: vi.fn(),
}));

vi.mock('../osrm-service', () => ({
  getBicycleRoute: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  getORSBicycleRoute as mockGetORSRoute,
  isORSAvailable as mockIsORSAvailable,
} from '../openrouteservice';
import { getBicycleRoute as mockGetOSRMRoute } from '../osrm-service';

describe('routing-service', () => {
  const mockORSResult = {
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [-85.255, 35.044],
        [-85.257, 35.046],
      ] as [number, number][],
    },
    distanceMeters: 1019,
    distanceMiles: 0.63,
    durationSeconds: 163,
    durationMinutes: 3,
  };

  const mockOSRMResult = {
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [-85.255, 35.044],
        [-85.257, 35.046],
      ] as [number, number][],
    },
    distanceMeters: 24000,
    distanceMiles: 14.9,
    durationSeconds: 3600,
    durationMinutes: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getBicycleRoute()', () => {
    it('should use ORS when available and return ORS result', async () => {
      vi.mocked(mockIsORSAvailable).mockReturnValue(true);
      vi.mocked(mockGetORSRoute).mockResolvedValue(mockORSResult);

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).not.toBeNull();
      expect(result?.service).toBe('ors');
      expect(result?.distanceMeters).toBe(1019);
      expect(mockGetORSRoute).toHaveBeenCalled();
      expect(mockGetOSRMRoute).not.toHaveBeenCalled();
    });

    it('should fall back to OSRM when ORS fails', async () => {
      vi.mocked(mockIsORSAvailable).mockReturnValue(true);
      vi.mocked(mockGetORSRoute).mockResolvedValue(null);
      vi.mocked(mockGetOSRMRoute).mockResolvedValue(mockOSRMResult);

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).not.toBeNull();
      expect(result?.service).toBe('osrm');
      expect(result?.distanceMeters).toBe(24000);
      expect(mockGetORSRoute).toHaveBeenCalled();
      expect(mockGetOSRMRoute).toHaveBeenCalled();
    });

    it('should use OSRM directly when ORS is not available', async () => {
      vi.mocked(mockIsORSAvailable).mockReturnValue(false);
      vi.mocked(mockGetOSRMRoute).mockResolvedValue(mockOSRMResult);

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).not.toBeNull();
      expect(result?.service).toBe('osrm');
      expect(mockGetORSRoute).not.toHaveBeenCalled();
      expect(mockGetOSRMRoute).toHaveBeenCalled();
    });

    it('should return null when both ORS and OSRM fail', async () => {
      vi.mocked(mockIsORSAvailable).mockReturnValue(true);
      vi.mocked(mockGetORSRoute).mockResolvedValue(null);
      vi.mocked(mockGetOSRMRoute).mockResolvedValue(null);

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints);

      expect(result).toBeNull();
    });

    it('should skip ORS when preferORS is false', async () => {
      vi.mocked(mockIsORSAvailable).mockReturnValue(true);
      vi.mocked(mockGetOSRMRoute).mockResolvedValue(mockOSRMResult);

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      const result = await getBicycleRoute(waypoints, { preferORS: false });

      expect(result).not.toBeNull();
      expect(result?.service).toBe('osrm');
      expect(mockGetORSRoute).not.toHaveBeenCalled();
      expect(mockGetOSRMRoute).toHaveBeenCalled();
    });

    it('should pass profile option to ORS', async () => {
      vi.mocked(mockIsORSAvailable).mockReturnValue(true);
      vi.mocked(mockGetORSRoute).mockResolvedValue(mockORSResult);

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      await getBicycleRoute(waypoints, { profile: 'cycling-mountain' });

      expect(mockGetORSRoute).toHaveBeenCalledWith(
        waypoints,
        'cycling-mountain'
      );
    });

    it('should use cycling-road profile by default', async () => {
      vi.mocked(mockIsORSAvailable).mockReturnValue(true);
      vi.mocked(mockGetORSRoute).mockResolvedValue(mockORSResult);

      const waypoints: [number, number][] = [
        [35.044, -85.255],
        [35.046, -85.257],
      ];

      await getBicycleRoute(waypoints);

      expect(mockGetORSRoute).toHaveBeenCalledWith(waypoints, 'cycling-road');
    });
  });
});
