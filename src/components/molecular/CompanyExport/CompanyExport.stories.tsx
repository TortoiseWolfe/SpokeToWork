import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';
import CompanyExport from './CompanyExport';
import type { ExportFormat } from './CompanyExport';

const mockExport = async (format: ExportFormat) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const content: Record<ExportFormat, string> = {
    csv: 'name,address\nAcme Corp,123 Main St',
    json: '{"companies":[{"name":"Acme Corp"}]}',
    gpx: '<?xml version="1.0"?><gpx></gpx>',
    printable: '<html><body>Companies List</body></html>',
  };

  const mimeTypes: Record<ExportFormat, string> = {
    csv: 'text/csv',
    json: 'application/json',
    gpx: 'application/gpx+xml',
    printable: 'text/html',
  };

  return new Blob([content[format]], { type: mimeTypes[format] });
};

const meta: Meta<typeof CompanyExport> = {
  title: 'Components/Molecular/CompanyExport',
  component: CompanyExport,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Export component for downloading company data in multiple formats: CSV, JSON, GPX, and printable HTML.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onExport: {
      description: 'Callback function to handle export in specified format',
      action: 'export',
    },
    companyCount: {
      control: { type: 'number', min: 0 },
      description: 'Number of companies to be exported',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable all export buttons',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onExport: fn(mockExport),
    companyCount: 10,
  },
};

export const NoCompanies: Story = {
  args: {
    onExport: fn(mockExport),
    companyCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows disabled state when there are no companies to export.',
      },
    },
  },
};

export const SingleCompany: Story = {
  args: {
    onExport: fn(mockExport),
    companyCount: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows singular company text.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    onExport: fn(mockExport),
    companyCount: 10,
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'All export buttons are disabled.',
      },
    },
  },
};

export const WithError: Story = {
  args: {
    onExport: fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      throw new Error('Export failed: Network error');
    }),
    companyCount: 10,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows error state when export fails.',
      },
    },
  },
};
