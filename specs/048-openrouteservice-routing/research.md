# Research: OpenRouteService API Integration

**Feature**: 048-openrouteservice-routing
**Date**: 2025-12-21

## Problem Statement

OSRM's bicycle routing profile (`routing.openstreetmap.de/routed-bike`) excludes residential roads like Whitewater Drive from its routing graph, causing:

- 24km detours instead of 1km direct routes
- Routes that cross highways twice unnecessarily
- Snap distances of 462m instead of 10m

**Evidence**:

- OSRM `nearest` endpoint finds Whitewater Drive (10m snap)
- OSRM `route` endpoint can't use Whitewater Drive (routes around it)
- OSRM car router uses Whitewater Drive directly

## Solution: OpenRouteService

### Decision: Use OpenRouteService with `cycling-road` profile

**Rationale**:

- ORS `cycling-road` profile includes all rideable roads while preferring paved surfaces
- No aggressive exclusion of residential roads like OSRM's bike profile
- Multiple bike profiles available for future enhancement
- Free tier sufficient for development (2000 req/day)

**Alternatives Rejected**:

| Alternative                        | Why Rejected                                  |
| ---------------------------------- | --------------------------------------------- |
| Use OSRM car profile               | Works but doesn't prefer bike-friendly routes |
| Add profile toggle UI              | Scope creep - can add later as enhancement    |
| Self-host OSRM with custom profile | Infrastructure overhead, maintenance burden   |
| Use GraphHopper                    | Similar to ORS but ORS has better free tier   |

## OpenRouteService API Details

### Endpoint

```
POST https://api.openrouteservice.org/v2/directions/{profile}/geojson
```

### Profiles Available

- `cycling-regular` - General purpose cycling
- `cycling-road` - Road bikes, prefers paved roads (SELECTED)
- `cycling-mountain` - Mountain bikes, allows trails
- `cycling-electric` - E-bikes, higher speed assumptions

### Request Format

```json
{
  "coordinates": [
    [longitude, latitude],  // Note: lon/lat order (GeoJSON standard)
    [longitude, latitude],
    ...
  ]
}
```

### Response Format

```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[lon, lat], ...]
    },
    "properties": {
      "segments": [{
        "distance": 1234.5,  // meters
        "duration": 300.0    // seconds
      }],
      "summary": {
        "distance": 1234.5,
        "duration": 300.0
      }
    }
  }]
}
```

### Authentication

```
Authorization: {API_KEY}
```

API key is JWT-encoded token from ORS dashboard.

### Rate Limits (Free Tier)

- 2000 requests/day
- Max 50 waypoints per request
- Max 6000km route distance
- Fair use policy

### Error Responses

| Status | Meaning             | Action                         |
| ------ | ------------------- | ------------------------------ |
| 401    | Invalid API key     | Fall back to OSRM              |
| 403    | Forbidden           | Fall back to OSRM              |
| 429    | Rate limited        | Exponential backoff, then OSRM |
| 500    | Server error        | Fall back to OSRM              |
| 503    | Service unavailable | Fall back to OSRM              |

## Implementation Notes

### Coordinate Order

- ORS uses GeoJSON standard: `[longitude, latitude]`
- Leaflet/our app uses: `[latitude, longitude]`
- Must convert when calling ORS API

### Distance/Duration Calculation

- ORS provides total `summary.distance` and `summary.duration`
- Also provides per-segment breakdown in `segments[]`
- Use summary for single-leg routes

### Geometry Extension

- Keep existing waypoint extension logic from OSRM service
- Apply after receiving ORS geometry if needed
- Threshold: 50m (matches existing OSRM service)

## Testing Validation

### Success Criteria

Route to Bradley/Polk Walk-in Clinic (119 Whitewater Dr):

- Should use Whitewater Drive directly
- Distance should be ~1km (not 24km)
- Snap distance should be <50m

### Test Cases

1. Direct route with ORS key → Uses ORS, returns direct route
2. No ORS key → Falls back to OSRM
3. Invalid ORS key → Falls back to OSRM
4. ORS rate limited → Retries, then falls back
5. Both fail → Returns null gracefully
