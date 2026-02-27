import type { Meta, StoryObj, Decorator } from '@storybook/nextjs-vite';
import ApplicationRow from './ApplicationRow';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

const base: EmployerApplication = {
  id: 'app-1',
  shared_company_id: 'c1',
  private_company_id: null,
  user_id: 'u1',
  position_title: 'Bike Mechanic',
  job_link: null,
  position_url: null,
  status_url: null,
  work_location_type: 'on_site',
  status: 'screening',
  outcome: 'pending',
  date_applied: '2026-02-10',
  interview_date: null,
  follow_up_date: null,
  priority: 3,
  notes: null,
  is_active: true,
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-10T00:00:00Z',
  applicant_name: 'Maya Chen',
  company_name: 'Velo Works',
};

// Per-story decorator (not meta-level) — Storybook composes decorators rather
// than replacing them, so ThemeMatrix can opt out by simply not including it.
const tableDecorator: Decorator = (Story) => (
  <table className="table w-full">
    <thead>
      <tr>
        <th>Applicant</th>
        <th>Position</th>
        <th>Status</th>
        <th>Applied</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <Story />
    </tbody>
  </table>
);

const meta: Meta<typeof ApplicationRow> = {
  title: 'Atomic Design/Molecular/ApplicationRow',
  component: ApplicationRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [tableDecorator],
  args: {
    application: base,
    onAdvance: () => {},
    updating: false,
    isRepeat: false,
  },
};

export const Repeat: Story = {
  decorators: [tableDecorator],
  args: {
    application: base,
    onAdvance: () => {},
    updating: false,
    isRepeat: true,
  },
};

export const Updating: Story = {
  decorators: [tableDecorator],
  args: {
    application: base,
    onAdvance: () => {},
    updating: true,
    isRepeat: false,
  },
};

export const Closed: Story = {
  decorators: [tableDecorator],
  args: {
    application: { ...base, status: 'closed', outcome: 'hired' },
    onAdvance: () => {},
    updating: false,
    isRepeat: false,
  },
};

const themes = ['spoketowork-light', 'spoketowork-dark', 'synthwave'] as const;

export const ThemeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-base-100 rounded p-4">
          <div className="mb-2 text-xs opacity-60">{theme}</div>
          <table className="table w-full">
            <tbody>
              <ApplicationRow
                application={base}
                onAdvance={() => {}}
                updating={false}
                isRepeat={false}
              />
            </tbody>
          </table>
        </div>
      ))}
    </div>
  ),
};
