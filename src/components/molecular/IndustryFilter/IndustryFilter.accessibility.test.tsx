import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { IndustryFilter } from './IndustryFilter';
import type { IndustryTreeNode } from '@/hooks/useIndustries';
import type { Industry } from '@/types/company';

expect.extend(toHaveNoViolations);

const mk = (id: string, name: string, parent_id: string | null = null): Industry => ({
  id, parent_id, slug: id, name, color: null, icon: null, sort_order: 0, created_at: '', updated_at: '',
});

// Populated tree so axe audits the actual checkbox/label markup, not just the
// loading-state placeholder.
const tree: IndustryTreeNode[] = [
  {
    industry: mk('t', 'Transportation'),
    children: [{ industry: mk('d', 'Delivery', 't'), children: [] }],
  },
];

describe('IndustryFilter a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <IndustryFilter tree={tree} selected={['t']} onChange={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
