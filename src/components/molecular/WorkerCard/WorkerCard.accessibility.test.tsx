import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { WorkerCard } from './WorkerCard';
import type { DiscoverableWorker, ResolvedSkill } from '@/types/worker';

expect.extend(toHaveNoViolations);

const worker: DiscoverableWorker = {
  id: 'w1', username: 'alice', display_name: 'Alice',
  avatar_url: null, bio: null, primary_skill_id: null, user_skills: [],
};

describe('WorkerCard a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <WorkerCard worker={worker} resolveSkill={() => null} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
