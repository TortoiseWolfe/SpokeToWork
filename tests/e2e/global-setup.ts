/**
 * Global Setup for E2E Tests
 *
 * Runs ONCE before any test shard to:
 * 1. Clean up orphaned e2e-* test users from previous crashed runs
 * 2. Ensure admin user (spoketowork) exists with ECDH encryption keys
 *    for welcome message and complete flow tests
 * 3. Delete + recreate encryption keys for all test users so each run
 *    starts with fresh, consistent key material (stale Node-derived keys
 *    cause browser-side Argon2id to hang indefinitely in auth.setup)
 */

import { FullConfig } from '@playwright/test';
import * as crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { executeSQL, escapeSQL } from './utils/supabase-admin';
import { getPrebakedKeysForUser, hasPrebakedKeys } from './utils/prebaked-keys';

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
  // In shard mode, skip cleanup entirely — shard users persist across runs.
  if (process.env.E2E_SHARD_INDEX) {
    console.log('🧹 Shard mode — skipping e2e user cleanup');
    return;
  }

  // Only clean up dynamically created users (e2e-shared-*), NOT shard users (e2e-s*).
  // Shard users are created once and persist across runs — just like production.
  // Deleting them forces re-creation, which causes sign-in failures.
  console.log('🧹 Cleaning up orphaned e2e-shared-* test users (preserving shard users)...');

  try {
    const countResult = (await executeSQL(
      `SELECT COUNT(*) as count FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'`
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
        SELECT id FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM user_encryption_keys WHERE user_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT c.id FROM conversations c
        JOIN auth.users u ON (c.participant_1_id = u.id OR c.participant_2_id = u.id)
        WHERE u.email LIKE 'e2e-shared-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM conversations WHERE participant_1_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'
      ) OR participant_2_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM user_profiles WHERE id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM auth.identities WHERE user_id IN (
        SELECT id FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'
      )
    `);

    await executeSQL(`
      DELETE FROM auth.users WHERE email LIKE 'e2e-shared-%@mailinator.com'
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
 * Clean old encryption keys and messages for test users.
 * Key derivation now happens entirely in-browser via auth.setup.ts →
 * completeEncryptionSetup → initializeKeys. This ensures browser-compatible
 * ECDH keys (Node.js @noble/curves P-256 is incompatible with Firefox WebCrypto).
 *
 * Without this cleanup, stale Node-derived keys in the DB cause
 * deriveKeys() verifyPublicKey to throw KeyMismatchError in the browser,
 * resulting in "Encrypted with previous keys" on all messages.
 *
 * auth.setup.ts will derive browser-compatible keys via completeEncryptionSetup
 * → initializeKeys (creates new salt + key pair + uploads public key to DB).
 */
async function ensureTestUserKeys(): Promise<void> {
  const adminClient = getAdminClient();
  const shardIndex = process.env.E2E_SHARD_INDEX;

  // Determine which users to manage based on shard isolation
  let testUsers: string[];
  if (shardIndex) {
    // CI: use per-shard users — each shard only manages its own users
    testUsers = [
      `e2e-s${shardIndex}-primary@mailinator.com`,
      `e2e-s${shardIndex}-secondary@mailinator.com`,
      `e2e-s${shardIndex}-tertiary@mailinator.com`,
    ];
  } else {
    // Local dev: use standard env vars
    testUsers = [
      process.env.TEST_USER_PRIMARY_EMAIL,
      process.env.TEST_USER_SECONDARY_EMAIL,
      process.env.TEST_USER_TERTIARY_EMAIL,
    ].filter((email): email is string => !!email);
  }

  if (testUsers.length === 0) {
    console.log('  ⚠ No test user emails found — skipping key cleanup');
    return;
  }

  // In CI with per-shard users, create the users if they don't exist
  if (shardIndex && adminClient) {
    const password = process.env.TEST_USER_PRIMARY_PASSWORD;
    if (password) {
      for (const email of testUsers) {
        const rows = (await executeSQL(
          `SELECT id FROM auth.users WHERE email = '${escapeSQL(email)}'`
        )) as { id: string }[];
        if (rows.length === 0) {
          console.log(`  Creating shard user: ${email}`);
          // Create via SQL (not auth.admin.createUser) — the admin API
          // doesn't reliably create users that can sign in on Supabase Cloud.
          // SQL with crypt() + identity record matches how the shared test
          // users were originally created (and they sign in fine).
          const displayName = escapeSQL(email.split('@')[0]);
          const escapedEmail = escapeSQL(email);
          const escapedPwd = escapeSQL(password);
          const createResult = (await executeSQL(`
            INSERT INTO auth.users (
              id, email, encrypted_password, email_confirmed_at,
              created_at, updated_at, instance_id, aud, role,
              raw_app_meta_data, raw_user_meta_data,
              confirmation_token, email_change, email_change_token_new, recovery_token
            ) VALUES (
              gen_random_uuid(),
              '${escapedEmail}',
              crypt('${escapedPwd}', gen_salt('bf')),
              NOW(), NOW(), NOW(),
              '00000000-0000-0000-0000-000000000000',
              'authenticated', 'authenticated',
              '{"provider":"email","providers":["email"]}'::jsonb,
              '{}'::jsonb,
              '', '', '', ''
            )
            RETURNING id
          `)) as { id: string }[];
          const userId = createResult[0]?.id;
          if (userId) {
            // Create identity record (required for GoTrue sign-in)
            await executeSQL(`
              INSERT INTO auth.identities (
                id, user_id, provider_id, provider, identity_data,
                last_sign_in_at, created_at, updated_at
              ) VALUES (
                gen_random_uuid(),
                '${userId}',
                '${escapedEmail}',
                'email',
                '{"sub":"${userId}","email":"${escapedEmail}","email_verified":true}'::jsonb,
                NOW(), NOW(), NOW()
              )
              ON CONFLICT DO NOTHING
            `);
            // Create user profile
            await adminClient.from('user_profiles').upsert(
              { id: userId, display_name: displayName },
              { onConflict: 'id' }
            );
            console.log(`  ✓ Created shard user: ${email} (${userId.slice(0, 8)}...)`);
          } else {
            console.warn(`  ⚠ Failed to create ${email} — no ID returned`);
          }
        }
      }
    }
  }

  console.log('🔑 Ensuring encryption keys are set...');

  for (const email of testUsers) {
    try {
      // 1. Look up user_id — try SQL, retry once for newly created users
      let userId: string | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        const rows = (await executeSQL(
          `SELECT id FROM auth.users WHERE email = '${escapeSQL(email)}'`
        )) as { id: string }[];
        userId = rows[0]?.id;
        if (userId) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
      }

      if (!userId) {
        console.log(`  ⚠ User ${email} not found — skipping key cleanup`);
        continue;
      }

      // 2. Upsert pre-baked keys (if available) or delete old keys for re-derivation.
      const prebaked = getPrebakedKeysForUser(email);
      if (prebaked) {
        // Pre-baked keys: delete ALL existing keys then insert the pre-baked one.
        // Must be the ONLY key in the DB so getUserPublicKey returns it.
        // Old Argon2id-derived keys from previous runs would have a newer
        // created_at, causing the app to read the wrong public key.
        const pubKeyJson = JSON.stringify(prebaked.db.public_key).replace(
          /'/g,
          "''"
        );
        await executeSQL(
          `DELETE FROM user_encryption_keys WHERE user_id = '${userId}'`
        );
        await executeSQL(`
          INSERT INTO user_encryption_keys (user_id, public_key, encryption_salt, revoked)
          VALUES ('${userId}', '${pubKeyJson}'::jsonb, '${prebaked.db.encryption_salt}', false)
        `);
        console.log(`  ✓ Pre-baked keys set for ${email} (old keys deleted)`);
      } else {
        // No pre-baked keys (local dev): delete old keys, browser will re-derive
        console.log(
          `  Deleting existing keys for ${email} (no pre-baked keys, browser will re-derive)...`
        );
        await executeSQL(
          `DELETE FROM user_encryption_keys WHERE user_id = '${userId}'`
        );
        if (adminClient) {
          await adminClient
            .from('user_encryption_keys')
            .delete()
            .eq('user_id', userId);
        }
        // Delete messages too (old keys can't decrypt them)
        await executeSQL(`
          DELETE FROM messages WHERE conversation_id IN (
            SELECT id FROM conversations
            WHERE participant_1_id = '${userId}' OR participant_2_id = '${userId}'
          )
        `);
        if (adminClient) {
          await adminClient.from('messages').delete().eq('sender_id', userId);
          const { data: convos } = await adminClient
            .from('conversations')
            .select('id')
            .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
          if (convos) {
            for (const c of convos) {
              await adminClient
                .from('messages')
                .delete()
                .eq('conversation_id', c.id);
            }
          }
        }
        console.log(`  ✓ Keys cleaned for ${email} (browser will re-derive)`);
      }
    } catch (error) {
      console.warn(`  ⚠ Key seeding failed for ${email}:`, error);
      // Don't fail other users if one fails
    }
  }
}

/**
 * Well-known IDs for test moderation contributions.
 * These are reset to 'pending' before each moderation spec run
 * (see moderation-flow.spec.ts resetTestContributions).
 */
const MODERATION_CONTRIB_IDS = [
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
];
const MODERATION_COMPANY_IDS = [
  'b6b1b671-6798-4161-a621-9ecf1abe39e0',
  '1cb302ab-6878-4f82-8fe6-a64b98ec42a6',
];

/**
 * Seed two pending company_contributions so admin moderation E2E specs
 * have data to approve/reject. Uses the service-role admin client
 * (works with local Supabase; executeSQL only works with cloud).
 */
async function ensureModerationTestData(): Promise<void> {
  const adminClient = getAdminClient();
  if (!adminClient) {
    console.log('⚠ No admin client — skipping moderation test data seeding');
    return;
  }
  console.log('🗂️  Ensuring moderation test contributions exist...');

  try {
    // 1. Resolve primary test user ID
    const testEmail = process.env.TEST_USER_PRIMARY_EMAIL;
    if (!testEmail) {
      console.log('  ⚠ TEST_USER_PRIMARY_EMAIL not set');
      return;
    }
    const { data: users } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    const testUser = users?.users?.find((u) => u.email === testEmail);
    if (!testUser) {
      console.log(`  ⚠ User ${testEmail} not found`);
      return;
    }

    // 2. Ensure a metro area exists (needed by approve → insert shared_company)
    const { data: metros } = await adminClient
      .from('metro_areas')
      .select('id')
      .limit(1);
    let metroId = metros?.[0]?.id;
    if (!metroId) {
      const { data: newMetro } = await adminClient
        .from('metro_areas')
        .insert({
          name: 'Portland',
          state: 'OR',
          center_lat: 45.52,
          center_lng: -122.68,
          radius_miles: 25,
        })
        .select('id')
        .single();
      metroId = newMetro?.id;
    }

    // 3. Ensure two private companies exist for the test user
    const companies = [
      {
        id: MODERATION_COMPANY_IDS[0],
        name: 'E2E Test Corp Alpha',
        address: '123 Main St, Portland, OR',
        lat: 45.5152,
        lng: -122.6784,
      },
      {
        id: MODERATION_COMPANY_IDS[1],
        name: 'E2E Test Corp Beta',
        address: '456 Oak Ave, Portland, OR',
        lat: 45.5231,
        lng: -122.6765,
      },
    ];
    for (const co of companies) {
      await adminClient.from('private_companies').upsert(
        {
          id: co.id,
          user_id: testUser.id,
          name: co.name,
          address: co.address,
          latitude: co.lat,
          longitude: co.lng,
          metro_area_id: metroId,
        },
        { onConflict: 'id' }
      );
    }

    // 4. Upsert two pending contributions (reset to pending if they already exist)
    for (let i = 0; i < 2; i++) {
      await adminClient.from('company_contributions').upsert(
        {
          id: MODERATION_CONTRIB_IDS[i],
          user_id: testUser.id,
          private_company_id: MODERATION_COMPANY_IDS[i],
          status: 'pending',
          reviewer_id: null,
          reviewer_notes: null,
          reviewed_at: null,
          created_shared_company_id: null,
        },
        { onConflict: 'id' }
      );
    }

    console.log('✓ Moderation test contributions seeded (2 pending)');
  } catch (error) {
    console.warn('⚠ Moderation seeding warning:', error);
  }
}

// ── Fixed UUIDs for public profile seeding ────────────────────────────────
const SEEDED_COMPANY_ID = 'e2e00000-0000-4000-a000-000000000001';
const SEEDED_INDUSTRY_ID = '10000000-0000-4000-a000-000000000001'; // Transportation (from migration seed)
const SEEDED_SKILL_ID = 'a0000000-0000-4000-a000-000000000001'; // Bicycle Mechanic (from migration seed)

/**
 * Ensure primary test user has role='worker' so AccountSettings
 * renders Resume/Visibility sections.
 */
async function ensureWorkerRole(): Promise<void> {
  const adminClient = getAdminClient();
  if (!adminClient) return;

  const testEmail = process.env.TEST_USER_PRIMARY_EMAIL;
  if (!testEmail) return;

  const { data: users } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });
  const testUser = users?.users?.find((u) => u.email === testEmail);
  if (!testUser) return;

  console.log('👷 Ensuring primary test user has worker role...');
  await adminClient
    .from('user_profiles')
    .update({ role: 'worker' })
    .eq('id', testUser.id);
  console.log('✓ Primary test user role set to worker');
}

