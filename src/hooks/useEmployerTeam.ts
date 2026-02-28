import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

// Tables/RPCs not yet in generated Database types — cast to untyped client.
// Same pattern as useEmployerApplications.ts:7.
const getClient = () => createClient() as unknown as SupabaseClient;

export interface TeamMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
}

export interface UseEmployerTeamReturn {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  addMember: (
    userId: string,
    optimisticProfile: Pick<TeamMember, 'display_name' | 'avatar_url'>
  ) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * useEmployerTeam — optimistic team roster CRUD for a single company.
 *
 * Fetches the company's team via the `get_team_members` RPC. Add/remove
 * update state immediately (optimistic) then call the corresponding RPC;
 * on RPC error the previous state is restored and the error rethrown so
 * callers can toast it.
 *
 * @param companyId — the `shared_company_id` to manage. Pass `null` for the
 *   no-company empty state (hook returns empty members, no fetch).
 */
export function useEmployerTeam(
  companyId: string | null
): UseEmployerTeamReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(companyId !== null);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = getClient();
    const { data, error: rpcError } = await supabase.rpc('get_team_members', {
      p_company_id: companyId,
    });
    if (rpcError) {
      setError(rpcError.message);
      setMembers([]);
    } else {
      setMembers((data as TeamMember[]) ?? []);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const addMember = useCallback(
    async (
      userId: string,
      optimisticProfile: Pick<TeamMember, 'display_name' | 'avatar_url'>
    ) => {
      if (!companyId) {
        throw new Error('No company selected');
      }
      const prev = members;
      const optimisticRow: TeamMember = {
        user_id: userId,
        display_name: optimisticProfile.display_name,
        avatar_url: optimisticProfile.avatar_url,
        joined_at: new Date().toISOString(),
      };
      setMembers([...prev, optimisticRow]);

      const supabase = getClient();
      const { error: rpcError } = await supabase.rpc('add_team_member', {
        p_company_id: companyId,
        p_user_id: userId,
      });
      if (rpcError) {
        setMembers(prev);
        throw new Error(rpcError.message);
      }
    },
    [companyId, members]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!companyId) {
        throw new Error('No company selected');
      }
      const prev = members;
      setMembers(prev.filter((m) => m.user_id !== userId));

      const supabase = getClient();
      const { error: rpcError } = await supabase.rpc('remove_team_member', {
        p_company_id: companyId,
        p_user_id: userId,
      });
      if (rpcError) {
        setMembers(prev);
        throw new Error(rpcError.message);
      }
    },
    [companyId, members]
  );

  return {
    members,
    loading,
    error,
    addMember,
    removeMember,
    refetch: fetchMembers,
  };
}
