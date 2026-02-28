import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamPanel, { type TeamPanelConnection } from './TeamPanel';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const makeMember = (over: Partial<TeamMember> = {}): TeamMember => ({
  user_id: 'u1',
  display_name: 'Alice',
  avatar_url: null,
  joined_at: '2026-01-01T00:00:00Z',
  ...over,
});

const connections: TeamPanelConnection[] = [
  { user_id: 'u-conn', display_name: 'Bob Connection', avatar_url: null },
];

describe('TeamPanel', () => {
  it('renders a chip per member with display names', () => {
    const members = [
      makeMember({ user_id: 'u1', display_name: 'Alice' }),
      makeMember({ user_id: 'u2', display_name: 'Bob' }),
    ];
    render(
      <TeamPanel
        members={members}
        availableConnections={[]}
        currentUserId="u1"
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows the member count in the heading', () => {
    render(
      <TeamPanel
        members={[makeMember(), makeMember({ user_id: 'u2' })]}
        availableConnections={[]}
        currentUserId="u1"
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(
      screen.getByRole('heading', { name: /team \(2\)/i })
    ).toBeInTheDocument();
  });

  it('calls onRemove with the user id when remove button clicked', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    render(
      <TeamPanel
        members={[makeMember({ user_id: 'u2', display_name: 'Bob' })]}
        availableConnections={[]}
        currentUserId="u1"
        onRemove={onRemove}
        onAdd={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /remove bob/i }));
    expect(onRemove).toHaveBeenCalledWith('u2');
  });

  it('hides remove button for the current user', () => {
    render(
      <TeamPanel
        members={[makeMember({ user_id: 'me', display_name: 'Me' })]}
        availableConnections={[]}
        currentUserId="me"
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('button', { name: /remove me/i })
    ).not.toBeInTheDocument();
  });

  it('shows empty-state text when only the current user is on the team', () => {
    render(
      <TeamPanel
        members={[makeMember({ user_id: 'me', display_name: 'Me' })]}
        availableConnections={[]}
        currentUserId="me"
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.getByText(/just you so far/i)).toBeInTheDocument();
  });

  it('opens the picker and calls onAdd when a connection is selected', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <TeamPanel
        members={[makeMember({ user_id: 'me', display_name: 'Me' })]}
        availableConnections={connections}
        currentUserId="me"
        onRemove={vi.fn()}
        onAdd={onAdd}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /add teammate/i })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /bob connection/i })
    );
    expect(onAdd).toHaveBeenCalledWith('u-conn', {
      display_name: 'Bob Connection',
      avatar_url: null,
    });
  });

  it('shows no-connections message when picker opens with empty list', async () => {
    render(
      <TeamPanel
        members={[makeMember({ user_id: 'me', display_name: 'Me' })]}
        availableConnections={[]}
        currentUserId="me"
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /add teammate/i })
    );
    expect(screen.getByText(/no connections to add/i)).toBeInTheDocument();
  });
});
