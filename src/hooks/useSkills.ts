'use client';

/**
 * useSkills — factory wrapper around the generic taxonomy hook.
 * Fallback icon 'user' instead of 'building' (worker context, not company).
 */

import {
  createTaxonomyHook,
  type TaxonomyTreeNode,
  type UseTaxonomyReturn,
} from '@/lib/taxonomy/adjacency';
import type { Skill, ResolvedSkill } from '@/types/worker';

export type SkillTreeNode = TaxonomyTreeNode<Skill>;

export interface UseSkillsReturn extends UseTaxonomyReturn<Skill> {
  skills: Skill[];
  resolve: (id: string) => ResolvedSkill | null;
}

const _useSkills = createTaxonomyHook<Skill>({
  table: 'skills',
  fallbackColor: 'primary',
  fallbackIcon: 'user',
});

export function useSkills(): UseSkillsReturn {
  const base = _useSkills();
  return {
    ...base,
    skills: base.rows,
    resolve: base.resolve as (id: string) => ResolvedSkill | null,
  };
}
