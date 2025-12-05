import type { Meta, StoryObj } from '@storybook/nextjs';
import CompanyDetailDrawer from './CompanyDetailDrawer';
import type { CompanyWithApplications } from '@/types/company';

const meta: Meta<typeof CompanyDetailDrawer> = {
  title: 'Organisms/CompanyDetailDrawer',
  component: CompanyDetailDrawer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Slide-out drawer that displays company details and job applications list.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'close' },
    onEditCompany: { action: 'editCompany' },
    onAddApplication: { action: 'addApplication' },
    onEditApplication: { action: 'editApplication' },
    onDeleteApplication: { action: 'deleteApplication' },
    onStatusChange: { action: 'statusChange' },
    onOutcomeChange: { action: 'outcomeChange' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseCompany: CompanyWithApplications = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Acme Corporation',
  address: '123 Main St, Cleveland, OH 44101',
  latitude: 41.4993,
  longitude: -81.6944,
  website: 'https://acme.example.com',
  email: 'hr@acme.example.com',
  phone: '555-123-4567',
  contact_name: 'John Smith',
  contact_title: 'HR Manager',
  notes: 'Great company culture. Remote-friendly.',
  status: 'contacted',
  priority: 2,
  follow_up_date: null,
  is_active: true,
  extended_range: false,
  route_id: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-10T00:00:00.000Z',
  applications: [
    {
      id: 'app-1',
      company_id: 'company-123',
      user_id: 'user-456',
      position_title: 'Senior Software Engineer',
      job_link: 'https://jobs.acme.com/123',
      work_location_type: 'hybrid',
      status: 'interviewing',
      outcome: 'pending',
      date_applied: '2024-01-15',
      interview_date: '2024-01-25T10:00:00.000Z',
      follow_up_date: null,
      priority: 1,
      notes: 'Second round scheduled for next week',
      is_active: true,
      created_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2024-01-20T00:00:00.000Z',
    },
    {
      id: 'app-2',
      company_id: 'company-123',
      user_id: 'user-456',
      position_title: 'Tech Lead',
      job_link: null,
      work_location_type: 'remote',
      status: 'applied',
      outcome: 'pending',
      date_applied: '2024-01-20',
      interview_date: null,
      follow_up_date: null,
      priority: 3,
      notes: null,
      is_active: true,
      created_at: '2024-01-18T00:00:00.000Z',
      updated_at: '2024-01-20T00:00:00.000Z',
    },
  ],
  latest_application: {
    id: 'app-1',
    company_id: 'company-123',
    user_id: 'user-456',
    position_title: 'Senior Software Engineer',
    job_link: 'https://jobs.acme.com/123',
    work_location_type: 'hybrid',
    status: 'interviewing',
    outcome: 'pending',
    date_applied: '2024-01-15',
    interview_date: '2024-01-25T10:00:00.000Z',
    follow_up_date: null,
    priority: 1,
    notes: 'Second round scheduled for next week',
    is_active: true,
    created_at: '2024-01-10T00:00:00.000Z',
    updated_at: '2024-01-20T00:00:00.000Z',
  },
  total_applications: 2,
};

export const Default: Story = {
  args: {
    company: baseCompany,
    isOpen: true,
    onClose: () => console.log('Close'),
  },
};

export const WithAllActions: Story = {
  args: {
    company: baseCompany,
    isOpen: true,
    onClose: () => console.log('Close'),
    onEditCompany: (company) => console.log('Edit company:', company.name),
    onAddApplication: (company) => console.log('Add app for:', company.name),
    onEditApplication: (app) => console.log('Edit app:', app.position_title),
    onDeleteApplication: (app) =>
      console.log('Delete app:', app.position_title),
    onStatusChange: (app, status) =>
      console.log('Status change:', app.position_title, status),
    onOutcomeChange: (app, outcome) =>
      console.log('Outcome change:', app.position_title, outcome),
  },
};

export const NoApplications: Story = {
  args: {
    company: {
      ...baseCompany,
      applications: [],
      latest_application: null,
      total_applications: 0,
    },
    isOpen: true,
    onClose: () => console.log('Close'),
    onAddApplication: (company) => console.log('Add app for:', company.name),
  },
};

export const ManyApplications: Story = {
  args: {
    company: {
      ...baseCompany,
      applications: [
        ...baseCompany.applications,
        {
          id: 'app-3',
          company_id: 'company-123',
          user_id: 'user-456',
          position_title: 'Frontend Developer',
          job_link: 'https://jobs.acme.com/456',
          work_location_type: 'on_site',
          status: 'closed',
          outcome: 'rejected',
          date_applied: '2023-12-01',
          interview_date: '2023-12-15T14:00:00.000Z',
          follow_up_date: null,
          priority: 4,
          notes: 'Position filled internally',
          is_active: false,
          created_at: '2023-11-25T00:00:00.000Z',
          updated_at: '2023-12-20T00:00:00.000Z',
        },
        {
          id: 'app-4',
          company_id: 'company-123',
          user_id: 'user-456',
          position_title: 'DevOps Engineer',
          job_link: null,
          work_location_type: 'remote',
          status: 'offer',
          outcome: 'pending',
          date_applied: '2024-01-25',
          interview_date: '2024-02-01T09:00:00.000Z',
          follow_up_date: '2024-02-05',
          priority: 1,
          notes: 'Offer received! Need to respond by Friday',
          is_active: true,
          created_at: '2024-01-22T00:00:00.000Z',
          updated_at: '2024-01-30T00:00:00.000Z',
        },
      ],
      total_applications: 4,
    },
    isOpen: true,
    onClose: () => console.log('Close'),
    onEditApplication: (app) => console.log('Edit:', app.position_title),
    onDeleteApplication: (app) => console.log('Delete:', app.position_title),
  },
};

export const InactiveCompany: Story = {
  args: {
    company: {
      ...baseCompany,
      is_active: false,
    },
    isOpen: true,
    onClose: () => console.log('Close'),
  },
};

export const MinimalCompany: Story = {
  args: {
    company: {
      ...baseCompany,
      website: null,
      email: null,
      phone: null,
      contact_name: null,
      contact_title: null,
      notes: null,
      applications: [],
      latest_application: null,
      total_applications: 0,
    },
    isOpen: true,
    onClose: () => console.log('Close'),
  },
};

export const Closed: Story = {
  args: {
    company: baseCompany,
    isOpen: false,
    onClose: () => console.log('Close'),
  },
};
