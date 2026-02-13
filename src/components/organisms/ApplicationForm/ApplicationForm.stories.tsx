import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ApplicationForm from './ApplicationForm';
import type { JobApplication } from '@/types/company';

const meta: Meta<typeof ApplicationForm> = {
  title: 'Organisms/ApplicationForm',
  component: ApplicationForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Form for creating and editing job applications. Supports position details, work location type, status/outcome tracking, and date management.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    onCancel: { action: 'cancelled' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockApplication: JobApplication = {
  id: 'app-123',
  shared_company_id: 'company-456',
  private_company_id: null,
  user_id: 'user-789',
  position_title: 'Senior Software Engineer',
  job_link: 'https://careers.example.com/jobs/senior-engineer',
  position_url: 'https://careers.example.com/apply/senior-engineer',
  status_url: null,
  work_location_type: 'hybrid',
  status: 'interviewing',
  outcome: 'pending',
  date_applied: '2024-01-15',
  interview_date: '2024-01-25T10:00:00.000Z',
  follow_up_date: '2024-01-30',
  priority: 2,
  notes: 'Had initial phone screen. Technical interview scheduled.',
  is_active: true,
  created_at: '2024-01-10T00:00:00.000Z',
  updated_at: '2024-01-20T00:00:00.000Z',
};

export const CreateMode: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Acme Corporation',
  },
};

export const EditMode: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Acme Corporation',
    application: mockApplication,
  },
};

export const WithRemoteJob: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Remote First Inc.',
    application: {
      ...mockApplication,
      work_location_type: 'remote',
      position_title: 'Remote Backend Developer',
    },
  },
};

export const WithOffer: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Dream Company',
    application: {
      ...mockApplication,
      status: 'offer',
      outcome: 'pending',
      position_title: 'Staff Engineer',
      priority: 1,
      notes: 'Received offer! Negotiating terms.',
    },
  },
};

export const RejectedApplication: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Big Tech Corp',
    application: {
      ...mockApplication,
      status: 'closed',
      outcome: 'rejected',
      position_title: 'Engineering Manager',
      notes: 'Did not pass the final round. Will reapply in 6 months.',
    },
  },
};

export const MinimalCreate: Story = {
  args: {
    companyId: 'company-456',
  },
};

export const WithCancelButton: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Example Corp',
    onCancel: () => console.log('Cancelled'),
  },
};

export const Narrow: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Test Company',
    className: 'max-w-md',
  },
};

export const Wide: Story = {
  args: {
    companyId: 'company-456',
    companyName: 'Test Company',
    className: 'max-w-4xl',
  },
};
