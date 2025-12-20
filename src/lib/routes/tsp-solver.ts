/**
 * TSP Solver for Route Optimization
 * Feature: 046-route-optimization
 *
 * Implements nearest neighbor + 2-opt improvement algorithm for
 * optimizing company visit order on bicycle routes.
 *
 * Algorithm:
 * 1. Build distance matrix using Haversine formula
 * 2. Nearest Neighbor: Greedy construction from start point
 * 3. 2-opt Improvement: Iteratively swap edges to reduce distance
 */

import {
  type RouteOptimizationInput,
  type RouteOptimizationResult,
  type DistanceMatrix,
  type MatrixPoint,
  OPTIMIZATION_LIMITS,
} from './optimization-types';

// =============================================================================
// HAVERSINE DISTANCE CALCULATION
// =============================================================================

/**
 * Earth's radius in miles
 */
const EARTH_RADIUS_MILES = 3958.8;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate Haversine distance between two points in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

// =============================================================================
// DISTANCE MATRIX
// =============================================================================

/**
 * Build distance matrix from points
 * Returns NxN matrix where distances[i][j] is distance from point i to point j
 */
export function buildDistanceMatrix(points: MatrixPoint[]): DistanceMatrix {
  const n = points.length;
  const distances: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = haversineDistance(
        points[i].lat,
        points[i].lng,
        points[j].lat,
        points[j].lng
      );
      distances[i][j] = dist;
      distances[j][i] = dist; // Symmetric
    }
  }

  return { points, distances };
}

// =============================================================================
// NEAREST NEIGHBOR ALGORITHM
// =============================================================================

/**
 * Find initial tour using nearest neighbor heuristic
 * Starts from start point (index 0), visits all companies, optionally returns to start
 */
function nearestNeighbor(
  matrix: DistanceMatrix,
  isRoundTrip: boolean
): number[] {
  const n = matrix.points.length;
  if (n <= 2) return Array.from({ length: n }, (_, i) => i);

  const visited = new Set<number>();
  const tour: number[] = [];

  // Start from index 0 (start point)
  let current = 0;
  tour.push(current);
  visited.add(current);

  // Visit all other points except the last one (end point) if not round trip
  const endIndex = isRoundTrip ? n : n - 1;

  while (tour.length < endIndex) {
    let nearest = -1;
    let nearestDist = Infinity;

    for (let i = 1; i < n; i++) {
      // Skip index 0 (start) and last index if not round trip (end)
      if (visited.has(i)) continue;
      if (!isRoundTrip && i === n - 1) continue; // Skip end point during tour

      const dist = matrix.distances[current][i];
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }

    if (nearest === -1) break;

    tour.push(nearest);
    visited.add(nearest);
    current = nearest;
  }

  // For round trip, return to start (index 0 already included at start)
  // For one-way, add end point (last index)
  if (!isRoundTrip) {
    tour.push(n - 1);
  }

  return tour;
}

// =============================================================================
// 2-OPT IMPROVEMENT
// =============================================================================

/**
 * Calculate total tour distance
 */
function tourDistance(tour: number[], matrix: DistanceMatrix): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += matrix.distances[tour[i]][tour[i + 1]];
  }
  return total;
}

/**
 * Reverse segment of tour between indices i and j
 */
function reverseSegment(tour: number[], i: number, j: number): number[] {
  const newTour = [...tour];
  while (i < j) {
    [newTour[i], newTour[j]] = [newTour[j], newTour[i]];
    i++;
    j--;
  }
  return newTour;
}

/**
 * Improve tour using 2-opt edge swaps
 * Returns improved tour
 */
function twoOpt(
  tour: number[],
  matrix: DistanceMatrix,
  maxIterations: number = 1000
): number[] {
  let improved = true;
  let iterations = 0;
  let currentTour = [...tour];
  let currentDist = tourDistance(currentTour, matrix);

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Don't swap start point (index 0) or end point (last index)
    for (let i = 1; i < currentTour.length - 2; i++) {
      for (let j = i + 1; j < currentTour.length - 1; j++) {
        const newTour = reverseSegment(currentTour, i, j);
        const newDist = tourDistance(newTour, matrix);

        if (newDist < currentDist - 0.0001) {
          // Small epsilon for floating point
          currentTour = newTour;
          currentDist = newDist;
          improved = true;
        }
      }
    }
  }

  return currentTour;
}

// =============================================================================
// MAIN OPTIMIZATION FUNCTION
// =============================================================================

/**
 * Solve route optimization using nearest neighbor + 2-opt
 */
