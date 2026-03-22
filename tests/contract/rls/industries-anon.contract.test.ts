/**
 * Contract: industries taxonomy is world-readable via anon key.
 * Runs against local Supabase.
 *
 * Uses raw @supabase/supabase-js (not the app's typed client) to verify
 * PostgREST/RLS behavior directly. Database generic is `any` because the
 * typed schema lands in Task 5 (src/lib/supabase/types.ts); a contract
 * test's job is proving the wire behavior, not the TypeScript mapping.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient as createAnon, type SupabaseClient } from '@supabase/supabase-js';
import { TRANSPORTATION_UUID, DELIVERY_LOGISTICS_UUID, BICYCLE_COURIER_UUID } from '@/lib/industries/seed-ids';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('industries RLS — anon client', () => {
  let anon: SupabaseClient<any, 'public', any>;

  beforeAll(() => {
    anon = createAnon<any>(url, anonKey, { auth: { persistSession: false } });
  });

  it('anon can SELECT all industries', async () => {
    const { data, error } = await anon.from('industries').select('id,slug,name');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it('anon cannot INSERT into industries', async () => {
    const { error } = await anon.from('industries').insert({ slug: 'hax', name: 'Hax' });
    expect(error).not.toBeNull();
  });

  it('anon can SELECT company_industries rows linked to shared companies', async () => {
    const { data, error } = await anon
      .from('company_industries')
      .select('id,shared_company_id,industry_id')
      .not('shared_company_id', 'is', null)
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    // Empty is OK — no junction rows seeded yet. RLS just must not error.
  });

  // Vacuous without a fixture: seed creates zero private-linked junction rows,
  // so expect([]) passes whether or not RLS works. A meaningful version needs
  // a service-role beforeAll that inserts a private company + junction row,
  // then asserts anon can't see it. Policy at migration:2067 is correct by
  // inspection — auth.uid() is NULL for anon so the IN-list is empty.
  it.todo('anon sees zero private-linked company_industries rows (needs seeded private row)');

  it('get_industry_descendants expands subtree recursively', async () => {
    const { data, error } = await anon.rpc('get_industry_descendants', {
      root_ids: [TRANSPORTATION_UUID],
    });
    expect(error).toBeNull();
    const ids = (data as { industry_id: string }[]).map((r) => r.industry_id);
    expect(ids).toContain(TRANSPORTATION_UUID);
    expect(ids).toContain(DELIVERY_LOGISTICS_UUID);
    expect(ids).toContain(BICYCLE_COURIER_UUID);
  });

  it('get_industry_descendants with leaf returns just the leaf', async () => {
    const { data, error } = await anon.rpc('get_industry_descendants', {
      root_ids: [BICYCLE_COURIER_UUID],
    });
    expect(error).toBeNull();
    expect(data).toEqual([{ industry_id: BICYCLE_COURIER_UUID }]);
  });
});
