import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemberScheduleDrawer from './MemberScheduleDrawer';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const member: TeamMember = {
  user_id: 'u1',
  display_name: 'Alice Chen',
  avatar_url: null,
  joined_at: '2026-01-01',
};

const defaultProps = {
  member,
  existingShifts: [],
  weekStart: '2026-03-02',
  businessHours: { open: '09:00', close: '17:00' },
  onSave: vi.fn(),
  onClose: vi.fn(),
};

describe('MemberScheduleDrawer', () => {
  it('renders nothing when member is null', () => {
    const { container } = render(
      <MemberScheduleDrawer {...defaultProps} member={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders member name in heading', () => {
    render(<MemberScheduleDrawer {...defaultProps} />);
    expect(screen.getByText("Alice Chen's Schedule")).toBeInTheDocument();
  });

  it('shows all 7 day checkboxes', () => {
    render(<MemberScheduleDrawer {...defaultProps} />);
    expect(screen.getByLabelText('Enable Mon')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Tue')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Wed')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Thu')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Fri')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Sat')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Sun')).toBeInTheDocument();
  });

  it('Mon-Fri button enables weekdays', async () => {
    const user = userEvent.setup();
    render(<MemberScheduleDrawer {...defaultProps} />);
    await user.click(screen.getByText('Mon–Fri'));
    expect(screen.getByLabelText('Enable Mon')).toBeChecked();
    expect(screen.getByLabelText('Enable Fri')).toBeChecked();
    expect(screen.getByLabelText('Enable Sat')).not.toBeChecked();
    expect(screen.getByLabelText('Enable Sun')).not.toBeChecked();
  });

  it('shows shift count summary when days enabled', async () => {
    const user = userEvent.setup();
    render(<MemberScheduleDrawer {...defaultProps} />);
    await user.click(screen.getByText('Mon–Fri'));
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/shifts? will be created/)).toBeInTheDocument();
  });

  it('calls onSave with correct entries for this week', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MemberScheduleDrawer {...defaultProps} onSave={onSave} />);

    await user.click(screen.getByText('Mon–Fri'));
    await user.click(screen.getByText(/Save 5 Shifts/));

    expect(onSave).toHaveBeenCalledTimes(1);
    const entries = onSave.mock.calls[0][0];
    expect(entries).toHaveLength(5);
    expect(entries[0]).toMatchObject({
      shift_date: '2026-03-02',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'regular',
    });
    expect(entries[4]).toMatchObject({
      shift_date: '2026-03-06',
    });
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MemberScheduleDrawer {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('pre-fills from existing shifts', () => {
    render(
      <MemberScheduleDrawer
        {...defaultProps}
        existingShifts={[
          {
            id: 's1',
            company_id: 'c1',
            user_id: 'u1',
            display_name: 'Alice Chen',
            avatar_url: null,
            shift_date: '2026-03-02',
            start_time: '10:00:00',
            end_time: '18:00:00',
            shift_type: 'regular',
            notes: null,
            created_by: 'u2',
            created_at: '2026-03-01T00:00:00Z',
            updated_at: '2026-03-01T00:00:00Z',
          },
        ]}
      />
    );
    expect(screen.getByLabelText('Enable Mon')).toBeChecked();
    expect(screen.getByLabelText('Mon start time')).toHaveValue('10:00');
    expect(screen.getByLabelText('Mon end time')).toHaveValue('18:00');
  });

  it('disables save button when no days enabled', () => {
    render(<MemberScheduleDrawer {...defaultProps} />);
    expect(screen.getByText(/Save 0 Shift/)).toBeDisabled();
  });

  it('multiplies shifts by week count', async () => {
    const user = userEvent.setup();
    render(<MemberScheduleDrawer {...defaultProps} />);
    await user.click(screen.getByText('Mon–Fri'));

    // Switch to multi-week mode
    const radioLabels = screen.getAllByRole('radio');
    await user.click(radioLabels[1]); // "Next N weeks"

    // 5 days × 4 weeks = 20, shown in save button
    expect(screen.getByText(/Save 20 Shifts/)).toBeInTheDocument();
  });
});
