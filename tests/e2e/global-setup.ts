/**
 * Global Setup for E2E Tests
 *
 * Runs before any test to:
 * 1. Clean up orphaned e2e-* test users from previous crashed runs
 * 2. Ensure admin user (spoketowork) exists with ECDH encryption keys
 *    for welcome message and complete flow tests
 */

import { FullConfig } from '@playwright/test';
import * as crypto from 'crypto';
import { executeSQL } from './utils/supabase-admin';

const ADMIN_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@spoketowork.com',
  username: 'spoketowork',
  displayName: 'SpokeToWork',
};

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

/**
 * Ensure admin user exists with ECDH P-256 encryption keys.
 *
 * The admin user (spoketowork) is needed for welcome message tests and
 * complete flow specs. Creates via SQL through the Management API so it
 * works in CI without SUPABASE_SERVICE_ROLE_KEY.
 */
async function ensureAdminUser(): Promise<void> {
  console.log('🔑 Ensuring admin user exists for welcome message tests...');

  try {
    // Check if admin profile already exists
    const profiles = (await executeSQL(
      `SELECT id FROM user_profiles WHERE username = '${ADMIN_USER.username}'`
    )) as { id: string }[];

    if (profiles[0]?.id) {
      // Admin profile exists — check if they have encryption keys
      const keys = (await executeSQL(
        `SELECT id FROM user_encryption_keys WHERE user_id = '${profiles[0].id}' AND revoked = false`
      )) as { id: string }[];

      if (keys[0]?.id) {
        console.log('✓ Admin user exists with encryption keys');
        return;
      }

      // Has profile but no keys — generate and store them
      console.log('Admin user exists but missing keys, generating...');
      await generateAndStoreAdminKeys(profiles[0].id);
      return;
    }

    // Admin user doesn't exist — create everything
    console.log('Creating admin user...');

    // Step 1: Create auth user with fixed UUID
    await executeSQL(`
      INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, instance_id, aud, role,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '${ADMIN_USER.id}',
        '${ADMIN_USER.email}',
        crypt('AdminPassword123!', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        '', '', '', ''
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // Step 2: Create identity record
    await executeSQL(`
      INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        '${ADMIN_USER.id}',
        '${ADMIN_USER.email}',
        'email',
        '{"sub":"${ADMIN_USER.id}","email":"${ADMIN_USER.email}","email_verified":true}'::jsonb,
        NOW(), NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // Step 3: Create user profile
    await executeSQL(`
      INSERT INTO user_profiles (id, username, display_name, welcome_message_sent)
      VALUES ('${ADMIN_USER.id}', '${ADMIN_USER.username}', '${ADMIN_USER.displayName}', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Step 4: Generate and store ECDH keys
    await generateAndStoreAdminKeys(ADMIN_USER.id);

    console.log('✓ Admin user created with encryption keys');
  } catch (error) {
    console.warn('⚠ Admin seeding warning:', error);
    // Don't fail tests if seeding fails — tests will skip if admin is missing
  }
}

/**
 * Generate ECDH P-256 keypair and store public key for admin user.
 * Private key is discarded (not needed at runtime — ECDH shared secret
 * is derived by combining admin's public key with user's private key).
 */
async function generateAndStoreAdminKeys(userId: string): Promise<void> {
  const { publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const jwk = publicKey.export({ format: 'jwk' });

  // Escape the JWK JSON for SQL insertion
  const jwkJson = JSON.stringify(jwk).replace(/'/g, "''");

  await executeSQL(`
    INSERT INTO user_encryption_keys (user_id, public_key, revoked)
    VALUES ('${userId}', '${jwkJson}'::jsonb, false)
    ON CONFLICT DO NOTHING
  `);

  console.log('  ✓ ECDH P-256 public key stored');
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  await cleanupOrphanedE2EUsers();
  await ensureAdminUser();
}
