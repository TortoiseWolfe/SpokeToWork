import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import StatusColumn from './StatusColumn';

const meta = {
  title: 'Atomic Design/Molecular/StatusColumn',
  component: StatusColumn,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof StatusColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithApplications: Story = {
  args: {
    status: 'applied',
    label: 'Applied',
    applications: [
      {
        id: '1',
        applicant_name: 'Alice Johnson',
        company_name: 'Acme Corp',
        position_title: 'Frontend Developer',
        status: 'applied',
        date_applied: '2026-02-20',
      },
      {
        id: '2',
        applicant_name: 'Bob Smith',
        company_name: 'TechCo',
        position_title: 'Backend Engineer',
        status: 'applied',
        date_applied: '2026-02-18',
      },
      {
        id: '3',
        applicant_name: 'Carol Davis',
        company_name: 'StartupXYZ',
        position_title: 'Full Stack Developer',
        status: 'applied',
        date_applied: '2026-02-16',
      },
      {
        id: '4',
        applicant_name: 'Dan Wilson',
        company_name: 'BigCo',
        position_title: 'DevOps Engineer',
        status: 'applied',
        date_applied: '2026-02-14',
      },
    ],
    onAdvance: () => {},
    onReject: () => {},
  },
};

export const Empty: Story = {
  args: {
    status: 'offer',
    label: 'Offer',
    applications: [],
    onAdvance: () => {},
    onReject: () => {},
  },
};
