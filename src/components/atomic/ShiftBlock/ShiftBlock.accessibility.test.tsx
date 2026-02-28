import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('ShiftBlock Accessibility', () => {
  it('renders as a button with aria-label', () => {
    render(<ShiftBlock shift={baseShift} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAccessibleName(/Alice shift/);
  });

  it('includes time range in accessible name', () => {
    render(<ShiftBlock shift={baseShift} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAccessibleName(/9:00 AM to 5:00 PM/);
  });

  it('open shift uses "Open" in label', () => {
    render(
      <ShiftBlock shift={{ ...baseShift, user_id: null, display_name: null }} />
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAccessibleName(/Open shift/);
  });
});
