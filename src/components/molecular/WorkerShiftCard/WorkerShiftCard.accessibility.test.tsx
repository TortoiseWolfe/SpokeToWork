import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkerShiftCard from './WorkerShiftCard';
import type { WorkerShift } from '@/types/schedule';

const PAST = new Date(Date.now() - 60_000).toISOString();
const FUTURE = new Date(Date.now() + 60 * 60_000).toISOString();

const baseShift: WorkerShift = {
  id: 's1',
  company_id: 'c1',
  company_name: "Joe's Pizza",
  shift_date: '2026-04-02',
  start_time: '09:00:00',
  end_time: '13:00:00',
  shift_type: 'regular',
  notes: null,
  metro_timezone: 'America/New_York',
  clock_in_opens_at: PAST,
  shift_end_at: FUTURE,
  active_entry_id: null,
  active_clock_in_at: null,
  active_entry_status: null,
};

describe('WorkerShiftCard Accessibility', () => {
  it('Clock In button names the company', () => {
    render(<WorkerShiftCard shift={baseShift} />);
    expect(
      screen.getByRole('button', { name: /Clock in to Joe's Pizza/i })
    ).toBeInTheDocument();
  });

  it('Clock Out button names the company', () => {
    render(
      <WorkerShiftCard shift={{ ...baseShift, active_entry_id: 'te1' }} />
    );
    expect(
      screen.getByRole('button', { name: /Clock out of Joe's Pizza/i })
    ).toBeInTheDocument();
  });

  it('overlap warning uses role=status', () => {
    render(<WorkerShiftCard shift={baseShift} hasOverlap />);
    expect(screen.getByRole('status')).toHaveTextContent(/Overlaps/);
  });

  it('disabled button uses native disabled (not aria-disabled)', () => {
    render(<WorkerShiftCard shift={baseShift} blocked />);
    const btn = screen.getByRole('button', { name: /clock in/i });
    expect(btn).toHaveProperty('disabled', true);
  });
});
