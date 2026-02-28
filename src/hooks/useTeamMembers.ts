import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { TeamMember, AddTeamMemberData } from '@/types/company';

// Tables not yet in generated Database types — cast to untyped client.
const getClient = () => createClient() as unknown as SupabaseClient;

/**
 * useTeamMembers — direct CRUD on the team_members table for a single company.
 *
 * Unlike useEmployerTeam (which manages registered-user access via RPCs on
 * employer_company_links), this hook manages a broader employee roster
 * including non-registered people (name/email entries).
 *
 * Features: optimistic add/remove with rollback, realtime INSERT/DELETE
 * subscription.
 */
export function useTeamMembers(companyId: string) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  /** Fresh mirror so callbacks can read current members without dep churn. */
  const membersRef = useRef<TeamMember[]>([]);

  // ---- Fetch ----
  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      const supabase = getClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        if (!cancelled) {
          setError('Not authenticated');
          setMembers([]);
          setLoading(false);
        }
        return;
      }

      userIdRef.current = userData.user.id;

      const { data, error: fetchError } = await supabase
        .from('team_members')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
          setMembers([]);
        } else {
          setMembers(data ?? []);
        }
        setLoading(false);
      }
    }

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // ---- Realtime ----
  useEffect(() => {
    const supabase = getClient();

    const ch = supabase.channel(`team-members-${companyId}`) as any;
    const channel = ch
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_members',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { new: TeamMember }) => {
          setMembers((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'team_members',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { old: { id: string } }) => {
          setMembers((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Keep ref in sync so callbacks avoid stale closures without dep churn.
  membersRef.current = members;

  // ---- Add member (optimistic) ----
  const addMember = useCallback(
    async (data: AddTeamMemberData) => {
      const prev = membersRef.current;
      const userId = userIdRef.current ?? '';

      // Optimistic placeholder
      const placeholder: TeamMember = {
        id: `temp-${Date.now()}`,
        company_id: companyId,
        user_id: null,
        name: data.name,
        email: data.email,
        role_title: data.role_title ?? null,
        start_date: data.start_date ?? null,
        added_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMembers([placeholder, ...prev]);

      const supabase = getClient();
      const { data: inserted, error: insertError } = await supabase
        .from('team_members')
        .insert({
          company_id: companyId,
          name: data.name,
          email: data.email,
          role_title: data.role_title ?? null,
          start_date: data.start_date ?? null,
          added_by: userId,
        })
        .select()
        .single();

      if (insertError) {
        setMembers(prev);
        return;
      }

      // Replace placeholder with real row
      setMembers([inserted as TeamMember, ...prev]);
    },
    [companyId]
  );

  // ---- Remove member (optimistic) ----
  const removeMember = useCallback(async (id: string) => {
    const prev = membersRef.current;
    setMembers(prev.filter((m) => m.id !== id));

    const supabase = getClient();
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setMembers(prev);
    }
  }, []);

  return { members, loading, error, addMember, removeMember };
}