export function solveRouteOptimization(
  input: RouteOptimizationInput
): RouteOptimizationResult {
  const { startPoint, endPoint, companies, isRoundTrip } = input;

  // Handle edge cases
  if (companies.length === 0) {
    return {
      optimizedOrder: [],
      totalDistanceMiles: 0,
      estimatedTimeMinutes: 0,
      distanceSavingsMiles: 0,
      distanceSavingsPercent: 0,
      originalDistanceMiles: 0,
      distancesFromStart: {},
    };
  }

  if (companies.length === 1) {
    const distToCompany = haversineDistance(
      startPoint.latitude,
      startPoint.longitude,
      companies[0].latitude,
      companies[0].longitude
    );
    const distFromCompany = isRoundTrip
      ? haversineDistance(
          companies[0].latitude,
          companies[0].longitude,
          endPoint.latitude,
          endPoint.longitude
        )
      : 0;
    const totalDist = distToCompany + distFromCompany;

    return {
      optimizedOrder: [companies[0].id],
      totalDistanceMiles: totalDist,
      estimatedTimeMinutes: Math.round(
        (totalDist / OPTIMIZATION_LIMITS.AVG_CYCLING_SPEED_MPH) * 60
      ),
      distanceSavingsMiles: 0,
      distanceSavingsPercent: 0,
      originalDistanceMiles: totalDist,
      distancesFromStart: { [companies[0].id]: distToCompany },
    };
  }

  // Build points array: [start, ...companies, end (if not round trip)]
  const points: MatrixPoint[] = [
    {
      id: 'start',
      lat: startPoint.latitude,
      lng: startPoint.longitude,
      isStart: true,
    },
    ...companies.map((c) => ({
      id: c.id,
      lat: c.latitude,
      lng: c.longitude,
    })),
  ];

  // For one-way routes, add end point separately
  if (!isRoundTrip) {
    points.push({
      id: 'end',
      lat: endPoint.latitude,
      lng: endPoint.longitude,
      isEnd: true,
    });
  }

  // Build distance matrix
  const matrix = buildDistanceMatrix(points);

  // Calculate original distance (companies in input order)
  const originalOrder = [0, ...companies.map((_, i) => i + 1)];
  if (!isRoundTrip) {
    originalOrder.push(points.length - 1);
  } else {
    originalOrder.push(0); // Return to start
  }
  const originalDistance = tourDistance(originalOrder, matrix);

  // Solve TSP
  const initialTour = nearestNeighbor(matrix, isRoundTrip);
  const optimizedTour = twoOpt(initialTour, matrix);

  // For round trip, add return to start
  const finalTour = isRoundTrip ? [...optimizedTour, 0] : optimizedTour;
  const optimizedDistance = tourDistance(finalTour, matrix);

  // Extract company order (skip start and end points)
  const optimizedOrder: string[] = [];
  for (const idx of finalTour) {
    const point = points[idx];
    if (!point.isStart && !point.isEnd) {
      optimizedOrder.push(point.id);
    }
  }

  // Calculate distances from start for each company
  const distancesFromStart: Record<string, number> = {};
  let cumulativeDistance = 0;

  for (let i = 1; i < finalTour.length; i++) {
    const prevIdx = finalTour[i - 1];
    const currIdx = finalTour[i];
    cumulativeDistance += matrix.distances[prevIdx][currIdx];

    const point = points[currIdx];
    if (!point.isStart && !point.isEnd) {
      distancesFromStart[point.id] = cumulativeDistance;
    }
  }

  // Calculate savings
  const distanceSavings = originalDistance - optimizedDistance;
  const savingsPercent =
    originalDistance > 0 ? (distanceSavings / originalDistance) * 100 : 0;

  return {
    optimizedOrder,
    totalDistanceMiles: optimizedDistance,
    estimatedTimeMinutes: Math.round(
      (optimizedDistance / OPTIMIZATION_LIMITS.AVG_CYCLING_SPEED_MPH) * 60
    ),
    distanceSavingsMiles: distanceSavings,
    distanceSavingsPercent: savingsPercent,
    originalDistanceMiles: originalDistance,
    distancesFromStart,
  };
}

// =============================================================================
// ROUTE STATS CALCULATION
// =============================================================================

/**
 * Calculate route statistics for a given order
 */
export function calculateRouteStats(
  order: string[],
  companies: { id: string; latitude: number; longitude: number }[],
  startPoint: { latitude: number; longitude: number },
  endPoint: { latitude: number; longitude: number },
  isRoundTrip: boolean
): { distanceMiles: number; timeMinutes: number } {
  if (order.length === 0) {
    return { distanceMiles: 0, timeMinutes: 0 };
  }

  // Create map for quick lookup
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  let totalDistance = 0;
  let prevLat = startPoint.latitude;
  let prevLng = startPoint.longitude;

  // Distance through all companies in order
  for (const id of order) {
    const company = companyMap.get(id);
    if (!company) continue;

    totalDistance += haversineDistance(
      prevLat,
      prevLng,
      company.latitude,
      company.longitude
    );
    prevLat = company.latitude;
    prevLng = company.longitude;
  }

  // Add distance to end point (or back to start for round trip)
  if (isRoundTrip) {
    totalDistance += haversineDistance(
      prevLat,
      prevLng,
      startPoint.latitude,
      startPoint.longitude
    );
  } else {
    totalDistance += haversineDistance(
      prevLat,
      prevLng,
      endPoint.latitude,
      endPoint.longitude
    );
  }

  return {
    distanceMiles: totalDistance,
    timeMinutes: Math.round(
      (totalDistance / OPTIMIZATION_LIMITS.AVG_CYCLING_SPEED_MPH) * 60
    ),
  };
}
