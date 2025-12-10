# Research: Bicycle Route Planning

**Feature**: 041-bicycle-route-planning
**Date**: 2025-12-08

## Research Summary

This document captures technical decisions and research findings for the Bicycle Route Planning feature.

---

## 1. Map Tile Providers for Cycling

### Decision

Use **Thunderforest OpenCycleMap** as primary cycling tile option with **OpenStreetMap** as fallback.

### Rationale

- OpenCycleMap specifically highlights bike lanes, paths, and cycling infrastructure
- Larger street labels than standard OSM tiles
- Thunderforest provides reliable CDN infrastructure
- Free tier allows 150,000 tiles/month (sufficient for development and light production)

### Alternatives Considered

| Provider                     | Pros                           | Cons                                   | Decision      |
| ---------------------------- | ------------------------------ | -------------------------------------- | ------------- |
| OpenCycleMap (Thunderforest) | Cycling-focused, larger labels | Requires API key                       | **Selected**  |
| CyclOSM                      | Free, no API key               | Less reliable CDN                      | Backup option |
| Stadia Maps Outdoors         | Good cycling data              | API key required, less cycling-focused | Not selected  |
| Mapbox Outdoors              | Excellent styling              | Pay-per-use pricing                    | Not selected  |

### Implementation Notes

- Store API key in localStorage (user-provided) or env variable
- Fall back to OSM if Thunderforest unavailable
- Tile URL pattern: `https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={key}`

---

## 2. GeoJSON Storage for Route Geometry

### Decision

Store route geometry as **JSONB** in PostgreSQL using **GeoJSON LineString** format.

### Rationale

- GeoJSON is industry standard for geographic data
- JSONB allows efficient querying without full PostGIS complexity
- Compatible with Leaflet's GeoJSON layer rendering
- Supports future spatial queries via PostGIS functions (already enabled)

### Alternatives Considered

| Approach             | Pros                                | Cons                              | Decision     |
| -------------------- | ----------------------------------- | --------------------------------- | ------------ |
| JSONB GeoJSON        | Standard format, Leaflet compatible | Limited spatial queries           | **Selected** |
| PostGIS geometry     | Full spatial capabilities           | More complex, overkill for routes | Not selected |
| Array of coordinates | Simple                              | Non-standard, harder to extend    | Not selected |
| GPX storage          | Export-friendly                     | Non-standard for DB storage       | Not selected |

### Implementation Notes

```json
{
  "type": "LineString",
  "coordinates": [
    [-84.8667, 35.1667], // [lng, lat] - GeoJSON format
    [-84.87, 35.16],
    [-84.8833, 35.1333]
  ]
}
```

---

## 3. Route-Company Association Pattern

### Decision

Use **junction table** (`route_companies`) with **sequence_order** column and **visit_on_next_ride** flag.

### Rationale

- Junction table allows many-to-many relationship
- sequence_order enables drag-and-drop reordering
- visit_on_next_ride flag provides quick filtering without separate table
- Supports both shared and private companies via separate foreign keys

### Alternatives Considered

| Approach             | Pros               | Cons                                      | Decision     |
| -------------------- | ------------------ | ----------------------------------------- | ------------ |
| Junction table       | Flexible, scalable | Extra table                               | **Selected** |
| JSON array in route  | Simple queries     | Hard to query/update individual companies | Not selected |
| Company has route_id | Simple             | Only one route per company                | Not selected |

### Implementation Notes

- Use CHECK constraint to ensure exactly one of shared_company_id or private_company_id is set
- Index on (route_id, sequence_order) for efficient ordered retrieval
- Index on (user_id, visit_on_next_ride) for next-ride filtering

---

## 4. Export Format Implementation

### Decision

Implement **four export formats**: GPX, CSV, JSON, and printable HTML.

### Rationale

- GPX: Standard for cycling apps (Strava, Garmin, Wahoo)
- CSV: Spreadsheet compatibility for planning
- JSON: Data backup and potential re-import
- HTML: Printable route cards for physical reference during rides

### Alternatives Considered

| Format     | Use Case              | Implementation Complexity | Decision    |
| ---------- | --------------------- | ------------------------- | ----------- |
| GPX        | Cycling apps          | Medium (XML generation)   | **Include** |
| CSV        | Spreadsheets          | Low                       | **Include** |
| JSON       | Data backup           | Low                       | **Include** |
| HTML/Print | Paper handouts        | Medium (styling needed)   | **Include** |
| KML        | Google Earth          | Medium                    | Not needed  |
| PDF        | Professional printout | High (requires library)   | Defer       |

