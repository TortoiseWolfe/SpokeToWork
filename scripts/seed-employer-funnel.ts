/**
 * seed-employer-funnel.ts
 *
 * Seeds the employer dashboard funnel for every employer who ALREADY has a
 * company link (employer_company_links). No new users or links are created —
 * applications are inserted from existing worker users into each linked
 * company, so the funnel visualisation shows data on first login instead of
 * an empty state.
 *
 * Differs from seed-employer-data.ts:
 *   - Works on local Supabase (service-role key). seed-employer-data.ts uses
 *     the Management API which only works against Cloud.
 *   - Does not create users or links — expects the employer to already exist.
 *   - Idempotent: seeded rows are tagged with notes='[seed:employer-funnel]'
 *     and cleared on each run before re-inserting.
 *
 * Funnel per company (18 apps over 28 days — active pipeline halves at each
 * stage for a realistic narrowing shape; closed is historical accumulation):
 *   8 applied · 4 screening · 2 interviewing · 1 offer · 3 closed
 *
 * Run:
 *   docker compose exec spoketowork pnpm run seed:employer-funnel
 *
 * Requires in .env:
 *   SUPABASE_INTERNAL_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SEED_TAG = '[seed:employer-funnel]';

/** Fixed admin UUID from seed-test-users.ts — never a funnel applicant. */
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

