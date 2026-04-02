import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import WorkerScheduleTimeline from './WorkerScheduleTimeline';
import type { WorkerShift } from '@/types/schedule';

const PAST = new Date(Date.now() - 60_000).toISOString();
const HALF_HOUR_AGO = new Date(Date.now() - 30 * 60_000).toISOString();
const FUTURE = new Date(Date.now() + 60 * 60_000).toISOString();
const FAR_FUTURE = new Date(Date.now() + 8 * 60 * 60_000).toISOString();

const weekDates = [
  '2026-03-30',
  '2026-03-31',
  '2026-04-01',
  '2026-04-02',
  '2026-04-03',
  '2026-04-04',
  '2026-04-05',
];

function mkShift(overrides: Partial<WorkerShift>): WorkerShift {
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

function buildMap(byDay: Record<string, WorkerShift[]>) {
  const m = new Map<string, WorkerShift[]>();
  for (const d of weekDates) m.set(d, byDay[d] ?? []);
  return m;
}

const baseArgs = {
  weekDates,
  weekStart: '2026-03-30',
  loading: false,
  error: null,
  onPrevWeek: () => {},
  onNextWeek: () => {},
  onClockIn: () => {},
  onClockOut: () => {},
};

const meta: Meta<typeof WorkerScheduleTimeline> = {
  title: 'Atomic Design/Organisms/WorkerScheduleTimeline',
  component: WorkerScheduleTimeline,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WorkerScheduleTimeline>;

export const TypicalWeek: Story = {
  args: {
    ...baseArgs,
    summary: { scheduled_hours: 20, worked_hours: 3.92 },
    shiftsByDay: buildMap({
      '2026-03-30': [
        mkShift({ id: 'mon-a' }),
        mkShift({
          id: 'mon-b',
          company_name: "Maria's Tacos",
          start_time: '14:00:00',
          end_time: '18:00:00',
          clock_in_opens_at: FAR_FUTURE,
          shift_end_at: FAR_FUTURE,
        }),
      ],
      '2026-04-01': [
        mkShift({
          id: 'wed-a',
          shift_date: '2026-04-01',
          company_name: 'Brooklyn Bagel Co',
          shift_type: 'training',
          clock_in_opens_at: FAR_FUTURE,
          shift_end_at: FAR_FUTURE,
        }),
      ],
      '2026-04-03': [
        mkShift({
          id: 'fri-a',
          shift_date: '2026-04-03',
          start_time: '17:00:00',
          end_time: '22:00:00',
          clock_in_opens_at: FAR_FUTURE,
          shift_end_at: FAR_FUTURE,
        }),
      ],
    }),
  },
};

/**
 * Single shift, currently on the clock. Shows the `text-success`
 * "On the clock since …" line and the `btn-outline` Clock Out button.
 * Summary panel reflects mid-shift state (scheduled > worked).
 */
export const ClockedIn: Story = {
  args: {
    ...baseArgs,
    summary: { scheduled_hours: 4, worked_hours: 0.5 },
    shiftsByDay: buildMap({
      '2026-03-30': [
        mkShift({
          id: 'on-the-clock',
          active_entry_id: 'te-live',
          active_clock_in_at: HALF_HOUR_AGO,
          active_entry_status: 'confirmed',
        }),
      ],
    }),
  },
};

/**
 * Shift has ended; worker already clocked out. Card shows the `badge-ghost`
 * Ended pill (no button). Paired with an upcoming shift so the contrast
 * between past and future is visible in one frame.
 */
export const ClockedOut: Story = {
  args: {
    ...baseArgs,
    summary: { scheduled_hours: 8, worked_hours: 3.8 },
    shiftsByDay: buildMap({
      '2026-03-30': [
        mkShift({
          id: 'done',
          start_time: '06:00:00',
          end_time: '10:00:00',
          clock_in_opens_at: PAST,
          shift_end_at: PAST, // now > shift_end_at → Ended badge
        }),
        mkShift({
          id: 'next-up',
          company_name: "Maria's Tacos",
          start_time: '14:00:00',
          end_time: '18:00:00',
          clock_in_opens_at: FAR_FUTURE,
          shift_end_at: FAR_FUTURE,
        }),
      ],
    }),
  },
};

/**
 * 22:00 → 02:00 shift. `formatTime` renders "10:00 PM–2:00 AM"; the server
 * has already bumped `shift_end_at` to the next calendar day so the clock-in
 * window (`now ≥ opens_at && now ≤ ends_at`) is satisfiable. Without the
 * midnight fix this card would show "Ended" before the shift even starts.
 *
 * Paired with an Ended training shift earlier the same day for visual contrast.
 */
export const OvernightShift: Story = {
  args: {
    ...baseArgs,
    summary: { scheduled_hours: 8, worked_hours: 0 },
    shiftsByDay: buildMap({
      '2026-03-30': [
        mkShift({
          id: 'day',
          shift_type: 'training',
          start_time: '09:00:00',
          end_time: '13:00:00',
          clock_in_opens_at: PAST,
          shift_end_at: PAST,
        }),
        mkShift({
          id: 'overnight',
          company_name: 'Brooklyn Bagel Co',
          start_time: '22:00:00',
          end_time: '02:00:00',
          // Window is open right now → Clock In button enabled
          clock_in_opens_at: PAST,
          shift_end_at: FUTURE,
        }),
      ],
    }),
  },
};

export const ClockedInBlocksOthers: Story = {
  args: {
    ...baseArgs,
    shiftsByDay: buildMap({
      '2026-03-30': [
        mkShift({
          id: 'open',
          active_entry_id: 'te1',
          active_clock_in_at: PAST,
          active_entry_status: 'confirmed',
        }),
        mkShift({
          id: 'blocked',
          company_name: "Maria's Tacos",
          start_time: '14:00:00',
          end_time: '18:00:00',
        }),
      ],
    }),
  },
};

export const PaperOverlap: Story = {
  args: {
    ...baseArgs,
    shiftsByDay: buildMap({
      '2026-03-30': [
        mkShift({ id: 'a', start_time: '09:00:00', end_time: '13:00:00' }),
        mkShift({
          id: 'b',
          company_name: "Maria's Tacos",
          start_time: '12:00:00',
          end_time: '16:00:00',
        }),
      ],
    }),
  },
};

export const Empty: Story = {
  args: { ...baseArgs, shiftsByDay: buildMap({}) },
};

export const Loading: Story = {
  args: { ...baseArgs, shiftsByDay: buildMap({}), loading: true },
};

export const ErrorState: Story = {
  args: {
    ...baseArgs,
    shiftsByDay: buildMap({}),
    error: 'Failed to load shifts',
  },
};
