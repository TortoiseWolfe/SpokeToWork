/**
 * Contract: skills taxonomy is world-readable via anon key.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient as createAnon, type SupabaseClient } from '@supabase/supabase-js';
import { COURIER_UUID, FOOD_DELIVERY_RIDER_UUID, PACKAGE_DELIVERY_UUID } from '@/lib/skills/seed-ids';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('skills RLS — anon client', () => {
  let anon: SupabaseClient<any, 'public', any>;

  beforeAll(() => {
    anon = createAnon<any>(url, anonKey, { auth: { persistSession: false } });
  });

  it('anon can SELECT all skills', async () => {
    const { data, error } = await anon.from('skills').select('id,slug,name');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it('anon cannot INSERT into skills', async () => {
    const { error } = await anon.from('skills').insert({ slug: 'hax', name: 'Hax' });
    expect(error).not.toBeNull();
  });

  it('anon can SELECT user_skills rows', async () => {
    const { data, error } = await anon
      .from('user_skills')
      .select('id,user_id,skill_id')
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('get_skill_descendants expands subtree recursively', async () => {
    const { data, error } = await anon.rpc('get_skill_descendants', {
      root_ids: [COURIER_UUID],
    });
    expect(error).toBeNull();
    const ids = (data as { skill_id: string }[]).map((r) => r.skill_id);
    expect(ids).toContain(COURIER_UUID);
    expect(ids).toContain(FOOD_DELIVERY_RIDER_UUID);
    expect(ids).toContain(PACKAGE_DELIVERY_UUID);
  });

  it('get_skill_descendants with leaf returns just the leaf', async () => {
    const { data, error } = await anon.rpc('get_skill_descendants', {
      root_ids: [FOOD_DELIVERY_RIDER_UUID],
    });
    expect(error).toBeNull();
    expect(data).toEqual([{ skill_id: FOOD_DELIVERY_RIDER_UUID }]);
  });
});
