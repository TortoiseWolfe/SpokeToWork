/**
 * Contract: discoverability-by-tagging privacy proof.
 *
 * Anon can see a user_profile iff that profile has ≥1 user_skills row.
 * Untagging removes the profile from anon view — this is the critical
 * round-trip that makes the opt-in model real.
 *
 * Setup via service-role in beforeAll: seed two users, tag only one.
 * Teardown: remove the tag to prove revocation.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createClient as createAnon,
  type SupabaseClient,
} from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const primaryEmail = process.env.TEST_USER_PRIMARY_EMAIL!;
const secondaryEmail = process.env.TEST_USER_SECONDARY_EMAIL!;

// Seed skill UUID from seed-ids.ts
const COURIER_UUID = 'a0000000-0000-4000-a000-000000000001';

describe('worker discoverability RLS', () => {
  let anon: SupabaseClient<any, 'public', any>;
  let admin: SupabaseClient<any, 'public', any>;
  let seededSkillRowId: string | null = null;
  let TEST_USER_PRIMARY: string;
  let TEST_USER_SECONDARY: string;

  beforeAll(async () => {
    anon = createAnon<any>(url, anonKey, { auth: { persistSession: false } });
    admin = createAnon<any>(url, serviceKey, {
      auth: { persistSession: false },
    });

    // Look up test user IDs by email (paginate to find them among ephemeral test users)
    const allUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data, error: listErr } = await admin.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (listErr) throw listErr;
      allUsers.push(...data.users);
      if (data.users.length < 100) break;
      page++;
    }
    const primary = allUsers.find((u) => u.email === primaryEmail);
    const secondary = allUsers.find((u) => u.email === secondaryEmail);
    if (!primary)
      throw new Error(
        `Primary test user (${primaryEmail}) not found — run seed-test-users.ts`
      );
    if (!secondary)
      throw new Error(
        `Secondary test user (${secondaryEmail}) not found — run seed-test-users.ts`
      );
    TEST_USER_PRIMARY = primary.id;
    TEST_USER_SECONDARY = secondary.id;

    // Ensure TEST_USER_PRIMARY has NO skills (negative control)
    await admin.from('user_skills').delete().eq('user_id', TEST_USER_PRIMARY);

    // Tag TEST_USER_SECONDARY with Courier skill (tagged user = discoverable)
    const { data, error } = await admin
      .from('user_skills')
      .upsert(
        {
          user_id: TEST_USER_SECONDARY,
          skill_id: COURIER_UUID,
          is_primary: true,
        },
        { onConflict: 'user_id,skill_id' }
      )
      .select('id')
      .single();
    if (error) throw error;
    seededSkillRowId = data.id;
  });

  afterAll(async () => {
    if (seededSkillRowId) {
      await admin.from('user_skills').delete().eq('id', seededSkillRowId);
    }
  });

  it('anon sees tagged worker profile', async () => {
    const { data, error } = await anon
      .from('user_profiles')
      .select('id')
      .eq('id', TEST_USER_SECONDARY);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(TEST_USER_SECONDARY);
  });

  it('anon does NOT see untagged worker profile', async () => {
    const { data, error } = await anon
      .from('user_profiles')
      .select('id')
      .eq('id', TEST_USER_PRIMARY);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('tagged worker appears in full table scan, untagged does not', async () => {
    const { data, error } = await anon.from('user_profiles').select('id');
    expect(error).toBeNull();
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    expect(ids).toContain(TEST_USER_SECONDARY);
    expect(ids).not.toContain(TEST_USER_PRIMARY);
  });

  it('removing the tag revokes discoverability', async () => {
    // Remove the tag via service-role
    if (seededSkillRowId) {
      await admin.from('user_skills').delete().eq('id', seededSkillRowId);
      seededSkillRowId = null;
    }

    const { data } = await anon
      .from('user_profiles')
      .select('id')
      .eq('id', TEST_USER_SECONDARY);
    expect(data).toHaveLength(0);

    // Re-tag for afterAll cleanup (noop since we already deleted)
  });
});
