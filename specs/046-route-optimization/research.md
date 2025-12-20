# Research: Route Optimization

**Feature**: 046-route-optimization
**Date**: 2025-12-19

## TSP Library Selection

### Requirements

- Browser-compatible (no Node.js-only APIs)
- Lightweight (<20KB)
- Handles 50+ nodes efficiently
- No external service dependencies
- Produces near-optimal results

### Options Evaluated

#### 1. @peerless/tsp ✅ SELECTED

- **Size**: ~5KB gzipped
- **Algorithm**: 2-opt + nearest neighbor hybrid
- **Performance**: <1s for 50 nodes
- **Dependencies**: None
- **Browser Support**: Full
- **API**:

```typescript
import { solve } from '@peerless/tsp';
const route = solve(distanceMatrix);
```

#### 2. tsp-solver

- **Size**: ~3KB
- **Algorithm**: Nearest neighbor + 2-opt
- **Performance**: Fast but less optimal
- **Rejected**: Less optimal results for similar size

#### 3. mlrose (Python)

- **Rejected**: Python only, requires server

#### 4. OR-Tools (Google)

- **Rejected**: No JavaScript/browser support

#### 5. Custom Implementation

- **Rejected**: More development time, likely less optimized

### Decision

Use `@peerless/tsp` - best balance of size, performance, and solution quality.

## Distance Calculation

### Haversine Formula

Existing implementation in `src/utils/map-utils.ts`:

```typescript
export function calculateDistance(
  point1: LatLngTuple,
  point2: LatLngTuple
): number;
```

Returns distance in meters. Sufficient for TSP optimization.

### OSRM Integration

Existing service in `src/lib/routing/osrm-service.ts`:

- Free bicycle routing
- No API key required
- Returns actual bike path geometry
- Use AFTER TSP optimization for accurate distances

### Optimization Strategy

1. Use Haversine for TSP (fast, good enough for ordering)
2. Use OSRM post-optimization for actual bike paths
3. Display OSRM distances/times to user

## Performance Considerations

### Benchmarks (estimated)

| Companies | TSP Time | OSRM Time | Total  |
| --------- | -------- | --------- | ------ |
| 5         | <50ms    | ~500ms    | ~600ms |
| 10        | <100ms   | ~800ms    | ~1s    |
| 20        | <200ms   | ~1.5s     | ~2s    |
| 50        | <500ms   | ~3s       | ~4s    |

### Optimization Techniques

- Memoize distance matrix
- Skip OSRM if network unavailable
- Show Haversine estimate immediately, update with OSRM
- Use loading states for UX

## Browser Compatibility

### Required APIs

- `Array.prototype.map/filter/reduce` - ES5+
- `Promise` - ES6+ or polyfill
- No Web Workers required (optional for >30 companies)

### Tested Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## References

- [TSP Wikipedia](https://en.wikipedia.org/wiki/Travelling_salesman_problem)
- [2-opt Algorithm](https://en.wikipedia.org/wiki/2-opt)
- [OSRM API](http://project-osrm.org/docs/v5.24.0/api/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
