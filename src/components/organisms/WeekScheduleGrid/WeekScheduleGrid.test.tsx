import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekScheduleGrid from './WeekScheduleGrid';
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

const shifts: TeamShift[] = [
  {
    id: 's1',
    company_id: 'c1',
    user_id: 'u1',
    display_name: 'Alice',
    avatar_url: null,
    shift_date: '2026-03-02',
    start_time: '09:00:00',
    end_time: '17:00:00',
    shift_type: 'regular',
    notes: null,
    created_by: 'u2',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

const defaultProps = {
  shifts,
  members,
  weekStart: '2026-03-02',
  loading: false,
  error: null,
  businessHours: { open: '08:00', close: '18:00' },
  onPrevWeek: vi.fn(),
  onNextWeek: vi.fn(),
  onToday: vi.fn(),
  onAddShift: vi.fn(),
  onEditShift: vi.fn(),
};

describe('WeekScheduleGrid', () => {
  it('renders the grid', () => {
    render(<WeekScheduleGrid {...defaultProps} />);
    expect(screen.getByTestId('week-schedule-grid')).toBeInTheDocument();
  });

  it('shows week navigation', () => {
    render(<WeekScheduleGrid {...defaultProps} />);
    expect(screen.getByLabelText('Previous week')).toBeInTheDocument();
    expect(screen.getByLabelText('Next week')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows team member names', () => {
    render(<WeekScheduleGrid {...defaultProps} />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
  });

  it('shows loading state', () => {
    render(<WeekScheduleGrid {...defaultProps} loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<WeekScheduleGrid {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onPrevWeek when prev button clicked', async () => {
    const user = userEvent.setup();
    const onPrevWeek = vi.fn();
    render(<WeekScheduleGrid {...defaultProps} onPrevWeek={onPrevWeek} />);
    await user.click(screen.getByLabelText('Previous week'));
    expect(onPrevWeek).toHaveBeenCalled();
  });

  it('calls onNextWeek when next button clicked', async () => {
    const user = userEvent.setup();
    const onNextWeek = vi.fn();
    render(<WeekScheduleGrid {...defaultProps} onNextWeek={onNextWeek} />);
    await user.click(screen.getByLabelText('Next week'));
    expect(onNextWeek).toHaveBeenCalled();
  });

  it('shows business hours as read-only when no update handler', () => {
    render(<WeekScheduleGrid {...defaultProps} />);
    expect(screen.getByText(/Business hours/)).toBeInTheDocument();
    expect(screen.getByText(/8:00 AM/)).toBeInTheDocument();
  });

  it('shows editable business hours when onUpdateBusinessHours provided', () => {
    render(
      <WeekScheduleGrid {...defaultProps} onUpdateBusinessHours={vi.fn()} />
    );
    expect(screen.getByLabelText('Opening time')).toHaveValue('08:00');
    expect(screen.getByLabelText('Closing time')).toHaveValue('18:00');
  });

  it('shows Save Hours button when hours are dirty', async () => {
    const user = userEvent.setup();
    render(
      <WeekScheduleGrid {...defaultProps} onUpdateBusinessHours={vi.fn()} />
    );
    const openInput = screen.getByLabelText('Opening time');
    await user.clear(openInput);
    await user.type(openInput, '09:00');
    expect(screen.getByText('Save Hours')).toBeInTheDocument();
  });

  it('calls onUpdateBusinessHours when Save Hours clicked', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <WeekScheduleGrid {...defaultProps} onUpdateBusinessHours={onUpdate} />
    );
    const openInput = screen.getByLabelText('Opening time');
    await user.clear(openInput);
    await user.type(openInput, '09:00');
    await user.click(screen.getByText('Save Hours'));
    expect(onUpdate).toHaveBeenCalledWith({ open: '09:00', close: '18:00' });
  });

  it('shows Copy Last Week button when handler provided', () => {
    render(<WeekScheduleGrid {...defaultProps} onCopyLastWeek={vi.fn()} />);
    expect(screen.getByText('Copy Last Week')).toBeInTheDocument();
  });

  it('shows confirmation on first Copy Last Week click', async () => {
    const user = userEvent.setup();
    render(<WeekScheduleGrid {...defaultProps} onCopyLastWeek={vi.fn()} />);
    await user.click(screen.getByText('Copy Last Week'));
    expect(screen.getByText('Confirm Copy?')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel copy')).toBeInTheDocument();
  });

  it('calls onCopyLastWeek on second click (confirm)', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockResolvedValue(3);
    render(<WeekScheduleGrid {...defaultProps} onCopyLastWeek={onCopy} />);
    await user.click(screen.getByText('Copy Last Week'));
    await user.click(screen.getByText('Confirm Copy?'));
    expect(onCopy).toHaveBeenCalled();
  });

  it('makes member names clickable when onSetSchedule provided', () => {
    render(<WeekScheduleGrid {...defaultProps} onSetSchedule={vi.fn()} />);
    expect(screen.getByLabelText('Set schedule for Alice')).toBeInTheDocument();
    expect(screen.getByLabelText('Set schedule for Bob')).toBeInTheDocument();
  });

  it('calls onSetSchedule when member name clicked', async () => {
    const user = userEvent.setup();
    const onSetSchedule = vi.fn();
    render(
      <WeekScheduleGrid {...defaultProps} onSetSchedule={onSetSchedule} />
    );
    await user.click(screen.getByLabelText('Set schedule for Alice'));
    expect(onSetSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', display_name: 'Alice' })
    );
  });

  it('shows Add Shift button', () => {
    render(<WeekScheduleGrid {...defaultProps} />);
    expect(screen.getByText('+ Add Shift')).toBeInTheDocument();
  });

  it('shows empty state when no members', () => {
    render(<WeekScheduleGrid {...defaultProps} members={[]} shifts={[]} />);
    expect(screen.getByText(/No team members yet/)).toBeInTheDocument();
  });
});
