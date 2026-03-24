'use client';

/**
 * useMySkills — own-tags CRUD for the authenticated user.
 *
 * Auto-primary: first skill added gets is_primary = true.
 * setPrimary: clear-then-set (uq_user_skills_primary rejects two primaries
 * in the same transaction, so we must clear the old one first).
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserSkill } from '@/types/worker';

export interface UseMySkillsReturn {
  skills: UserSkill[];
  addSkill: (skillId: string) => Promise<void>;
  removeSkill: (skillId: string) => Promise<void>;
  setPrimary: (skillId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useMySkills(userId: string | null): UseMySkillsReturn {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!userId) {
      setSkills([]);
      setIsLoading(false);
      return;
    }
     
    const { data, error: err } = await (createClient() as any)
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (err) {
      setError(new Error(err.message));
    } else {
      setSkills((data ?? []) as UserSkill[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const addSkill = useCallback(
    async (skillId: string) => {
      if (!userId) return;
      const isFirst = skills.length === 0;
       
      const { error: err } = await (createClient() as any)
        .from('user_skills')
        .insert({ user_id: userId, skill_id: skillId, is_primary: isFirst });
      if (err) throw new Error(err.message);
      await fetchSkills();
    },
    [userId, skills.length, fetchSkills]
  );

  const removeSkill = useCallback(
    async (skillId: string) => {
      if (!userId) return;
       
      const { error: err } = await (createClient() as any)
        .from('user_skills')
        .delete()
        .eq('user_id', userId)
        .eq('skill_id', skillId);
      if (err) throw new Error(err.message);
      await fetchSkills();
    },
    [userId, fetchSkills]
  );

  const setPrimary = useCallback(
    async (skillId: string) => {
      if (!userId) return;
       
      const sb = createClient() as any;
      // uq_user_skills_primary rejects two primaries — clear current first.
      const { error: clearErr } = await sb
        .from('user_skills')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
      if (clearErr) throw new Error(clearErr.message);
      const { error: setErr } = await sb
        .from('user_skills')
        .update({ is_primary: true })
        .eq('user_id', userId)
        .eq('skill_id', skillId);
      if (setErr) throw new Error(setErr.message);
      await fetchSkills();
    },
    [userId, fetchSkills]
  );

  return { skills, addSkill, removeSkill, setPrimary, isLoading, error };
}