/**
 * Seed a shared company with an industry for company-profile-public E2E tests.
 * Writes the company UUID to tests/e2e/fixtures/seeded-company-id.json.
 */
async function ensurePublicProfileCompany(): Promise<void> {
  const adminClient = getAdminClient();
  if (!adminClient) return;

  console.log('🏢 Ensuring public profile company exists...');
  try {
    // Ensure a metro area exists
    const { data: metros } = await adminClient
      .from('metro_areas')
      .select('id')
      .limit(1);
    let metroId = metros?.[0]?.id;
    if (!metroId) {
      const { data: newMetro } = await adminClient
        .from('metro_areas')
        .insert({
          name: 'Portland',
          state: 'OR',
          center_lat: 45.52,
          center_lng: -122.68,
          radius_miles: 25,
        })
        .select('id')
        .single();
      metroId = newMetro?.id;
    }

    // Upsert the shared company
    await adminClient.from('shared_companies').upsert(
      {
        id: SEEDED_COMPANY_ID,
        name: 'E2E Public Profile Corp',
        metro_area_id: metroId,
        is_verified: true,
      },
      { onConflict: 'id' }
    );

    // Link an industry (Transportation — seeded by migration)
    await adminClient.from('company_industries').upsert(
      {
        shared_company_id: SEEDED_COMPANY_ID,
        industry_id: SEEDED_INDUSTRY_ID,
        is_primary: true,
      },
      { onConflict: 'shared_company_id,industry_id' }
    );

    // Write fixture
    const fs = await import('fs');
    const path = await import('path');
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'seeded-company-id.json'
    );
    fs.writeFileSync(
      fixturePath,
      JSON.stringify({ sharedCompanyId: SEEDED_COMPANY_ID }, null, 2) + '\n'
    );

    console.log('✓ Public profile company seeded:', SEEDED_COMPANY_ID);
  } catch (error) {
    console.warn('⚠ Public profile company seeding warning:', error);
  }
}

