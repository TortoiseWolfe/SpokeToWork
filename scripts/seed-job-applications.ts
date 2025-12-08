/**
 * Seed Job Applications for Cleveland, TN Job Search
 *
 * Run with: docker compose exec spoketowork npx tsx scripts/seed-job-applications.ts --user-email=JonPohlner@gmail.com
 *
 * Uses Management API to bypass RLS and seed job applications for a user.
 */

const PROJECT_REF = process.env
  .NEXT_PUBLIC_SUPABASE_URL!.replace('https://', '')
  .split('.')[0];
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

if (!ACCESS_TOKEN) {
  throw new Error('SUPABASE_ACCESS_TOKEN environment variable is required');
}

interface JobPosition {
  company_name: string;
  position_title: string;
  job_link: string | null;
  work_location_type: 'remote' | 'hybrid' | 'on_site';
  priority: 1 | 2 | 3;
  notes: string;
  salary_info?: string;
}

// Priority tech/design positions for full-stack developer with graphic design skills
const priorityPositions: JobPosition[] = [
  {
    company_name: 'Jackson Furniture',
    position_title: 'CAD Product Developer',
    job_link: 'https://jacksonfurniture.applytojob.com/',
    work_location_type: 'on_site',
    priority: 1,
    notes:
      'AutoCAD, 2D/3D design, Assyst software - BEST MATCH for full-stack dev with graphic design skills. M-F schedule, 401(k) with match.',
  },
  {
    company_name: 'Mars',
    position_title: 'Digital Continuous Improvement Engineer',
    job_link: 'https://careers.mars.com/us/en',
    work_location_type: 'on_site',
    priority: 1,
    notes:
      'Computer Science/Digital Technology degree, Industry 4.0. M&M/Mars Chocolate facility in Cleveland. Strong tech match.',
  },
  {
    company_name: 'DENSO',
    position_title: 'Design Engineer 3 (Mechanical)',
    job_link: 'https://www.denso.com/us-ca/en/careers/locations/athens/',
    work_location_type: 'on_site',
    priority: 2,
    salary_info: '$94K-$117K',
    notes:
      'SolidWorks 3D CAD, automation design. Athens, TN location (near Cleveland). Low-cost healthcare, 401(k), tuition reimbursement.',
  },
  {
    company_name: 'Eaton',
    position_title: 'Operations Engineer - Rotational',
    job_link: 'https://eaton.dejobs.org/cleveland/tennessee/usa/jobs/',
    work_location_type: 'on_site',
    priority: 2,
    salary_info: '$67.5K-$99K',
    notes:
      'AutoCAD, Autodesk Inventor, 3D modeling. Engineering degree by May 2026. Industry 4.0 Lighthouse Factory.',
  },
  {
    company_name: 'Cleveland State',
    position_title: 'Adjunct Faculty - CIT/CIS',
    job_link: 'https://careers.tbr.edu',
    work_location_type: 'on_site',
    priority: 2,
    salary_info: '$550-600/credit hr',
    notes:
      "Teaching IT courses - leverage full-stack dev experience. Bachelor's + certification required.",
  },
  {
    company_name: 'Lee University',
    position_title: 'Admin Asst to VP of Marketing',
    job_link: 'https://www.leeuniversity.edu/human-resources/positions/',
    work_location_type: 'on_site',
    priority: 2,
    notes:
      "Social media management, student team leadership. Bachelor's required. Christian faith commitment required.",
  },
  {
    company_name: 'Prior Attire',
    position_title: 'Social Media Coordinator',
    job_link: 'https://shoppriorattire.com/pages/career-opportunities',
    work_location_type: 'on_site',
    priority: 3,
    salary_info: '~$13/hr',
    notes:
      'Video/photo editing, content creation. Consignment shop downtown Cleveland. Check availability.',
  },
];

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

interface QueryResult {
  result?: unknown[];
  error?: string;
}

