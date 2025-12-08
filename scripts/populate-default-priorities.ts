import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BackupCompany {
  name: string;
  priority: number;
}

interface BackupData {
  companies: BackupCompany[];
}

async function main() {
  console.log('Reading backup file...');
  const backup: BackupData = JSON.parse(
    readFileSync('data/companies_backup.json', 'utf-8')
  );

  console.log(`Found ${backup.companies.length} companies in backup\n`);

  // Build priority map by name
  const priorityMap = new Map<string, number>();
  backup.companies.forEach((c) => {
    priorityMap.set(c.name.toLowerCase(), c.priority);
  });

  // Get all shared companies
  const { data: sharedCompanies, error } = await supabase
    .from('shared_companies')
    .select('id, name');

  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }

  console.log(
    `Found ${sharedCompanies?.length} shared companies in database\n`
  );

  // Update each company's default_priority
  let updated = 0;
  let notFound = 0;
  const priorityCount: Record<number, number> = {};

  for (const company of sharedCompanies || []) {
    const priority = priorityMap.get(company.name.toLowerCase());

    if (priority) {
      const { error: updateError } = await supabase
        .from('shared_companies')
        .update({ default_priority: priority })
        .eq('id', company.id);

      if (updateError) {
        console.error(`Failed to update ${company.name}:`, updateError.message);
      } else {
        updated++;
        priorityCount[priority] = (priorityCount[priority] || 0) + 1;
      }
    } else {
      notFound++;
      console.log(`No backup priority for: ${company.name}`);
    }
  }

  console.log(`\n✓ Updated ${updated} companies`);
  console.log(`⚠ ${notFound} companies not found in backup\n`);
  console.log('Priority distribution:', priorityCount);
}

main().catch(console.error);
