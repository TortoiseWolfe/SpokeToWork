# Data Model: Job Applications and Data Quality Fix

**Feature**: 014-job-applications-fix
**Date**: 2025-12-07

## Entity Changes

### Modified: `job_applications`

**Current State (BROKEN)**:

```
job_applications
├── id: UUID (PK)
├── company_id: UUID → companies(id)  ❌ BROKEN - table deleted
├── user_id: UUID → auth.users(id)
├── position_title: TEXT
├── status: TEXT (not_applied|applied|screening|interviewing|offer|closed)
├── ...
```

**Target State (FIXED)**:

```
job_applications
├── id: UUID (PK)
├── shared_company_id: UUID → shared_companies(id) [NULLABLE]
├── private_company_id: UUID → private_companies(id) [NULLABLE]
├── user_id: UUID → auth.users(id)
├── position_title: TEXT
├── status: TEXT (not_applied|applied|screening|interviewing|offer|closed)
├── ...
└── CONSTRAINT: exactly one of shared_company_id OR private_company_id must be set
```

**Migration SQL**:

```sql
-- Step 1: Drop broken FK
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_company_id_fkey;

-- Step 2: Drop broken column
ALTER TABLE job_applications
  DROP COLUMN IF EXISTS company_id;

-- Step 3: Add new columns
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS shared_company_id UUID
    REFERENCES shared_companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS private_company_id UUID
    REFERENCES private_companies(id) ON DELETE CASCADE;

-- Step 4: Add CHECK constraint
ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_company_ref_check
  CHECK (
    (shared_company_id IS NOT NULL AND private_company_id IS NULL) OR
    (shared_company_id IS NULL AND private_company_id IS NOT NULL)
  );

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_shared_company
  ON job_applications(shared_company_id) WHERE shared_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_applications_private_company
  ON job_applications(private_company_id) WHERE private_company_id IS NOT NULL;
```

---

### Modified: `company_locations`

**Current State**:

```
company_locations
├── id: UUID (PK)
├── shared_company_id: UUID → shared_companies(id)
├── address: VARCHAR(500)
├── latitude: DECIMAL(10,7)
├── longitude: DECIMAL(10,7)
├── phone: VARCHAR(20)  ✅ EXISTS
├── email: VARCHAR(255)  ✅ EXISTS
├── is_headquarters: BOOLEAN
└── created_at: TIMESTAMPTZ
```

**Target State (ENHANCED)**:

```
company_locations
├── id: UUID (PK)
├── shared_company_id: UUID → shared_companies(id)
├── address: VARCHAR(500)
├── latitude: DECIMAL(10,7)
├── longitude: DECIMAL(10,7)
├── phone: VARCHAR(20)
├── email: VARCHAR(255)
├── contact_name: TEXT  ← NEW
├── contact_title: TEXT  ← NEW
├── is_headquarters: BOOLEAN
└── created_at: TIMESTAMPTZ
```

**Migration SQL**:

```sql
ALTER TABLE company_locations
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_title TEXT;
```

---

### Unchanged: `user_company_tracking`

Structure unchanged, but data needs fixing:

**Current Data Issue**:

- All 415 rows have `priority = 3`
- Should have varied priorities (1-5) from original data

**Data Migration**:

```sql
-- Will be executed via Supabase Management API
-- Match by company name from backup file
UPDATE user_company_tracking uct
SET priority = [value_from_backup]
FROM shared_companies sc
WHERE uct.shared_company_id = sc.id
  AND sc.name = [name_from_backup];
```

---

## Entity Relationships

```
┌─────────────────────┐
│   auth.users        │
└─────────┬───────────┘
          │ 1:N
          ▼
┌─────────────────────┐      ┌─────────────────────┐
│  job_applications   │──────│  shared_companies   │
│                     │  N:1 │                     │
│  shared_company_id ─┼──────│  id                 │
│  private_company_id─┼──┐   └─────────┬───────────┘
│  user_id           ─┼──┘             │ 1:N
└─────────────────────┘                ▼
          │              ┌─────────────────────┐
          │              │  company_locations  │
          │              │                     │
          │              │  contact_name       │
          │              │  contact_title      │
          │              │  phone              │
          │              │  email              │
          │              └─────────────────────┘
          │
          └──────────────┬─────────────────────┐
                     N:1 │                     │
                         ▼                     │
               ┌─────────────────────┐         │
               │  private_companies  │◄────────┘
               │                     │
               │  (user-created)     │
               └─────────────────────┘
```

---

## TypeScript Type Updates

### `types/company.ts`

**Before**:

```typescript
interface JobApplication {
  id: string;
  company_id: string; // ❌ References deleted table
  user_id: string;
  // ...
}
```

**After**:

```typescript
interface JobApplication {
  id: string;
  shared_company_id: string | null; // ← NEW
  private_company_id: string | null; // ← NEW
  user_id: string;
  // ...
}

// Helper type for company reference
type CompanyReference =
  | { shared_company_id: string; private_company_id: null }
  | { shared_company_id: null; private_company_id: string };
```

---

## RLS Policy Updates

```sql
-- Ensure users can only see their own applications
DROP POLICY IF EXISTS "Users can view own applications" ON job_applications;
CREATE POLICY "Users can view own applications" ON job_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own applications" ON job_applications;
CREATE POLICY "Users can insert own applications" ON job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own applications" ON job_applications;
CREATE POLICY "Users can update own applications" ON job_applications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own applications" ON job_applications;
CREATE POLICY "Users can delete own applications" ON job_applications
  FOR DELETE USING (auth.uid() = user_id);
```