async function executeSQL(query: string): Promise<unknown[]> {
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
  return result || [];
}

async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const result = (await executeSQL(
    `SELECT id, email FROM auth.users WHERE email = '${escapeSQL(email)}'`
  )) as { id: string; email: string }[];
  return result?.[0] || null;
}

async function getMetroAreaId(
  name: string,
  state: string
): Promise<string | null> {
  const result = (await executeSQL(
    `SELECT id FROM metro_areas WHERE name = '${escapeSQL(name)}' AND state = '${escapeSQL(state)}'`
  )) as { id: string }[];
  return result?.[0]?.id || null;
}

async function findSharedCompany(
  companyName: string,
  metroAreaId: string
): Promise<{ id: string; name: string } | null> {
  // Fuzzy match by name pattern
  const searchName = companyName.split(' ')[0]; // First word for fuzzy match
  const result = (await executeSQL(
    `SELECT id, name FROM shared_companies
     WHERE metro_area_id = '${metroAreaId}'
     AND name ILIKE '%${escapeSQL(searchName)}%'
     LIMIT 1`
  )) as { id: string; name: string }[];
  return result?.[0] || null;
}

async function ensureUserCompanyTracking(
  userId: string,
  sharedCompanyId: string,
  priority: number
): Promise<void> {
  // First check if tracking already exists (unique constraint includes location_id)
  const existing = (await executeSQL(`
    SELECT id FROM user_company_tracking
    WHERE user_id = '${userId}' AND shared_company_id = '${sharedCompanyId}'
    LIMIT 1
  `)) as { id: string }[];

  if (existing && existing.length > 0) {
    return; // Already exists
  }

  // Get the first location for this company (for the FK)
  const locations = (await executeSQL(`
    SELECT id FROM company_locations
    WHERE shared_company_id = '${sharedCompanyId}'
    LIMIT 1
  `)) as { id: string }[];

  const locationId = locations?.[0]?.id || null;
  const locationClause = locationId ? `'${locationId}'` : 'NULL';

  await executeSQL(`
    INSERT INTO user_company_tracking (user_id, shared_company_id, location_id, status, priority, is_active)
    VALUES ('${userId}', '${sharedCompanyId}', ${locationClause}, 'not_contacted', ${priority}, true)
  `);
}

async function createJobApplication(
  userId: string,
  sharedCompanyId: string | null,
  privateCompanyId: string | null,
  position: JobPosition
): Promise<boolean> {
  const positionTitle = escapeSQL(position.position_title);
  const jobLink = position.job_link
    ? `'${escapeSQL(position.job_link)}'`
    : 'NULL';
  const notes = escapeSQL(
    position.salary_info
      ? `${position.salary_info} - ${position.notes}`
      : position.notes
  );

  const sharedId = sharedCompanyId ? `'${sharedCompanyId}'` : 'NULL';
  const privateId = privateCompanyId ? `'${privateCompanyId}'` : 'NULL';

  const sql = `
    INSERT INTO job_applications (
      user_id,
      shared_company_id,
      private_company_id,
      position_title,
      job_link,
      work_location_type,
      status,
      outcome,
      priority,
      notes,
      is_active
    ) VALUES (
      '${userId}',
      ${sharedId},
      ${privateId},
      '${positionTitle}',
      ${jobLink},
      '${position.work_location_type}',
      'not_applied',
      'pending',
      ${position.priority},
      '${notes}',
      true
    )
    RETURNING id
  `;

  try {
    const result = await executeSQL(sql);
    return Array.isArray(result) && result.length > 0;
  } catch (err) {
    console.error(`  Error creating application:`, err);
    return false;
  }
}

