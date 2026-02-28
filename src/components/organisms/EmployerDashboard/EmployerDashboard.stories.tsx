import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmployerDashboard from './EmployerDashboard';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';
import type { JobApplicationStatus } from '@/types/company';

const createApp = (
  overrides: Partial<EmployerApplication> & { id: string }
): EmployerApplication => ({
  shared_company_id: 'comp-1',
  private_company_id: null,
  user_id: 'user-1',
  position_title: 'Software Engineer',
  job_link: null,
  position_url: null,
  status_url: null,
  work_location_type: 'remote',
  status: 'applied',
  outcome: 'pending',
  date_applied: '2026-01-15T00:00:00Z',
  interview_date: null,
  follow_up_date: null,
  priority: 3,
  notes: null,
  is_active: true,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  applicant_name: 'Jane Doe',
  company_name: 'Acme Corp',
  ...overrides,
});

const sampleApplications: EmployerApplication[] = [
  createApp({
    id: '1',
    applicant_name: 'Alice Johnson',
    position_title: 'Frontend Developer',
    status: 'applied',
    priority: 2,
    work_location_type: 'hybrid',
    date_applied: '2026-02-10T00:00:00Z',
  }),
  createApp({
    id: '2',
    applicant_name: 'Bob Smith',
    position_title: 'Backend Engineer',
    status: 'screening',
    priority: 1,
    work_location_type: 'on_site',
    date_applied: '2026-02-08T00:00:00Z',
    interview_date: '2026-03-05T14:00:00Z',
  }),
  createApp({
    id: '3',
    user_id: 'user-2',
    applicant_name: 'Carol Davis',
    position_title: 'Full Stack Developer',
    status: 'interviewing',
    priority: 1,
    work_location_type: 'remote',
    date_applied: '2026-02-05T00:00:00Z',
    interview_date: '2026-03-01T10:00:00Z',
    company_name: 'TechCo',
  }),
  createApp({
    id: '4',
    user_id: 'user-3',
    applicant_name: 'Dan Wilson',
    position_title: 'DevOps Engineer',
    status: 'offer',
    priority: 2,
    work_location_type: 'remote',
    date_applied: '2026-01-28T00:00:00Z',
    notes: 'Salary negotiation pending',
  }),
  createApp({
    id: '5',
    user_id: 'user-4',
    applicant_name: 'Eve Brown',
    position_title: 'UX Designer',
    status: 'closed',
    priority: 4,
    work_location_type: 'hybrid',
    date_applied: '2026-01-20T00:00:00Z',
    outcome: 'hired',
  }),
];

const meta = {
  title: 'Atomic Design/Organism/EmployerDashboard',
  component: EmployerDashboard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onUpdateStatus: { action: 'updateStatus' },
    onRefresh: { action: 'refresh' },
  },
} satisfies Meta<typeof EmployerDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    applications: sampleApplications,
    loading: false,
    error: null,
    onUpdateStatus: async (id: string, status: JobApplicationStatus) => {
      console.log('Update status:', id, status);
    },
    onRefresh: async () => {
      console.log('Refresh');
    },
  },
};

export const Loading: Story = {
  args: {
    applications: [],
    loading: true,
    error: null,
    onUpdateStatus: async () => {},
    onRefresh: async () => {},
  },
};

export const Error: Story = {
  args: {
    applications: [],
    loading: false,
    error: 'Failed to load applications. Please check your connection.',
    onUpdateStatus: async () => {},
    onRefresh: async () => {},
  },
};

export const Empty: Story = {
  args: {
    applications: [],
    loading: false,
    error: null,
    onUpdateStatus: async () => {},
    onRefresh: async () => {},
  },
};

export const SingleApplication: Story = {
  args: {
    applications: [sampleApplications[0]],
    loading: false,
    error: null,
    onUpdateStatus: async (id: string, status: JobApplicationStatus) => {
      console.log('Update status:', id, status);
    },
    onRefresh: async () => {},
  },
};

export const HasMore: Story = {
  args: {
    applications: sampleApplications,
    loading: false,
    error: null,
    onUpdateStatus: async () => {},
    onRefresh: async () => {},
    statusCounts: {
      applied: 120,
      screening: 48,
      interviewing: 20,
      offer: 5,
      closed: 7,
    },
    totalCount: 200,
    hasMore: true,
    onLoadMore: async () => {
      console.log('Load more');
    },
  },
};

export const LoadingMore: Story = {
  args: {
    ...HasMore.args,
    loadingMore: true,
  },
};
