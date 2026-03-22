import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkillBadge } from './SkillBadge';
import type { ResolvedSkill } from '@/types/worker';

const skill: ResolvedSkill = {
  id: 'c', parent_id: null, slug: 'courier', name: 'Courier',
  color: 'info', icon: 'bike', ancestry: ['Courier'],
};

describe('SkillBadge', () => {
  it('renders the skill name', () => {
    render(<SkillBadge skill={skill} />);
    expect(screen.getByText('Courier')).toBeInTheDocument();
  });

  it('applies the badge color class', () => {
    render(<SkillBadge skill={skill} />);
    expect(screen.getByTestId('skill-badge')).toHaveClass('badge-info');
  });
});