const supabaseUrl =
  process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing Supabase credentials. Need SUPABASE_INTERNAL_URL (or ' +
      'NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------

type Status = 'applied' | 'screening' | 'interviewing' | 'offer' | 'closed';
type Outcome = 'pending' | 'hired' | 'rejected';

interface Slot {
  status: Status;
  outcome: Outcome;
  daysAgo: number;
  position: string;
  /** Days from now (positive = future) + HH:MM local. Only set for interviewing slots. */
  interview?: { inDays: number; at: string };
}

const POSITIONS = [
  'Bike Courier',
  'Shop Mechanic',
  'Delivery Lead',
  'Route Planner',
  'Fleet Coordinator',
  'Service Tech',
];

/**
 * 18-slot funnel template. Active pipeline narrows 8→4→2→1 (roughly halving
 * at each stage — textbook conic). Closed stays at 3 since it's historical
 * accumulation across the 28-day window, not "the narrow end of the funnel".
 */
const FUNNEL: Slot[] = [
  // 8 applied (days 0–6) — top of funnel, wide
  { status: 'applied', outcome: 'pending', daysAgo: 0, position: POSITIONS[0] },
  { status: 'applied', outcome: 'pending', daysAgo: 1, position: POSITIONS[1] },
  { status: 'applied', outcome: 'pending', daysAgo: 2, position: POSITIONS[2] },
  { status: 'applied', outcome: 'pending', daysAgo: 3, position: POSITIONS[3] },
  { status: 'applied', outcome: 'pending', daysAgo: 4, position: POSITIONS[4] },
  { status: 'applied', outcome: 'pending', daysAgo: 5, position: POSITIONS[5] },
  { status: 'applied', outcome: 'pending', daysAgo: 6, position: POSITIONS[0] },
  { status: 'applied', outcome: 'pending', daysAgo: 6, position: POSITIONS[1] },
  // 4 screening (days 8–12)
  {
    status: 'screening',
    outcome: 'pending',
    daysAgo: 8,
    position: POSITIONS[2],
  },
  {
    status: 'screening',
    outcome: 'pending',
    daysAgo: 9,
    position: POSITIONS[3],
  },
  {
    status: 'screening',
    outcome: 'pending',
    daysAgo: 11,
    position: POSITIONS[4],
  },
  {
    status: 'screening',
    outcome: 'pending',
    daysAgo: 12,
    position: POSITIONS[5],
  },
  // 2 interviewing (days 14–17) — interviews scheduled in the near future
  {
    status: 'interviewing',
    outcome: 'pending',
    daysAgo: 14,
    position: POSITIONS[0],
    interview: { inDays: 2, at: '10:00' },
  },
  {
    status: 'interviewing',
    outcome: 'pending',
    daysAgo: 17,
    position: POSITIONS[2],
    interview: { inDays: 5, at: '14:30' },
  },
  // 1 offer (day 20)
  { status: 'offer', outcome: 'pending', daysAgo: 20, position: POSITIONS[4] },
  // 3 closed (days 22–28) — historical accumulation, mixed outcomes
  { status: 'closed', outcome: 'hired', daysAgo: 22, position: POSITIONS[3] },
  {
    status: 'closed',
    outcome: 'rejected',
    daysAgo: 25,
    position: POSITIONS[1],
  },
  {
    status: 'closed',
    outcome: 'rejected',
    daysAgo: 28,
    position: POSITIONS[5],
  },
];

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** YYYY-MM-DD, n days in the past. */
function dateDaysAgo(n: number): string {
  return isoDaysAgo(n).slice(0, 10);
}

/** ISO timestamp n days in the future at HH:MM (zero seconds/ms). */
function isoDaysAhead(n: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Seeding employer dashboard funnel...\n');

  // --- 1. Discover linked companies --------------------------------------
  // Any company with at least one employer_company_links row gets a funnel.
  const { data: links, error: linksErr } = await supabase
    .from('employer_company_links')
    .select('shared_company_id, user_id');

  if (linksErr) {
    console.error('Failed to read employer_company_links:', linksErr.message);
    process.exit(1);
  }

  if (!links || links.length === 0) {
    console.error(
      'No employer_company_links found.\n\n' +
        'This script seeds applications for employers who ALREADY have a\n' +
        'company. Link a company first:\n' +
        '  · Through the app: sign in as an employer, visit /employer,\n' +
        '    and claim a company from shared_companies.\n' +
        '  · Or on Cloud: run `pnpm run seed:employer` (Management API,\n' +
        '    creates a test employer + links).'
    );
    process.exit(1);
  }

  const companyIds = [...new Set(links.map((l) => l.shared_company_id))];
  const employerIds = [...new Set(links.map((l) => l.user_id))];

  console.log(
    `Found ${links.length} link(s) → ${companyIds.length} company(ies), ` +
      `${employerIds.length} employer(s)`
  );

  // --- 2. Discover worker applicants -------------------------------------
  // role='worker' excludes employers (role='employer') and admins (role='admin'),
  // but the admin profile's role defaults to 'worker' if never explicitly set.
  // Belt-and-braces: also exclude the fixed admin UUID and any user who holds
  // an employer_company_link (an employer shouldn't apply to their own funnel).
  const excludeIds = [...employerIds, ADMIN_USER_ID];
  const { data: workers, error: workersErr } = await supabase
    .from('user_profiles')
    .select('id, display_name, username')
    .eq('role', 'worker')
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .limit(20);

  if (workersErr) {
    console.error('Failed to read worker profiles:', workersErr.message);
    process.exit(1);
  }

  if (!workers || workers.length === 0) {
    console.error(
      'No worker users found (user_profiles.role = "worker").\n' +
        'Run seed-test-users.ts first to create test workers.'
    );
    process.exit(1);
  }

  console.log(`Found ${workers.length} worker applicant(s):`);
  workers.forEach((w) =>
    console.log(`  · ${w.display_name ?? w.username ?? w.id}`)
  );

  // --- 3. Idempotency: clear previously-seeded rows ----------------------
  const { error: delErr } = await supabase
    .from('job_applications')
    .delete()
    .eq('notes', SEED_TAG);

  if (delErr) {
    console.error('Failed to clear prior seed:', delErr.message);
    process.exit(1);
  }
  console.log(`\nCleared prior ${SEED_TAG} rows`);

  // --- 4. Build + insert -------------------------------------------------
  // Full 15-slot funnel per company. Workers cycle through slots — if there
  // are fewer workers than slots, some naturally repeat (exercises the
  // isRepeat badge in ApplicationRow).
  const rows = companyIds.flatMap((companyId, ci) =>
    FUNNEL.map((slot, si) => {
      const worker = workers[(ci * FUNNEL.length + si) % workers.length];
      const ts = isoDaysAgo(slot.daysAgo);
      return {
        shared_company_id: companyId,
        private_company_id: null,
        user_id: worker.id,
        position_title: slot.position,
        status: slot.status,
        outcome: slot.outcome,
        date_applied: dateDaysAgo(slot.daysAgo),
        interview_date: slot.interview
          ? isoDaysAhead(slot.interview.inDays, slot.interview.at)
          : null,
        work_location_type: 'on_site',
        priority: 3,
        is_active: true,
        notes: SEED_TAG,
        created_at: ts,
        updated_at: ts,
      };
    })
  );

  console.log(
    `Inserting ${rows.length} application(s) across ${companyIds.length} company(ies)...`
  );

  const { error: insErr } = await supabase
    .from('job_applications')
    .insert(rows);

  if (insErr) {
    console.error('Insert failed:', insErr.message);
    process.exit(1);
  }

  // --- Summary -----------------------------------------------------------
  const dist = FUNNEL.reduce<Record<Status, number>>(
    (acc, s) => ((acc[s.status] = (acc[s.status] ?? 0) + 1), acc),
    {} as Record<Status, number>
  );
  const distStr = Object.entries(dist)
    .map(([k, v]) => `${v} ${k}`)
    .join(' · ');

  console.log(
    `\n✓ Seeded ${rows.length} applications (per company: ${distStr})`
  );
  console.log('Sign in as any linked employer and visit /employer.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
