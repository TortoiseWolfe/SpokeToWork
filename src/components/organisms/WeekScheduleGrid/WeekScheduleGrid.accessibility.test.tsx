import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeekScheduleGrid from './WeekScheduleGrid';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const members: TeamMember[] = [
  {
    user_id: 'u1',
    display_name: 'Alice',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
];

const defaultProps = {
  shifts: [],
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

describe('WeekScheduleGrid Accessibility', () => {
  it('has accessible table', () => {
    render(<WeekScheduleGrid {...defaultProps} />);
    expect(screen.getByRole('table')).toHaveAccessibleName('Weekly schedule');
  });

  it('navigation buttons have aria-labels', () => {
    render(<WeekScheduleGrid {...defaultProps} />);
    expect(screen.getByLabelText('Previous week')).toBeInTheDocument();
    expect(screen.getByLabelText('Next week')).toBeInTheDocument();
  });

  it('loading state has role=status', () => {
    render(<WeekScheduleGrid {...defaultProps} loading />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading schedule'
    );
  });

  it('error state has role=alert', () => {
    render(<WeekScheduleGrid {...defaultProps} error="Failed" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('editable business hours inputs have aria-labels', () => {
    render(
      <WeekScheduleGrid {...defaultProps} onUpdateBusinessHours={vi.fn()} />
    );
    expect(screen.getByLabelText('Opening time')).toBeInTheDocument();
    expect(screen.getByLabelText('Closing time')).toBeInTheDocument();
  });

  it('copy last week button has aria-label', () => {
    render(<WeekScheduleGrid {...defaultProps} onCopyLastWeek={vi.fn()} />);
    expect(screen.getByLabelText('Copy last week')).toBeInTheDocument();
  });
});
