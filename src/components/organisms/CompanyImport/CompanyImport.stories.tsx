import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import CompanyImport from './CompanyImport';
import type { ImportResult } from '@/types/company';

const mockSuccessResult: ImportResult = {
  success: 5,
  failed: 0,
  errors: [],
};

const mockPartialResult: ImportResult = {
  success: 3,
  failed: 2,
  errors: [
    { row: 2, reason: 'Missing company name' },
    { row: 5, reason: 'Geocoding failed: Could not find coordinates' },
  ],
};

const meta: Meta<typeof CompanyImport> = {
  title: 'Components/Organisms/CompanyImport',
  component: CompanyImport,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Import component for uploading companies from CSV files. Supports drag-and-drop and file selection. Shows progress and error details.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onImport: {
      description: 'Callback function to handle the CSV file import',
      action: 'import',
    },
    onComplete: {
      description: 'Callback called when import completes',
      action: 'complete',
    },
    onCancel: {
      description: 'Callback when cancel/close is clicked',
      action: 'cancel',
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
    onImport: fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return mockSuccessResult;
    }),
    onComplete: fn(),
    onCancel: fn(),
  },
};

export const WithPartialFailure: Story = {
  args: {
    onImport: fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return mockPartialResult;
    }),
    onComplete: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the result when some rows fail to import.',
      },
    },
  },
};

export const WithSlowImport: Story = {
  args: {
    onImport: fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return mockSuccessResult;
    }),
    onComplete: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulates a slow import to show loading state.',
      },
    },
  },
};

export const WithoutCancel: Story = {
  args: {
    onImport: fn(async () => mockSuccessResult),
    onComplete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Without cancel button (no onCancel prop).',
      },
    },
  },
};
