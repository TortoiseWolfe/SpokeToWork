/**
 * Geocoding Service - Feature 011
 *
 * Client-side geocoding using Nominatim (OpenStreetMap) API.
 * Includes rate limiting (1 req/sec), caching, and distance calculation.
 *
 * @see specs/011-company-management/contracts/geocoding.md
 */

import type { GeocodeResult, GeocodeCache } from '@/types/company';

// Constants
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT =
  'SpokeToWork/1.0 (https://tortoisewolfe.github.io/SpokeToWork)';
const MIN_INTERVAL_MS = 1000; // 1 request per second
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_MAX_ENTRIES = 1000;

/**
 * Queue-based rate limiter for Nominatim API compliance
 */
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequest = 0;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const elapsed = Date.now() - this.lastRequest;
      if (elapsed < MIN_INTERVAL_MS) {
        await this.sleep(MIN_INTERVAL_MS - elapsed);
      }
      const fn = this.queue.shift();
      if (fn) {
        this.lastRequest = Date.now();
        await fn();
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// Singleton rate limiter
const rateLimiter = new RateLimiter();

// In-memory cache (persisted to IndexedDB separately)
const memoryCache = new Map<string, GeocodeCache>();

/**
 * Normalize address for consistent cache keys
 */
export function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: GeocodeCache): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Get cached geocode result
 */
function getFromCache(address: string): GeocodeResult | null {
  const key = normalizeAddress(address);
  const cached = memoryCache.get(key);

  if (cached && isCacheValid(cached)) {
    return { ...cached.result, cached: true };
  }

  return null;
}

/**
 * Add result to cache
 */
function addToCache(address: string, result: GeocodeResult): void {
  const key = normalizeAddress(address);

  // LRU eviction if cache is full
  if (memoryCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }

  memoryCache.set(key, {
    address_key: key,
    result,
    timestamp: Date.now(),
  });
}

/**
 * Clear all cached geocode results
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * Geocode an address using Nominatim API
 *
 * @param address - The address to geocode
 * @returns GeocodeResult with coordinates or error
 */
export async function geocode(address: string): Promise<GeocodeResult> {
  // Check cache first
  const cached = getFromCache(address);
  if (cached) {
    return cached;
  }

  // Queue the request for rate limiting
  return rateLimiter.enqueue(async () => {
    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        addressdetails: '1',
      });

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            address,
            error: 'Rate limit exceeded. Please wait and try again.',
          };
        }
        return {
          success: false,
          address,
          error: `Geocoding failed: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        const result: GeocodeResult = {
          success: false,
          address,
          error: 'No results found for this address',
        };
        // Cache negative results too (but they'll expire)
        addToCache(address, result);
        return result;
      }

      const location = data[0];
      const result: GeocodeResult = {
        success: true,
        address,
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        display_name: location.display_name,
      };

      addToCache(address, result);
      return result;
    } catch (error) {
      return {
        success: false,
        address,
        error:
          error instanceof Error
            ? error.message
            : 'Network error during geocoding',
      };
    }
  });
}

/**
 * Batch geocode multiple addresses with rate limiting
 *
 * @param addresses - Array of addresses to geocode
 * @returns Array of GeocodeResults in same order
 */
export async function geocodeBatch(
  addresses: string[]
): Promise<GeocodeResult[]> {
  const results: GeocodeResult[] = [];

  for (const address of addresses) {
    const result = await geocode(address);
    results.push(result);
  }

  return results;
}

/**
 * Calculate distance between two points using Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in miles
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles

  const toRad = (deg: number): number => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate coordinates against a home location and radius
 *
 * @param lat - Company latitude
 * @param lng - Company longitude
 * @param homeLat - Home latitude
 * @param homeLng - Home longitude
 * @param radiusMiles - Maximum radius in miles
 * @returns Object with distance and whether it's within/extended range
 */
export function validateDistance(
  lat: number,
  lng: number,
  homeLat: number,
  homeLng: number,
  radiusMiles: number
): { distance_miles: number; within_radius: boolean; extended_range: boolean } {
  const distance = haversineDistance(homeLat, homeLng, lat, lng);

  return {
    distance_miles: Math.round(distance * 10) / 10, // Round to 1 decimal
    within_radius: distance <= radiusMiles,
    extended_range: distance > radiusMiles,
  };
}

/**
 * Get current queue length (for debugging/monitoring)
 */
export function getQueueLength(): number {
  return rateLimiter.getQueueLength();
}
