import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShiftEditorDrawer from './ShiftEditorDrawer';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const members: TeamMember[] = [
  {
    user_id: 'u1',
    display_name: 'Alice',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
];

describe('ShiftEditorDrawer Accessibility', () => {
  it('has dialog role with aria-label', () => {
    render(
      <ShiftEditorDrawer
        shift={null}
        defaultDate="2026-03-02"
        members={members}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Add shift');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('all form fields have labels', () => {
    render(
      <ShiftEditorDrawer
        shift={null}
        defaultDate="2026-03-02"
        members={members}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Assign to')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Start')).toBeInTheDocument();
    expect(screen.getByLabelText('End')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('close button has accessible name', () => {
    render(
      <ShiftEditorDrawer
        shift={null}
        defaultDate="2026-03-02"
        members={members}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
  });
});
