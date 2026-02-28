import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TeamPanel from './TeamPanel';
import type { TeamMember } from '@/hooks/useEmployerTeam';

expect.extend(toHaveNoViolations);

const members: TeamMember[] = [
  {
    user_id: 'u1',
    display_name: 'Alice',
    avatar_url: null,
    joined_at: '2026-01-01T00:00:00Z',
  },
  {
    user_id: 'u2',
    display_name: 'Bob',
    avatar_url: null,
    joined_at: '2026-01-02T00:00:00Z',
  },
];

describe('TeamPanel Accessibility', () => {
  it('has no axe violations (roster with remove buttons)', async () => {
    const { container } = render(
      <TeamPanel
        members={members}
        availableConnections={[]}
        currentUserId="u1"
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations (picker open)', async () => {
    const { container, getByRole } = render(
      <TeamPanel
        members={members}
        availableConnections={[
          { user_id: 'u3', display_name: 'Carol', avatar_url: null },
        ]}
        currentUserId="u1"
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    // Open the picker so axe sees that DOM too
    await userEvent.click(getByRole('button', { name: /add teammate/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
