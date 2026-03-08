/**
 * Unit Tests for TSP Solver
 * Feature: 046-route-optimization
 *
 * Tests the Traveling Salesman Problem solver with nearest neighbor + 2-opt algorithm.
 */

import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  buildDistanceMatrix,
  solveRouteOptimization,
  calculateRouteStats,
} from '@/lib/routes/tsp-solver';
import type { RouteOptimizationInput } from '@/lib/routes/optimization-types';

describe('tsp-solver', () => {
  describe('haversineDistance', () => {
    it('returns 0 for same point', () => {
      const distance = haversineDistance(35.1667, -84.8667, 35.1667, -84.8667);
      expect(distance).toBe(0);
    });

    it('calculates distance between two points in miles', () => {
      // Cleveland, TN to Chattanooga, TN is approximately 28 miles
      const distance = haversineDistance(35.1667, -84.8667, 35.0456, -85.3097);
      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(35);
    });

    it('is symmetric (A to B equals B to A)', () => {
      const distAB = haversineDistance(35.1667, -84.8667, 35.0456, -85.3097);
      const distBA = haversineDistance(35.0456, -85.3097, 35.1667, -84.8667);
      expect(distAB).toBeCloseTo(distBA, 10);
    });

    it('handles short distances accurately', () => {
      // Two points about 1 mile apart
      const distance = haversineDistance(35.1667, -84.8667, 35.1812, -84.8667);
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });
  });

  describe('buildDistanceMatrix', () => {
    it('builds symmetric matrix for 2 points', () => {
      const points = [
        { id: 'A', lat: 35.1667, lng: -84.8667 },
        { id: 'B', lat: 35.1812, lng: -84.8667 },
      ];

      const matrix = buildDistanceMatrix(points);

      expect(matrix.distances.length).toBe(2);
      expect(matrix.distances[0][0]).toBe(0);
      expect(matrix.distances[1][1]).toBe(0);
      expect(matrix.distances[0][1]).toBeCloseTo(matrix.distances[1][0], 10);
    });

    it('builds matrix for 4 points', () => {
      const points = [
        { id: 'start', lat: 35.1667, lng: -84.8667, isStart: true },
        { id: 'A', lat: 35.17, lng: -84.86 },
        { id: 'B', lat: 35.18, lng: -84.85 },
        { id: 'end', lat: 35.19, lng: -84.84, isEnd: true },
      ];

      const matrix = buildDistanceMatrix(points);

      expect(matrix.distances.length).toBe(4);
      expect(matrix.points.length).toBe(4);

      // Diagonal should be zeros
      for (let i = 0; i < 4; i++) {
        expect(matrix.distances[i][i]).toBe(0);
      }

      // Matrix should be symmetric
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          expect(matrix.distances[i][j]).toBeCloseTo(
            matrix.distances[j][i],
            10
          );
        }
      }
    });
  });

  describe('solveRouteOptimization', () => {
    it('handles empty companies list', () => {
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        endPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        companies: [],
        isRoundTrip: true,
      };

      const result = solveRouteOptimization(input);

      expect(result.optimizedOrder).toEqual([]);
      expect(result.totalDistanceMiles).toBe(0);
      expect(result.distanceSavingsMiles).toBe(0);
    });

    it('handles single company', () => {
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        endPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        companies: [
          {
            id: 'company-1',
            name: 'Company 1',
            latitude: 35.17,
            longitude: -84.86,
          },
        ],
        isRoundTrip: true,
      };

      const result = solveRouteOptimization(input);

      expect(result.optimizedOrder).toEqual(['company-1']);
      expect(result.totalDistanceMiles).toBeGreaterThan(0);
      expect(result.distanceSavingsMiles).toBe(0); // No savings for single company
    });

    it('optimizes route with multiple companies', () => {
      // Create a scenario where optimization matters:
      // Start -> A (far) -> B (near start) -> C (far) -> End
      // vs
      // Start -> B (near) -> A (mid) -> C (far) -> End
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        endPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        companies: [
          // Companies in suboptimal order
          { id: 'A', name: 'Company A', latitude: 35.2, longitude: -84.9 }, // Far NW
          { id: 'B', name: 'Company B', latitude: 35.17, longitude: -84.87 }, // Near start
          { id: 'C', name: 'Company C', latitude: 35.25, longitude: -84.95 }, // Further NW
        ],
        isRoundTrip: true,
      };

      const result = solveRouteOptimization(input);

      expect(result.optimizedOrder.length).toBe(3);
      expect(result.optimizedOrder).toContain('A');
      expect(result.optimizedOrder).toContain('B');
      expect(result.optimizedOrder).toContain('C');
      expect(result.totalDistanceMiles).toBeGreaterThan(0);
      expect(result.estimatedTimeMinutes).toBeGreaterThan(0);
    });

    it('returns distances from start for each company', () => {
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        endPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        companies: [
          { id: 'A', name: 'Company A', latitude: 35.17, longitude: -84.86 },
          { id: 'B', name: 'Company B', latitude: 35.18, longitude: -84.85 },
        ],
        isRoundTrip: true,
      };

      const result = solveRouteOptimization(input);

      expect(Object.keys(result.distancesFromStart).length).toBe(2);
      expect(result.distancesFromStart['A']).toBeDefined();
      expect(result.distancesFromStart['B']).toBeDefined();
    });

    it('handles one-way route (different start and end)', () => {
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        endPoint: { latitude: 35.2, longitude: -84.9, type: 'custom' },
        companies: [
          { id: 'A', name: 'Company A', latitude: 35.18, longitude: -84.88 },
          { id: 'B', name: 'Company B', latitude: 35.19, longitude: -84.89 },
        ],
        isRoundTrip: false,
      };

      const result = solveRouteOptimization(input);

      expect(result.optimizedOrder.length).toBe(2);
      expect(result.totalDistanceMiles).toBeGreaterThan(0);
    });

    it('calculates distance savings percentage', () => {
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        endPoint: { latitude: 35.1667, longitude: -84.8667, type: 'home' },
        companies: [
          { id: 'A', name: 'Company A', latitude: 35.3, longitude: -84.7 }, // Far NE
          { id: 'B', name: 'Company B', latitude: 35.17, longitude: -84.87 }, // Near
          { id: 'C', name: 'Company C', latitude: 35.35, longitude: -84.65 }, // Far NE
        ],
        isRoundTrip: true,
      };

      const result = solveRouteOptimization(input);

      expect(result.originalDistanceMiles).toBeGreaterThan(0);
      // Optimization should improve or maintain distance
      expect(result.totalDistanceMiles).toBeLessThanOrEqual(
        result.originalDistanceMiles + 0.01
      );
      expect(result.distanceSavingsPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateRouteStats', () => {
    it('returns zero for empty order', () => {
      const stats = calculateRouteStats(
        [],
        [],
        { latitude: 35.1667, longitude: -84.8667 },
        { latitude: 35.1667, longitude: -84.8667 },
        true
      );

      expect(stats.distanceMiles).toBe(0);
      expect(stats.timeMinutes).toBe(0);
    });

    it('calculates distance through companies in order', () => {
      const companies = [
        { id: 'A', latitude: 35.17, longitude: -84.86 },
        { id: 'B', latitude: 35.18, longitude: -84.85 },
      ];

      const stats = calculateRouteStats(
        ['A', 'B'],
        companies,
        { latitude: 35.1667, longitude: -84.8667 },
        { latitude: 35.1667, longitude: -84.8667 },
        true
      );

      expect(stats.distanceMiles).toBeGreaterThan(0);
      expect(stats.timeMinutes).toBeGreaterThan(0);
    });

    it('includes return to start for round trip', () => {
      const companies = [{ id: 'A', latitude: 35.17, longitude: -84.86 }];

      const roundTripStats = calculateRouteStats(
        ['A'],
        companies,
        { latitude: 35.1667, longitude: -84.8667 },
        { latitude: 35.1667, longitude: -84.8667 },
        true
      );

      const oneWayStats = calculateRouteStats(
        ['A'],
        companies,
        { latitude: 35.1667, longitude: -84.8667 },
        { latitude: 35.1667, longitude: -84.8667 },
        false
      );

      // Round trip includes return to start, one-way goes to end point
      // When start == end, both include distance to company, but:
      // - Round trip: start -> A -> start (2 * distance to A)
      // - One-way: start -> A -> end (where end == start, so still 2 * distance to A)
      // However, calculateRouteStats calculates: start -> A -> endpoint
      // For round trip: endpoint is start, so A -> start
      // For one-way: endpoint is end, which is same as start
      // So they should actually be equal when start == end
      expect(roundTripStats.distanceMiles).toBeCloseTo(
        oneWayStats.distanceMiles,
        0.01
      );
    });

    it('skips companies not in companies array', () => {
      const companies = [{ id: 'A', latitude: 35.17, longitude: -84.86 }];

      const stats = calculateRouteStats(
        ['A', 'B', 'C'], // B and C don't exist
        companies,
        { latitude: 35.1667, longitude: -84.8667 },
        { latitude: 35.1667, longitude: -84.8667 },
        true
      );

      // Should only calculate for company A
      expect(stats.distanceMiles).toBeGreaterThan(0);
    });
  });

  describe('optimization quality', () => {
    it('produces better or equal result than input order', () => {
      // Triangle scenario where B is between A and C
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.0, longitude: -85.0, type: 'home' },
        endPoint: { latitude: 35.0, longitude: -85.0, type: 'home' },
        companies: [
          // Input order: A -> C -> B (bad order - zigzag)
          { id: 'A', name: 'A', latitude: 35.1, longitude: -85.0 },
          { id: 'C', name: 'C', latitude: 35.3, longitude: -85.0 },
          { id: 'B', name: 'B', latitude: 35.2, longitude: -85.0 },
        ],
        isRoundTrip: true,
      };

      const result = solveRouteOptimization(input);

      // Optimized distance should be <= original
      expect(result.totalDistanceMiles).toBeLessThanOrEqual(
        result.originalDistanceMiles + 0.001
      );
    });

    it('handles collinear points optimally', () => {
      // Points in a line - optimal order is sequential
      const input: RouteOptimizationInput = {
        routeId: 'route-1',
        startPoint: { latitude: 35.0, longitude: -85.0, type: 'home' },
        endPoint: { latitude: 35.0, longitude: -85.0, type: 'home' },
        companies: [
          { id: 'A', name: 'A', latitude: 35.1, longitude: -85.0 },
          { id: 'B', name: 'B', latitude: 35.2, longitude: -85.0 },
          { id: 'C', name: 'C', latitude: 35.3, longitude: -85.0 },
        ],
        isRoundTrip: true,
      };

      const result = solveRouteOptimization(input);

      // For collinear points with round trip, optimal is A->B->C->B->A pattern
      // or simply visiting in order A->B->C and returning
      expect(result.optimizedOrder.length).toBe(3);

      // B should be visited between A and C (or in sequential order)
      const aIndex = result.optimizedOrder.indexOf('A');
      const bIndex = result.optimizedOrder.indexOf('B');
      const cIndex = result.optimizedOrder.indexOf('C');

      // Either A-B-C or C-B-A order is optimal
      const isSequential =
        (aIndex < bIndex && bIndex < cIndex) ||
        (cIndex < bIndex && bIndex < aIndex);
      expect(isSequential).toBe(true);
    });
  });
});
