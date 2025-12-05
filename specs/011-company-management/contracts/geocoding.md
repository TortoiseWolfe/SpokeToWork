# Contract: Geocoding Service

**Module**: `src/lib/companies/geocoding.ts`

## Overview

Client-side geocoding using Nominatim (OpenStreetMap) API with rate limiting and caching.

## External API

### Nominatim API

**Endpoint:** `https://nominatim.openstreetmap.org/search`

**Terms of Use:**

- Max 1 request per second
- Requires `User-Agent` header identifying the application
- Must include OpenStreetMap attribution in UI

**Request:**

```
GET /search?q={address}&format=json&limit=1&addressdetails=1
Headers:
  User-Agent: SpokeToWork/1.0 (https://spoketowork.github.io)
```

**Response:**

```json
[
  {
    "lat": "40.7128",
    "lon": "-74.0060",
    "display_name": "New York, NY, USA",
    "address": {
      "city": "New York",
      "state": "New York",
      "country": "United States"
    }
  }
]
```

## Interface

```typescript
export interface GeocodingService {
  // Main geocoding function
  geocode(address: string): Promise<GeocodeResult>;

  // Batch geocoding with rate limiting
  geocodeBatch(addresses: string[]): Promise<GeocodeResult[]>;

  // Clear cache
  clearCache(): void;
}

export interface GeocodeResult {
  success: boolean;
  address: string;
  latitude?: number;
  longitude?: number;
  display_name?: string;
  error?: string;
  cached?: boolean;
}

export interface GeocodeCache {
  address: string;
  result: GeocodeResult;
  timestamp: number;
}
```

## Implementation Details

### Rate Limiting

```typescript
// Queue-based rate limiter
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequest = 0;
  private readonly minInterval = 1000; // 1 second

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

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const elapsed = Date.now() - this.lastRequest;
      if (elapsed < this.minInterval) {
        await sleep(this.minInterval - elapsed);
      }
      const fn = this.queue.shift();
      if (fn) {
        this.lastRequest = Date.now();
        await fn();
      }
    }

    this.processing = false;
  }
}
```

### Caching

- Cache stored in IndexedDB
- Cache key: normalized address (lowercase, trimmed, single spaces)
- Cache TTL: 7 days
- Cache size limit: 1000 entries (LRU eviction)

### Error Handling

| Error                  | Cause                  | Recovery                              |
| ---------------------- | ---------------------- | ------------------------------------- |
| `RateLimitError`       | Nominatim returned 429 | Retry after delay                     |
| `NetworkError`         | No network connection  | Return cached if available, else fail |
| `NotFoundError`        | No results for address | Prompt manual entry                   |
| `InvalidResponseError` | Malformed API response | Log and fail                          |

### Address Normalization

Before geocoding and cache lookup:

1. Trim whitespace
2. Collapse multiple spaces to single
3. Convert to lowercase for cache key
4. Preserve original for display

### Haversine Distance Calculation

```typescript
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
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

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

## Attribution Requirement

The following attribution must appear in the application footer:

```html
<a
  href="https://www.openstreetmap.org/copyright"
  target="_blank"
  rel="noopener"
>
  Geocoding by OpenStreetMap
</a>
```
