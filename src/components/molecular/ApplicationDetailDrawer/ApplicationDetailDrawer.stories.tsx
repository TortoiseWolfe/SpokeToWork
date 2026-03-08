import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ApplicationDetailDrawer from './ApplicationDetailDrawer';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

const base: EmployerApplication = {
  id: 'app-1',
  shared_company_id: 'c1',
  private_company_id: null,
  user_id: 'u1',
  position_title: 'Frontend Developer',
  job_link: 'https://example.com/careers',
  position_url: 'https://example.com/jobs/frontend',
  status_url: 'https://example.com/portal',
  work_location_type: 'hybrid',
  status: 'interviewing',
  outcome: 'pending',
  date_applied: '2026-02-10T00:00:00Z',
  interview_date: '2026-03-05T14:00:00Z',
  follow_up_date: '2026-03-10',
  priority: 1,
  notes: 'Strong portfolio, 5 years experience.\nGreat cultural fit.',
  is_active: true,
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-20T00:00:00Z',
  applicant_name: 'Alice Chen',
  company_name: 'Acme Corp',
};

const meta: Meta<typeof ApplicationDetailDrawer> = {
  title: 'Atomic Design/Molecular/ApplicationDetailDrawer',
  component: ApplicationDetailDrawer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ApplicationDetailDrawer>;

export const Default: Story = {
  args: {
    application: base,
    onClose: () => {},
    onAdvance: () => {},
  },
};

export const ClosedApplication: Story = {
  args: {
    application: { ...base, status: 'closed', outcome: 'hired' },
    onClose: () => {},
    onAdvance: () => {},
  },
};

export const MinimalData: Story = {
  args: {
    application: {
      ...base,
      position_title: null,
      job_link: null,
      position_url: null,
      status_url: null,
      interview_date: null,
      follow_up_date: null,
      notes: null,
      priority: 5,
    },
    onClose: () => {},
    onAdvance: () => {},
  },
};

export const Closed: Story = {
  args: {
    application: null,
    onClose: () => {},
    onAdvance: () => {},
  },
};
