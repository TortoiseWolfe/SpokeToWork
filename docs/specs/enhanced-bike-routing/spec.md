# Enhanced Bike Route Mapping Spec

## Problem Statement

The current bike route mapping system provides basic route display but lacks features that cyclists need for effective trip planning:

1. **No turn-by-turn directions** - Routes are displayed as polylines but users can't see step-by-step navigation instructions.

2. **No elevation data** - Cyclists can't assess route difficulty or plan for hills/climbs.

3. **Single route only** - OSRM returns one route with no alternatives for users to compare.

4. **Limited mobile experience** - Map interactions aren't optimized for touch, and there's no voice guidance capability.

5. **No route metrics** - Users can't see total distance, estimated time, or difficulty at a glance.

## Current Architecture

- **Map Library**: Leaflet via `react-leaflet`
- **Routing**: OSRM service for bicycle routing
- **Route Storage**: Supabase PostgreSQL (`active_route_planning`, `route_companies` tables)
- **Geometry**: GeoJSON LineString/MultiLineString stored in database
- **Related Spec**: `map-font-legibility` proposes MapLibre GL migration for better fonts/styling

## Proposed Features

### 1. Turn-by-Turn Directions

Display step-by-step navigation instructions alongside the route.

**Implementation**:

- OSRM already returns `steps` array in routing response
- Parse maneuver types (turn left, continue, arrive, etc.)
- Display in collapsible sidebar/drawer on mobile
- Highlight current step on map when tapped

**Data already available from OSRM**:

```json
{
  "steps": [
    {
      "maneuver": { "type": "turn", "modifier": "left" },
      "name": "Main Street",
      "distance": 450,
      "duration": 90
    }
  ]
}
```

### 2. Elevation Profile

Show elevation changes along the route to help cyclists plan for difficulty.

**Implementation Options**:

#### Option A: Open-Elevation API

- Free, open-source elevation data
- POST route coordinates, receive elevations
- Rate limits apply (consider caching)

#### Option B: Mapbox Terrain-RGB Tiles

- Query elevation from terrain tiles
- Requires Mapbox account (free tier available)
- More accurate, faster for long routes

#### Option C: OpenTopoData

- Self-hostable or use public instance
- Multiple datasets (SRTM, ASTER, etc.)
- Good for cycling-relevant accuracy

**Display**:

- Interactive elevation chart below map
- Hover to see elevation at point
- Color-code route by gradient (green=flat, red=steep)
- Show total ascent/descent metrics

### 3. Route Alternatives

Present multiple route options for user comparison.

**Implementation**:

- OSRM supports `alternatives=true` parameter
- Returns up to 3 alternative routes
- Display all routes with different colors/opacity
- Allow user to select preferred route
- Show comparison metrics (distance, time, elevation)

**UI**:

- Route cards showing each option's stats
- Tap card to highlight route on map
- "Select This Route" button to confirm choice

### 4. Route Metrics Dashboard

Display key route information prominently.

**Metrics to show**:

- Total distance (km/miles based on user preference)
- Estimated cycling time (configurable average speed)
- Total elevation gain/loss
- Difficulty rating (easy/moderate/hard based on gradient)
- Number of companies on route

**Placement**:

- Sticky header/footer on map page
- Collapsible on mobile to maximize map view

### 5. Enhanced Mobile Experience

Optimize for cyclists using phones while planning or riding.

**Features**:

- Large touch targets (44px minimum per WCAG)
- Swipe gestures for direction steps
- Full-screen map mode
- Quick-access FAB for current location
- Offline route caching (sync with PWA offline queue)
- Optional voice readout of directions (Web Speech API)

### 6. Route Waypoints

Allow users to add intermediate stops.

**Implementation**:

- Drag-to-add waypoints on route
- Reorder stops via drag-and-drop list
- OSRM supports multiple waypoints natively
- Persist waypoints to database with route

## Dependencies

- **map-font-legibility spec**: If MapLibre GL migration proceeds, this spec's implementation should use MapLibre APIs instead of Leaflet
- **OSRM service**: Already integrated, needs additional parameters
- **Elevation API**: New external dependency (Open-Elevation or similar)

## Requirements

### Must Have

- [ ] Turn-by-turn direction list from OSRM response
- [ ] Route metrics (distance, estimated time)
- [ ] Mobile-optimized touch interactions
- [ ] Route displayed with company markers

### Should Have

- [ ] Elevation profile visualization
- [ ] Route alternatives (2-3 options)
- [ ] Difficulty rating based on elevation
- [ ] Offline route viewing

### Nice to Have

- [ ] Voice guidance via Web Speech API
- [ ] Draggable waypoints
- [ ] Route sharing (deep links)
- [ ] GPX export for bike computers

## Files Affected

New components:

- `src/components/map/DirectionsList/` - Turn-by-turn UI
- `src/components/map/ElevationChart/` - Elevation profile
- `src/components/map/RouteMetrics/` - Stats dashboard
- `src/components/map/RouteAlternatives/` - Route comparison UI

Modified:

- `src/lib/routing/` - Add alternatives, elevation fetching
- `src/app/map/page.tsx` - Integrate new components
- `src/components/map/MapContainer/` - Touch optimizations

New services:

- `src/services/elevation/` - Elevation data fetching/caching

## Success Criteria

A cyclist planning a route can:

1. See step-by-step directions for their route
2. View elevation profile and total climb
3. Compare 2-3 route alternatives
4. Quickly see distance/time/difficulty metrics
5. Use the map comfortably on a mobile phone
6. Access their route offline after initial load

## Technical Considerations

### Performance

- Elevation API calls should be debounced/cached
- Alternative routes fetched on-demand, not by default
- Lazy-load elevation chart component

### Accessibility

- Direction steps keyboard navigable
- Elevation chart has text alternative
- Color-coding supplemented with patterns/labels
- Voice guidance as progressive enhancement

### Offline Support

- Cache route geometry in IndexedDB (existing Dexie setup)
- Cache elevation data with route
- Directions available offline once fetched

## References

- [OSRM API Documentation](http://project-osrm.org/docs/v5.24.0/api/)
- [Open-Elevation API](https://open-elevation.com/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Recharts](https://recharts.org/) - For elevation chart
