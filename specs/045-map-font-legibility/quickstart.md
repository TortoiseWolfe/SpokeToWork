# Quickstart: MapLibre Integration

## Basic Usage

After migration, the MapContainer API remains largely unchanged:

```tsx
import { MapContainer } from '@/components/map/MapContainer';

export default function MapPage() {
  return (
    <MapContainer
      center={[39.2904, -76.6122]}
      zoom={14}
      height="100vh"
      showUserLocation
      onMapReady={(map) => console.log('Map ready', map)}
    />
  );
}
```

## Adding Route Overlays

Routes are displayed using the RoutePolyline component with GeoJSON:

```tsx
import { MapContainer } from '@/components/map/MapContainer';
import { RoutePolyline } from '@/components/map/RoutePolyline';

const routeGeoJSON = {
  type: 'LineString',
  coordinates: [
    [-76.6122, 39.2904],
    [-76.615, 39.292],
    [-76.618, 39.295],
  ],
};

export default function RoutePage() {
  return (
    <MapContainer center={[39.2904, -76.6122]} zoom={14}>
      <RoutePolyline geometry={routeGeoJSON} color="#3b82f6" width={4} />
    </MapContainer>
  );
}
```

## Dark Mode

The map automatically follows the app theme. No additional configuration needed:

```tsx
// Theme switching is handled internally via useMapTheme hook
<MapContainer center={[39.2904, -76.6122]} zoom={14} />
```

To manually control the theme:

```tsx
import { MapContainer } from '@/components/map/MapContainer';

<MapContainer
  center={[39.2904, -76.6122]}
  zoom={14}
  theme="dark" // 'light' | 'dark' | 'auto'
/>;
```

## Markers

Add markers for companies or points of interest:

```tsx
import { MapContainer } from '@/components/map/MapContainer';

const markers = [
  { id: '1', position: [39.2904, -76.6122], popup: 'Company A' },
  { id: '2', position: [39.295, -76.615], popup: 'Company B' },
];

<MapContainer center={[39.2904, -76.6122]} zoom={14} markers={markers} />;
```

## Offline Support

Tiles are automatically cached as users view them. To check offline status:

```tsx
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

function MapWithOfflineIndicator() {
  const isOffline = useOfflineStatus();

  return (
    <div>
      {isOffline && <div className="alert">Viewing cached map data</div>}
      <MapContainer center={[39.2904, -76.6122]} zoom={14} />
    </div>
  );
}
```

## Error Handling

The map shows an error state with retry when tiles fail to load:

```tsx
<MapContainer
  center={[39.2904, -76.6122]}
  zoom={14}
  onError={(error) => console.error('Map error:', error)}
  onRetry={() => console.log('User clicked retry')}
/>
```

## Style Customization

To modify the base map style (advanced):

```tsx
import { MapContainer } from '@/components/map/MapContainer';
import customStyle from '@/styles/custom-map-style.json';

<MapContainer center={[39.2904, -76.6122]} zoom={14} mapStyle={customStyle} />;
```

## Migration Notes

### Breaking Changes

1. **TileLayerSelector removed** - Vector tiles don't need multiple providers
2. **Map instance type changed** - `LeafletMap` -> `MapRef` from react-map-gl
3. **CSS import changed** - `leaflet/dist/leaflet.css` -> `maplibre-gl/dist/maplibre-gl.css`

### Unchanged APIs

- `center`, `zoom`, `height`, `width` props
- `showUserLocation` prop
- `markers` array format
- `onLocationFound`, `onLocationError` callbacks
- `onMapReady` callback (different map instance type)
- `children` for custom overlays
