/**
 * Supabase Admin Utilities for E2E Tests
 *
 * Uses Supabase Management API to bypass RLS for test data setup.
 * Requires SUPABASE_ACCESS_TOKEN and NEXT_PUBLIC_SUPABASE_URL in env.
 *
 * Feature: 062-fix-e2e-auth
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

/**
 * Execute SQL via Supabase Management API (bypasses RLS)
 */
export async function executeSQL(query: string): Promise<unknown[]> {
  if (!PROJECT_REF || !ACCESS_TOKEN) {
    console.log('Skipping SQL: Missing SUPABASE_URL or ACCESS_TOKEN');
    return [];
  }

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
    const errorText = await response.text();
    console.warn(`SQL warning: ${response.status} - ${errorText}`);
    return [];
  }

  return response.json();
}

/**
 * Ensure test user has routes for route E2E tests
 *
 * Creates 3 routes if user has less than 2 routes.
 * Routes use test user's home coordinates.
 */
export async function ensureTestRoutes(userEmail: string): Promise<void> {
  if (!PROJECT_REF || !ACCESS_TOKEN) {
    console.log('Skipping route setup: Missing SUPABASE_ACCESS_TOKEN');
    return;
  }

  console.log('Checking test routes...');

  // Get user ID and check existing routes
  const result = (await executeSQL(`
    SELECT
      u.id as user_id,
      up.home_latitude,
      up.home_longitude,
      (SELECT COUNT(*) FROM bicycle_routes br WHERE br.user_id = u.id) as route_count
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    WHERE u.email = '${userEmail}'
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

  if (existingRoutes >= 2) {
    console.log(`Test user has ${existingRoutes} routes`);
    return;
  }

  console.log(
    `Test user has ${existingRoutes} routes, creating test routes...`
  );

  // Use user's home or fallback to Chattanooga area coordinates
  const homeLat = home_latitude || 35.0456;
  const homeLng = home_longitude || -85.3097;

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
        '${user_id}', '${route.name}', '${route.color}', TRUE, FALSE,
        ${route.startLat}, ${route.startLng}, ${route.endLat}, ${route.endLng},
        NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM bicycle_routes WHERE user_id = '${user_id}' AND name = '${route.name}'
      )
    `);
  }

  console.log(`Created ${routes.length} test routes for ${userEmail}`);
}