### Implementation Notes

- GPX follows schema: `<gpx><trk><trkseg><trkpt lat="x" lon="y"/></trkseg></trk></gpx>`
- CSV columns: route_name, company_name, address, lat, lng, sequence, notes
- HTML uses print-friendly CSS with route map thumbnail
- All exports client-side (no server required for static hosting)

---

## 5. Active Route Planning State

### Decision

Use **database table** (`active_route_planning`) with single row per user.

### Rationale

- Persists across sessions/devices
- Simple query to check current planning state
- Ensures only one active route at a time via UNIQUE constraint on user_id

### Alternatives Considered

| Approach           | Pros                             | Cons                        | Decision        |
| ------------------ | -------------------------------- | --------------------------- | --------------- |
| Database table     | Persists, single source of truth | Extra query                 | **Selected**    |
| localStorage       | Fast, no DB call                 | Doesn't sync across devices | Supplement only |
| URL state          | Shareable                        | Lost on navigation          | Not selected    |
| React context only | Simple                           | Lost on refresh             | Not selected    |

### Implementation Notes

- Primary key is user_id (one active route per user)
- Store route_id and started_at timestamp
- Update last_modified_at on changes
- Clear on route completion/save

---

## 6. Soft/Hard Limits Implementation

### Decision

Implement limits at **service layer** with clear user feedback.

### Rationale

- Service layer provides single point of enforcement
- Database constraints as backup for hard limits
- UI shows warning at soft limit, blocks at hard limit
- Prepares for future premium tier feature

### Limits Defined

| Resource            | Soft Limit (Warning) | Hard Limit (Block) |
| ------------------- | -------------------- | ------------------ |
| Routes per user     | 20                   | 50                 |
| Companies per route | 50                   | 100                |

### Implementation Notes

- Service methods check limits before create operations
- Return clear error messages for limit violations
- UI shows progress indicator: "15 of 20 routes (20 remaining)"
- Database CHECK constraints enforce hard limits as safety net

---

## 7. Drag-and-Drop Reordering

### Decision

Use **@dnd-kit** library for route company reordering.

### Rationale

- Already used in similar features in the codebase
- Excellent accessibility support (keyboard navigation)
- Smooth animations
- Works well with React 19

### Alternatives Considered

| Library             | Pros                         | Cons                                | Decision     |
| ------------------- | ---------------------------- | ----------------------------------- | ------------ |
| @dnd-kit            | Accessible, modern, flexible | Slightly complex setup              | **Selected** |
| react-beautiful-dnd | Popular, simple              | Unmaintained, React 18 issues       | Not selected |
| Native HTML5 DnD    | No dependencies              | Poor accessibility, limited styling | Not selected |

### Implementation Notes

- Use SortableContext for ordered lists
- Update sequence_order on drop
- Optimistic updates with rollback on error
- Save new order to database after drag complete

---

## 8. Cleveland GreenWay Trail Data

### Decision

Store GreenWay as **system route** with hardcoded GeoJSON in seed data.

### Rationale

- User provided detailed trail coordinates and access points
- System routes visible to all users in the area
- is_system_route flag distinguishes from user routes
- Can add more system trails later using same pattern

### Trail Data Source

- Cleveland/Bradley County GreenWay: 4.2 miles, paved
- North terminus: Mohawk Drive (approx 35.1667, -84.8667)
- South terminus: Willow Street (approx 35.1333, -84.8833)
- 9 access points with parking

### Implementation Notes

- Create migration with GeoJSON coordinates
- Link to Cleveland metro_area_id
- Include metadata: name, length, surface type, access points
- Display as distinct layer (different from user routes)

---

## Dependencies to Add

None - all required dependencies already installed:

- `leaflet` 1.9.4
- `react-leaflet` 5.0.0
- `@tanstack/react-query` (existing)
- `@dnd-kit/core`, `@dnd-kit/sortable` (may need to verify installation)

### Verification Command

```bash
docker compose exec spoketowork pnpm list leaflet react-leaflet @dnd-kit/core @dnd-kit/sortable
```

---

## Risk Assessment

| Risk                                  | Likelihood | Impact | Mitigation                    |
| ------------------------------------- | ---------- | ------ | ----------------------------- |
| Thunderforest API rate limits         | Medium     | Low    | Fallback to OSM, caching      |
| GeoJSON performance with large routes | Low        | Medium | Limit waypoints to 1000       |
| Drag-and-drop a11y issues             | Low        | Medium | Use @dnd-kit keyboard support |
| Export size limits                    | Low        | Low    | Paginate large exports        |
