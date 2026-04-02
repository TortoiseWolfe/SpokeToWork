import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkerScheduleTimeline from './WorkerScheduleTimeline';
import type { WorkerShift } from '@/types/schedule';

const PAST = new Date(Date.now() - 60_000).toISOString();
const FUTURE = new Date(Date.now() + 60 * 60_000).toISOString();

const weekDates = [
  '2026-03-30',
  '2026-03-31',
  '2026-04-01',
  '2026-04-02',
  '2026-04-03',
  '2026-04-04',
  '2026-04-05',
];

const shift: WorkerShift = {
  id: 's1',
  company_id: 'c1',
  company_name: "Joe's Pizza",
  shift_date: '2026-03-30',
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

const baseProps = {
  shiftsByDay: new Map(weekDates.map((d) => [d, d === '2026-03-30' ? [shift] : []])),
  weekDates,
  weekStart: '2026-03-30',
  loading: false,
  error: null,
  onPrevWeek: vi.fn(),
  onNextWeek: vi.fn(),
  onClockIn: vi.fn(),
  onClockOut: vi.fn(),
};

describe('WorkerScheduleTimeline Accessibility', () => {
  it('week nav buttons have descriptive labels', () => {
    render(<WorkerScheduleTimeline {...baseProps} />);
    expect(
      screen.getByRole('button', { name: 'Previous week' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Next week' })
    ).toBeInTheDocument();
  });

  it('error uses role=alert', () => {
    render(<WorkerScheduleTimeline {...baseProps} error="boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('day group has heading-level structure', () => {
    render(<WorkerScheduleTimeline {...baseProps} />);
    // Week label is h2, day labels are h3
    expect(
      screen.getByRole('heading', { level: 2, name: /Mar 30/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /Mon/ })
    ).toBeInTheDocument();
  });

  it('nav arrows meet 44px touch target', () => {
    render(<WorkerScheduleTimeline {...baseProps} />);
    const prev = screen.getByRole('button', { name: 'Previous week' });
    expect(prev.className).toMatch(/min-h-11/);
    expect(prev.className).toMatch(/min-w-11/);
  });
});
