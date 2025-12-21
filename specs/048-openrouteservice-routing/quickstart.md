# Quickstart: OpenRouteService Routing

**Feature**: 048-openrouteservice-routing
**Date**: 2025-12-21

## Setup

### 1. Get an API Key

1. Register at https://openrouteservice.org/dev/#/signup
2. Create a free account
3. Copy your API key from the dashboard

### 2. Configure Environment

Add to your `.env` file:

```env
NEXT_PUBLIC_ORS_API_KEY=your_api_key_here
```

**Note**: The app works without an API key - it will use OSRM as fallback.

### 3. Restart Docker

```bash
docker compose down && docker compose up
```

## Usage

### Automatic Integration

The routing service is automatically used when generating route geometry:

```typescript
import { useRoutes } from '@/hooks/useRoutes';

function RouteComponent({ routeId }: { routeId: string }) {
  const { generateRouteGeometry } = useRoutes();

  const handleRegenerateRoute = async () => {
    await generateRouteGeometry(routeId);
    // Route now uses ORS cycling-road profile
    // Falls back to OSRM if ORS fails
  };
}
```

### Direct API Access

For advanced use cases:

```typescript
import { getBicycleRoute } from '@/lib/routing/routing-service';

const waypoints: [number, number][] = [
  [35.0456, -85.3097], // Start [lat, lng]
  [35.0512, -85.3042], // Waypoint
  [35.0478, -85.2998], // End
];

const result = await getBicycleRoute(waypoints);

if (result) {
  console.log(`Distance: ${result.distanceMiles.toFixed(1)} miles`);
  console.log(`Duration: ${result.durationMinutes} minutes`);
  console.log(`Service used: ${result.service}`); // 'ors' or 'osrm'
}
```

## Verification

### Check Which Service is Active

Look for log messages:

```
[routing] Using OpenRouteService (cycling-road profile)
[routing] Bicycle route calculated: 1.2 miles, 8 minutes
```

Or if falling back:

```
[routing] ORS unavailable, falling back to OSRM
[routing] Bicycle route calculated via OSRM: 1.3 miles, 9 minutes
```

### Test Route Quality

1. Create a route to Bradley/Polk Walk-in Clinic (119 Whitewater Dr)
2. With ORS: Route should be ~1km via Whitewater Drive
3. With OSRM only: Route may be 24km+ via back roads

## Troubleshooting

### Routes Still Taking Detours

1. Check if ORS key is set: Look for "Using OpenRouteService" in logs
2. Check if key is valid: Look for "401 Unauthorized" errors
3. Regenerate route: Click the route regenerate button

### API Key Not Working

1. Verify key format is correct (JWT-encoded base64 string)
2. Check ORS dashboard for remaining quota
3. Ensure key has "directions" API enabled

### Rate Limiting

Free tier: 2000 requests/day. If exceeded:

1. Wait until daily reset
2. Upgrade to paid tier
3. App will fall back to OSRM automatically

## API Limits

| Limit              | Value      |
| ------------------ | ---------- |
| Requests per day   | 2000       |
| Max waypoints      | 50         |
| Max route distance | 6000 km    |
| Request timeout    | 10 seconds |
