/**
 * Shared E2E test helpers for messaging tests
 * Provides admin client seeding for connections and conversations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const getAdminClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const getUserIdByEmail = async (
  client: SupabaseClient,
  email: string
): Promise<string | null> => {
  const { data } = await client.auth.admin.listUsers();
  return data?.users?.find((u) => u.email === email)?.id ?? null;
};

export const ensureUserProfile = async (
  client: SupabaseClient,
  email: string
): Promise<void> => {
  const userId = await getUserIdByEmail(client, email);
  if (!userId) return;
  const displayName = email.split('@')[0];
  await client.from('user_profiles').upsert({
    id: userId,
    username: displayName,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });
};

export const ensureConnection = async (
  client: SupabaseClient,
  emailA: string,
  emailB: string
): Promise<void> => {
  const [idA, idB] = await Promise.all([
    getUserIdByEmail(client, emailA),
    getUserIdByEmail(client, emailB),
  ]);
  if (!idA || !idB) return;

  await Promise.all([
    ensureUserProfile(client, emailA),
    ensureUserProfile(client, emailB),
  ]);

  const { data: existing } = await client
    .from('user_connections')
    .select('id')
    .or(
      `and(requester_id.eq.${idA},addressee_id.eq.${idB}),and(requester_id.eq.${idB},addressee_id.eq.${idA})`
    )
    .maybeSingle();
  if (existing) return;

  await client.from('user_connections').insert({
    requester_id: idA,
    addressee_id: idB,
    status: 'accepted',
  });
};

export const ensureConversation = async (
  client: SupabaseClient,
  emailA: string,
  emailB: string
): Promise<string | null> => {
  const [idA, idB] = await Promise.all([
    getUserIdByEmail(client, emailA),
    getUserIdByEmail(client, emailB),
  ]);
  if (!idA || !idB) return null;

  // Canonical ordering: smaller UUID = participant_1
  const p1 = idA < idB ? idA : idB;
  const p2 = idA < idB ? idB : idA;

  const { data: existing } = await client
    .from('conversations')
    .select('id')
    .eq('participant_1_id', p1)
    .eq('participant_2_id', p2)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await client
    .from('conversations')
    .insert({ participant_1_id: p1, participant_2_id: p2 })
    .select('id')
    .single();
  if (error) {
    console.warn('ensureConversation:', error.message);
    return null;
  }
  return data.id;
};
