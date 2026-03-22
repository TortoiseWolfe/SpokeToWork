import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SkillBadge } from './SkillBadge';
import type { ResolvedSkill } from '@/types/worker';

expect.extend(toHaveNoViolations);

const skill: ResolvedSkill = {
  id: 'c', parent_id: null, slug: 'courier', name: 'Courier',
  color: 'info', icon: 'bike', ancestry: ['Courier'],
};

describe('SkillBadge a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(<SkillBadge skill={skill} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