async function createPrivateCompany(
  userId: string,
  metroAreaId: string,
  companyName: string,
  position: JobPosition
): Promise<string | null> {
  const name = escapeSQL(companyName);
  const website = position.job_link
    ? `'${escapeSQL(new URL(position.job_link).origin)}'`
    : 'NULL';
  const careersUrl = position.job_link
    ? `'${escapeSQL(position.job_link)}'`
    : 'NULL';

  const sql = `
    INSERT INTO private_companies (
      user_id,
      metro_area_id,
      name,
      website,
      careers_url,
      status,
      priority,
      notes,
      is_active
    ) VALUES (
      '${userId}',
      '${metroAreaId}',
      '${name}',
      ${website},
      ${careersUrl},
      'not_contacted',
      ${position.priority},
      '${escapeSQL(position.notes)}',
      true
    )
    RETURNING id
  `;

  try {
    const result = (await executeSQL(sql)) as { id: string }[];
    return result?.[0]?.id || null;
  } catch (err) {
    console.error(`  Error creating private company:`, err);
    return null;
  }
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith('--user-email='));
  const userEmail = emailArg?.split('=')[1] || process.env.TEST_USER_EMAIL;

  if (!userEmail) {
    console.error(
      'Usage: npx tsx scripts/seed-job-applications.ts --user-email=email@example.com'
    );
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Seed Job Applications');
  console.log('='.repeat(60));
  console.log(`User email: ${userEmail}`);
  console.log(`Project: ${PROJECT_REF}`);

  // Step 1: Look up user
  console.log('\nStep 1: Looking up user...');
  const user = await getUserByEmail(userEmail);
  if (!user) {
    console.error(`  ERROR: User not found with email: ${userEmail}`);
    process.exit(1);
  }
  console.log(`  Found user: ${user.id}`);

  // Step 2: Get Cleveland metro area
  console.log('\nStep 2: Getting Cleveland, TN metro area...');
  const metroAreaId = await getMetroAreaId('Cleveland, TN', 'TN');
  if (!metroAreaId) {
    console.error('  ERROR: Cleveland, TN metro area not found');
    process.exit(1);
  }
  console.log(`  Found metro area: ${metroAreaId}`);

  // Step 3: Process each position
  console.log('\nStep 3: Creating job applications...');
  let created = 0;
  let skipped = 0;

  for (const position of priorityPositions) {
    console.log(
      `\n  Processing: ${position.company_name} - ${position.position_title}`
    );

    // Try to find matching shared company
    const sharedCompany = await findSharedCompany(
      position.company_name,
      metroAreaId
    );

    let sharedCompanyId: string | null = null;
    let privateCompanyId: string | null = null;

    if (sharedCompany) {
      console.log(
        `    Matched to shared company: ${sharedCompany.name} (${sharedCompany.id})`
      );
      sharedCompanyId = sharedCompany.id;

      // Ensure user has tracking record for this company
      await ensureUserCompanyTracking(
        user.id,
        sharedCompanyId,
        position.priority
      );
      console.log(`    Ensured user_company_tracking record`);
    } else {
      // Create as private company
      console.log(`    No shared company match - creating private company`);
      privateCompanyId = await createPrivateCompany(
        user.id,
        metroAreaId,
        position.company_name,
        position
      );
      if (!privateCompanyId) {
        console.log(`    SKIP: Failed to create private company`);
        skipped++;
        continue;
      }
      console.log(`    Created private company: ${privateCompanyId}`);
    }

    // Create job application
    const success = await createJobApplication(
      user.id,
      sharedCompanyId,
      privateCompanyId,
      position
    );

    if (success) {
      console.log(
        `    Created job application (priority ${position.priority})`
      );
      created++;
    } else {
      console.log(`    SKIP: Failed to create application`);
      skipped++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`  Total positions: ${priorityPositions.length}`);
  console.log(`  Applications created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  User: ${userEmail} (${user.id})`);
  console.log('='.repeat(60));

  if (created > 0) {
    console.log('\nNext steps:');
    console.log('  1. Open the app at /companies');
    console.log('  2. Click on a company to see job applications');
    console.log('  3. Update status as you apply to positions');
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
