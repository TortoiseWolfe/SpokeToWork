import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShiftBlock from './ShiftBlock';
import type { TeamShift } from '@/types/schedule';

const baseShift: TeamShift = {
  id: '1',
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
};

describe('ShiftBlock', () => {
  it('renders time range', () => {
    render(<ShiftBlock shift={baseShift} />);
    expect(screen.getByText(/9:00 AM–5:00 PM/)).toBeInTheDocument();
  });

  it('renders shift type label', () => {
    render(<ShiftBlock shift={baseShift} />);
    expect(screen.getByText('Regular')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShiftBlock shift={baseShift} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(baseShift);
  });

  it('hides label in compact mode', () => {
    render(<ShiftBlock shift={baseShift} compact />);
    expect(screen.queryByText('Regular')).not.toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<ShiftBlock shift={baseShift} />);
    expect(screen.getByRole('button')).toHaveAccessibleName(
      /Alice shift: 9:00 AM to 5:00 PM, Regular/
    );
  });
});
