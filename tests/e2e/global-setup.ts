/**
 * Global Setup for E2E Tests
 *
 * Runs before any test to clean up orphaned e2e-* test users from previous
 * crashed or interrupted test runs. This prevents database clutter and
 * rate limiting issues.
 */

import { FullConfig } from '@playwright/test';

require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function executeSQL(query: string): Promise<unknown[]> {
  if (!PROJECT_REF || !ACCESS_TOKEN) {
    console.log('Skipping cleanup: Missing SUPABASE_URL or ACCESS_TOKEN');
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
    console.warn(`SQL cleanup warning: ${response.status} - ${errorText}`);
    return [];
  }

  return response.json();
}

async function cleanupOrphanedE2EUsers(): Promise<void> {
  console.log('🧹 Cleaning up orphaned e2e-* test users...');

  try {
    // Count orphaned users first
    const countResult = (await executeSQL(
      `SELECT COUNT(*) as count FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'`
    )) as { count: string }[];

    const count = parseInt(countResult[0]?.count || '0', 10);

    if (count === 0) {
      console.log('✓ No orphaned e2e-* users found');
      return;
    }

    console.log(`Found ${count} orphaned e2e-* users, cleaning up...`);

    // Delete dependent records first
    await executeSQL(`
      DELETE FROM user_company_tracking WHERE user_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM user_encryption_keys WHERE user_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT c.id FROM conversations c
        JOIN auth.users u ON (c.participant_1_id = u.id OR c.participant_2_id = u.id)
        WHERE u.email LIKE 'e2e-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM conversations WHERE participant_1_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'
      ) OR participant_2_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM user_profiles WHERE id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM auth.identities WHERE user_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM auth.users WHERE email LIKE 'e2e-%@mailinator.com'
    `);

    console.log(`✓ Cleaned up ${count} orphaned e2e-* users`);
  } catch (error) {
    console.warn('⚠ Cleanup warning:', error);
    // Don't fail tests if cleanup fails
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  await cleanupOrphanedE2EUsers();
}
