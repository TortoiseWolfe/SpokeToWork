/**
 * Supabase Admin Utilities for E2E Tests
 *
 * Uses the Supabase Management API against the hosted project, or a direct
 * Postgres connection against the throwaway local stack used by CI.
 * Requires NEXT_PUBLIC_SUPABASE_URL plus either SUPABASE_ACCESS_TOKEN (cloud)
 * or SUPABASE_DB_URL (local).
 *
 * Feature: 062-fix-e2e-auth
 */

import 'dotenv/config';
import { Client } from 'pg';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const LOCAL_DB_URL = process.env.SUPABASE_DB_URL;

/**
 * True when NEXT_PUBLIC_SUPABASE_URL points at a local stack rather than a
 * hosted Supabase project.
 */
export function isLocalSupabase(): boolean {
  if (!SUPABASE_URL) return false;
  try {
    const host = new URL(SUPABASE_URL).hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

/**
 * True when this process has a way to run arbitrary SQL against the test DB.
 */
export function canExecuteSQL(): boolean {
  return isLocalSupabase()
    ? !!LOCAL_DB_URL
    : !!(PROJECT_REF && ACCESS_TOKEN);
}

/**
 * Escape a string for safe SQL interpolation.
 * Prevents SQL injection by escaping single quotes and backslashes.
 */
export function escapeSQL(value: string): string {
  // Escape backslashes first, then single quotes
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

/**
 * Execute SQL directly against the local Postgres instance.
 * Handles multi-statement strings by returning the rows from the final
 * statement that produced any (matching the Management API behaviour the
 * tests were written against).
 */
async function executeLocalSQL(query: string): Promise<unknown[]> {
  if (!LOCAL_DB_URL) {
    console.log('Skipping SQL: Missing SUPABASE_DB_URL');
    return [];
  }

  const client = new Client({ connectionString: LOCAL_DB_URL });
  await client.connect();
  try {
    const result = await client.query(query);
    const results = Array.isArray(result) ? result : [result];
    const withRows = [...results]
      .reverse()
      .find((r) => Array.isArray(r.rows) && r.rows.length > 0);
    return (withRows ?? results[results.length - 1])?.rows ?? [];
  } finally {
    await client.end();
  }
}

/**
 * Execute SQL via the Supabase Management API (cloud) or a direct Postgres
 * connection (local stack). Both paths bypass RLS.
 */
export async function executeSQL(
  query: string,
  retries = 5,
  baseDelay = 2000
): Promise<unknown[]> {
  if (isLocalSupabase()) {
    return executeLocalSQL(query);
  }

  if (!PROJECT_REF || !ACCESS_TOKEN) {
    console.log('Skipping SQL: Missing SUPABASE_URL or ACCESS_TOKEN');
    return [];
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
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

    if (response.ok) {
      return response.json();
    }

    // Handle rate limiting with exponential backoff + jitter
    if (response.status === 429 && attempt < retries) {
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(
        `Rate limited (attempt ${attempt + 1}/${retries}), retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    const errorText = await response.text();

    // Programming errors are ALWAYS a bug in the test, never a legitimate
    // runtime state — and swallowing them into `[]` is indistinguishable from
    // "the query ran and matched nothing". That is not hypothetical: a query
    // against a non-existent `connections` table (the table is
    // `user_connections`) returned [] for weeks, and the caller reported it as
    // "the UI claimed success but no row was written — silent send failure".
    // A test bug impersonated a data-loss bug and kept main red.
    //
    // These SQLSTATEs are fatal. Everything else (transient 5xx, permissions,
    // exhausted retries) keeps the tolerant behaviour the 85 call sites rely
    // on, so cleanup helpers still degrade gracefully.
    //   42P01 undefined_table    42703 undefined_column
    //   42601 syntax_error       42883 undefined_function
    if (/\b(42P01|42703|42601|42883)\b/.test(errorText)) {
      throw new Error(
        `SQL is malformed — this is a bug in the test, not a data condition.\n` +
          `Query: ${query}\nResponse: ${response.status} ${errorText}`
      );
    }

    console.warn(`SQL warning: ${response.status} - ${errorText}`);
    return [];
  }

  return [];
}

// Home the route specs assert on (route-home-connection.spec.ts expects route
// geometry to start here). The live database's test user had this saved; a fresh
// local database has none, so seed the same point instead of a Chattanooga one.
const TEST_HOME_LAT = 35.1778384;
const TEST_HOME_LNG = -84.8353553;

/**
 * Ensure test user has routes for route E2E tests
 *
 * Creates 3 routes if user has less than 2 routes.
 * Routes use test user's home coordinates.
 */
export async function ensureTestRoutes(userEmail: string): Promise<void> {
  if (!canExecuteSQL()) {
    console.log('Skipping route setup: Missing database credentials');
    return;
  }

  console.log('Checking test routes...');

  // Get user ID and check existing routes
  // Home location lives in user_home_locations, not user_profiles — the
  // columns were split off user_profiles (dropped there) so that no
  // cross-user read path can expose a job seeker's home address.
  const result = (await executeSQL(`
    SELECT
      u.id as user_id,
      uhl.home_latitude,
      uhl.home_longitude,
      (SELECT COUNT(*) FROM bicycle_routes br WHERE br.user_id = u.id) as route_count
    FROM auth.users u
    LEFT JOIN user_home_locations uhl ON uhl.user_id = u.id
    WHERE u.email = '${escapeSQL(userEmail)}'
  `)) as Array<{
    user_id: string;
    home_latitude: number | null;
    home_longitude: number | null;
    route_count: string;
  }>;

  if (!result?.[0]?.user_id) {
    console.log('Test user not found, skipping route setup');
    return;
  }

  const { user_id, home_latitude, home_longitude, route_count } = result[0];
  const existingRoutes = parseInt(route_count || '0', 10);

  // Seeded routes need a drawn path (route_geometry) or the map has no
  // `route-*` layers and no start/end markers to assert on, and the primary
  // user needs a saved home so the home marker renders. Both statements are
  // idempotent and run on every setup, including when the routes already exist.
  const seedGeometryAndHome = async (
    homeLat: number,
    homeLng: number
  ): Promise<void> => {
    await executeSQL(`
      INSERT INTO user_home_locations (user_id, home_address, home_latitude, home_longitude)
      VALUES ('${escapeSQL(user_id)}', 'Chattanooga, TN', ${homeLat}, ${homeLng})
      ON CONFLICT (user_id) DO NOTHING
    `);
    await executeSQL(`
      UPDATE bicycle_routes
      SET route_geometry = jsonb_build_object(
        'type', 'LineString',
        'coordinates', jsonb_build_array(
          jsonb_build_array(start_longitude, start_latitude),
          jsonb_build_array(end_longitude, end_latitude)
        )
      )
      WHERE user_id = '${escapeSQL(user_id)}'
        AND is_system_route = FALSE
        AND route_geometry IS NULL
        AND name IN ('Downtown Loop', 'River Trail', 'East Side Route')
    `);
    // The map draws the glow layer only for the user's active route
    // (active_route_planning, one row per user). A fresh database has none,
    // so make "Downtown Loop" active unless the user already chose one.
    await executeSQL(`
      INSERT INTO active_route_planning (user_id, route_id)
      SELECT '${escapeSQL(user_id)}', br.id
      FROM bicycle_routes br
      WHERE br.user_id = '${escapeSQL(user_id)}'
        AND br.is_system_route = FALSE
        AND br.name = 'Downtown Loop'
      LIMIT 1
      ON CONFLICT (user_id) DO NOTHING
    `);
  };

  if (existingRoutes >= 2) {
    console.log(`Test user has ${existingRoutes} routes`);
    await seedGeometryAndHome(
      home_latitude ?? TEST_HOME_LAT,
      home_longitude ?? TEST_HOME_LNG
    );
    return;
  }

  console.log(
    `Test user has ${existingRoutes} routes, creating test routes...`
  );

  // Use the user's real home, or fall back to Chattanooga. Log the fallback:
  // while this query was reading dropped columns it always fell through here,
  // so route E2E seeded fixed coordinates and passed regardless of the data.
  if (home_latitude == null || home_longitude == null) {
    console.log(
      `No home location for ${userEmail} — seeding routes from the fixture home coordinates`
    );
  }
  const homeLat = home_latitude ?? TEST_HOME_LAT;
  const homeLng = home_longitude ?? TEST_HOME_LNG;

  const routes = [
    {
      name: 'Downtown Loop',
      color: '#3B82F6',
      startLat: homeLat,
      startLng: homeLng,
      endLat: homeLat + 0.01,
      endLng: homeLng + 0.01,
    },
    {
      name: 'River Trail',
      color: '#10B981',
      startLat: homeLat,
      startLng: homeLng,
      endLat: homeLat + 0.02,
      endLng: homeLng - 0.01,
    },
    {
      name: 'East Side Route',
      color: '#F59E0B',
      startLat: homeLat,
      startLng: homeLng,
      endLat: homeLat - 0.01,
      endLng: homeLng + 0.02,
    },
  ];

  for (const route of routes) {
    await executeSQL(`
      INSERT INTO bicycle_routes (
        user_id, name, color, is_active, is_system_route,
        start_latitude, start_longitude, end_latitude, end_longitude,
        created_at, updated_at
      )
      SELECT
        '${escapeSQL(user_id)}', '${escapeSQL(route.name)}', '${escapeSQL(route.color)}', TRUE, FALSE,
        ${route.startLat}, ${route.startLng}, ${route.endLat}, ${route.endLng},
        NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM bicycle_routes WHERE user_id = '${escapeSQL(user_id)}' AND name = '${escapeSQL(route.name)}'
      )
    `);
  }

  await seedGeometryAndHome(homeLat, homeLng);

  console.log(`Created ${routes.length} test routes for ${userEmail}`);
}
