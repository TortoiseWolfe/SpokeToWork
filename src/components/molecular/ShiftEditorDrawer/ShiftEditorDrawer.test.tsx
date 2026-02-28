import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShiftEditorDrawer from './ShiftEditorDrawer';
import type { TeamShift } from '@/types/schedule';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const members: TeamMember[] = [
  {
    user_id: 'u1',
    display_name: 'Alice',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
  {
    user_id: 'u2',
    display_name: 'Bob',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
];

const baseShift: TeamShift = {
  id: 's1',
  company_id: 'c1',
  user_id: 'u1',
  display_name: 'Alice',
  avatar_url: null,
  shift_date: '2026-03-02',
  start_time: '09:00:00',
  end_time: '17:00:00',
  shift_type: 'regular',
  notes: 'Test notes',
  created_by: 'u2',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

describe('ShiftEditorDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ShiftEditorDrawer
        shift={null}
        members={members}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders create mode with defaultDate', () => {
    render(
      <ShiftEditorDrawer
        shift={null}
        defaultDate="2026-03-02"
        members={members}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(
      screen.getByRole('heading', { name: 'Add Shift' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue('2026-03-02');
  });

  it('renders edit mode with existing shift', () => {
    render(
      <ShiftEditorDrawer
        shift={baseShift}
        members={members}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Edit Shift')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue('2026-03-02');
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows member options in dropdown', () => {
    render(
      <ShiftEditorDrawer
        shift={null}
        defaultDate="2026-03-02"
        members={members}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Open Shift (unassigned)')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ShiftEditorDrawer
        shift={null}
        defaultDate="2026-03-02"
        members={members}
        onSave={vi.fn()}
        onClose={onClose}
      />
    );
    await user.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows duration', () => {
    render(
      <ShiftEditorDrawer
        shift={baseShift}
        members={members}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/8\.0 hours/)).toBeInTheDocument();
  });
});
