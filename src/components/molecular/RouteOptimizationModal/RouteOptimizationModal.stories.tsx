import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import RouteOptimizationModal from './RouteOptimizationModal';
import type { RouteOptimizationResult } from '@/lib/routes/optimization-types';

const meta: Meta<typeof RouteOptimizationModal> = {
  title: 'Molecular/RouteOptimizationModal',
  component: RouteOptimizationModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal dialog showing route optimization results with before/after comparison and savings.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    isLoading: {
      control: 'boolean',
      description: 'Loading state while optimization is in progress',
    },
    error: {
      control: 'text',
      description: 'Error message if optimization failed',
    },
    onApply: {
      action: 'apply',
      description: 'Callback when user applies the optimization',
    },
    onClose: {
      action: 'close',
      description: 'Callback when user closes the modal',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RouteOptimizationModal>;

const mockCompanies = [
  { id: 'company-1', name: 'Cleveland Cycle Shop' },
  { id: 'company-2', name: 'Ooltewah Outdoor Gear' },
  { id: 'company-3', name: 'Chattanooga Bikes & More' },
  { id: 'company-4', name: 'Signal Mountain Sports' },
];

const mockOriginalOrder = ['company-1', 'company-2', 'company-3', 'company-4'];

const mockResultWithSavings: RouteOptimizationResult = {
  optimizedOrder: ['company-2', 'company-4', 'company-3', 'company-1'],
  totalDistanceMiles: 18.5,
  originalDistanceMiles: 28.3,
  distanceSavingsMiles: 9.8,
  distanceSavingsPercent: 35,
  estimatedTimeMinutes: 52,
  distancesFromStart: {
    'company-1': 18.5,
    'company-2': 3.2,
    'company-3': 12.1,
    'company-4': 7.8,
  },
};

const mockResultNoSavings: RouteOptimizationResult = {
  optimizedOrder: ['company-1', 'company-2', 'company-3', 'company-4'],
  totalDistanceMiles: 18.5,
  originalDistanceMiles: 18.5,
  distanceSavingsMiles: 0,
  distanceSavingsPercent: 0,
  estimatedTimeMinutes: 52,
  distancesFromStart: {
    'company-1': 3.2,
    'company-2': 7.8,
    'company-3': 12.1,
    'company-4': 18.5,
  },
};

export const WithSavings: Story = {
  args: {
    isOpen: true,
    result: mockResultWithSavings,
    companies: mockCompanies,
    originalOrder: mockOriginalOrder,
    isLoading: false,
    error: null,
  },
};

export const NoSavings: Story = {
  args: {
    isOpen: true,
    result: mockResultNoSavings,
    companies: mockCompanies,
    originalOrder: mockOriginalOrder,
    isLoading: false,
    error: null,
  },
};

export const Loading: Story = {
  args: {
    isOpen: true,
    result: null,
    companies: mockCompanies,
    originalOrder: mockOriginalOrder,
    isLoading: true,
    error: null,
  },
};

export const Error: Story = {
  args: {
    isOpen: true,
    result: null,
    companies: mockCompanies,
    originalOrder: mockOriginalOrder,
    isLoading: false,
    error: 'Failed to calculate optimal route. Please try again.',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    result: mockResultWithSavings,
    companies: mockCompanies,
    originalOrder: mockOriginalOrder,
    isLoading: false,
    error: null,
  },
};

export const SmallRoute: Story = {
  args: {
    isOpen: true,
    result: {
      optimizedOrder: ['company-2', 'company-1'],
      totalDistanceMiles: 5.2,
      originalDistanceMiles: 7.8,
      distanceSavingsMiles: 2.6,
      distanceSavingsPercent: 33,
      estimatedTimeMinutes: 18,
      distancesFromStart: {
        'company-1': 5.2,
        'company-2': 2.1,
      },
    },
    companies: mockCompanies.slice(0, 2),
    originalOrder: ['company-1', 'company-2'],
    isLoading: false,
    error: null,
  },
};
