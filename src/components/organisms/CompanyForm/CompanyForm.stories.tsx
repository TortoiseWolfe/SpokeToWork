import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';
import CompanyForm from './CompanyForm';
import type { Company, HomeLocation } from '@/types/company';

const meta: Meta<typeof CompanyForm> = {
  title: 'Components/Organisms/CompanyForm',
  component: CompanyForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Form component for creating and editing company records. Includes geocoding, map preview, and distance validation.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    company: {
      description: 'Existing company data for edit mode',
    },
    homeLocation: {
      description: 'Home location for distance validation',
    },
    onSubmit: {
      description: 'Callback when form is submitted',
      action: 'submitted',
    },
    onCancel: {
      description: 'Callback when form is cancelled',
      action: 'cancelled',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockHomeLocation: HomeLocation = {
  address: '100 Home Street, New York, NY 10001',
  latitude: 40.7128,
  longitude: -74.006,
  radius_miles: 25,
};

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
  notes: 'Great opportunity, follow up next week.',
  follow_up_date: '2025-01-15',
  route_id: null,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-05T00:00:00Z',
};

export const CreateMode: Story = {
  args: {
    onSubmit: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty form for creating a new company.',
      },
    },
  },
};

export const CreateModeWithHomeLocation: Story = {
  args: {
    homeLocation: mockHomeLocation,
    onSubmit: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Create form with home location configured for distance validation.',
      },
    },
  },
};

export const EditMode: Story = {
  args: {
    company: mockCompany,
    homeLocation: mockHomeLocation,
    onSubmit: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-filled form for editing an existing company.',
      },
    },
  },
};

export const ExtendedRangeCompany: Story = {
  args: {
    company: {
      ...mockCompany,
      address: '1 Infinite Loop, Cupertino, CA 95014',
      latitude: 37.3318,
      longitude: -122.0312,
      extended_range: true,
    },
    homeLocation: mockHomeLocation,
    onSubmit: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Edit form showing a company outside the home radius with extended range warning.',
      },
    },
  },
};

export const WithoutCancelButton: Story = {
  args: {
    onSubmit: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Form without cancel button (onCancel not provided).',
      },
    },
  },
};
