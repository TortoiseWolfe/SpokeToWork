import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = process.env
  .NEXT_PUBLIC_SUPABASE_URL!.replace('https://', '')
  .split('.')[0];
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

async function executeSQL(query: string): Promise<void> {
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
    throw new Error(`SQL failed: ${error}`);
  }

  const result = await response.json();
  console.log('Result:', JSON.stringify(result).slice(0, 200));
}

async function main() {
  console.log('Step 1: Adding check constraint...');
  try {
    await executeSQL(`
      DO $$
      BEGIN
        ALTER TABLE shared_companies
        ADD CONSTRAINT check_default_priority CHECK (default_priority IN (1, 2, 3, 5));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('✓ Constraint added/exists');
  } catch (e: any) {
    console.log(
      'Constraint error (may already exist):',
      e.message?.slice(0, 100)
    );
  }

  console.log('\nStep 2: Updating seed_user_companies trigger function...');
  await executeSQL(`
    CREATE OR REPLACE FUNCTION seed_user_companies()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      IF NEW.metro_area_id IS NOT NULL AND (OLD IS NULL OR OLD.metro_area_id IS NULL) THEN
        INSERT INTO user_company_tracking (user_id, shared_company_id, status, priority, is_active)
        SELECT
          NEW.id,
          sc.id,
          'not_contacted',
          COALESCE(sc.default_priority, 3),
          true
        FROM shared_companies sc
        WHERE sc.metro_area_id = NEW.metro_area_id
          AND sc.is_seed = true
          AND sc.is_verified = true
        ON CONFLICT DO NOTHING;
      END IF;
      RETURN NEW;
    END;
    $fn$;
  `);
  console.log('✓ Trigger function updated');

  console.log('\nStep 3: Verifying column exists...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('shared_companies')
    .select('id, name, default_priority')
    .limit(3);

  console.log('Sample data:', data);
}

main().catch(console.error);
