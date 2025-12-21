# Feature Specification: OpenRouteService Bicycle Routing

**Feature Branch**: `048-openrouteservice-routing`
**Created**: 2025-12-21
**Status**: Complete
**Input**: Switch bicycle routing from OSRM to OpenRouteService for better bike profiles

## Problem Statement

The current OSRM bicycle routing service (`routing.openstreetmap.de/routed-bike`) excludes many residential roads from its bicycle routing graph, causing:

1. **Massive detours**: Routes of 24km instead of 1km direct
2. **Dangerous routing**: Crossing highways multiple times instead of using direct residential roads
3. **Poor user experience**: Route distances and times are unrealistic

**Evidence**:

- Car router: 1km direct to Bradley/Polk via Whitewater Drive (snaps 10m)
- Bike router: 24km detour via back roads (snaps 462m away)
- OSRM `nearest` finds Whitewater Drive, but `route` can't use it

## User Scenarios & Testing

### User Story 1 - Direct Route Generation (Priority: P1)

As a cyclist planning a route to visit businesses, I want the routing to use direct roads so that my routes are efficient and realistic.

**Why this priority**: Core functionality - without accurate routing, the entire route planning feature is broken.

**Independent Test**: Generate a route to Bradley/Polk Walk-in Clinic (119 Whitewater Dr, Ocoee, TN) and verify it uses Whitewater Drive directly (~1km) instead of a 24km detour.

**Acceptance Scenarios**:

1. **Given** a route with Bradley/Polk as a waypoint, **When** the route is generated, **Then** the route uses Whitewater Drive and total segment distance is under 2km (not 24km)
2. **Given** any residential address as a waypoint, **When** the route is generated, **Then** the route reaches within 50m of the actual address
3. **Given** valid waypoints, **When** routing fails with ORS, **Then** system falls back to OSRM and still generates a route

---

### User Story 2 - Multiple Bike Profiles (Priority: P2)

As a cyclist, I want to choose between different routing profiles so that I can optimize for my bike type and preferences.

**Why this priority**: Enhances user experience but not required for basic functionality.

**Independent Test**: Toggle between cycling-road and cycling-regular profiles and verify different routes are generated.

**Acceptance Scenarios**:

1. **Given** a user selects "cycling-road" profile, **When** a route is generated, **Then** the route prefers paved roads
2. **Given** a user selects "cycling-regular" profile, **When** a route is generated, **Then** the route may include bike paths even if longer

---

### User Story 3 - API Key Configuration (Priority: P3)

As a developer deploying this application, I want to use my own OpenRouteService API key so that I can manage my own rate limits and usage.

**Why this priority**: Required for production deployments but default key works for development.

**Independent Test**: Set a custom ORS API key in environment and verify routes are generated successfully.

**Acceptance Scenarios**:

1. **Given** no ORS API key is configured, **When** routing is attempted, **Then** system falls back to OSRM
2. **Given** an invalid ORS API key, **When** routing is attempted, **Then** system logs error and falls back to OSRM
3. **Given** a valid ORS API key, **When** routing is attempted, **Then** ORS is used successfully

---

### Edge Cases

- What happens when ORS API is unavailable? Fall back to OSRM.
- What happens when route exceeds ORS 6000km limit? Fall back to OSRM.
- What happens when waypoints exceed ORS 50 waypoint limit? Fall back to OSRM.
- How does system handle ORS rate limiting (429 errors)? Exponential backoff then OSRM fallback.

## Requirements

### Functional Requirements

- **FR-001**: System MUST use OpenRouteService as the primary bicycle routing service
- **FR-002**: System MUST fall back to OSRM when ORS fails or is unavailable
- **FR-003**: System MUST support `cycling-road` profile as default (prefers paved roads)
- **FR-004**: System MUST read ORS API key from `NEXT_PUBLIC_ORS_API_KEY` environment variable
- **FR-005**: System MUST log routing service used and any fallback events
- **FR-006**: System MUST handle ORS API errors gracefully without crashing
- **FR-007**: System MUST preserve existing route geometry format (GeoJSON LineString)
- **FR-008**: System MUST return distance in meters and duration in seconds (matching current interface)

### Non-Functional Requirements

- **NFR-001**: Routing requests MUST complete within 10 seconds
- **NFR-002**: System MUST work without ORS key (using OSRM fallback only)
- **NFR-003**: API key MUST be documented in .env.example with instructions

### Key Entities

- **RouteGeometry**: GeoJSON LineString with coordinates array
- **BicycleRouteResult**: geometry, distanceMeters, distanceMiles, durationSeconds, durationMinutes
- **RoutingProfile**: cycling-regular, cycling-road, cycling-mountain, cycling-electric

## Success Criteria

### Measurable Outcomes

- **SC-001**: Route to Bradley/Polk uses Whitewater Drive (distance < 2km, not 24km)
- **SC-002**: All existing route tests pass with new routing service
- **SC-003**: Fallback to OSRM works when ORS is unavailable
- **SC-004**: Route generation time remains under 10 seconds
- **SC-005**: Documentation includes API key setup instructions

## Assumptions

1. OpenRouteService free tier (2000 requests/day) is sufficient for development and small deployments
2. The `cycling-road` profile will include residential roads that OSRM's bike profile excludes
3. End users deploying this app will register for their own ORS API keys for production use

## Out of Scope

- User-facing profile selection UI (future enhancement)
- Caching of route results
- Offline routing support

## Clarifications

### Session 2025-12-21

**Ambiguity Scan Results**: All 9 taxonomy categories evaluated as Clear.

| Category                      | Status |
| ----------------------------- | ------ |
| Functional Scope              | Clear  |
| Domain & Data Model           | Clear  |
| Interaction & UX Flow         | Clear  |
| Non-Functional Quality        | Clear  |
| Integration & Dependencies    | Clear  |
| Edge Cases & Failure Handling | Clear  |
| Constraints & Tradeoffs       | Clear  |
| Terminology & Consistency     | Clear  |
| Completion Signals            | Clear  |

**API Key Format**: Verified ORS API key uses JWT-encoded token format (base64 encoded JSON with org, id, and hash fields). Key stored in `NEXT_PUBLIC_ORS_API_KEY` environment variable.
