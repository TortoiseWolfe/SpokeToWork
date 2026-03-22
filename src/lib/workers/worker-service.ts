import { createClient } from '@/lib/supabase/client';
import type { DiscoverableWorker, WorkerFilters } from '@/types/worker';

/**
 * Resolve primary skill from embedded user_skills rows.
 * Explicit is_primary wins; falls back to oldest by created_at.
 * !inner join in the query guarantees the array is non-empty.
 */
export function resolvePrimarySkillId(
  userSkills: { skill_id: string; is_primary: boolean; created_at: string }[]
): string | null {
  if (userSkills.length === 0) return null;
  const primary = userSkills.find((s) => s.is_primary);
  if (primary) return primary.skill_id;
  // Fallback: oldest
  return [...userSkills].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  )[0].skill_id;
}

export async function getDiscoverableWorkers(
  filters?: WorkerFilters
): Promise<DiscoverableWorker[]> {
  const sb = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = sb as any;

  let query = sbAny
    .from('user_profiles')
    .select('id, username, display_name, avatar_url, bio, user_skills!inner(skill_id, is_primary, created_at)');

  if (filters?.skill_ids?.length) {
    const { data: matches, error: rpcError } = await sb.rpc('filter_workers_by_skill', {
      root_skill_ids: filters.skill_ids,
    });
    if (rpcError) throw rpcError;
    const ids = ((matches ?? []) as { user_id: string }[]).map((m) => m.user_id);
    if (ids.length === 0) return [];
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    primary_skill_id: resolvePrimarySkillId(row.user_skills ?? []),
    user_skills: row.user_skills ?? [],
  }));
}

export async function getWorkerById(id: string): Promise<DiscoverableWorker | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = createClient() as any;
  const { data, error } = await sbAny
    .from('user_profiles')
    .select('id, username, display_name, avatar_url, bio, user_skills!inner(skill_id, is_primary, created_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    bio: data.bio,
    primary_skill_id: resolvePrimarySkillId(data.user_skills ?? []),
    user_skills: data.user_skills ?? [],
  };
}
