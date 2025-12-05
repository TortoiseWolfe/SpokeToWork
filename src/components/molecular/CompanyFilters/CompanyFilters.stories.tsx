import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';
import { useState } from 'react';
import CompanyFilters from './CompanyFilters';
import type { CompanyFilters as CompanyFiltersType } from '@/types/company';

const meta: Meta<typeof CompanyFilters> = {
  title: 'Components/Molecular/CompanyFilters',
  component: CompanyFilters,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Filter controls for the company list. Includes search, status, priority, and active filters.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    filters: {
      description: 'Current filter values',
    },
    onFiltersChange: {
      description: 'Callback when filters change',
      action: 'filters changed',
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
    filters: {},
    onFiltersChange: fn(),
  },
};

export const WithSearchFilter: Story = {
  args: {
    filters: { search: 'acme' },
    onFiltersChange: fn(),
  },
};

export const WithStatusFilter: Story = {
  args: {
    filters: { status: 'contacted' },
    onFiltersChange: fn(),
  },
};

export const WithMultipleFilters: Story = {
  args: {
    filters: {
      search: 'corp',
      status: 'follow_up',
      priority: 1,
      is_active: true,
    },
    onFiltersChange: fn(),
  },
};

// Interactive example
const InteractiveTemplate = () => {
  const [filters, setFilters] = useState<CompanyFiltersType>({});

  return (
    <div className="space-y-4">
      <CompanyFilters filters={filters} onFiltersChange={setFilters} />
      <div className="bg-base-200 rounded p-4">
        <strong>Current filters:</strong>
        <pre className="mt-2 text-xs">{JSON.stringify(filters, null, 2)}</pre>
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveTemplate />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing filter state changes.',
      },
    },
  },
};
