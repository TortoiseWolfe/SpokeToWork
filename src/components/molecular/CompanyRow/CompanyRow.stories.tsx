import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import CompanyRow from './CompanyRow';
import type { Company, UnifiedCompany, CompanySource } from '@/types/company';

const mockCompany: Company = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Acme Corporation',
  contact_name: 'John Smith',
  contact_title: 'HR Manager',
  phone: '555-123-4567',
  email: 'john.smith@acme.com',
  website: 'https://acme.com',
  careers_url: null,
  address: '350 5th Ave, New York, NY 10118',
  latitude: 40.7484,
  longitude: -73.9857,
  extended_range: false,
  status: 'contacted',
  priority: 2,
  notes: 'Great opportunity',
  follow_up_date: '2025-01-15',
  route_id: null,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-05T00:00:00Z',
};

const meta: Meta<typeof CompanyRow> = {
  title: 'Components/Molecular/CompanyRow',
  component: CompanyRow,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Row component for displaying a company in a table. Shows company info, status, and actions.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <table className="table">
        <tbody>
          <Story />
        </tbody>
      </table>
    ),
  ],
  argTypes: {
    company: {
      description: 'Company data to display',
    },
    onClick: {
      description: 'Callback when row is clicked',
      action: 'clicked',
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
    company: mockCompany,
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
};

export const HighPriority: Story = {
  args: {
    company: { ...mockCompany, priority: 1 },
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
};

export const ExtendedRange: Story = {
  args: {
    company: { ...mockCompany, extended_range: true },
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
};

export const Inactive: Story = {
  args: {
    company: { ...mockCompany, is_active: false },
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
};

export const WithStatusDropdown: Story = {
  args: {
    company: mockCompany,
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onStatusChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'With status dropdown for quick status changes.',
      },
    },
  },
};

export const ReadOnly: Story = {
  args: {
    company: mockCompany,
  },
  parameters: {
    docs: {
      description: {
        story: 'Without any action handlers (read-only mode).',
      },
    },
  },
};

// Feature 012: Unified Company Stories (T061)
const mockUnifiedCompanyShared: UnifiedCompany = {
  source: 'shared' as CompanySource,
  tracking_id: 'tracking-123',
  company_id: 'shared-company-456',
  private_company_id: null,
  user_id: 'user-789',
  metro_area_id: 'metro-cleveland-tn',
  name: 'Community Employer Inc',
  website: 'https://community-employer.com',
  careers_url: 'https://community-employer.com/careers',
  address: '100 Market St, Cleveland, TN 37311',
  latitude: 35.1595,
  longitude: -84.8766,
  phone: '423-555-0100',
  email: 'hiring@community-employer.com',
  contact_name: 'Sarah Johnson',
  contact_title: 'Talent Acquisition',
  notes: 'Great benefits package',
  status: 'contacted',
  priority: 2,
  follow_up_date: '2025-01-20',
  is_active: true,
  is_verified: true,
  submit_to_shared: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-05T00:00:00Z',
};

const mockUnifiedCompanyPrivate: UnifiedCompany = {
  source: 'private' as CompanySource,
  tracking_id: null,
  company_id: null,
  private_company_id: 'private-789',
  user_id: 'user-789',
  metro_area_id: 'metro-cleveland-tn',
  name: 'My Private Lead',
  website: 'https://private-lead.com',
  careers_url: null,
  address: '200 Oak Ave, Cleveland, TN 37312',
  latitude: 35.1595,
  longitude: -84.8766,
  phone: '423-555-0200',
  email: 'info@private-lead.com',
  contact_name: 'Mike Brown',
  contact_title: 'Owner',
  notes: 'Found at networking event',
  status: 'not_contacted',
  priority: 1,
  follow_up_date: null,
  is_active: true,
  is_verified: false,
  submit_to_shared: false,
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
};

export const CommunityCompany: Story = {
  args: {
    company: mockUnifiedCompanyShared,
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Company from the shared community registry (Feature 012). Shows "Community" badge.',
      },
    },
  },
};

export const PrivateCompany: Story = {
  args: {
    company: mockUnifiedCompanyPrivate,
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'User\'s private company not yet in community registry (Feature 012). Shows "Private" badge.',
      },
    },
  },
};

// Feature 044: Active Route Indicator Stories
export const OnActiveRoute: Story = {
  args: {
    company: mockCompany,
    isOnActiveRoute: true,
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Company that is on the active route (Feature 044). Shows bicycle icon indicator.',
      },
    },
  },
};

export const HighPriorityOnActiveRoute: Story = {
  args: {
    company: { ...mockCompany, priority: 1 },
    isOnActiveRoute: true,
    onClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'High priority company that is on the active route. Shows both priority star and route indicator.',
      },
    },
  },
};
