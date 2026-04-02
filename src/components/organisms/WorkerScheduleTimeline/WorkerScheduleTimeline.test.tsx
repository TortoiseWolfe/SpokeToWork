import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkerScheduleTimeline from './WorkerScheduleTimeline';
import type { WorkerShift } from '@/types/schedule';

const PAST = new Date(Date.now() - 60_000).toISOString();
const FUTURE = new Date(Date.now() + 60 * 60_000).toISOString();

function mkShift(overrides: Partial<WorkerShift> = {}): WorkerShift {
  return {
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
    ...overrides,
  };
}

const weekDates = [
  '2026-03-30',
  '2026-03-31',
  '2026-04-01',
  '2026-04-02',
  '2026-04-03',
  '2026-04-04',
  '2026-04-05',
];

function mkProps(byDay: Record<string, WorkerShift[]>) {
  const shiftsByDay = new Map<string, WorkerShift[]>();
  for (const d of weekDates) shiftsByDay.set(d, byDay[d] ?? []);
  return {
    shiftsByDay,
    weekDates,
    weekStart: '2026-03-30',
    loading: false,
    error: null,
    onPrevWeek: vi.fn(),
    onNextWeek: vi.fn(),
    onClockIn: vi.fn(),
    onClockOut: vi.fn(),
  };
}

describe('WorkerScheduleTimeline', () => {
  it('renders week range label', () => {
    render(<WorkerScheduleTimeline {...mkProps({})} />);
    expect(
      screen.getByRole('heading', { name: /Mar 30 – Apr 5, 2026/ })
    ).toBeInTheDocument();
  });

  it('shows empty state when no shifts', () => {
    render(<WorkerScheduleTimeline {...mkProps({})} />);
    expect(screen.getByText(/No shifts scheduled/)).toBeInTheDocument();
  });

  it('renders only days that have shifts', () => {
    render(
      <WorkerScheduleTimeline
        {...mkProps({
          '2026-03-30': [mkShift({ id: 'mon' })],
          '2026-04-02': [mkShift({ id: 'thu', shift_date: '2026-04-02' })],
        })}
      />
    );
    expect(screen.getByTestId('day-2026-03-30')).toBeInTheDocument();
    expect(screen.queryByTestId('day-2026-03-31')).not.toBeInTheDocument();
    expect(screen.getByTestId('day-2026-04-02')).toBeInTheDocument();
  });

  it('groups multi-company shifts under the same day', () => {
    render(
      <WorkerScheduleTimeline
        {...mkProps({
          '2026-03-30': [
            mkShift({ id: 'a', company_name: "Joe's Pizza" }),
            mkShift({
              id: 'b',
              company_name: "Maria's Tacos",
              start_time: '14:00:00',
              end_time: '18:00:00',
            }),
          ],
        })}
      />
    );
    const day = screen.getByTestId('day-2026-03-30');
    expect(within(day).getByText("Joe's Pizza")).toBeInTheDocument();
    expect(within(day).getByText("Maria's Tacos")).toBeInTheDocument();
  });

  it('blocks other shifts when one has an open entry (cross-company)', () => {
    render(
      <WorkerScheduleTimeline
        {...mkProps({
          '2026-03-30': [
            mkShift({ id: 'open', active_entry_id: 'te1' }),
            mkShift({
              id: 'blocked',
              company_name: "Maria's Tacos",
              start_time: '14:00:00',
              end_time: '18:00:00',
            }),
          ],
        })}
      />
    );
    // The open shift shows Clock Out
    expect(
      screen.getByRole('button', { name: /clock out of Joe's Pizza/i })
    ).toBeInTheDocument();
    // The other shift's Clock In is disabled with the explanation
    const blockedBtn = screen.getByRole('button', {
      name: /clock in to Maria's Tacos/i,
    });
    expect(blockedBtn).toBeDisabled();
    expect(
      screen.getByText(/Clock out of your other shift first/)
    ).toBeInTheDocument();
  });

  it('flags paper-schedule overlaps within a day', () => {
    render(
      <WorkerScheduleTimeline
        {...mkProps({
          '2026-03-30': [
            mkShift({ id: 'a', start_time: '09:00:00', end_time: '13:00:00' }),
            mkShift({
              id: 'b',
              company_name: "Maria's Tacos",
              start_time: '12:00:00',
              end_time: '16:00:00',
            }),
          ],
        })}
      />
    );
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('does not flag overlap for shifts that abut', () => {
    render(
      <WorkerScheduleTimeline
        {...mkProps({
          '2026-03-30': [
            mkShift({ id: 'a', start_time: '09:00:00', end_time: '13:00:00' }),
            mkShift({
              id: 'b',
              company_name: "Maria's Tacos",
              start_time: '13:00:00',
              end_time: '17:00:00',
            }),
          ],
        })}
      />
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('week nav fires callbacks', async () => {
    const user = userEvent.setup();
    const props = mkProps({});
    render(<WorkerScheduleTimeline {...props} />);
    await user.click(screen.getByRole('button', { name: /previous week/i }));
    expect(props.onPrevWeek).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: /next week/i }));
    expect(props.onNextWeek).toHaveBeenCalledOnce();
  });

  it('shows error in alert region', () => {
    render(
      <WorkerScheduleTimeline {...mkProps({})} error="RPC failed" />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('RPC failed');
  });

  it('renders server-aggregated summary when provided', () => {
    render(
      <WorkerScheduleTimeline
        {...mkProps({})}
        summary={{ scheduled_hours: 20, worked_hours: 3.92 }}
      />
    );
    const panel = screen.getByTestId('week-summary');
    expect(within(panel).getByText('Scheduled')).toBeInTheDocument();
    expect(within(panel).getByText('20.0 h')).toBeInTheDocument();
    expect(within(panel).getByText('Worked')).toBeInTheDocument();
    expect(within(panel).getByText('3.9 h')).toBeInTheDocument();
  });

  it('omits summary panel when summary is null', () => {
    render(<WorkerScheduleTimeline {...mkProps({})} summary={null} />);
    expect(screen.queryByTestId('week-summary')).not.toBeInTheDocument();
  });
});
