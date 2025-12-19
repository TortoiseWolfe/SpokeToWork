# Research: Map Font Legibility

## Decision 1: Map Rendering Library

**Question**: Which library should replace Leaflet for vector tile support?

**Decision**: MapLibre GL JS with react-map-gl

**Rationale**:

- MapLibre GL is the open-source fork of Mapbox GL (no token required)
- react-map-gl provides React bindings with hooks API
- Mature ecosystem with good documentation
- Supports all required features: vector tiles, custom styles, markers, GeoJSON layers

**Alternatives Rejected**:

- **Mapbox GL JS**: Requires API token, costs money at scale
- **OpenLayers**: Steeper learning curve, less React-friendly
- **Deck.gl**: Overkill for 2D map with routes

## Decision 2: Vector Tile Source

**Question**: Which free vector tile provider should we use?

**Decision**: OpenFreeMap

**Rationale**:

- Completely free with no usage limits
- No API key required (simplifies deployment)
- Uses OpenMapTiles schema (standard, well-documented)
- Includes cycling infrastructure data from OpenStreetMap
- Reliable uptime, community-maintained

**Alternatives Rejected**:

- **MapTiler**: Free tier limited to 100k requests/month
- **Protomaps**: Requires self-hosting infrastructure
- **Stadia Maps**: Requires account and API key management

## Decision 3: Font Size Implementation

**Question**: How to ensure 16px minimum street labels?

**Decision**: Custom MapLibre style JSON with modified text-size properties

**Rationale**:

- MapLibre styles use JSON spec with full control over text rendering
- Can set `"text-size": 16` or use expressions for zoom-dependent sizing
- Apply to all label layers: roads, places, POIs

**Implementation**:

```json
{
  "id": "road-label",
  "type": "symbol",
  "layout": {
    "text-field": ["get", "name"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 10, 12, 13, 16, 16, 20]
  }
}
```

## Decision 4: Dark Mode Strategy

**Question**: How to implement theme-aware map styles?

**Decision**: Two separate style JSON files, switch based on DaisyUI theme

**Rationale**:

- MapLibre supports runtime style switching
- Cleaner than dynamically modifying colors
- Can optimize each theme independently

**Implementation**:

- `map-style-light.json`: Light backgrounds, dark text
- `map-style-dark.json`: Dark backgrounds, light text
- `useMapTheme` hook detects theme and returns appropriate style URL

## Decision 5: Offline Tile Caching

**Question**: How to cache vector tiles for offline use?

**Decision**: Use MapLibre's built-in caching with IndexedDB storage

**Rationale**:

- MapLibre GL has native `transformRequest` hook for cache interception
- Dexie already in project for offline queue
- Can reuse existing IndexedDB infrastructure

**Implementation**:

```typescript
// Intercept tile requests and cache responses
const transformRequest = (url: string) => {
  return {
    url,
    // Cache tiles as they're fetched
    credentials: 'same-origin',
  };
};
```

**Cache Strategy**:

- Cache tiles as user views them
- LRU eviction when cache exceeds 50MB
- Serve from cache when offline

## Decision 6: Bundle Size Mitigation

**Question**: How to prevent 200KB bundle size regression?

**Decision**: Dynamic import with Next.js `next/dynamic`

**Rationale**:

- Current MapContainer already uses dynamic import
- Extend to include maplibre-gl in the dynamic chunk
- Map only loads when user visits `/map` route

**Implementation**:

```typescript
const MapContainerInner = dynamic(
  () => import('./MapContainerInner'),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```

## Decision 7: Cycling Infrastructure Styling

**Question**: How to highlight bike lanes like CyclOSM does?

**Decision**: Custom layer styling in MapLibre style spec

**Rationale**:

- OpenMapTiles includes `highway` data with `bicycle` tags
- Can filter and style bike-related features with custom colors
- More control than raster tiles

**Layers to style**:

- `cycleway`: Dedicated bike paths (bright color)
- `path` with bicycle=yes: Shared paths
- `lane` with cycleway: Road bike lanes (dashed line)

```json
{
  "id": "cycleway",
  "type": "line",
  "source": "openmaptiles",
  "source-layer": "transportation",
  "filter": ["==", ["get", "class"], "path"],
  "paint": {
    "line-color": "#d63384",
    "line-width": 3
  }
}
```

## References

- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [react-map-gl](https://visgl.github.io/react-map-gl/)
- [OpenFreeMap](https://openfreemap.org/)
- [OpenMapTiles Schema](https://openmaptiles.org/schema/)
- [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/)