/**
 * Seed the primary test user as a discoverable worker with >=1 skill.
 * Writes the user UUID to tests/e2e/fixtures/seeded-worker-id.json.
 */
async function ensureDiscoverableWorker(): Promise<void> {
  const adminClient = getAdminClient();
  if (!adminClient) return;

  const testEmail = process.env.TEST_USER_PRIMARY_EMAIL;
  if (!testEmail) return;

  console.log('🔧 Ensuring discoverable worker exists...');
  try {
    const { data: users } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    const testUser = users?.users?.find((u) => u.email === testEmail);
    if (!testUser) {
      console.log(`  ⚠ User ${testEmail} not found`);
      return;
    }

    // Ensure user has a display_name (needed for heading to render)
    const displayName = testEmail.split('@')[0];
    await adminClient
      .from('user_profiles')
      .upsert(
        { id: testUser.id, username: displayName, display_name: displayName },
        { onConflict: 'id' }
      );

    // Ensure at least one skill (Bicycle Mechanic — seeded by migration)

    await (adminClient as any)
      .from('user_skills')
      .upsert(
        { user_id: testUser.id, skill_id: SEEDED_SKILL_ID, is_primary: true },
        { onConflict: 'user_id,skill_id' }
      );

    // Write fixture
    const fs = await import('fs');
    const path = await import('path');
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'seeded-worker-id.json'
    );
    fs.writeFileSync(
      fixturePath,
      JSON.stringify({ workerId: testUser.id }, null, 2) + '\n'
    );

    console.log('✓ Discoverable worker seeded:', testUser.id);
  } catch (error) {
    console.warn('⚠ Discoverable worker seeding warning:', error);
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  if (process.env.SMOKE_ONLY === 'true') {
    console.log('🚀 SMOKE_ONLY mode — running lightweight cleanup only');
    await cleanupOrphanedE2EUsers();
    return;
  }

  await cleanupOrphanedE2EUsers();
  await ensureAdminUser();
  await ensureTestUserKeys();
  await ensureModerationTestData();
  await ensureWorkerRole();
  await ensurePublicProfileCompany();
  await ensureDiscoverableWorker();

  // Clean old audit log entries to prevent DB bloat under 18-shard load
  // (46k+ rows were observed causing 10s queries on 2026-04-04)
  await executeSQL(
    `DELETE FROM auth.audit_log_entries WHERE created_at < NOW() - INTERVAL '1 hour'`
  ).catch((err: unknown) =>
    console.warn('⚠ Audit log cleanup warning:', err)
  );
}
