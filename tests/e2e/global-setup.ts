/**
 * Global Setup for E2E Tests
 *
 * Runs before any test to:
 * 1. Clean up orphaned e2e-* test users from previous crashed runs
 * 2. Ensure admin user (spoketowork) exists with ECDH encryption keys
 *    for welcome message and complete flow tests
 * 3. Ensure test users have password-derived encryption keys so
 *    messaging E2E tests can actually send/receive encrypted messages
 */

import { FullConfig } from '@playwright/test';
import * as crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { executeSQL } from './utils/supabase-admin';
import { createTestUser } from './utils/test-user-factory';
import { ARGON2_CONFIG } from '../../src/types/messaging';

/** Admin Supabase client for local dev (bypasses RLS, works without Management API) */
function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

    // Step 3: Create user profile (use DO UPDATE SET because the
    // create_user_profile() trigger already fires on auth.users INSERT and
    // creates a row with NULL username — DO NOTHING would silently skip).
    await executeSQL(`
      INSERT INTO user_profiles (id, username, display_name, welcome_message_sent)
      VALUES ('${ADMIN_USER.id}', '${ADMIN_USER.username}', '${ADMIN_USER.displayName}', true)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        welcome_message_sent = EXCLUDED.welcome_message_sent
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

/**
 * P-256 curve order for scalar reduction.
 * Must match the constant in src/lib/messaging/key-derivation.ts.
 */
const P256_ORDER = BigInt(
  '0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'
);

/**
 * Ensure every test user has password-derived encryption keys in the database.
 *
 * Without these keys, deriveKeys() in the browser throws
 * "No salt found. User may need migration or initialization." and
 * messaging tests fail or get skipped.
 *
 * Replicates the exact same pipeline as src/lib/messaging/key-derivation.ts:
 *   password + salt → Argon2id → 32-byte seed → reduceScalar → P-256 keypair
 */
async function ensureTestUserKeys(): Promise<void> {
  console.log('🔑 Ensuring test users have encryption keys...');

  // Dynamic imports — both are project dependencies
  const { argon2id } = await import('hash-wasm');
  const { p256 } = await import('@noble/curves/nist.js');

  const testUsers = [
    {
      email: process.env.TEST_USER_PRIMARY_EMAIL,
      password: process.env.TEST_USER_PRIMARY_PASSWORD,
    },
    {
      email: process.env.TEST_USER_SECONDARY_EMAIL,
      password: process.env.TEST_USER_SECONDARY_PASSWORD,
    },
    {
      email: process.env.TEST_USER_TERTIARY_EMAIL,
      password: process.env.TEST_USER_TERTIARY_PASSWORD,
    },
  ].filter(
    (u): u is { email: string; password: string } => !!u.email && !!u.password
  );

  if (testUsers.length === 0) {
    console.log(
      '  ⚠ No test user credentials found in env — skipping key seeding'
    );
    return;
  }

  const adminClient = getAdminClient();

  for (const { email, password } of testUsers) {
    try {
      // 1. Look up user_id — try SQL first, fall back to admin client
      let userId: string | undefined;
      const rows = (await executeSQL(
        `SELECT id FROM auth.users WHERE email = '${email}'`
      )) as { id: string }[];
      userId = rows[0]?.id;

      if (!userId && adminClient) {
        const { data } = await adminClient.auth.admin.listUsers({
          perPage: 1000,
        });
        userId = data?.users?.find((u) => u.email === email)?.id;
      }

      if (!userId) {
        // User doesn't exist yet — create them via admin API
        console.log(`  ⚠ User ${email} not found — creating via admin API...`);
        try {
          const created = await createTestUser(email, password, {
            createProfile: true,
          });
          userId = created.id;
          console.log(`  ✓ Created user ${email} (${userId})`);
        } catch (createErr) {
          console.warn(`  ⚠ Failed to create ${email}:`, createErr);
          continue;
        }
      }

      // 2. Delete existing keys — always recreate to match current ARGON2_CONFIG
      //    (keys from previous runs may use different Argon2 parameters)
      await executeSQL(
        `DELETE FROM user_encryption_keys WHERE user_id = '${userId}'`
      );
      // Fallback: admin client delete if executeSQL silently failed (no access token)
      if (adminClient) {
        await adminClient
          .from('user_encryption_keys')
          .delete()
          .eq('user_id', userId);
      }

      // 3. Generate random salt (16 bytes, matching ARGON2_CONFIG.SALT_LENGTH)
      const salt = crypto.randomBytes(16);

      // 4. Argon2id hash — uses ARGON2_CONFIG from src/types/messaging.ts
      //    In E2E test mode: ~1s. In production: 10-30s.
      const seed = await argon2id({
        password,
        salt,
        parallelism: ARGON2_CONFIG.PARALLELISM,
        iterations: ARGON2_CONFIG.TIME_COST,
        memorySize: ARGON2_CONFIG.MEMORY_COST,
        hashLength: ARGON2_CONFIG.HASH_LENGTH,
        outputType: 'binary',
      });

      // 5. Reduce scalar mod P-256 order (matches reduceScalar in key-derivation.ts)
      let seedBigInt = BigInt(0);
      for (const byte of seed) {
        seedBigInt = (seedBigInt << BigInt(8)) + BigInt(byte);
      }
      const reduced = (seedBigInt % (P256_ORDER - BigInt(1))) + BigInt(1);
      const privKeyBytes = new Uint8Array(32);
      let rem = reduced;
      for (let i = 31; i >= 0; i--) {
        privKeyBytes[i] = Number(rem & BigInt(0xff));
        rem = rem >> BigInt(8);
      }

      // 6. Compute P-256 public key (uncompressed: 0x04 || x || y)
      const pubKeyBytes = p256.getPublicKey(privKeyBytes, false);
      const x = Buffer.from(pubKeyBytes.slice(1, 33)).toString('base64url');
      const y = Buffer.from(pubKeyBytes.slice(33, 65)).toString('base64url');
      const jwk = { kty: 'EC', crv: 'P-256', x, y };

      // 7. Store public_key + encryption_salt in database
      const saltBase64 = Buffer.from(salt).toString('base64');

      // Try SQL first, then admin client
      const jwkJson = JSON.stringify(jwk).replace(/'/g, "''");
      const sqlResult = await executeSQL(`
        INSERT INTO user_encryption_keys (user_id, public_key, encryption_salt, revoked)
        VALUES ('${userId}', '${jwkJson}'::jsonb, '${saltBase64}', false)
        ON CONFLICT DO NOTHING
      `);

      // If executeSQL skipped (returned []), use admin client
      if (sqlResult.length === 0 && adminClient) {
        const { error: insertErr } = await adminClient
          .from('user_encryption_keys')
          .insert({
            user_id: userId,
            public_key: jwk,
            encryption_salt: saltBase64,
            revoked: false,
          });
        if (insertErr) {
          console.warn(
            `  ⚠ Admin client key insert failed for ${email}:`,
            insertErr.message
          );
          continue;
        }
      }

      console.log(`  ✓ Encryption keys seeded for ${email}`);
      // NOTE: We do NOT cache the Node.js-derived JWK in localStorage.
      // Node.js @noble/curves and firefox's crypto.subtle produce
      // incompatible ECDH shared secrets from the same P-256 key pair.
      // Instead, let the browser derive keys via ReAuth modal (~1s with
      // E2E test params) and cache them itself via key-service.ts.
    } catch (error) {
      console.warn(`  ⚠ Key seeding failed for ${email}:`, error);
      // Don't fail other users if one fails
    }
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  await cleanupOrphanedE2EUsers();
  await ensureAdminUser();
  await ensureTestUserKeys();
}
