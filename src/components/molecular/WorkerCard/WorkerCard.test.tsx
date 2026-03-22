import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkerCard } from './WorkerCard';
import type { DiscoverableWorker, ResolvedSkill } from '@/types/worker';

const worker: DiscoverableWorker = {
  id: 'w1',
  username: 'alice',
  display_name: 'Alice',
  avatar_url: null,
  bio: 'Bike courier',
  primary_skill_id: 's1',
  user_skills: [{ id: 'us1', user_id: 'w1', skill_id: 's1', is_primary: true, created_at: '' }],
};

const resolvedSkill: ResolvedSkill = {
  id: 's1', parent_id: null, slug: 'courier', name: 'Courier',
  color: 'info', icon: 'bike', ancestry: ['Courier'],
};

describe('WorkerCard', () => {
  it('renders the worker display name', () => {
    render(<WorkerCard worker={worker} resolveSkill={() => resolvedSkill} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders the primary skill badge', () => {
    render(<WorkerCard worker={worker} resolveSkill={() => resolvedSkill} />);
    expect(screen.getByTestId('skill-badge')).toBeInTheDocument();
  });

  it('renders bio snippet', () => {
    render(<WorkerCard worker={worker} resolveSkill={() => resolvedSkill} />);
    expect(screen.getByText('Bike courier')).toBeInTheDocument();
  });

  it('links to worker profile page', () => {
    render(<WorkerCard worker={worker} resolveSkill={() => resolvedSkill} />);
    expect(screen.getByTestId('worker-card')).toHaveAttribute('href', '/worker?id=w1');
  });

  it('falls back to initial when no avatar', () => {
    render(<WorkerCard worker={worker} resolveSkill={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
