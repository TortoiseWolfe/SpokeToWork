import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';
import CompanyRow from './CompanyRow';
import type { Company } from '@/types/company';

const mockCompany: Company = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Acme Corporation',
  contact_name: 'John Smith',
  contact_title: 'HR Manager',
  phone: '555-123-4567',
  email: 'john.smith@acme.com',
  website: 'https://acme.com',
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
