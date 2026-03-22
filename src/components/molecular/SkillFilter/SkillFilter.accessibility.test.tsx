import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SkillFilter } from './SkillFilter';
import type { SkillTreeNode } from '@/hooks/useSkills';
import type { Skill } from '@/types/worker';

expect.extend(toHaveNoViolations);

const mk = (id: string, name: string, parent_id: string | null = null): Skill => ({
  id, parent_id, slug: id, name, color: null, icon: null, sort_order: 0, created_at: '', updated_at: '',
});

const tree: SkillTreeNode[] = [
  {
    node: mk('c', 'Courier'),
    children: [{ node: mk('fd', 'Food Delivery', 'c'), children: [] }],
  },
];

describe('SkillFilter a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <SkillFilter tree={tree} selected={['c']} onChange={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
