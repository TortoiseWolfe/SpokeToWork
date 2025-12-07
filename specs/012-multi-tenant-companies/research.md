# Research: Multi-Tenant Company Data Model

**Feature**: 012-multi-tenant-companies
**Date**: 2025-12-06

## PostgreSQL Extensions

### PostGIS for Spatial Queries

**Decision**: Use PostGIS `ST_DWithin` for metro area auto-inference

**Rationale**:

- Native PostgreSQL extension, no external dependencies
- Available on Supabase free tier (enable with `CREATE EXTENSION IF NOT EXISTS postgis`)
- Accurate geographic distance calculations using geography type
- Index-supported for efficient queries

**Alternatives Considered**:

- Haversine formula in SQL: Less accurate, no index support
- Client-side calculation: Inefficient for large datasets
- Pre-computed assignment: Requires manual admin work

**Implementation**:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- Example: Find metro area for coordinates
SELECT id FROM metro_areas
WHERE ST_DWithin(
  ST_Point(longitude, latitude)::geography,
  ST_Point(center_lng, center_lat)::geography,
  radius_miles * 1609.34  -- Convert miles to meters
)
ORDER BY ST_Distance(...)
LIMIT 1;
```

### pg_trgm for Fuzzy Matching

**Decision**: Use pg_trgm with `similarity()` function, 0.3 threshold

**Rationale**:

- Handles typos and variations ("Amazon" vs "Amazn", "LLC" suffix differences)
- GIN index support for efficient searches
- Configurable threshold (0.3 balances false positives/negatives)
- Available on Supabase free tier

**Alternatives Considered**:

- ILIKE: Only exact substring match, misses variations
- Levenshtein: Good for short strings but slow on long names
- Full-text search: Overkill for company name matching

**Implementation**:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Example: Find similar companies
SELECT * FROM shared_companies
WHERE similarity(name, 'Amazn') > 0.3
ORDER BY similarity(name, 'Amazn') DESC
LIMIT 5;
```

## RLS Policy Patterns

### Shared Tables (Public Read, Admin Write)

**Decision**: Use `is_admin` boolean on user profile for admin identification

**Rationale**:

- Simple implementation for single-admin scenario
- Easy to extend later with role-based system
- Works with Supabase RLS `auth.uid()` function

**Pattern**:

```sql
-- Read: Anyone authenticated
CREATE POLICY "shared_read" ON shared_companies
  FOR SELECT USING (true);

-- Write: Admin only
CREATE POLICY "admin_write" ON shared_companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

### User-Owned Tables

**Decision**: Standard user_id check pattern

**Pattern**:

```sql
CREATE POLICY "user_owned" ON user_company_tracking
  FOR ALL USING (user_id = auth.uid());
```

### Contribution Tables (User Submit, Admin Review)

**Decision**: Users can insert their own, admins can read/update all

**Pattern**:

```sql
-- Users can insert and view their own
CREATE POLICY "user_submit" ON company_contributions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_view_own" ON company_contributions
  FOR SELECT USING (user_id = auth.uid());

-- Admin can view and update all
CREATE POLICY "admin_review" ON company_contributions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

## Migration Strategy

### Big-Bang Cutover Approach

**Decision**: Single migration script, backup file for recovery

**Rationale**:

- Simple execution - one SQL file to run
- Current user base is single user (the developer)
- Backup file already exists in repo root
- Monolithic migration file can be edited for rollback

**Migration Steps**:

1. Backup current `companies` table data to JSON (already done: `data/companies_backup.json`)
2. Enable extensions (postgis, pg_trgm)
3. Create new tables with RLS policies
4. Insert "Cleveland, TN" metro area
5. Migrate companies: `INSERT INTO shared_companies SELECT ... FROM companies`
6. Create company_locations from companies
7. Create user_company_tracking for current user
8. Update job_applications foreign keys
9. Drop old companies table

**Rollback Procedure**:

1. Re-add `companies` table from monolithic SQL backup section
2. Restore data from `data/companies_backup.json`
3. Revert job_applications foreign keys

## Unified View Design

**Decision**: PostgreSQL VIEW combining shared tracking + private companies

**Rationale**:

- Single interface for application code
- Hides complexity of multi-table joins
- Performance acceptable for expected scale

**Implementation**:

```sql
CREATE OR REPLACE VIEW user_companies_unified AS
-- Tracked shared companies
SELECT
  'shared' as source,
  sc.id as company_id,
  sc.name,
  sc.website,
  sc.careers_url,
  cl.address,
  cl.latitude,
  cl.longitude,
  cl.phone,
  cl.email,
  uct.status,
  uct.priority,
  uct.notes,
  uct.contact_name,
  uct.contact_title,
  uct.is_active,
  uct.follow_up_date,
  uct.user_id
FROM user_company_tracking uct
JOIN shared_companies sc ON uct.shared_company_id = sc.id
LEFT JOIN company_locations cl ON uct.location_id = cl.id

UNION ALL

-- Private companies
SELECT
  'private' as source,
  pc.id as company_id,
  pc.name,
  pc.website,
  pc.careers_url,
  pc.address,
  pc.latitude,
  pc.longitude,
  pc.phone,
  pc.email,
  pc.status,
  pc.priority,
  pc.notes,
  pc.contact_name,
  pc.contact_title,
  pc.is_active,
  pc.follow_up_date,
  pc.user_id
FROM private_companies pc;
```

## Match Detection Algorithm

**Decision**: Multi-signal approach with weighted scoring

**Signals**:

1. **Name similarity** (pg_trgm): Score 0-1, threshold 0.3
2. **Location proximity** (PostGIS): Within 5 miles = high confidence
3. **Domain match**: Same website domain = very high confidence

**Logic**:

```typescript
interface MatchResult {
  company: SharedCompany;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

// High confidence: Same domain OR (name >= 0.6 AND within 1 mile)
// Medium confidence: Name >= 0.4 AND within 5 miles
// Low confidence: Name >= 0.3 (suggest but allow new)
```

## Performance Considerations

### Indexing Strategy

```sql
-- Fuzzy name search
CREATE INDEX idx_shared_companies_name_trgm
  ON shared_companies USING GIN (name gin_trgm_ops);

-- Spatial queries
CREATE INDEX idx_company_locations_geom
  ON company_locations USING GIST (
    ST_Point(longitude, latitude)::geography
  );

-- User queries
CREATE INDEX idx_user_tracking_user_id
  ON user_company_tracking(user_id);
CREATE INDEX idx_private_companies_user_id
  ON private_companies(user_id);
```

### Query Optimization

- Unified view uses UNION ALL (not UNION) to avoid sort
- RLS policies use indexed columns
- Limit match suggestions to top 5 results
