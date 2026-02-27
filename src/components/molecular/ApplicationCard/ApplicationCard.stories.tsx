import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ApplicationCard from './ApplicationCard';

const meta = {
  title: 'Atomic Design/Molecular/ApplicationCard',
  component: ApplicationCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ApplicationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Applied: Story = {
  args: {
    application: {
      id: '1',
      applicant_name: 'Jane Doe',
      company_name: 'Acme Corp',
      position_title: 'Software Engineer',
      status: 'applied',
      date_applied: '2026-02-20',
    },
    onAdvance: () => {},
    onReject: () => {},
  },
};

export const Interviewing: Story = {
  args: {
    application: {
      id: '2',
      applicant_name: 'John Smith',
      company_name: 'TechCo',
      position_title: 'UX Designer',
      status: 'interviewing',
      date_applied: '2026-02-15',
      interview_date: null,
    },
    onAdvance: () => {},
    onReject: () => {},
  },
};

export const InterviewScheduled: Story = {
  args: {
    application: {
      id: '5',
      applicant_name: 'Maria Lopez',
      company_name: 'TechCo',
      position_title: 'Frontend Developer',
      status: 'interviewing',
      date_applied: '2026-02-12',
      interview_date: '2026-03-05T14:00:00Z',
    },
    onAdvance: () => {},
    onReject: () => {},
  },
};

export const Closed: Story = {
  args: {
    application: {
      id: '3',
      applicant_name: 'Alex Chen',
      company_name: 'StartupXYZ',
      position_title: null,
      status: 'closed',
      date_applied: null,
    },
    onAdvance: () => {},
    onReject: () => {},
  },
};

export const Rejected: Story = {
  args: {
    application: {
      id: '4',
      applicant_name: 'Sam Rivera',
      company_name: 'BigCo',
      position_title: 'Product Manager',
      status: 'closed',
      outcome: 'rejected',
      date_applied: '2026-02-10',
    },
    onAdvance: () => {},
    onReject: () => {},
  },
};
