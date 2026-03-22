'use client';

import { BADGE_CLASS } from '@/lib/taxonomy/badge-class';
import type { ResolvedSkill } from '@/types/worker';

export interface SkillBadgeProps {
  skill: ResolvedSkill;
}

export function SkillBadge({ skill }: SkillBadgeProps) {
  return (
    <span
      data-testid="skill-badge"
      className={`badge badge-lg ${BADGE_CLASS[skill.color]}`}
    >
      {skill.name}
    </span>
  );
}
