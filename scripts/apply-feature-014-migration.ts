/**
 * Feature 014: Fix job_applications Schema
 *
 * This script executes the Feature 014 migration via Supabase Management API.
 * It fixes the broken job_applications foreign key that was referencing the
 * deleted 'companies' table and adds proper multi-tenant support.
 *
 * Run via Docker:
 *   docker compose exec spoketowork npx tsx scripts/apply-feature-014-migration.ts
 */

const PROJECT_REF = process.env
  .NEXT_PUBLIC_SUPABASE_URL!.replace('https://', '')
  .split('.')[0];
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

interface QueryResult {
  result?: unknown[];
  error?: string;
}

async function executeSQL(
  query: string,
  description: string
): Promise<QueryResult> {
  console.log(`\n${description}...`);

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`  ERROR: ${error}`);
    return { error };
  }

  const result = await response.json();
  console.log(`  OK`);
  return { result };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Feature 014: Fix job_applications Schema');
  console.log('='.repeat(60));
  console.log(`Project: ${PROJECT_REF}`);

  // Step 1: Check current schema state
  const { result: currentSchema } = await executeSQL(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'job_applications'
    ORDER BY ordinal_position;
    `,
    'Step 1: Checking current schema'
  );
  console.log('  Current columns:', JSON.stringify(currentSchema, null, 2));

  // Step 2: Add contact columns to company_locations (T003)
  await executeSQL(
    `
    ALTER TABLE company_locations
      ADD COLUMN IF NOT EXISTS contact_name TEXT,
      ADD COLUMN IF NOT EXISTS contact_title TEXT;

    COMMENT ON COLUMN company_locations.contact_name IS 'Primary contact name at this location (Feature 014)';
    COMMENT ON COLUMN company_locations.contact_title IS 'Primary contact job title (Feature 014)';
    `,
    'Step 2: Adding contact columns to company_locations (T003)'
  );

  // Step 3: Drop broken FK constraint (T004 Step 1)
  await executeSQL(
    `
    ALTER TABLE job_applications
      DROP CONSTRAINT IF EXISTS job_applications_company_id_fkey;
    `,
    'Step 3: Dropping broken FK constraint'
  );

  // Step 4: Drop broken column (T004 Step 2)
  await executeSQL(
    `
    ALTER TABLE job_applications
      DROP COLUMN IF EXISTS company_id;
    `,
    'Step 4: Dropping broken company_id column'
  );

  // Step 5: Add new multi-tenant columns (T004 Step 3)
  await executeSQL(
    `
    ALTER TABLE job_applications
      ADD COLUMN IF NOT EXISTS shared_company_id UUID REFERENCES shared_companies(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS private_company_id UUID REFERENCES private_companies(id) ON DELETE CASCADE;
    `,
    'Step 5: Adding shared_company_id and private_company_id columns'
  );

  // Step 6: Add CHECK constraint (T004 Step 4)
  await executeSQL(
    `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'job_applications_company_ref_check'
      ) THEN
        ALTER TABLE job_applications
          ADD CONSTRAINT job_applications_company_ref_check
          CHECK (
            (shared_company_id IS NOT NULL AND private_company_id IS NULL) OR
            (shared_company_id IS NULL AND private_company_id IS NOT NULL)
          );
      END IF;
    END $$;
    `,
    'Step 6: Adding CHECK constraint (exactly one company reference)'
  );

  // Step 7: Add indexes (T004 Step 5)
  await executeSQL(
    `
    CREATE INDEX IF NOT EXISTS idx_job_applications_shared_company
      ON job_applications(shared_company_id) WHERE shared_company_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_job_applications_private_company
      ON job_applications(private_company_id) WHERE private_company_id IS NOT NULL;
    `,
    'Step 7: Creating partial indexes'
  );

  // Step 8: Drop old index (T004 Step 6)
  await executeSQL(
    `
    DROP INDEX IF EXISTS idx_job_applications_company;
    `,
    'Step 8: Dropping old idx_job_applications_company index'
  );

  // Step 9: Add column comments
  await executeSQL(
    `
    COMMENT ON COLUMN job_applications.shared_company_id IS 'FK to shared_companies for community companies (Feature 014)';
    COMMENT ON COLUMN job_applications.private_company_id IS 'FK to private_companies for user-created companies (Feature 014)';
    `,
    'Step 9: Adding column comments'
  );

  // Verify final schema
  const { result: finalSchema } = await executeSQL(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'job_applications'
      AND column_name IN ('shared_company_id', 'private_company_id', 'company_id')
    ORDER BY column_name;
    `,
    'Verification: Checking final schema'
  );
  console.log('  Final columns:', JSON.stringify(finalSchema, null, 2));

  // Check constraint
  const { result: constraints } = await executeSQL(
    `
    SELECT conname, contype
    FROM pg_constraint
    WHERE conrelid = 'job_applications'::regclass
      AND conname = 'job_applications_company_ref_check';
    `,
    'Verification: Checking constraint'
  );
  console.log('  Constraints:', JSON.stringify(constraints, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Feature 014 migration complete!');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
