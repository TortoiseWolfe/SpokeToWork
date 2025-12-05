# SpokeToWork

> Track companies and generate optimized bicycle routes for in-person job hunting

---

## Problem Statement

A job seeker in a small city (Cleveland, TN) wants to conduct in-person job applications efficiently. Visiting companies by bicycle requires planning optimal routes to minimize travel time and physical effort. Currently, there's no easy way to:

1. Track which companies to visit and their application status
2. Verify and manage company location coordinates
3. Group nearby companies into logical geographic clusters for single-trip visits
4. Generate optimized multi-stop bicycle routes
5. Export routes to mobile devices for field use

## User Profile

- **Primary User**: Individual job seeker
- **Mode of Transport**: Bicycle (affects routing preferences - bike-friendly roads, avoid highways)
- **Geographic Scope**: ~10 mile radius from home address
- **Technical Comfort**: Comfortable with web interfaces and mobile map apps

## Core Workflows

### 1. Company Management

The user needs to maintain a list of companies they intend to visit or have visited.

**Required Information per Company**:

- Company name and contact details (name, title, phone, email, website)
- Physical address
- Geographic coordinates (latitude/longitude)
- Application status tracking (not contacted → contacted → follow-up → meeting → outcome)
- Priority level
- Notes and follow-up dates
- Route assignment (which geographic cluster)
- Active/inactive flag (still pursuing or not)

**Actions**:

- Add new companies manually
- Edit company information
- Delete companies
- Bulk import from spreadsheet data
- Export data for backup or sharing
- Filter and search companies

### 2. Address Geocoding

Company addresses must be converted to coordinates for mapping and routing.

**Requirements**:

- Convert street addresses to latitude/longitude coordinates
- Handle addresses that fail automatic geocoding (manual coordinate entry)
- Validate coordinates are within reasonable geographic bounds
- Visual verification of coordinates on a map (catch geocoding errors)
- Bulk geocoding for efficiency

### 3. Geographic Clustering

Companies should be grouped into route clusters based on geographic proximity.

**Requirements**:

- Define a home location as the start/end point for all routes
- Automatically assign companies to geographic clusters (routes)
- Clusters should be based on:
  - Distance from home
  - Directional bearing (north, east, southwest, etc.)
  - Natural geographic groupings
- Support 5-10 route clusters with descriptive names
- Allow manual override of automatic assignments
- Handle companies outside normal range ("extended range")

**Cluster Characteristics**:

- Each cluster should be completable in a single trip
- Clusters should minimize backtracking
- Nearby companies should be in the same cluster

### 4. Route Generation

Given a set of companies to visit, generate an optimized travel route.

**Requirements**:

- Start and end at home location
- Visit all selected companies in optimal order (minimize total distance)
- Use bicycle-appropriate roads and paths
- Calculate total distance and estimated travel time
- Support selecting companies by:
  - Geographic cluster (route)
  - Manual selection
  - Active/priority status

### 5. Route Export

Routes must be usable in the field on mobile devices.

**Export Formats**:

- Interactive map viewable in web browser
- GPS file importable to cycling/navigation apps
- Printable summary with company details and addresses

### 6. Field Operations Support

While visiting companies, the user needs reference materials.

**Requirements**:

- Printable "field sheet" with company details for the day's route
- Quick status updates (mark as visited, add notes)
- View route progress

## Data Requirements

### Single Source of Truth

- All company data should live in one authoritative location
- Changes should be tracked/auditable
- Data should be exportable and human-readable

### Data Integrity

- Prevent data loss from concurrent edits
- Support undo/recovery from mistakes
- Validate data on entry (coordinates in valid range, required fields present)

### Privacy

- Data is personal/private (single user)
- No cloud sync required initially
- User controls their own data

## User Interface Requirements

### Company Management View

- Spreadsheet-like interface for efficient bulk editing
- Sort and filter by any column
- Visual indicators for status, priority, route assignment
- Checkbox selection for bulk operations

### Map View

- Display companies as markers on a map
- Color-code by route/cluster assignment
- Show generated route paths
- Click markers for company details

### Route Controls

- Quick toggle: include/exclude companies from route generation
- Filter view by route/cluster
- One-click route generation for a cluster
- Preview route before export

## Constraints

### Geographic

- Optimized for small city/suburban area (~20 mile diameter)
- Bicycle routing (not car-optimized)
- Single home location as hub

### Scale

- Target: 50-200 companies
- Target: 5-10 route clusters
- Single user (no multi-user/collaboration initially)

### Offline Capability

- Route exports must work offline (for field use)
- Core data management can require connectivity

## Success Criteria

1. **Efficiency**: User can plan a day's route in under 5 minutes
2. **Accuracy**: Geocoded coordinates are verifiably correct
3. **Usability**: Routes are practical for actual bicycle travel
4. **Reliability**: No data loss, changes are tracked
5. **Portability**: Routes work on standard mobile map/GPS apps

## Out of Scope (Future Considerations)

- Multi-user/team collaboration
- Automatic company discovery/import from business directories
- Integration with job application platforms

## Glossary

- **Route/Cluster**: A geographic grouping of companies that can be visited in a single trip
- **Geocoding**: Converting a street address to latitude/longitude coordinates
- **TSP (Traveling Salesman Problem)**: The optimization problem of finding the shortest route visiting all points
- **Field Sheet**: Printable reference document for use while visiting companies
- **Home Location**: The user's starting point for all routes (typically their residence)
