import type { Meta, StoryObj } from '@storybook/nextjs';
import ApplicationRow from './ApplicationRow';
import type { JobApplication } from '@/types/company';

const meta: Meta<typeof ApplicationRow> = {
  title: 'Molecular/ApplicationRow',
  component: ApplicationRow,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Table row for displaying job application data with status, outcome, dates, and action buttons.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <table className="table">
        <thead>
          <tr>
            <th>Position</th>
            <th>Status</th>
            <th className="hidden sm:table-cell">Outcome</th>
            <th className="hidden lg:table-cell">Applied</th>
            <th className="hidden lg:table-cell">Interview</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <Story />
        </tbody>
      </table>
    ),
  ],
  argTypes: {
    onClick: { action: 'clicked' },
    onEdit: { action: 'edit' },
    onDelete: { action: 'delete' },
    onStatusChange: { action: 'statusChanged' },
    onOutcomeChange: { action: 'outcomeChanged' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseApplication: JobApplication = {
  id: 'app-123',
  company_id: 'company-456',
  user_id: 'user-789',
  position_title: 'Senior Software Engineer',
  job_link: 'https://example.com/jobs/senior-engineer',
  work_location_type: 'hybrid',
  status: 'interviewing',
  outcome: 'pending',
  date_applied: '2024-01-15',
  interview_date: '2024-01-25T10:00:00.000Z',
  follow_up_date: '2024-01-30',
  priority: 2,
  notes: 'Interview scheduled',
  is_active: true,
  created_at: '2024-01-10T00:00:00.000Z',
  updated_at: '2024-01-20T00:00:00.000Z',
};

export const Default: Story = {
  args: {
    application: baseApplication,
  },
};

export const WithActions: Story = {
  args: {
    application: baseApplication,
    onEdit: () => console.log('Edit'),
    onDelete: () => console.log('Delete'),
  },
};

export const WithStatusDropdown: Story = {
  args: {
    application: baseApplication,
    onStatusChange: (app, status) => console.log('Status:', status),
    onOutcomeChange: (app, outcome) => console.log('Outcome:', outcome),
  },
};

export const NotApplied: Story = {
  args: {
    application: {
      ...baseApplication,
      status: 'not_applied',
      date_applied: null,
      interview_date: null,
    },
  },
};

export const Applied: Story = {
  args: {
    application: {
      ...baseApplication,
      status: 'applied',
      outcome: 'pending',
    },
  },
};

export const Interviewing: Story = {
  args: {
    application: baseApplication,
  },
};

export const Offer: Story = {
  args: {
    application: {
      ...baseApplication,
      status: 'offer',
      outcome: 'pending',
      priority: 1,
    },
  },
};

export const Hired: Story = {
  args: {
    application: {
      ...baseApplication,
      status: 'closed',
      outcome: 'hired',
    },
  },
};

export const Rejected: Story = {
  args: {
    application: {
      ...baseApplication,
      status: 'closed',
      outcome: 'rejected',
    },
  },
};

export const Ghosted: Story = {
  args: {
    application: {
      ...baseApplication,
      status: 'closed',
      outcome: 'ghosted',
    },
  },
};

export const RemoteJob: Story = {
  args: {
    application: {
      ...baseApplication,
      work_location_type: 'remote',
      position_title: 'Remote Backend Developer',
    },
  },
};

export const OnSiteJob: Story = {
  args: {
    application: {
      ...baseApplication,
      work_location_type: 'on_site',
      position_title: 'On-site Systems Engineer',
    },
  },
};

export const HighPriority: Story = {
  args: {
    application: {
      ...baseApplication,
      priority: 1,
      position_title: 'Dream Job Position',
    },
  },
};

export const LowPriority: Story = {
  args: {
    application: {
      ...baseApplication,
      priority: 5,
    },
  },
};

export const Inactive: Story = {
  args: {
    application: {
      ...baseApplication,
      is_active: false,
    },
  },
};

export const Selected: Story = {
  args: {
    application: baseApplication,
    isSelected: true,
  },
};

export const NoJobLink: Story = {
  args: {
    application: {
      ...baseApplication,
      job_link: null,
    },
  },
};

export const NoTitle: Story = {
  args: {
    application: {
      ...baseApplication,
      position_title: null,
    },
  },
};

export const WithCompanyName: Story = {
  args: {
    application: baseApplication,
    showCompany: true,
    companyName: 'Acme Corporation',
  },
  decorators: [
    (Story) => (
      <table className="table">
        <thead>
          <tr>
            <th>Position</th>
            <th className="hidden md:table-cell">Company</th>
            <th>Status</th>
            <th className="hidden sm:table-cell">Outcome</th>
            <th className="hidden lg:table-cell">Applied</th>
            <th className="hidden lg:table-cell">Interview</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <Story />
        </tbody>
      </table>
    ),
  ],
};
