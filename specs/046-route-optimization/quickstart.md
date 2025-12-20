# Quickstart: Route Optimization

**Feature**: 046-route-optimization
**Date**: 2025-12-19

## Integration Scenarios

### Scenario 1: Optimize Existing Route

**User Journey**: Job hunter has 8 companies on a route and wants to minimize travel distance.

```typescript
// 1. User clicks "Optimize Order" button in RouteCompanyList
const handleOptimize = async () => {
  const result = await optimizeRoute(routeId, {
    previewOnly: true  // Show comparison first
  });

  setComparisonData(result);
  setShowOptimizationModal(true);
};

// 2. Modal shows before/after comparison
<RouteOptimizationModal
  comparison={comparisonData}
  onApply={handleApplyOptimization}
  onCancel={() => setShowOptimizationModal(false)}
/>

// 3. User clicks "Apply" - persist optimization
const handleApplyOptimization = async () => {
  await applyRouteOptimization(routeId, comparisonData.after.order);
  await generateRouteGeometry(routeId); // OSRM path
  setShowOptimizationModal(false);
  refetchRoute();
};
```

### Scenario 2: Create Route with Home Start/End

**User Journey**: Job hunter creates a new route, system auto-populates home as start/end.

```typescript
// RouteBuilder component
const { data: profile } = useUserProfile();

const defaultRouteData = {
  name: '',
  start_type: 'home',
  end_type: 'home',
  start_address: profile?.home_address,
  start_latitude: profile?.home_latitude,
  start_longitude: profile?.home_longitude,
  end_address: profile?.home_address,
  end_latitude: profile?.home_latitude,
  end_longitude: profile?.home_longitude,
  is_round_trip: true
};

// User can override with RouteStartEndEditor
<RouteStartEndEditor
  initialStart={{ type: 'home', ...homeCoords }}
  initialEnd={{ type: 'home', ...homeCoords }}
  onChange={(start, end) => {
    setRouteData(prev => ({
      ...prev,
      start_type: start.type,
      start_latitude: start.latitude,
      ...
    }));
  }}
/>
```

### Scenario 3: Auto-Suggest on Company Add

**User Journey**: Job hunter adds a 4th company, system suggests optimization.

```typescript
// useRouteOptimization hook
const {
  showSuggestion,
  suggestedSavings,
  dismissSuggestion,
  applySuggestion
} = useRouteOptimization(routeId);

// In RouteCompanyList after successful add
useEffect(() => {
  if (companies.length >= 3 && justAdded) {
    checkOptimizationSuggestion();
  }
}, [companies.length]);

// Suggestion banner
{showSuggestion && (
  <div className="alert alert-info">
    <span>Optimize route order? Save {suggestedSavings.toFixed(1)} miles</span>
    <button onClick={applySuggestion}>Apply</button>
    <button onClick={dismissSuggestion}>Dismiss</button>
  </div>
)}
```

### Scenario 4: Toggle Round-Trip Mode

**User Journey**: Job hunter wants a one-way route (no return home).

```typescript
// RouteDetailDrawer
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={route.is_round_trip}
    onChange={(e) => updateRoute({
      is_round_trip: e.target.checked
    })}
    className="toggle"
  />
  <span>Round trip (return to start)</span>
</label>

// Changing this triggers re-optimization prompt
useEffect(() => {
  if (route.last_optimized_at && routeWasOptimized) {
    setShouldReoptimize(true);
  }
}, [route.is_round_trip]);
```

## API Reference

### TSP Solver Service

```typescript
import {
  buildDistanceMatrix,
  solveRouteOptimization,
  calculateRouteStats
} from '@/lib/routes/tsp-solver';

// Build distance matrix from coordinates
const matrix = buildDistanceMatrix([
  { id: 'start', lat: 35.0, lng: -85.0 },
  { id: 'company1', lat: 35.1, lng: -85.1 },
  { id: 'company2', lat: 35.2, lng: -84.9 },
  { id: 'end', lat: 35.0, lng: -85.0 }  // Same as start for round-trip
]);

// Solve TSP
const result = solveRouteOptimization({
  routeId: 'route-123',
  startPoint: { lat: 35.0, lng: -85.0, type: 'home' },
  endPoint: { lat: 35.0, lng: -85.0, type: 'home' },
  companies: [...],
  isRoundTrip: true
});

// Result:
// {
//   optimizedOrder: ['company2', 'company1'],
//   totalDistanceMiles: 12.5,
//   distanceSavingsMiles: 3.2,
//   distanceSavingsPercent: 20.4,
//   ...
// }
```

### Route Service Extensions

```typescript
import {
  optimizeRoute,
  setRouteStartEnd,
  toggleRoundTrip,
} from '@/lib/routes/route-service';

// Full optimization flow
const comparison = await optimizeRoute(routeId, {
  previewOnly: true,
});

// Apply optimization
await applyRouteOptimization(routeId, comparison.after.order);

// Update start/end points
await setRouteStartEnd(routeId, {
  start: { type: 'custom', lat: 35.1, lng: -85.1, address: '123 Main St' },
  end: { type: 'home' }, // Uses profile home location
});

// Toggle round-trip
await toggleRoundTrip(routeId, false); // One-way
```

### React Hook

```typescript
import { useRouteOptimization } from '@/hooks/useRouteOptimization';

function RouteDetail({ routeId }) {
  const {
    optimize,
    isOptimizing,
    comparison,
    showSuggestion,
    suggestedSavings,
    applySuggestion,
    dismissSuggestion,
    error
  } = useRouteOptimization(routeId);

  return (
    <>
      <button
        onClick={optimize}
        disabled={isOptimizing}
      >
        {isOptimizing ? 'Optimizing...' : 'Optimize Order'}
      </button>

      {comparison && (
        <RouteOptimizationModal
          comparison={comparison}
          onApply={applySuggestion}
          onCancel={dismissSuggestion}
        />
      )}
    </>
  );
}
```

## Testing Guide

### Unit Tests

```bash
docker compose exec spoketowork pnpm test src/lib/routes/tsp-solver.test.ts
```

### E2E Tests

```bash
docker compose exec spoketowork pnpm exec playwright test route-optimization
```

### Manual Testing Checklist

- [ ] Create route with 5+ companies
- [ ] Click "Optimize Order" button
- [ ] Verify modal shows before/after comparison
- [ ] Apply optimization, verify order changes
- [ ] Check distance/time updated
- [ ] Test with no home location set
- [ ] Test custom start/end points
- [ ] Test round-trip vs one-way
- [ ] Test auto-suggest on company add
