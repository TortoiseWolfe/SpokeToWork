# Map Font Legibility & Cycling Data Spec

## Problem Statement

The interactive map on `/map` has critical usability issues that make it nearly unusable for cyclists:

1. **Fonts are too small at ALL zoom levels** - Street names and labels are tiny and unreadable regardless of zoom. When you zoom in, new tiles load with proportionally smaller fonts, so the apparent font size never increases.

2. **Trade-off between cycling data and readability** - CyclOSM tiles show bike lanes/trails (pink lines) but have tiny fonts. Other tile providers have better fonts but no cycling infrastructure data.

3. **No font customization possible** - Raster tiles (PNG images) have fonts baked in at fixed pixel sizes. Cannot be changed client-side.

## Current Architecture

- **Map Library**: Leaflet via `react-leaflet`
- **Tile Source**: CyclOSM raster tiles (`https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png`)
- **Route Overlay**: Custom polylines from database (GeoJSON LineString/MultiLineString)

## Failed Approaches

### 1. Retina Tiles (@2x)

- **Tried**: Carto Voyager @2x tiles
- **Result**: Fonts are sharper but NOT larger. @2x means higher DPI, same logical size.

### 2. Higher Default Zoom

- **Tried**: Changed default zoom from 13 to 15
- **Result**: Fonts appear larger initially, but shrink when tiles reload. Not a real fix.

### 3. Layered Tiles (Base + Labels)

- **Tried**: Carto no-labels base + labels-only overlay with CSS `transform: scale(1.5)`
- **Result**:
  - Labels were larger but blurry from CSS scaling
  - Lost cycling infrastructure data (no bike lanes shown)
  - Poor visual quality

### 4. Multiple Tile Provider Options

- **Tried**: Dropdown to switch between CyclOSM, Carto, OSM
- **Result**: Trade-off remains - good fonts OR cycling data, never both

## Proposed Solution: MapLibre GL

Migrate from Leaflet (raster tiles) to MapLibre GL (vector tiles).

### Why Vector Tiles Solve This

1. **Client-side text rendering** - Fonts are rendered by the browser, not baked into images. Size is fully customizable via style configuration.

2. **Cycling data available** - OpenMapTiles and similar vector tile sources include cycling infrastructure in the data. Can be styled/highlighted as needed.

3. **Smooth zoom** - No tile reloading at zoom boundaries. Continuous scaling.

4. **Custom styling** - Can increase label font sizes, bold bike routes, adjust colors - all via JSON style spec.

### Implementation Options

#### Option A: MapLibre GL JS + react-map-gl

- Replace `react-leaflet` with `react-map-gl`
- Use free vector tile source (OpenFreeMap, MapTiler free tier, or self-hosted)
- Custom style JSON with larger fonts

#### Option B: MapLibre GL JS + Custom Style

- Same as A but with heavily customized style for cycling focus
- Highlight bike lanes, trails, greenways prominently
- Large, bold street labels

### Vector Tile Sources (Free)

1. **OpenFreeMap** - Free, no API key, OpenMapTiles schema
2. **MapTiler** - Free tier (100k requests/month), good cycling data
3. **Protomaps** - Free/self-hosted option
4. **Stadia Maps** - Free tier available

## Requirements

### Must Have

- [ ] Street names readable at zoom 13-16 without squinting
- [ ] Bike lanes/trails visible (equivalent to CyclOSM pink lines)
- [ ] Our custom route overlays still work (polylines from database)
- [ ] Geolocation "you are here" marker works
- [ ] Company markers on routes still display

### Should Have

- [ ] Dark mode support (match app theme)
- [ ] Smooth zoom (no tile loading jumps) — _inherent to MapLibre vector tiles_
- [ ] Style customization for cycling focus

### Nice to Have

- [ ] Offline tile caching for PWA
- [ ] 3D terrain/buildings
- [ ] Turn-by-turn route display

## Files Affected

Primary changes:

- `src/components/map/MapContainer/` - Replace Leaflet with MapLibre
- `src/components/map/RoutePolyline/` - Adapt to MapLibre layer API
- `src/app/map/page.tsx` - Update map integration
- `package.json` - Swap `react-leaflet` for `react-map-gl` + `maplibre-gl`

Style configuration:

- New files: `src/styles/map-style-light.json` and `src/styles/map-style-dark.json` for MapLibre style specs

## Success Criteria

A cyclist looking at the map can:

1. Read street names clearly at normal zoom levels
2. See bike lanes and trails highlighted
3. See their planned routes overlaid
4. Navigate smoothly without jarring tile reloads

## Clarifications

### Session 2025-12-19

**Q: Which vector tile provider?**
A: **OpenFreeMap** - Free, no API key required, uses OpenMapTiles schema with cycling infrastructure data.

**Q: Is the ~200KB bundle size increase acceptable?**
A: **Yes, with mitigation** - Use code-splitting to lazy-load the map component only when `/map` route is visited. This keeps initial bundle small while accepting the larger map library.

**Q: How should dark mode work with the map?**
A: **Auto-switch with app theme** - Map style changes automatically when user toggles DaisyUI theme. Use a dark variant of the OpenFreeMap style that matches the app's dark themes.

**Q: What should happen if vector tiles fail to load?**
A: **Show error + retry button** - Display user-friendly error message with manual retry option. Route overlays and markers remain visible if already loaded from database.

**Q: What minimum font size makes street names "readable"?**
A: **16px minimum** - Prioritize accessibility. Accept potential label crowding at lower zoom levels in favor of better readability for all users.

**Q: Should offline tile caching be in scope?**
A: **Yes, include it** - Cache viewed tiles in IndexedDB for offline access. Critical for cyclists who may lose cell coverage while riding. Integrate with existing Dexie/PWA offline infrastructure.

**Q: Browser compatibility scope?**
A: Support latest 2 versions of Chrome, Firefox, Safari, Edge. MapLibre GL requires WebGL support.

**Q: Mobile touch interactions?**
A: Standard gestures supported by MapLibre: pinch-to-zoom, two-finger pan, double-tap zoom. No custom gesture handling needed.

**Q: What color should bike lanes use?**
A: **#d63384 (magenta/pink)** - Matches CyclOSM conventions. Distinct from road colors, visible in both light and dark modes.

## References

- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [react-map-gl](https://visgl.github.io/react-map-gl/)
- [OpenFreeMap](https://openfreemap.org/)
- [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/)
