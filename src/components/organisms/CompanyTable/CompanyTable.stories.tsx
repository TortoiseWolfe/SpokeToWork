import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import CompanyTable from './CompanyTable';
import type { Company } from '@/types/company';

const mockCompanies: Company[] = [
  {
    id: 'company-1',
    user_id: 'user-1',
    name: 'Acme Corporation',
    contact_name: 'John Smith',
    contact_title: 'HR Manager',
    phone: '555-123-4567',
    email: 'john@acme.com',
    website: 'https://acme.com',
    careers_url: null,
    address: '350 5th Ave, New York, NY 10118',
    latitude: 40.7484,
    longitude: -73.9857,
    extended_range: false,
    status: 'contacted',
    priority: 2,
    notes: null,
    follow_up_date: '2025-01-15',
    route_id: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-05T00:00:00Z',
  },
  {
    id: 'company-2',
    user_id: 'user-1',
    name: 'TechStart Inc',
    contact_name: 'Jane Doe',
    contact_title: 'Recruiter',
    phone: '555-987-6543',
    email: 'jane@techstart.com',
    website: 'https://techstart.com',
    careers_url: null,
    address: '100 Tech Plaza, San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    extended_range: true,
    status: 'follow_up',
    priority: 1,
    notes: 'Great opportunity!',
    follow_up_date: '2025-01-10',
    route_id: null,
    is_active: true,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-06T00:00:00Z',
  },
  {
    id: 'company-3',
    user_id: 'user-1',
    name: 'Global Corp',
    contact_name: null,
    contact_title: null,
    phone: null,
    email: null,
    website: null,
    careers_url: null,
    address: '1 World Trade Center, New York, NY',
    latitude: 40.7127,
    longitude: -74.0134,
    extended_range: false,
    status: 'not_contacted',
    priority: 3,
    notes: null,
    follow_up_date: null,
    route_id: null,
    is_active: true,
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
  },
];

const meta: Meta<typeof CompanyTable> = {
  title: 'Components/Organisms/CompanyTable',
  component: CompanyTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Table component for displaying and filtering companies. Includes sorting, filtering, and action callbacks.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    companies: {
      description: 'List of companies to display',
    },
    isLoading: {
      control: 'boolean',
      description: 'Loading state',
    },
    onCompanyClick: {
      description: 'Callback when a company row is clicked',
      action: 'company clicked',
    },
    onEdit: {
      description: 'Callback when edit is requested',
      action: 'edit',
    },
    onDelete: {
      description: 'Callback when delete is requested',
      action: 'delete',
    },
    onStatusChange: {
      description: 'Callback when status is changed',
      action: 'status changed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    companies: mockCompanies,
    onCompanyClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onStatusChange: fn(),
  },
};

export const Empty: Story = {
  args: {
    companies: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows empty state when no companies exist.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    companies: [],
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows loading spinner while data is being fetched.',
      },
    },
  },
};

export const ReadOnly: Story = {
  args: {
    companies: mockCompanies,
    onCompanyClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Without edit/delete handlers (read-only mode).',
      },
    },
  },
};

export const ManyCompanies: Story = {
  args: {
    companies: [
      ...mockCompanies,
      ...mockCompanies.map((c, i) => ({
        ...c,
        id: `company-${i + 4}`,
        name: `Company ${i + 4}`,
      })),
    ],
    onCompanyClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'With many companies to demonstrate scrolling and filtering.',
      },
    },
  },
};
