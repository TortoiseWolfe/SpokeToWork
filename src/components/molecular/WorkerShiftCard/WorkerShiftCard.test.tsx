import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  clock_in_opens_at: PAST, // window open
  shift_end_at: FUTURE, // not over
  active_entry_id: null,
  active_clock_in_at: null,
  active_entry_status: null,
};

describe('WorkerShiftCard', () => {
  it('renders time range and company name', () => {
    render(<WorkerShiftCard shift={baseShift} />);
    expect(screen.getByText(/9:00 AM–1:00 PM/)).toBeInTheDocument();
    expect(screen.getByText("Joe's Pizza")).toBeInTheDocument();
  });

  it('Clock In is enabled when window is open and no active entry', () => {
    render(<WorkerShiftCard shift={baseShift} />);
    const btn = screen.getByRole('button', { name: /clock in/i });
    expect(btn).toBeEnabled();
  });

  it('Clock In is disabled before clock_in_opens_at', () => {
    render(
      <WorkerShiftCard shift={{ ...baseShift, clock_in_opens_at: FUTURE }} />
    );
    const btn = screen.getByRole('button', { name: /clock in/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Opens 15 min before/)).toBeInTheDocument();
  });

  it('shows Clock Out when active_entry_id is set', () => {
    render(
      <WorkerShiftCard
        shift={{
          ...baseShift,
          active_entry_id: 'te1',
          active_clock_in_at: PAST,
        }}
      />
    );
    expect(
      screen.getByRole('button', { name: /clock out/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/On the clock since/)).toBeInTheDocument();
  });

  it('calls onClockIn with shift id', async () => {
    const user = userEvent.setup();
    const onClockIn = vi.fn();
    render(<WorkerShiftCard shift={baseShift} onClockIn={onClockIn} />);
    await user.click(screen.getByRole('button', { name: /clock in/i }));
    expect(onClockIn).toHaveBeenCalledWith('s1');
  });

  it('calls onClockOut with active entry id', async () => {
    const user = userEvent.setup();
    const onClockOut = vi.fn();
    render(
      <WorkerShiftCard
        shift={{ ...baseShift, active_entry_id: 'te1' }}
        onClockOut={onClockOut}
      />
    );
    await user.click(screen.getByRole('button', { name: /clock out/i }));
    expect(onClockOut).toHaveBeenCalledWith('te1');
  });

  it('disables Clock In when blocked, with explanation', () => {
    render(<WorkerShiftCard shift={baseShift} blocked />);
    expect(
      screen.getByRole('button', { name: /clock in/i })
    ).toBeDisabled();
    expect(
      screen.getByText(/Clock out of your other shift first/)
    ).toBeInTheDocument();
  });

  it('shows overlap warning when hasOverlap', () => {
    render(<WorkerShiftCard shift={baseShift} hasOverlap />);
    expect(screen.getByRole('status')).toHaveTextContent(/Overlaps another/);
  });

  it('shows Ended badge after shift_end_at', () => {
    render(
      <WorkerShiftCard
        shift={{ ...baseShift, clock_in_opens_at: PAST, shift_end_at: PAST }}
      />
    );
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /clock in/i })
    ).not.toBeInTheDocument();
  });
});
