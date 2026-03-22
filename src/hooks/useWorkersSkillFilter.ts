'use client';

/**
 * useWorkersSkillFilter
 *
 * Bundles skill-filter state for the workers page:
 *   - skillIds selection state + setter
 *   - useSkills() tree for the dropdown
 *   - workerFilters memo — undefined when empty (stable cache key)
 */

import { useMemo, useState } from 'react';
import { useSkills, type SkillTreeNode } from '@/hooks/useSkills';
import type { ResolvedSkill, WorkerFilters } from '@/types/worker';

export interface UseWorkersSkillFilterReturn {
  skillIds: string[];
  setSkillIds: (ids: string[]) => void;
  skillTree: SkillTreeNode[];
  resolveSkill: (id: string) => ResolvedSkill | null;
  workerFilters: WorkerFilters | undefined;
}

export function useWorkersSkillFilter(): UseWorkersSkillFilterReturn {
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const { tree: skillTree, resolve: resolveSkill } = useSkills();

  // Filters object MUST be stable — undefined so cache key matches unfiltered case.
  const workerFilters = useMemo(
    () => (skillIds.length ? { skill_ids: skillIds } : undefined),
    [skillIds]
  );

  return { skillIds, setSkillIds, skillTree, resolveSkill, workerFilters };
}
