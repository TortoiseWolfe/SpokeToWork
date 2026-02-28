/**
 * Contract tests for Feature 064 — Employer Team Management RPCs.
 * Runs against local Supabase (supabase-kong:8000).
 *
 * RPCs under test (defined in the monolithic migration):
 *   - get_team_members(p_company_id UUID)
 *   - add_team_member(p_company_id UUID, p_user_id UUID)
 *   - remove_team_member(p_company_id UUID, p_user_id UUID)
 *
 * Self-seeds fixtures in beforeAll via service-role client since
 * seed-employer-data.ts only works against Cloud (Management API).
 *
 * Run with:
 *   docker compose exec -T spoketowork pnpm vitest run -c vitest.contract.config.ts \
 *     tests/contract/employer-team.contract.test.ts
 *
 * @see docs/plans/2026-02-27-employee-management-plan.md — Task 2
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_EMAIL_TERTIARY,
  TEST_PASSWORD_TERTIARY,
} from '../fixtures/test-user';

// ---------------------------------------------------------------------------
// Environment & client factory
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    'Missing Supabase env vars for contract test. ' +
      'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY'
  );
}

/**
 * Fresh anon client per call — avoids the @/lib/supabase/client singleton,
 * so we can hold two concurrent authenticated sessions (employer + tertiary).
 */
function newAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Sentinel UUIDs that won't exist in the DB
const FAKE_COMPANY_ID = '00000000-0000-0000-0000-000000000099';
const FAKE_USER_ID = '00000000-0000-0000-0000-000000000088';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Employer Team RPCs — Contract', () => {
  let admin: SupabaseClient; // service-role — bypasses RLS
  let employer: SupabaseClient; // signed in as PRIMARY test user
  let employerId: string;
  let tertiaryId: string;
  let companyId: string;

  beforeAll(async () => {
    // --- Client setup ---

    admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    employer = newAnonClient();
    const { data: auth, error: authErr } =
      await employer.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    if (authErr || !auth.user) {
      throw new Error(
        `Failed to sign in as PRIMARY test user (${TEST_EMAIL}). ` +
          `Did you run seed-test-users.ts? Error: ${authErr?.message}`
      );
    }
    employerId = auth.user.id;

    // Look up tertiary user id via admin API (auth.users is not exposed over PostgREST)
    const { data: tertUsers, error: listErr } =
      await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const tert = tertUsers.users.find((u) => u.email === TEST_EMAIL_TERTIARY);
    if (!tert) {
      throw new Error(
        `Tertiary test user (${TEST_EMAIL_TERTIARY}) not found — run seed-test-users.ts`
      );
    }
    tertiaryId = tert.id;

    // --- Fixture seeding (idempotent; service-role bypasses RLS) ---

    // 1. Ensure employer has role='employer' (migration default is 'worker')
    await admin
      .from('user_profiles')
      .update({ role: 'employer' })
      .eq('id', employerId);

    // 2. Ensure tertiary starts as role='worker' so the add → upgrade path is testable
    await admin
      .from('user_profiles')
      .update({ role: 'worker' })
      .eq('id', tertiaryId);

    // 3. Ensure a shared_companies row exists
    const { data: existingCo } = await admin
      .from('shared_companies')
      .select('id')
      .eq('name', 'Contract Test Co')
      .maybeSingle();
    if (existingCo) {
      companyId = existingCo.id;
    } else {
      const { data: newCo, error: coErr } = await admin
        .from('shared_companies')
        .insert({ name: 'Contract Test Co' })
        .select('id')
        .single();
      if (coErr) {
        throw new Error(
          `Failed to seed shared_companies row: ${coErr.message}`
        );
      }
      companyId = newCo.id;
    }

    // 4. Ensure employer is linked to the company
    //    (employer_company_links has UNIQUE (user_id, shared_company_id))
    await admin
      .from('employer_company_links')
      .upsert(
        { user_id: employerId, shared_company_id: companyId },
        { onConflict: 'user_id,shared_company_id', ignoreDuplicates: true }
      );

    // 5. Ensure accepted connection employer ↔ tertiary (bidirectional table; one row suffices)
    const { data: existingConn } = await admin
      .from('user_connections')
      .select('id')
      .or(
        `and(requester_id.eq.${employerId},addressee_id.eq.${tertiaryId}),` +
          `and(requester_id.eq.${tertiaryId},addressee_id.eq.${employerId})`
      )
      .maybeSingle();
    if (!existingConn) {
      const { error: connErr } = await admin.from('user_connections').insert({
        requester_id: employerId,
        addressee_id: tertiaryId,
        status: 'accepted',
      });
      if (connErr) {
        throw new Error(`Failed to seed user_connections: ${connErr.message}`);
      }
    } else {
      // Ensure status is 'accepted' in case a prior run left a different state
      await admin
        .from('user_connections')
        .update({ status: 'accepted' })
        .eq('id', existingConn.id);
    }

    // 6. Clean slate: tertiary must NOT be pre-linked to this company
    await admin
      .from('employer_company_links')
      .delete()
      .eq('user_id', tertiaryId)
      .eq('shared_company_id', companyId);
  });

  afterAll(async () => {
    // Best-effort cleanup (service-role — no RLS)
    if (admin && companyId && tertiaryId) {
      await admin
        .from('employer_company_links')
        .delete()
        .eq('user_id', tertiaryId)
        .eq('shared_company_id', companyId);
      await admin
        .from('user_profiles')
        .update({ role: 'worker' })
        .eq('id', tertiaryId);
    }
    await employer?.auth.signOut();
  });

  // -------------------------------------------------------------------------
  // get_team_members
  // -------------------------------------------------------------------------

  describe('get_team_members', () => {
    it('returns the caller in the roster', async () => {
      const { data, error } = await employer.rpc('get_team_members', {
        p_company_id: companyId,
      });
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      const ids = (data as Array<{ user_id: string }>).map((m) => m.user_id);
      expect(ids).toContain(employerId);
    });

    it('rejects a company the caller is not linked to', async () => {
      const { data, error } = await employer.rpc('get_team_members', {
        p_company_id: FAKE_COMPANY_ID,
      });
      expect(data).toBeNull();
      expect(error?.message).toContain('Not linked to company');
    });
  });

  // -------------------------------------------------------------------------
  // add_team_member
  // -------------------------------------------------------------------------

  describe('add_team_member', () => {
    it('rejects adding yourself', async () => {
      const { error } = await employer.rpc('add_team_member', {
        p_company_id: companyId,
        p_user_id: employerId,
      });
      expect(error?.message).toContain('Cannot add yourself');
    });

    it('rejects a user who is not in your connections', async () => {
      const { error } = await employer.rpc('add_team_member', {
        p_company_id: companyId,
        p_user_id: FAKE_USER_ID,
      });
      expect(error?.message).toContain('User is not in your connections');
    });

    it('rejects when caller is not linked to the company', async () => {
      const { error } = await employer.rpc('add_team_member', {
        p_company_id: FAKE_COMPANY_ID,
        p_user_id: tertiaryId,
      });
      expect(error?.message).toContain('Not linked to company');
    });

    it('inserts the link and auto-upgrades teammate role to employer', async () => {
      const { error } = await employer.rpc('add_team_member', {
        p_company_id: companyId,
        p_user_id: tertiaryId,
      });
      expect(error).toBeNull();

      // Teammate appears in roster
      const { data: roster } = await employer.rpc('get_team_members', {
        p_company_id: companyId,
      });
      const ids = (roster as Array<{ user_id: string }>).map((m) => m.user_id);
      expect(ids).toContain(tertiaryId);

      // Role upgraded (admin bypasses RLS on user_profiles)
      const { data: profile } = await admin
        .from('user_profiles')
        .select('role')
        .eq('id', tertiaryId)
        .single();
      expect(profile?.role).toBe('employer');
    });

    it('is idempotent — re-adding the same member does not error', async () => {
      const { error } = await employer.rpc('add_team_member', {
        p_company_id: companyId,
        p_user_id: tertiaryId,
      });
      expect(error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // remove_team_member
  // -------------------------------------------------------------------------

  describe('remove_team_member', () => {
    it('rejects removing yourself', async () => {
      const { error } = await employer.rpc('remove_team_member', {
        p_company_id: companyId,
        p_user_id: employerId,
      });
      expect(error?.message).toContain('Cannot remove yourself');
    });

    it('rejects when caller is not linked to the company', async () => {
      const { error } = await employer.rpc('remove_team_member', {
        p_company_id: FAKE_COMPANY_ID,
        p_user_id: tertiaryId,
      });
      expect(error?.message).toContain('Not linked to company');
    });

    it('deletes the link and does NOT demote the role', async () => {
      // Ensure teammate is on the team (idempotent)
      await employer.rpc('add_team_member', {
        p_company_id: companyId,
        p_user_id: tertiaryId,
      });

      const { error } = await employer.rpc('remove_team_member', {
        p_company_id: companyId,
        p_user_id: tertiaryId,
      });
      expect(error).toBeNull();

      // Teammate no longer in roster
      const { data: roster } = await employer.rpc('get_team_members', {
        p_company_id: companyId,
      });
      const ids = (roster as Array<{ user_id: string }>).map((m) => m.user_id);
      expect(ids).not.toContain(tertiaryId);

      // Role is STILL employer (no demotion)
      const { data: profile } = await admin
        .from('user_profiles')
        .select('role')
        .eq('id', tertiaryId)
        .single();
      expect(profile?.role).toBe('employer');
    });
  });

  // -------------------------------------------------------------------------
  // Unlinked caller — all three RPCs reject
  // -------------------------------------------------------------------------

  describe('unlinked caller (tertiary user — not linked to any company)', () => {
    let tertiary: SupabaseClient;

    beforeAll(async () => {
      // Fresh independent client — does NOT share session with `employer`
      tertiary = newAnonClient();
      const { error } = await tertiary.auth.signInWithPassword({
        email: TEST_EMAIL_TERTIARY,
        password: TEST_PASSWORD_TERTIARY,
      });
      if (error) throw error;

      // Guarantee tertiary has no link to companyId
      // (service-role — the remove test above should have cleared it, but be defensive)
      await admin
        .from('employer_company_links')
        .delete()
        .eq('user_id', tertiaryId)
        .eq('shared_company_id', companyId);
    });

    afterAll(async () => {
      await tertiary?.auth.signOut();
    });

    it('get_team_members rejects unlinked caller', async () => {
      const { error } = await tertiary.rpc('get_team_members', {
        p_company_id: companyId,
      });
      expect(error?.message).toContain('Not linked to company');
    });

    it('add_team_member rejects unlinked caller', async () => {
      const { error } = await tertiary.rpc('add_team_member', {
        p_company_id: companyId,
        p_user_id: employerId,
      });
      expect(error?.message).toContain('Not linked to company');
    });

    it('remove_team_member rejects unlinked caller', async () => {
      const { error } = await tertiary.rpc('remove_team_member', {
        p_company_id: companyId,
        p_user_id: employerId,
      });
      expect(error?.message).toContain('Not linked to company');
    });
  });
});
