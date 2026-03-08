import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ApplicationToast from './ApplicationToast';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

const mockApplication: EmployerApplication = {
  id: 'app-1',
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
};

const meta = {
  title: 'Atomic Design/Atomic/ApplicationToast',
  component: ApplicationToast,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onDismiss: { action: 'dismissed' },
  },
} satisfies Meta<typeof ApplicationToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    application: mockApplication,
    onDismiss: () => {},
    autoDismissMs: 999999, // Prevent auto-dismiss in Storybook
  },
};

export const NoPositionTitle: Story = {
  args: {
    application: { ...mockApplication, position_title: null },
    onDismiss: () => {},
    autoDismissMs: 999999,
  },
};

export const Hidden: Story = {
  args: {
    application: null,
    onDismiss: () => {},
  },
};
