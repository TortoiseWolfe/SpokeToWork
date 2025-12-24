/**
 * Global Setup for E2E Tests
 *
 * Runs before any test to clean up orphaned e2e-* test users from previous
 * crashed or interrupted test runs. This prevents database clutter and
 * rate limiting issues.
 */

import { FullConfig } from '@playwright/test';
import { executeSQL } from './utils/supabase-admin';

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
